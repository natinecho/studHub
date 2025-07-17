import mongoose from "mongoose";

const MessageSchema = new mongoose.Schema({
  sender: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
  content: String,
  conversation: { type: mongoose.Schema.Types.ObjectId, ref: "Conversation" },
  group: { type: mongoose.Schema.Types.ObjectId, ref: "Group" },
  seenBy: [{ type: mongoose.Schema.Types.ObjectId, ref: "User" }]
}, { timestamps: true });

export default mongoose.model("Message", MessageSchema);
