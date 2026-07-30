import { useState } from 'react';
import DashboardLayout from '../../components/layout/DashboardLayout';
import UserManagement from './components/UserManagement';
import TimetableManagement from './components/TimetableManagement';
import Analytics from './components/Analytics';
import Settings from './components/Settings';
import Overview from './components/Overview';
import AttendanceManagement from './components/AttendanceManagement';
import ApprovalManagement from './components/ApprovalManagement';
import { FaUsers, FaCalendarAlt, FaChartPie, FaCog, FaChartLine, FaCheckSquare, FaUserCheck } from 'react-icons/fa';

const AdminDashboard = () => {
  const [activeTab, setActiveTab] = useState('overview');
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);

  const tabs = [
    { id: 'overview', label: 'Overview', icon: <FaChartLine /> },
    { id: 'approvals', label: 'Approval Management', icon: <FaUserCheck /> },
    { id: 'users', label: 'User Management', icon: <FaUsers /> },
    { id: 'timetable', label: 'Timetable', icon: <FaCalendarAlt /> },
    { id: 'attendance', label: 'Attendance', icon: <FaCheckSquare /> },
    { id: 'analytics', label: 'Analytics', icon: <FaChartPie /> },
    { id: 'settings', label: 'Settings', icon: <FaCog /> },
  ];

  return (
    <DashboardLayout tabs={tabs} activeTab={activeTab} onTabChange={setActiveTab}>
      <div className="space-y-6">
        {activeTab === 'overview' && <Overview />}
        {activeTab === 'approvals' && <ApprovalManagement />}
        {activeTab === 'users' && <UserManagement />}
        { activeTab === 'timetable' && <TimetableManagement /> }
        { activeTab === 'attendance' && <AttendanceManagement /> }
        { activeTab === 'analytics' && <Analytics /> }
        { activeTab === 'settings' && <Settings /> }
      </div>
    </DashboardLayout>
  );
};

export default AdminDashboard;
