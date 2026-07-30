const functions = require("firebase-functions");
const admin = require("firebase-admin");
const nodemailer = require("nodemailer");
const cors = require("cors")({ origin: true });

admin.initializeApp();

const transporter = nodemailer.createTransport({
  service: "gmail",
  auth: {
    user: process.env.SMTP_EMAIL || "test@example.com",
    pass: process.env.SMTP_PASSWORD || "password",
  },
});

exports.sendOTP = functions.https.onCall(async (data, context) => {
  const { email, otp } = data;
  
  if (!email || !otp) {
    throw new functions.https.HttpsError(
      "invalid-argument",
      "Email and OTP are required"
    );
  }

  const mailOptions = {
    from: "Anti-Gravity AI <noreply@antigravity.edu>",
    to: email,
    subject: "Your OTP for Smart Attendance System",
    html: `
      <div style="font-family: Arial, sans-serif; padding: 20px; color: #333;">
        <h2>Verify Your Login</h2>
        <p>Your One Time Password (OTP) is:</p>
        <h1 style="color: #4CAF50; letter-spacing: 5px;">${otp}</h1>
        <p>This code will expire in 10 minutes.</p>
        <p>If you did not request this code, please ignore this email.</p>
      </div>
    `,
  };

  try {
    await transporter.sendMail(mailOptions);
    return { success: true, message: "OTP sent successfully" };
  } catch (error) {
    console.error("Error sending OTP email:", error);
    throw new functions.https.HttpsError("internal", "Failed to send OTP");
  }
});

exports.sendAttendanceAlert = functions.https.onCall(async (data, context) => {
  return { success: true };
});
