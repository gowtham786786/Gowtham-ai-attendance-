import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { yupResolver } from '@hookform/resolvers/yup';
import * as yup from 'yup';
import { setDoc, doc } from 'firebase/firestore';
import { db } from '../../firebase/config';
import { loginUser, logoutUser } from '../../services/authService';
import { getAuth, sendPasswordResetEmail } from 'firebase/auth';
import { toast } from 'react-toastify';
import { useNavigate, Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { sendOTP, verifyOTP } from '../../api/otpService';

const loginSchema = yup.object().shape({
  email: yup.string().email('Invalid email').required('Email is required'),
  password: yup.string().required('Password is required'),
});

const LoginForm = ({ role, title }) => {
  const [step, setStep] = useState(1); // 1: Login, 2: OTP
  const [loading, setLoading] = useState(false);
  const [generatedOtp, setGeneratedOtp] = useState('');
  const [otpInput, setOtpInput] = useState('');
  const [resetEmail, setResetEmail] = useState('');
  const navigate = useNavigate();

  const { register, handleSubmit, getValues, formState: { errors } } = useForm({
    resolver: yupResolver(loginSchema)
  });

  const onSubmit = async (data) => {
    setLoading(true);
    try {
      // 1. Sign in with Firebase Auth and Verify Role via Service
      const user = await loginUser(data.email, data.password, role);

      if (role === 'student') {
        toast.success('Login successful!');
        navigate(`/student/dashboard`);
      } else {
        // 2. Generate and send OTP via Backend
        const response = await sendOTP(data.email, user.displayName, role, 'login');
        
        toast.success(response.message || 'OTP sent to your email!');
        setStep(2);
      }
    } catch (error) {
      console.error(error);
      toast.error(error.message || 'Login failed');
      await logoutUser();
    } finally {
      setLoading(false);
    }
  };

  const verifyOtp = async () => {
    setLoading(true);
    try {
      const email = getValues('email');
      await verifyOTP(email, otpInput);
      toast.success('Login successful!');
      navigate(`/${role}/dashboard`);
    } catch (error) {
      toast.error(error.response?.data?.error || 'Invalid OTP. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleForgotPassword = async () => {
    if (!resetEmail) {
      toast.error('Please enter your email address to reset password.');
      return;
    }
    setLoading(true);
    try {
      const auth = getAuth();
      await sendPasswordResetEmail(auth, resetEmail);
      toast.success('Password reset email sent! Check your inbox.');
      setStep(1); // Go back to login
    } catch (error) {
      console.error(error);
      if (error.code === 'auth/user-not-found') {
         toast.error('No account found with this email.');
      } else {
         toast.error('Failed to send reset email. ' + error.message);
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-[80vh] flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8">
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="max-w-md w-full space-y-8 glass-card p-8 rounded-2xl"
      >
        <div>
          <h2 className="mt-6 text-center text-3xl font-extrabold text-gray-900 dark:text-white">
            {title}
          </h2>
        </div>

        {step === 1 ? (
          <form className="mt-8 space-y-6" onSubmit={handleSubmit(onSubmit)}>
            <div className="rounded-md shadow-sm space-y-4">
              <div>
                <label className="sr-only">Email address</label>
                <input
                  {...register('email')}
                  type="email"
                  className="input-field"
                  placeholder="Email address"
                />
                {errors.email && <p className="text-red-500 text-xs mt-1">{errors.email.message}</p>}
              </div>
              <div>
                <label className="sr-only">Password</label>
                <input
                  {...register('password')}
                  type="password"
                  className="input-field"
                  placeholder="Password"
                />
                {errors.password && <p className="text-red-500 text-xs mt-1">{errors.password.message}</p>}
              </div>
            </div>

            <div>
              <button
                type="submit"
                disabled={loading}
                className="group relative w-full flex justify-center btn-primary"
              >
                {loading ? 'Authenticating...' : 'Sign in'}
              </button>
            </div>
            
            <div className="flex items-center justify-between mt-4">
              <div className="text-sm">
                <button type="button" onClick={() => setStep(3)} className="font-medium text-primary hover:text-primary-dark">
                  Forgot your password?
                </button>
              </div>
            </div>
            
            <div className="text-center space-y-2 flex flex-col">
              {role !== 'admin' && (
                <Link to={`/${role}/register`} className="text-sm text-gray-600 hover:text-primary">
                  Don't have an account? <span className="font-semibold">Register here</span>
                </Link>
              )}
              <Link to="/" className="text-sm text-primary hover:text-primary-dark">
                &larr; Back to Home
              </Link>
            </div>
          </form>
        ) : step === 2 ? (
          <div className="mt-8 space-y-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                Enter 6-digit OTP sent to your email
              </label>
              <input
                type="text"
                maxLength={6}
                value={otpInput}
                onChange={(e) => setOtpInput(e.target.value)}
                className="mt-1 input-field text-center tracking-widest text-2xl"
                placeholder="------"
              />
            </div>
            <button
              onClick={verifyOtp}
              disabled={otpInput.length !== 6 || loading}
              className="w-full flex justify-center btn-primary disabled:opacity-50"
            >
              {loading ? 'Verifying...' : 'Verify OTP'}
            </button>
            <button
              onClick={async () => {
                await logoutUser();
                setStep(1);
              }}
              className="w-full text-sm text-gray-500 hover:text-gray-700 dark:hover:text-gray-300 text-center"
            >
              Cancel and Sign out
            </button>
          </div>
        ) : step === 3 ? (
          <div className="mt-8 space-y-6">
            <div>
              <p className="text-sm text-gray-600 dark:text-gray-400 mb-4 text-center">
                Enter your email address and we will send you a link to reset your password.
              </p>
              <label className="sr-only">Email address</label>
              <input
                type="email"
                value={resetEmail}
                onChange={(e) => setResetEmail(e.target.value)}
                className="input-field"
                placeholder="Email address"
              />
            </div>
            <div className="flex flex-col space-y-3">
              <button
                onClick={handleForgotPassword}
                disabled={loading}
                className="w-full flex justify-center btn-primary"
              >
                {loading ? 'Sending...' : 'Send Reset Link'}
              </button>
              <button
                onClick={() => setStep(1)}
                className="w-full text-sm text-gray-500 hover:text-gray-700 dark:hover:text-gray-300 text-center"
              >
                Back to Login
              </button>
            </div>
          </div>
        ) : null}
      </motion.div>
    </div>
  );
};

export default LoginForm;
