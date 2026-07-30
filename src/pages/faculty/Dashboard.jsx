import React, { useState } from 'react';
import DashboardLayout from '../../components/layout/DashboardLayout';
import { useFaculty } from '../../context/FacultyContext';
import DashboardHome from './components/DashboardHome';
import FacultyProfile from './components/FacultyProfile';
import StudentList from './components/StudentList';
import AttendanceHistory from './components/AttendanceHistory';
import FacultyAnalytics from './components/FacultyAnalytics';
import StartAttendance from './components/StartAttendance';
import { FaHome, FaUser, FaUsers, FaHistory, FaChartPie } from 'react-icons/fa';

const FacultyDashboard = () => {
  const { facultyData, loading } = useFaculty();
  const [activeTab, setActiveTab] = useState('home');
  const [activeSession, setActiveSession] = useState(null);

  const tabs = [
    { id: 'home', label: 'Home', icon: <FaHome /> },
    { id: 'profile', label: 'Profile', icon: <FaUser /> },
    { id: 'students', label: 'My Students', icon: <FaUsers /> },
    { id: 'attendance', label: 'Attendance History', icon: <FaHistory /> },
    { id: 'analytics', label: 'Analytics', icon: <FaChartPie /> },
  ];

  if (loading || !facultyData) {
    return (
      <DashboardLayout tabs={tabs} activeTab={activeTab} onTabChange={setActiveTab}>
        <div className="py-20 flex flex-col justify-center items-center text-gray-500">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mb-4"></div>
          <span>Loading Dashboard...</span>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout 
      tabs={tabs} 
      activeTab={activeTab} 
      onTabChange={(tab) => { setActiveTab(tab); setActiveSession(null); }}
    >
      <div className="space-y-8">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Faculty Dashboard</h1>
          <p className="mt-2 text-gray-600 dark:text-gray-400">
            Welcome back, Prof. {facultyData.name}. Here is your schedule and quick actions.
          </p>
        </div>
        
        {activeTab === 'home' && !activeSession && (
          <DashboardHome onStartAttendance={(cls) => setActiveSession(cls)} />
        )}
        
        {activeTab === 'home' && activeSession && (
          <div className="space-y-4">
            <button 
              onClick={() => setActiveSession(null)}
              className="text-primary hover:text-primary-dark font-medium flex items-center space-x-2"
            >
              <span>&larr; Back to Dashboard Home</span>
            </button>
            <StartAttendance sessionData={activeSession} onComplete={() => setActiveSession(null)} />
          </div>
        )}
        
        {activeTab === 'profile' && <FacultyProfile />}
        {activeTab === 'students' && <StudentList />}
        {activeTab === 'attendance' && <AttendanceHistory />}
        {activeTab === 'analytics' && <FacultyAnalytics />}
      </div>
    </DashboardLayout>
  );
};

export default FacultyDashboard;
