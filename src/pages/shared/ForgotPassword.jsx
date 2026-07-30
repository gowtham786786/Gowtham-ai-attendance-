import React, { useState } from 'react';
import { useSearchParams, Link } from 'react-router-dom';
import { sendPasswordResetEmail } from 'firebase/auth';
import { auth } from '../../firebase/config';
import { toast } from 'react-toastify';

const ForgotPassword = () => {
  const [searchParams] = useSearchParams();
  const role = searchParams.get('role') || 'student';
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!email) {
      toast.error('Please enter your email');
      return;
    }

    setLoading(true);
    try {
      const loginUrl = `${window.location.origin}/${role}/login`;
      await sendPasswordResetEmail(auth, email, {
        url: loginUrl,
      });
      setSuccess(true);
      toast.success('Password reset email sent!');
    } catch (error) {
      console.error(error);
      toast.error(error.message || 'Failed to send reset email');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-8 bg-white dark:bg-gray-800 p-8 rounded-2xl shadow-xl">
        <div>
          <h2 className="text-center text-3xl font-extrabold text-gray-900 dark:text-white">
            Reset Password
          </h2>
          <p className="mt-2 text-center text-sm text-gray-600 dark:text-gray-300 capitalize">
            {role} Account
          </p>
        </div>

        {!success ? (
          <form className="space-y-6" onSubmit={handleSubmit}>
            <div>
              <label htmlFor="email" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                Email address
              </label>
              <div className="mt-1">
                <input
                  id="email"
                  name="email"
                  type="email"
                  autoComplete="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="input-field"
                  placeholder="Enter your registered email"
                />
              </div>
            </div>

            <div>
              <button
                type="submit"
                disabled={loading}
                className="w-full flex justify-center py-3 btn-primary disabled:opacity-50"
              >
                {loading ? 'Sending...' : 'Send Reset Link'}
              </button>
            </div>
            
            <div className="text-center">
              <Link to={`/${role}/login`} className="text-sm text-primary hover:underline">
                Back to Login
              </Link>
            </div>
          </form>
        ) : (
          <div className="text-center space-y-6">
            <div className="text-green-500 text-5xl flex justify-center">✓</div>
            <h3 className="text-xl font-bold text-gray-900 dark:text-white">Email Sent</h3>
            <p className="text-sm text-gray-600 dark:text-gray-300">
              A password reset link has been sent to <strong>{email}</strong>.
              Please check your inbox and spam folder.
            </p>
            
            <Link 
              to={`/${role}/login`}
              className="mt-6 block w-full py-3 btn-primary text-center"
            >
              Back to Login
            </Link>
          </div>
        )}
      </div>
    </div>
  );
};

export default ForgotPassword;
