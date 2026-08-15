import mongoose from "mongoose";

const ConversationSchema = new mongoose.Schema({
  members: [{ type: mongoose.Schema.Types.ObjectId, ref: "User" }],
  lastMessage: { type: mongoose.Schema.Types.ObjectId, ref: "Message" }
}, { timestamps: true });

// The chat list: this user's conversations, most recently active first.
ConversationSchema.index({ members: 1, updatedAt: -1 });

export default mongoose.model("Conversation", ConversationSchema);
