import React from 'react';
import { FaArrowLeft, FaEnvelope, FaPhone, FaExclamationTriangle } from 'react-icons/fa';
import DashboardCard from '../../../components/ui/DashboardCard';

const StudentDetails = ({ student, onBack }) => {
  return (
    <div className="space-y-6">
      <button 
        onClick={onBack}
        className="text-primary hover:text-primary-dark font-medium flex items-center space-x-2 bg-white dark:bg-gray-800 px-4 py-2 rounded-lg border border-gray-200 dark:border-gray-700 shadow-sm"
      >
        <FaArrowLeft /> <span>Back to Student List</span>
      </button>

      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-6 flex flex-col md:flex-row items-start md:items-center gap-6">
        <div className="h-24 w-24 rounded-full bg-primary/10 flex flex-shrink-0 items-center justify-center text-4xl text-primary font-bold">
          {student.name.charAt(0)}
        </div>
        <div className="flex-1">
          <div className="flex justify-between items-start">
            <div>
              <h2 className="text-2xl font-bold text-gray-900 dark:text-white">{student.name}</h2>
              <p className="text-gray-500 font-medium">ID: {student.studentId || 'N/A'}</p>
            </div>
            <div className={`px-4 py-2 rounded-lg font-bold text-lg ${student.attendancePct < 75 ? 'bg-red-100 text-red-700' : 'bg-green-100 text-green-700'}`}>
              {student.attendancePct}% Overall
            </div>
          </div>
          
          <div className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-4 text-sm text-gray-600 dark:text-gray-400">
             <div className="flex items-center space-x-2">
               <span className="font-semibold text-gray-800 dark:text-gray-200">Department:</span>
               <span>{student.department}</span>
             </div>
             <div className="flex items-center space-x-2">
               <span className="font-semibold text-gray-800 dark:text-gray-200">Year / Section:</span>
               <span>{student.year} / {student.section}</span>
             </div>
             <div className="flex items-center space-x-2">
               <FaEnvelope className="text-gray-400" />
               <span>{student.email}</span>
             </div>
             <div className="flex items-center space-x-2">
               <FaPhone className="text-gray-400" />
               <span>{student.phone || 'N/A'}</span>
             </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <DashboardCard title="Subject-wise Attendance">
          <p className="text-gray-500 italic p-4 text-center">No subject-wise data available for this demo.</p>
        </DashboardCard>

        <DashboardCard title="Recent Activity" actionButton={
          student.attendancePct < 75 && (
            <button className="bg-red-100 hover:bg-red-200 text-red-700 px-3 py-1.5 rounded-lg text-sm font-medium flex items-center space-x-1 transition-colors">
               <FaExclamationTriangle size={12} />
               <span>Send Warning</span>
            </button>
          )
        }>
          <p className="text-gray-500 italic p-4 text-center">No recent logs available for this demo.</p>
        </DashboardCard>
      </div>

    </div>
  );
};

export default StudentDetails;
