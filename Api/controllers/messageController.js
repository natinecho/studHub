import Message from "../models/chatModels/messageModel.js";
import Conversation from "../models/chatModels/conversationModel.js";

export const getMessagesForConversation = async (req, res) => {
  const { id } = req.params;
  const messages = await Message.find({ conversation: id }).sort({createdAt: 1});
  if (!messages) {
    return res.status(404).json({ message: "No message here yet" });
  }
  res.status(200).json(messages);
};

export const getMessagesForGroup = async (req, res) => {
    const { id } = req.params;
    const messages = await Message.find({ group: id }).sort({ createdAt: 1 });
    if (!messages) {
      return res.status(404).json({ message: "No message here yet" });
    }
  res.status(200).json(messages);
};

export const getAllConversations = async (req, res) => {
  const conversation = await Conversation.find();
  if (!conversation) {
    return res.status(404).json({ messages: "No conversation" });
  }
  res.status(200).json(conversation);
};


// export const getSeen = async (req, res) => {
//   const { messageIds } = req.body;
//   const userId = req.user.id;

//   if (!Array.isArray(messageIds)) return res.status(400).send("Invalid message IDs");

//   await Message.updateMany(
//     { _id: { $in: messageIds }, seenBy: { $ne: userId } },
//     { $addToSet: { seenBy: userId } }
//   );

//   res.send("Messages marked as seen");
// }
