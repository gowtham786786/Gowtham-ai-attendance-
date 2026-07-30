const crypto = require('crypto');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const fs = require('fs');
const path = require('path');
const { db } = require('../config/firebase-admin');
const transporter = require('../config/mailer');

// Regex for email validation
const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

// Utility functions
const sanitizeEmail = (email) => email.replace(/[@.]/g, '_');
const generateOTP = () => crypto.randomInt(100000, 999999).toString();
const hashOTP = async (otp) => await bcrypt.hash(otp, 10);
const verifyOTP = async (inputOTP, hashedOTP) => await bcrypt.compare(inputOTP, hashedOTP);

exports.sendOTP = async (req, res) => {
  try {
    const { email, name, type, context = 'register' } = req.body;

    if (!email || !type || (!name && context !== 'login')) {
      return res.status(400).json({ error: 'Missing required fields' });
    }
    
    const displayName = name || 'User';

    if (!emailRegex.test(email)) {
      return res.status(400).json({ error: 'Invalid email format' });
    }

    const sanitizedEmail = sanitizeEmail(email);
    
    // 2. Generate and Hash OTP
    const rawOTP = generateOTP();
    const hashed = await hashOTP(rawOTP);
    const now = new Date();
    const expiresAt = new Date(now.getTime() + 5 * 60000); // 5 minutes

    // 3. Save to Firestore (or memory if Firebase is broken)
    global.otpCache = global.otpCache || new Map();
    
    try {
      // Check for duplicates in students/faculty/admin collection
      let existingUser;
      if (type === 'admin') {
        existingUser = await db.collection('users').where('email', '==', email).where('role', '==', 'admin').get();
      } else {
        const collectionName = type === 'student' ? 'students' : 'faculty';
        existingUser = await db.collection(collectionName).where('email', '==', email).get();
      }
      
      if (context === 'login') {
        if (existingUser.empty) {
          return res.status(400).json({ error: `No ${type} account found with this email` });
        }
      } else {
        if (!existingUser.empty) {
          return res.status(400).json({ error: `${type} with this email already exists` });
        }
      }

      const otpRef = db.collection('otp_requests').doc(sanitizedEmail);
      const otpDoc = await otpRef.get();

      let resendCount = 0;
      if (otpDoc.exists) {
        const data = otpDoc.data();
        if (data.resendCount >= 3) {
          return res.status(400).json({ error: 'Maximum resend limit reached. Contact support.' });
        }
        resendCount = data.resendCount;
      }

      await otpRef.set({
        email,
        otp: hashed,
        createdAt: now,
        expiresAt: expiresAt,
        verified: false,
        attempts: 0,
        resendCount: resendCount,
        type
      });
      console.log(`[OTP]      Saved to Firestore for ${email}`);
    } catch (dbError) {
      console.warn(`[OTP] ⚠️ Firebase error (${dbError.message}). Falling back to memory cache.`);
      global.otpCache.set(sanitizedEmail, {
        email,
        otp: hashed,
        expiresAt: expiresAt,
        verified: false,
        attempts: 0,
        type
      });
    }

    console.log(`[OTP]      Generated for ${email}`);
    


    // 4. Send Email
    const templatePath = path.join(__dirname, '../templates/otpEmail.html');
    const template = fs.readFileSync(templatePath, 'utf8');
    const html = template
      .replace('{{NAME}}', displayName)
      .replace('{{OTP}}', rawOTP)
      .replace('{{EXPIRY}}', '5 minutes');

    console.log(`[EMAIL]    Sending to ${email}...`);
    
    const mailOptions = {
      from: `"Smart Attendance" <${process.env.EMAIL_USER}>`,
      to: email,
      subject: 'Your Smart Attendance Verification Code',
      html
    };

    const info = await transporter.sendMail(mailOptions);
    console.log(`[EMAIL]    ✓ Sent successfully (messageId: ${info.messageId})`);

    res.status(200).json({ success: true, message: 'OTP sent successfully' });

  } catch (error) {
    console.error(`[EMAIL]    ✗ Failed:`, error.message);
    
    // Detailed SMTP Error Mapping for Frontend
    let userMessage = "Failed to send email. Check server logs.";
    if (error.code === "EAUTH" || error.responseCode === 535) {
      userMessage = "Email authentication failed. Please check the Gmail App Password in .env";
    } else if (error.code === "ECONNREFUSED" || error.code === "ETIMEDOUT") {
      userMessage = "Cannot connect to Gmail SMTP. Check internet or firewall.";
    } else if (error.message && error.message.includes("Missing credentials")) {
      userMessage = "EMAIL_USER or EMAIL_PASS is missing in the backend .env";
    }

    res.status(500).json({ error: userMessage, debug: error.message });
  }
};

exports.verifyOTPCode = async (req, res) => {
  try {
    const { email, otp } = req.body;
    
    if (!email || !otp) {
      return res.status(400).json({ error: 'Email and OTP are required' });
    }

    console.log(`[VERIFY]   Attempt for ${email}`);
    const sanitizedEmail = sanitizeEmail(email);
    let data;
    let fromMemory = false;
    const otpRef = db.collection('otp_requests').doc(sanitizedEmail);

    try {
      const otpDoc = await otpRef.get();
      if (!otpDoc.exists) {
        return res.status(400).json({ error: 'No OTP request found for this email' });
      }
      data = otpDoc.data();
    } catch (dbError) {
      if (global.otpCache && global.otpCache.has(sanitizedEmail)) {
        data = global.otpCache.get(sanitizedEmail);
        fromMemory = true;
      } else {
        return res.status(400).json({ error: 'No OTP request found (Firebase unavailable and memory empty)' });
      }
    }

    if (data.verified) {
      return res.status(400).json({ error: 'OTP already used. Please request a new one.' });
    }

    if (data.attempts >= 5) {
      return res.status(400).json({ error: 'Maximum attempts exceeded. Request a new OTP.' });
    }

    const now = new Date();
    // In memory we have Date objects, Firestore returns Timestamps that need .toDate()
    const expiry = data.expiresAt.toDate ? data.expiresAt.toDate() : data.expiresAt;
    
    if (now > expiry) {
      return res.status(400).json({ error: 'OTP has expired. Please request a new one.' });
    }

    const isMatch = await verifyOTP(otp, data.otp);
    
    if (!isMatch) {
      const newAttempts = data.attempts + 1;
      if (fromMemory) {
        data.attempts = newAttempts;
        global.otpCache.set(sanitizedEmail, data);
      } else {
        await otpRef.update({ attempts: newAttempts });
      }
      return res.status(400).json({ error: `Incorrect OTP. ${5 - newAttempts} attempts remaining.` });
    }

    // Success
    if (fromMemory) {
      global.otpCache.delete(sanitizedEmail);
    } else {
      await otpRef.update({
        verified: true,
        otp: null // Clear OTP immediately
      });
    }

    console.log(`[VERIFY]   ✓ OTP verified for ${email}`);

    // Generate JWT token for registration endpoint
    const sessionToken = jwt.sign(
      { email, type: data.type }, 
      process.env.JWT_SECRET || 'super_secret_jwt_key_32_chars_long', 
      { expiresIn: '15m' }
    );

    res.status(200).json({ success: true, token: sessionToken });

  } catch (error) {
    console.error(`[VERIFY]   ✗ Error:`, error.message);
    res.status(500).json({ error: 'Verification failed' });
  }
};

exports.resendOTP = async (req, res) => {
  try {
    const { email, name, type } = req.body;
    const sanitizedEmail = sanitizeEmail(email);
    const otpRef = db.collection('otp_requests').doc(sanitizedEmail);
    const otpDoc = await otpRef.get();

    if (!otpDoc.exists) {
      return res.status(400).json({ error: 'No existing OTP request to resend.' });
    }

    const data = otpDoc.data();
    if (data.resendCount >= 3) {
      return res.status(400).json({ error: 'Maximum resend limit reached. Contact support.' });
    }

    const rawOTP = generateOTP();
    const hashed = await hashOTP(rawOTP);
    const now = new Date();
    const expiresAt = new Date(now.getTime() + 5 * 60000);

    await otpRef.update({
      otp: hashed,
      createdAt: now,
      expiresAt: expiresAt,
      attempts: 0,
      resendCount: data.resendCount + 1,
      verified: false
    });

    console.log(`[OTP]      Resent for ${email}`);
    

    
    // Resend Email
    const templatePath = path.join(__dirname, '../templates/otpEmail.html');
    const template = fs.readFileSync(templatePath, 'utf8');
    const html = template
      .replace('{{NAME}}', name)
      .replace('{{OTP}}', rawOTP)
      .replace('{{EXPIRY}}', '5 minutes');

    const mailOptions = {
      from: `"Smart Attendance" <${process.env.EMAIL_USER}>`,
      to: email,
      subject: 'Your Smart Attendance Verification Code (Resend)',
      html
    };

    await transporter.sendMail(mailOptions);
    res.status(200).json({ success: true, message: 'OTP resent successfully' });

  } catch (error) {
    console.error(`[EMAIL]    ✗ Resend Failed:`, error.message);
    res.status(500).json({ error: 'Failed to resend OTP' });
  }
};
