import nodemailer from "nodemailer";

import dotenv from "dotenv";

dotenv.config();

const transporter = nodemailer.createTransport({
  host: "smtp.gmail.com",
  port: 587,
  secure: false, // true for port 465, false for 587
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS
  }});
// Gene
// rate professional HTML template
const generatePasswordResetTemplate = (resetLink, username) => `
  <div style="font-family: Arial, sans-serif; max-width: 600px; margin: auto; padding: 20px; border: 1px solid #eee; border-radius: 10px;">
    <h2 style="color: #333;">Hello ${username},</h2>
    <p>You recently requested to reset your password.</p>
    <p>Click the button below to reset it:</p>
    <a href="${resetLink}" 
       style="display: inline-block; padding: 10px 20px; background-color: #4CAF50; color: #fff; text-decoration: none; border-radius: 5px; margin: 10px 0;">
      Reset Password
    </a>
    <p>If you didn’t request this, you can safely ignore this email.</p>
    <hr />
    <p style="font-size: 12px; color: #999;">This link will expire in 15 minutes.</p>
  </div>
`;

export const sendPasswordResetEmail = async (to, resetLink, username) => {
  const mailOptions = {
    from: process.env.EMAIL_USER,
    to,
    subject: "Reset Your Password",
    html: generatePasswordResetTemplate(resetLink, username),
  };

  try {
    await transporter.sendMail(mailOptions);
    console.log(`Password reset email sent to ${to}`);
  } catch (error) {
    console.error("Error sending email:", error);
    throw new Error("Failed to send password reset email");
  }
};
