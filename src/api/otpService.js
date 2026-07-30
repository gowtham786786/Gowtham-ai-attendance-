import axios from 'axios';

const BASE = import.meta.env.VITE_BACKEND_URL || 'https://gowtham-ai-attendance-backend.onrender.com';

export const sendOTP = (email, name, type, context = 'register') =>
  axios.post(`${BASE}/api/send-otp`, { email, name, type, context });

export const verifyOTP = (email, otp) =>
  axios.post(`${BASE}/api/verify-otp`, { email, otp });

export const resendOTP = (email, name, type, context = 'register') =>
  axios.post(`${BASE}/api/resend-otp`, { email, name, type, context });

export const registerStudent = (formData, verificationToken) =>
  axios.post(`${BASE}/api/register-student`, { formData, verificationToken });

export const registerFaculty = (formData, verificationToken) =>
  axios.post(`${BASE}/api/register-faculty`, { formData, verificationToken });
