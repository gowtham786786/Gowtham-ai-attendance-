const transporter = require('../config/mailer');

const generateOTP = () => {
  return Math.floor(100000 + Math.random() * 900000).toString();
};

const sendOTPEmail = async (email, otp) => {
  const mailOptions = {
    from: `"Smart Attendance System" <${process.env.EMAIL_USER}>`,
    to: email,
    subject: 'Smart Attendance Verification Code',
    html: `
      <div style="font-family: Arial, sans-serif; max-w-md; margin: 0 auto; padding: 20px; border: 1px solid #e2e8f0; border-radius: 10px; background-color: #f8fafc;">
        <div style="text-align: center; margin-bottom: 20px;">
          <h1 style="color: #10b981; margin: 0;">AI</h1>
          <h3 style="color: #334155; margin-top: 5px;">Smart Attendance Portal</h3>
        </div>
        <div style="background-color: white; padding: 20px; border-radius: 8px; box-shadow: 0 1px 3px rgba(0,0,0,0.1);">
          <p style="color: #475569; font-size: 16px;">Hello,</p>
          <p style="color: #475569; font-size: 16px;">Here is your verification code to register for the Smart Attendance System:</p>
          <div style="text-align: center; margin: 30px 0;">
            <span style="font-size: 32px; font-weight: bold; letter-spacing: 5px; color: #0f172a; background-color: #f1f5f9; padding: 10px 20px; border-radius: 8px;">
              ${otp}
            </span>
          </div>
          <p style="color: #ef4444; font-size: 14px; text-align: center; font-weight: bold;">
            This code will expire in 5 minutes.
          </p>
        </div>
        <p style="color: #94a3b8; font-size: 12px; text-align: center; margin-top: 20px;">
          If you did not request this code, please ignore this email. Do not share this code with anyone.
        </p>
      </div>
    `
  };

  try {
    const info = await transporter.sendMail(mailOptions);
    console.log('OTP Email sent: %s', info.messageId);
    
    // Specifically for Ethereal test accounts, log the URL to view the email
    const nodemailer = require('nodemailer');
    const previewUrl = nodemailer.getTestMessageUrl(info);
    if (previewUrl) {
      console.log('----------------------------------------------------');
      console.log('📧 TEST EMAIL PREVIEW URL:');
      console.log(previewUrl);
      console.log('----------------------------------------------------');
    }
    
    return true;
  } catch (error) {
    console.error('Error sending OTP email:', error);
    throw error;
  }
};

module.exports = {
  generateOTP,
  sendOTPEmail
};
