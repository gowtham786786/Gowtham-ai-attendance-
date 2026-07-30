const express = require('express');
const router = express.Router();

const otpController = require('../controllers/otp.controller');
const registerController = require('../controllers/register.controller');

// OTP Flow
router.post('/send-otp', otpController.sendOTP);
router.post('/verify-otp', otpController.verifyOTPCode);
router.post('/resend-otp', otpController.resendOTP);

// Verified Registration Flow
router.post('/register-student', registerController.registerStudent);
router.post('/register-faculty', registerController.registerFaculty);

module.exports = router;
