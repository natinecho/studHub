import mongoose from "mongoose";

const ConversationSchema = new mongoose.Schema({
  members: [{ type: mongoose.Schema.Types.ObjectId, ref: "User" }],
  lastMessage: { type: mongoose.Schema.Types.ObjectId, ref: "Message" }
}, { timestamps: true });

export default mongoose.model("Conversation", ConversationSchema);
