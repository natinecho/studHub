import mongoose from "mongoose";

const MessageSchema = new mongoose.Schema({
  sender: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
  content: String,
  conversation: { type: mongoose.Schema.Types.ObjectId, ref: "Conversation" },
  group: { type: mongoose.Schema.Types.ObjectId, ref: "Group" },
  seenBy: [{ type: mongoose.Schema.Types.ObjectId, ref: "User" }],
  /** The message this one answers, for the quoted reply block. */
  replyTo: { type: mongoose.Schema.Types.ObjectId, ref: "Message" },
  /** Set when the sender edits the text, so the UI can mark it "edited". */
  editedAt: Date,
  /** Soft delete — a reply quoting this message still needs something to show. */
  deletedAt: Date,
}, { timestamps: true });

// Opening a thread reads every message in it in createdAt order; the
// conversation-list aggregates group by the same field and sort createdAt
// descending, which walks these same indexes backwards.
MessageSchema.index({ conversation: 1, createdAt: 1 });
MessageSchema.index({ group: 1, createdAt: 1 });

export default mongoose.model("Message", MessageSchema);
