import crypto from "crypto";
import bcrypt from "bcryptjs";
import User from "../models/userModel.js";

import PasswordResetToken from "../models/passwordResetModel.js";
import { sendPasswordResetEmail } from "../services/emailService.js"; // your email sender

export const forgetPassword = async (req, res) => {
  try {
    const email = req.body;

    const user = await User.findOne(email);

    if (!user) return res.status(404).json({ message: "user not found" });

    const exsistingtoken = await PasswordResetToken.findOne({
      user: user._id,
      used: false,
      expiresAt: { $gt: new Date() },
    });

    const MAX_RESEND = 5;

    if (exsistingtoken) {
      if (exsistingtoken.rateLimit > MAX_RESEND) {
        return res
          .status(429)
          .json({ message: "Too many resend requests. Try later." });
      }

      exsistingtoken.rateLimit += 1;
      await exsistingtoken.save();

      const resetLink = `${process.env.FRONTEND_URL}/reset-password/${exsistingtoken}`;
      await sendPasswordResetEmail(user.email, resetLink, user.username);

      return res
        .status(200)
        .json({ message: "Reset link resent successfully" });
    }

    // Create new token
    const token = crypto.randomBytes(32).toString("hex");
    const tokenHash = crypto.createHash("sha256").update(token).digest("hex");

    const tokenDoc = await PasswordResetToken.create({
      user: user._id,
      tokenHash,
      rateLimit: 1,
      expiresAt: new Date(Date.now() + 15 * 60 * 1000), // 15 min expiry
    });
    // Send email with token
    const resetLink = `${process.env.FRONTEND_URL}/reset-password/${token}`;
    await sendPasswordResetEmail(user.email, resetLink, user.username);

    res.status(200).json({ message: "Password reset link sent successfully" });
  } catch (error) {
    res.status(500).json({
      message: "Failed to request password reset",
      error: error.message,
    });
  }
};

export const resetPassword = async (req, res) => {
  try {
    const { token, newPassword } = req.body;

    const tokenHash = crypto.createHash("sha256").update(token).digest("hex");

    const tokenDoc = await PasswordResetToken.findOne({
      tokenHash,
      used: false,
      expiresAt: { $gt: new Date() },
    }).populate("user");

    if (!tokenDoc) {
      return res.status(400).json({ message: "Invalid or expired token" });
    }

    const user = tokenDoc.user;

    //hash password
    const salt = await bcrypt.genSalt(10);
    user.password = await bcrypt.hash(newPassword, salt);

    await user.save();

    //update the token status to used
    tokenDoc.used = true;
    tokenDoc.save();

    res.status(200).json({ message: "Password reset successful" });
  } catch (error) {
    res.status(500).json({
      message: "Failed to request password reset",
      error: error.message,
    });
  }
};

export const changePassword = async (req, res) => {
  try {
    const { password, newPassword } = req.body;

    if (!password || !newPassword) {
      return res
        .status(400)
        .json({ message: "Both old and new passwords are required" });
    }

    const user = await User.findOne(req.user._id);

    if (!user) return res.status(404).json({ message: "user not found" });

    const match = await bcrypt.compare(password, user.password);

    if (!match) return res.status(400).send({ message: "Invalid credentials" });

    const salt = await bcrypt.genSalt(10);
    user.password = await bcrypt.hash(newPassword, salt);

    await user.save();

    res.status(200).json({ message: "Password changed successfully" });
  } catch (error) {
    res
      .status(500)
      .json({ message: "Failed to change password", error: error.message });
  }
};
