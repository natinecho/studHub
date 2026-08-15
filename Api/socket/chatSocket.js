import Message from "../models/chatModels/messageModel.js";
import Conversation from "../models/chatModels/conversationModel.js";
import Group from "../models/groupModel.js";
import UserStatus from "../models/chatModels/userStatusModel.js";

// Wraps an async socket handler so a rejected promise is logged instead of
// bubbling up as an unhandled rejection and killing the process.
const safe = (name, handler) => async (...args) => {
  try {
    await handler(...args);
  } catch (error) {
    console.error(`socket ${name} failed:`, error.message);
  }
};

/**
 * What the client needs to render a message: the author's name and, for a
 * reply, enough of the quoted message to show a preview.
 */
const POPULATE = [
  { path: "sender", select: "username profile_pic" },
  {
    path: "replyTo",
    select: "content sender deletedAt",
    populate: { path: "sender", select: "username" },
  },
];

const hydrate = (message) => message.populate(POPULATE);

/** Deliver an event to every member of a group except the actor. */
const emitToGroup = async (io, group, actorId, event, payload) => {
  for (const member of group.members) {
    if (member.toString() === actorId) continue;
    const status = await UserStatus.findOne({ userId: member });
    if (status?.isOnline) io.to(status.socketId).emit(event, payload);
  }
};

const setupSocket = (io) => {
  io.on("connection", safe("connection", async (socket) => {
    const userId = socket.handshake.query.userId;
    if (!userId) return;

    // Every socket.on() below is registered before the first await. Awaiting
    // first would leave the socket deaf for the length of a database round
    // trip — long enough that a short-lived connection could close before its
    // own `disconnect` handler existed, and never be marked offline.

    // 1-on-1 message
    socket.on("send_dm", safe("send_dm", async ({ receiverId, content, replyTo }) => {
      let convo = await Conversation.findOne({
        members: { $all: [userId, receiverId] },
      });
      if (!convo)
        convo = await Conversation.create({ members: [userId, receiverId] });

      const message = await Message.create({
        sender: userId,
        content,
        conversation: convo._id,
        replyTo: replyTo || undefined,
      });
      convo.lastMessage = message._id;
      await convo.save();
      await hydrate(message);

      // The sender gets it back too, so their optimistic copy is replaced by
      // the real one — with the id that edit and delete need.
      socket.emit("receive_dm", message);

      const receiver = await UserStatus.findOne({ userId: receiverId });
      if (receiver?.isOnline) {
        io.to(receiver.socketId).emit("receive_dm", message);
      } else {
        await UserStatus.updateOne(
          { userId: receiverId },
          { $push: { offlineQueue: message._id } }
        );
      }
    }));

    // Group message
    socket.on("send_group", safe("send_group", async ({ groupId, content, replyTo }) => {
      const group = await Group.findById(groupId);
      if (!group || !group.members.includes(userId)) return;

      const message = await Message.create({
        sender: userId,
        content,
        group: groupId,
        replyTo: replyTo || undefined,
      });
      await hydrate(message);

      socket.emit("receive_group", message);

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
    }));

    // ── Edit / delete, sender only ─────────────────────────────────────────
    // Both broadcast a `message_updated` carrying the whole message, so every
    // open client converges on the same text without refetching the thread.
    const broadcastUpdate = async (message) => {
      await hydrate(message);
      socket.emit("message_updated", message);

      if (message.group) {
        const group = await Group.findById(message.group);
        if (group) {
          await emitToGroup(io, group, userId, "message_updated", message);
        }
        return;
      }

      const convo = await Conversation.findById(message.conversation);
      if (!convo) return;
      for (const member of convo.members) {
        if (member.toString() === userId) continue;
        const status = await UserStatus.findOne({ userId: member });
        if (status?.isOnline) {
          io.to(status.socketId).emit("message_updated", message);
        }
      }
    };

    socket.on("edit_message", safe("edit_message", async ({ messageId, content }) => {
      const text = (content || "").trim();
      if (!text) return;

      const message = await Message.findOne({ _id: messageId, sender: userId });
      if (!message || message.deletedAt) return;

      message.content = text;
      message.editedAt = new Date();
      await message.save();

      // Keep the conversation preview honest if this was the latest message.
      await Conversation.updateOne(
        { _id: message.conversation, lastMessage: message._id },
        { updatedAt: new Date() }
      );

      await broadcastUpdate(message);
    }));

    socket.on("delete_message", safe("delete_message", async ({ messageId }) => {
      const message = await Message.findOne({ _id: messageId, sender: userId });
      if (!message || message.deletedAt) return;

      // Soft delete: replies quoting this one still need something to show.
      message.content = "";
      message.deletedAt = new Date();
      message.replyTo = undefined;
      await message.save();

      await broadcastUpdate(message);
    }));

    // Get pending messages
    socket.on("get_pending", safe("get_pending", async () => {
      const status = await UserStatus.findOne({ userId }).populate(
        "offlineQueue"
      );
      if (status && status.offlineQueue.length > 0) {
        socket.emit("pending_messages", status.offlineQueue);
        status.offlineQueue = [];
        await status.save();
      }
    }));

    // The reader is whoever owns this socket. (The client also sends a userId;
    // trusting the connection instead means nobody can mark for someone else.)
    socket.on("mark_seen", safe("mark_seen", async ({ messageIds }) => {
      if (!Array.isArray(messageIds) || !messageIds.length) return;

      await Message.updateMany(
        { _id: { $in: messageIds }, seenBy: { $ne: userId } },
        { $push: { seenBy: userId } }
      );

      // Tell each author which of their messages were just read, so their
      // ticks can turn without a refetch.
      const messages = await Message.find({ _id: { $in: messageIds } })
        .select("sender")
        .lean();

      const bySender = new Map();
      for (const message of messages) {
        const author = message.sender?.toString();
        if (!author || author === userId) continue;
        if (!bySender.has(author)) bySender.set(author, []);
        bySender.get(author).push(message._id.toString());
      }

      for (const [author, ids] of bySender) {
        const status = await UserStatus.findOne({ userId: author });
        if (status?.isOnline) {
          io.to(status.socketId).emit("messages_seen", {
            messageIds: ids,
            userId,
          });
        }
      }
    }));

    socket.on("disconnect", safe("disconnect", async () => {
      // Only the socket that currently owns the record may mark it offline —
      // otherwise closing one of two open tabs would report the user as gone.
      const lastSeen = new Date();
      const result = await UserStatus.findOneAndUpdate(
        { userId, socketId: socket.id },
        { isOnline: false, lastSeen }
      );
      if (result) io.emit("presence", { userId, isOnline: false, lastSeen });
    }));

    // Now the slow part: claim this socket as the user's current one and share
    // presence both ways.
    const now = new Date();
    await UserStatus.findOneAndUpdate(
      { userId },
      { socketId: socket.id, isOnline: true, lastSeen: now },
      { upsert: true }
    );

    // The whole roster, not just who's online: an offline entry carries the
    // timestamp the "last seen" line needs.
    const roster = await UserStatus.find()
      .select("userId isOnline lastSeen")
      .lean();
    socket.emit(
      "presence_snapshot",
      roster.map((status) => ({
        userId: status.userId.toString(),
        isOnline: !!status.isOnline,
        lastSeen: status.lastSeen ?? null,
      }))
    );
    socket.broadcast.emit("presence", {
      userId,
      isOnline: true,
      lastSeen: now,
    });
  }));
};

export default setupSocket;
