
import React from 'react';
import { useNavigate } from 'react-router-dom';
import FaceRegistration from './components/FaceRegistration';
import { FaUserShield } from 'react-icons/fa';

const FaceRegistrationPage = () => {
  const navigate = useNavigate();

  const handleRegistrationComplete = (photoUrl) => {
    // The component handles updating Firestore, so we just redirect.
    setTimeout(() => {
      navigate('/student/dashboard');
    }, 1500); // Small delay to let toasts display and user digest success
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex flex-col items-center justify-center p-4">
      <div className="max-w-3xl w-full">
        
        {/* Header Section */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-blue-100 dark:bg-blue-900/50 text-blue-600 dark:text-blue-400 mb-4 shadow-inner">
            <FaUserShield size={32} />
          </div>
          <h1 className="text-3xl font-extrabold text-gray-900 dark:text-white mb-2">
            Final Step: Setup Face ID
          </h1>
          <p className="text-gray-600 dark:text-gray-400 text-lg">
            This is required to securely mark your attendance using AI.
          </p>
        </div>

        {/* Component */}
        <FaceRegistration onComplete={handleRegistrationComplete} />

        {/* Instructions */}
        <div className="mt-8 bg-white dark:bg-gray-800 rounded-xl p-6 shadow-md border border-gray-100 dark:border-gray-700">
          <h4 className="font-bold text-gray-800 dark:text-gray-200 mb-4">Tips for a good scan:</h4>
          <ul className="space-y-2 text-gray-600 dark:text-gray-400 text-sm list-disc list-inside">
            <li>Ensure you are in a well-lit environment.</li>
            <li>Look directly at the camera.</li>
            <li>Make sure only your face is visible in the frame.</li>
            <li>Remove masks or heavy sunglasses.</li>
          </ul>
        </div>
        
      </div>
    </div>
  );
};

export default FaceRegistrationPage;
