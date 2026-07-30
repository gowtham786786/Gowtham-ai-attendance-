import React, { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { yupResolver } from '@hookform/resolvers/yup';
import * as yup from 'yup';
import { toast } from 'react-toastify';
import { useNavigate, Link } from 'react-router-dom';
import { sendOTP, verifyOTP, resendOTP, registerStudent } from '../../api/otpService';
import OTPInput from '../../components/OTPInput';
import { signInWithEmailAndPassword } from 'firebase/auth';
import { auth } from '../../firebase/config';

const studentSchema = yup.object().shape({
  name: yup.string().required('Name is required'),
  studentId: yup.string().required('Student ID is required'),
  email: yup.string().email('Invalid email').required('Email is required'),
  phone: yup.string().required('Phone number is required'),
  branch: yup.string().required('Branch is required'),
  year: yup.string().required('Year is required'),
  section: yup.string().required('Section is required'),
  gender: yup.string().required('Gender is required'),
  password: yup.string().min(6, 'Minimum 6 characters').required('Password is required'),
});

const StudentRegister = () => {
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState(null);
  
  // OTP State
  const [otpValue, setOtpValue] = useState('');
  const [otpVerified, setOtpVerified] = useState(false);
  const [verifyToken, setVerifyToken] = useState(null);
  const [countdown, setCountdown] = useState(300); // 5 minutes
  const [resendCount, setResendCount] = useState(0);

  const navigate = useNavigate();

  const { register, handleSubmit, formState: { errors, isValid } } = useForm({
    resolver: yupResolver(studentSchema),
    mode: 'onChange'
  });

  // Timer logic
  useEffect(() => {
    let timer;
    if (step === 2 && countdown > 0 && !otpVerified) {
      timer = setInterval(() => setCountdown((prev) => prev - 1), 1000);
    }
    return () => clearInterval(timer);
  }, [step, countdown, otpVerified]);

  const onSendOtp = async (data) => {
    setLoading(true);
    try {
      await sendOTP(data.email, data.name, 'student');
      toast.success(`OTP sent to ${data.email}`);
      setFormData(data);
      setStep(2);
      setCountdown(300);
    } catch (err) {
      const serverMsg = err.response?.data?.error;
      const debugMsg = err.response?.data?.debug;
      console.error('Send OTP failed:', debugMsg || err.message);
      toast.error(serverMsg || 'Failed to send OTP');
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyOTP = async () => {
    if (otpValue.length !== 6) {
      toast.error('Please enter a 6-digit OTP');
      return;
    }
    
    setLoading(true);
    try {
      const res = await verifyOTP(formData.email, otpValue);
      setOtpVerified(true);
      setVerifyToken(res.data.token);
      toast.success('✓ Email verified successfully');
    } catch (err) {
      toast.error(err.response?.data?.error || 'Verification failed');
    } finally {
      setLoading(false);
    }
  };

  const handleResendOTP = async () => {
    if (resendCount >= 3) {
      toast.error('Maximum resend limit reached.');
      return;
    }

    setLoading(true);
    try {
      await resendOTP(formData.email, formData.name, 'student');
      toast.success('New OTP sent!');
      setCountdown(300);
      setResendCount(prev => prev + 1);
    } catch (err) {
      toast.error(err.response?.data?.error || 'Failed to resend OTP');
    } finally {
      setLoading(false);
    }
  };

  const handleCompleteRegistration = async () => {
    if (!otpVerified || !verifyToken) return;

    setLoading(true);
    try {
      await registerStudent(formData, verifyToken);
      toast.success('Registration successful!');
      
      // Sign in client side
      await signInWithEmailAndPassword(auth, formData.email, formData.password);
      
      // Redirect to face registration for mandatory onboarding
      navigate('/student/face-registration'); 
    } catch (err) {
      toast.error(err.response?.data?.error || 'Failed to complete registration');
    } finally {
      setLoading(false);
    }
  };

  const formatTime = (seconds) => {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m}:${s < 10 ? '0' : ''}${s}`;
  };

  const canResend = countdown === 0 || countdown <= 240; // 60 seconds passed

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-2xl w-full space-y-8 bg-white dark:bg-gray-800 p-8 rounded-2xl shadow-xl">
        <div>
          <h2 className="text-center text-3xl font-extrabold text-gray-900 dark:text-white">
            Student Registration
          </h2>
        </div>

        {step === 1 && (
          <form className="space-y-6" onSubmit={handleSubmit(onSendOtp)}>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Full Name</label>
                <input {...register('name')} className="input-field mt-1" />
                {errors.name && <p className="text-red-500 text-xs mt-1">{errors.name.message}</p>}
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Student ID</label>
                <input {...register('studentId')} className="input-field mt-1" />
                {errors.studentId && <p className="text-red-500 text-xs mt-1">{errors.studentId.message}</p>}
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Email Address</label>
                <input type="email" {...register('email')} className="input-field mt-1" />
                {errors.email && <p className="text-red-500 text-xs mt-1">{errors.email.message}</p>}
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Phone</label>
                <input {...register('phone')} className="input-field mt-1" />
                {errors.phone && <p className="text-red-500 text-xs mt-1">{errors.phone.message}</p>}
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Branch</label>
                <select {...register('branch')} className="input-field mt-1 cursor-pointer">
                  <option value="">Select Branch</option>
                  <option value="CSE">CSE</option>
                  <option value="IT">IT</option>
                  <option value="ECE">ECE</option>
                  <option value="AIDS">AIDS</option>
                </select>
                {errors.branch && <p className="text-red-500 text-xs mt-1">{errors.branch.message}</p>}
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Year</label>
                <select {...register('year')} className="input-field mt-1 cursor-pointer">
                  <option value="">Select Year</option>
                  <option value="1">1st Year</option>
                  <option value="2">2nd Year</option>
                  <option value="3">3rd Year</option>
                  <option value="4">4th Year</option>
                </select>
                {errors.year && <p className="text-red-500 text-xs mt-1">{errors.year.message}</p>}
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Section</label>
                <select {...register('section')} className="input-field mt-1 cursor-pointer">
                  <option value="">Select Section</option>
                  {['A','B','C','D','E','F'].map(s => <option key={s} value={s}>{s}</option>)}
                </select>
                {errors.section && <p className="text-red-500 text-xs mt-1">{errors.section.message}</p>}
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Gender</label>
                <select {...register('gender')} className="input-field mt-1 cursor-pointer">
                  <option value="">Select Gender</option>
                  <option value="Male">Male</option>
                  <option value="Female">Female</option>
                </select>
                {errors.gender && <p className="text-red-500 text-xs mt-1">{errors.gender.message}</p>}
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Create Password</label>
              <input type="password" {...register('password')} className="input-field mt-1" />
              {errors.password && <p className="text-red-500 text-xs mt-1">{errors.password.message}</p>}
            </div>

            <button
              type="submit"
              disabled={loading || !isValid}
              className="w-full flex justify-center py-3 btn-primary disabled:opacity-50 mt-6"
            >
              {loading ? 'Processing...' : 'Send OTP'}
            </button>
            <div className="text-center mt-4">
              <Link to="/student/login" className="text-sm text-primary hover:underline">Already have an account? Login</Link>
            </div>
          </form>
        )}

        {step === 2 && (
          <div className="space-y-6 pt-6 text-center">
            <h3 className="text-xl font-bold text-gray-800 dark:text-white">Email Verification</h3>
            <p className="text-gray-600 dark:text-gray-300 text-sm">
              OTP sent to <strong>{formData?.email}</strong>
            </p>

            <OTPInput 
              value={otpValue} 
              onChange={setOtpValue} 
              disabled={otpVerified || loading || countdown === 0} 
            />

            {!otpVerified && (
              <div className="flex flex-col items-center justify-center my-4">
                <p className={`text-xl font-mono font-bold mb-2 ${countdown <= 60 ? 'text-red-500' : 'text-gray-800 dark:text-white'}`}>
                  {countdown > 0 ? `OTP expires in ${formatTime(countdown)}` : 'OTP expired. Please resend.'}
                </p>
                <p className="text-sm text-gray-500">Resends left: {3 - resendCount}/3</p>
                
                <button
                  onClick={handleResendOTP}
                  disabled={!canResend || resendCount >= 3 || loading}
                  className="mt-3 text-sm text-primary font-semibold disabled:text-gray-400 hover:underline"
                >
                  Resend OTP
                </button>
              </div>
            )}

            {otpVerified && (
              <div className="text-green-500 font-bold text-lg my-4">
                ✓ Email verified successfully
              </div>
            )}

            <div className="flex flex-col space-y-3 mt-6">
              {!otpVerified ? (
                <button
                  onClick={handleVerifyOTP}
                  disabled={loading || otpValue.length !== 6 || countdown === 0}
                  className="w-full py-3 btn-primary text-lg disabled:opacity-50"
                >
                  {loading ? 'Verifying...' : 'Verify OTP'}
                </button>
              ) : (
                <button
                  onClick={handleCompleteRegistration}
                  disabled={loading}
                  className="w-full py-3 bg-green-600 hover:bg-green-700 text-white font-bold rounded-lg text-lg disabled:opacity-50 transition-colors"
                >
                  {loading ? 'Registering...' : 'Complete Registration'}
                </button>
              )}
              
              {!otpVerified && (
                <button
                  onClick={() => setStep(1)}
                  className="text-sm text-gray-500 hover:text-gray-700 underline"
                >
                  Cancel and edit details
                </button>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default StudentRegister;
