require("dotenv").config();

const transporter = {
  sendMail: async (mailOptions) => {
    try {
      const response = await fetch("https://api.brevo.com/v3/smtp/email", {
        method: "POST",
        headers: {
          "accept": "application/json",
          "api-key": process.env.BREVO_API_KEY,
          "content-type": "application/json"
        },
        body: JSON.stringify({
          sender: { name: "Smart Attendance System", email: process.env.EMAIL_USER || "attendancesystem786@gmail.com" },
          to: [{ email: mailOptions.to }],
          subject: mailOptions.subject,
          htmlContent: mailOptions.html
        })
      });
      
      const data = await response.json();
      
      if (!response.ok) {
        console.error("[Mailer] ✗ Brevo API FAILED:", data);
        throw new Error(data.message || "Failed to send email");
      }
      
      console.log("[Mailer] ✓ Email sent via Brevo successfully", data);
      return data;
    } catch (err) {
      console.error("[Mailer] Full error:", err);
      throw err;
    }
  }
};

module.exports = transporter;
