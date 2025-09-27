import mongoose from "mongoose";

const PasswordResetTokenSchema = new mongoose.Schema({
  user: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true }, 
  tokenHash: { type: String, required: true },
  rateLimit: { type: Number, default: 0 },
  expiresAt: { type: Date, required: true },
  used: { type: Boolean, default: false },
}, { timestamps: true });

//TTL (time to live) => to delete the token after it expires
PasswordResetTokenSchema.index({expiresAt:1},{expireAfterSeconds:0});

const PasswordResetToken = mongoose.model("PasswordResetToken", PasswordResetTokenSchema)

export default PasswordResetToken;
