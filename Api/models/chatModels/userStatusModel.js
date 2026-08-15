import mongoose from "mongoose";

const UserStatusSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: "User", unique: true },
  socketId: String,
  isOnline: Boolean,
  /** When this user was last connected — drives the "last seen" line. */
  lastSeen: Date,
  offlineQueue: [{ type: mongoose.Schema.Types.ObjectId, ref: "Message" }]
});

export default mongoose.model("UserStatus", UserStatusSchema);
