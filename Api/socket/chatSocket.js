import Message from "../models/chatModels/messageModel.js";
import Conversation from "../models/chatModels/conversationModel.js";
import Group from "../models/groupModel.js";
import UserStatus from "../models/chatModels/userStatusModel.js";

const setupSocket = (io) => {
  io.on("connection", async (socket) => {
    const userId = socket.handshake.query.userId;
    if (!userId) return;

    await UserStatus.findOneAndUpdate(
      { userId },
      { socketId: socket.id, isOnline: true },
      { upsert: true }
    );

    // 1-on-1 message
    socket.on("send_dm", async ({ receiverId, content }) => {
      let convo = await Conversation.findOne({
        members: { $all: [userId, receiverId] },
      });
      if (!convo)
        convo = await Conversation.create({ members: [userId, receiverId] });

      const message = await Message.create({
        sender: userId,
        content,
        conversation: convo._id,
      });
      convo.lastMessage = message._id;
      await convo.save();

      const receiver = await UserStatus.findOne({ userId: receiverId });
      if (receiver?.isOnline) {
        io.to(receiver.socketId).emit("receive_dm", message);
      } else {
        await UserStatus.updateOne(
          { userId: receiverId },
          { $push: { offlineQueue: message._id } }
        );
      }
    });

    // Group message
    socket.on("send_group", async ({ groupId, content }) => {
      const group = await Group.findById(groupId);
      if (!group || !group.members.includes(userId)) return;

      const message = await Message.create({
        sender: userId,
        content,
        group: groupId,
      });

      for (const member of group.members) {
        if (member.toString() === userId) continue;

        const status = await UserStatus.findOne({ userId: member });
        if (status?.isOnline) {
          io.to(status.socketId).emit("receive_group", message);
        } else {
          await UserStatus.updateOne(
            { userId: member },
            { $push: { offlineQueue: message._id } }
          );
        }
      }
    });

    // Get pending messages
    socket.on("get_pending", async () => {
      const status = await UserStatus.findOne({ userId }).populate(
        "offlineQueue"
      );
      if (status && status.offlineQueue.length > 0) {
        socket.emit("pending_messages", status.offlineQueue);
        status.offlineQueue = [];
        await status.save();
      }
    });

    socket.on("mark_seen", async ({ messageIds, userId }) => {
      await Message.updateMany(
        { _id: { $in: messageIds }, seenBy: { $ne: userId } },
        { $push: { seenBy: userId } }
      );
    });

    socket.on("disconnect", async () => {
      await UserStatus.findOneAndUpdate({ userId }, { isOnline: false });
    });
  });
};

export default setupSocket;
