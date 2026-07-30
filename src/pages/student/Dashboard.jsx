import React, { useState } from 'react';
import DashboardLayout from '../../components/layout/DashboardLayout';
import { useStudent } from '../../context/StudentContext';
import { FaHome, FaUser, FaCalendarAlt, FaCheckSquare, FaChartPie, FaHistory } from 'react-icons/fa';

// Components
import StudentDashboardHome from './components/StudentDashboardHome';
import StudentProfile from './components/StudentProfile';
import StudentTimetable from './components/StudentTimetable';
import MarkAttendance from './components/MarkAttendance';
import AttendanceHistory from './components/AttendanceHistory';
import StudentAnalytics from './components/StudentAnalytics';

const StudentDashboard = () => {
  const { studentData } = useStudent();
  const [activeTab, setActiveTab] = useState('dashboard');

  const tabs = [
    { id: 'dashboard', label: 'Dashboard', icon: <FaHome /> },
    { id: 'profile', label: 'My Profile', icon: <FaUser /> },
    { id: 'timetable', label: 'My Timetable', icon: <FaCalendarAlt /> },
    { id: 'attendance', label: 'Mark Attendance', icon: <FaCheckSquare /> },
    { id: 'history', label: 'History', icon: <FaHistory /> },
    { id: 'analytics', label: 'Analytics', icon: <FaChartPie /> },
  ];

  return (
    <DashboardLayout tabs={tabs} activeTab={activeTab} onTabChange={setActiveTab}>
      <div className="h-full">
        {activeTab === 'dashboard' && <StudentDashboardHome />}
        {activeTab === 'profile' && <StudentProfile />}
        {activeTab === 'timetable' && <StudentTimetable />}
        {activeTab === 'attendance' && <MarkAttendance />}
        {activeTab === 'history' && <AttendanceHistory />}
        {activeTab === 'analytics' && <StudentAnalytics />}
      </div>
    </DashboardLayout>
  );
};

export default StudentDashboard;
