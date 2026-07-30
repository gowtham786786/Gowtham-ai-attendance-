import { useState } from 'react';
import StudentManagement from './StudentManagement';
import FacultyManagement from './FacultyManagement';
import { FaUserGraduate, FaChalkboardTeacher } from 'react-icons/fa';
import { Link } from 'react-router-dom';

const UserManagement = () => {
  const [activeTab, setActiveTab] = useState('students');

  return (
    <div className="space-y-6">
      {/* Top Header & Tab Controls */}
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700 p-4">
        <div className="flex flex-col sm:flex-row justify-between items-center space-y-4 sm:space-y-0">
          <div>
            <h2 className="text-xl font-bold text-gray-800 dark:text-white">Smart Attendance User Management</h2>
            <p className="text-sm text-gray-500">Manage all university students and faculty efficiently.</p>
          </div>
          
          <div className="flex bg-gray-100 dark:bg-gray-700 p-1 rounded-lg">
            <button
              onClick={() => setActiveTab('students')}
              className={`flex items-center space-x-2 px-6 py-2 rounded-md text-sm font-medium transition-all ${
                activeTab === 'students' 
                  ? 'bg-white dark:bg-gray-800 text-primary shadow-sm' 
                  : 'text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300'
              }`}
            >
              <FaUserGraduate />
              <span>Students</span>
            </button>
            <button
              onClick={() => setActiveTab('faculty')}
              className={`flex items-center space-x-2 px-6 py-2 rounded-md text-sm font-medium transition-all ${
                activeTab === 'faculty' 
                  ? 'bg-white dark:bg-gray-800 text-primary shadow-sm' 
                  : 'text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300'
              }`}
            >
              <FaChalkboardTeacher />
              <span>Faculty</span>
            </button>
          </div>
        </div>
      </div>

      {/* Render Active Component */}
      <div className="transition-all duration-300 ease-in-out">
        {activeTab === 'students' ? <StudentManagement /> : <FacultyManagement />}
      </div>
    </div>
  );
};

export default UserManagement;
