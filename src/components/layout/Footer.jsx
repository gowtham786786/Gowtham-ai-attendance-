import React from 'react';

const Footer = () => {
  return (
    <footer className="bg-white dark:bg-gray-800 border-t border-gray-200 dark:border-gray-700 py-4 px-6 mt-auto">
      <div className="flex flex-col md:flex-row justify-between items-center text-sm text-gray-500 dark:text-gray-400">
        <div>
          &copy; {new Date().getFullYear()} Smart Attendance System. All Rights Reserved.
        </div>
        <div className="mt-2 md:mt-0 flex space-x-4">
          <a href="#" className="hover:text-primary transition-colors">Privacy Policy</a>
          <a href="#" className="hover:text-primary transition-colors">Terms of Service</a>
          <span>v2.0 Beta</span>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
