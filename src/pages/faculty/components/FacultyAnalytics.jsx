import React, { useState, useEffect } from 'react';
import { collection, query, where, getDocs, limit } from 'firebase/firestore';
import { db } from '../../../firebase/config';
import { useFaculty } from '../../../context/FacultyContext';
import { toast } from 'react-toastify';
import DashboardCard from '../../../components/ui/DashboardCard';
import { FaChartBar, FaUsers, FaExclamationTriangle, FaCalendarCheck } from 'react-icons/fa';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, ResponsiveContainer, PieChart, Pie, Cell, LineChart, Line } from 'recharts';

const FacultyAnalytics = () => {
  const { facultyData } = useFaculty();
  const [loading, setLoading] = useState(true);
  
  // Stats
  const [stats, setStats] = useState({
    todayClasses: { total: 0, completed: 0, pending: 0 },
    overall: { sessionsConducted: 0, avgAttendance: 0 },
    lowAttendanceStudents: 0
  });

  // Chart Data
  const [subjectData, setSubjectData] = useState([]);
  const [pieData, setPieData] = useState([]);
  const [trendData, setTrendData] = useState([]);

  useEffect(() => {
    const fetchAnalytics = async () => {
      if (!facultyData) return;
      try {
        // Fetch sessions conducted by faculty
        const qSessions = query(
          collection(db, 'attendance'),
          where('type', '==', 'session_tracker'),
          where('facultyId', '==', facultyData.id),
          limit(2000)
        );
        const sessionSnap = await getDocs(qSessions);
        const sessions = [];
        sessionSnap.forEach(d => sessions.push({ id: d.id, ...d.data() }));

        const today = new Date().toISOString().split('T')[0];
        const todaySessions = sessions.filter(s => s.date === today);
        
        const completed = todaySessions.filter(s => s.status === 'closed').length;
        
        // Fetch student count in assigned sections (mocking for now with fixed numbers for UI)
        // In reality, this requires querying students by department and sections.
        
        // Mock data for charts
        setSubjectData([
          { name: 'Java', avg: 85 },
          { name: 'Python', avg: 92 },
          { name: 'Data Structs', avg: 78 }
        ]);

        setPieData([
          { name: 'Present', value: 45 },
          { name: 'Absent', value: 12 },
          { name: 'Not Marked', value: 3 }
        ]);

        setTrendData([
          { date: 'Mon', percentage: 80 },
          { date: 'Tue', percentage: 85 },
          { date: 'Wed', percentage: 82 },
          { date: 'Thu', percentage: 90 },
          { date: 'Fri', percentage: 88 }
        ]);

        setStats({
          todayClasses: { 
            total: todaySessions.length || 3, // Fallback to 3 for demo if none
            completed: completed || 1, 
            pending: (todaySessions.length || 3) - (completed || 1) 
          },
          overall: { 
            sessionsConducted: sessions.length || 24, 
            avgAttendance: 85 
          },
          lowAttendanceStudents: 5 // Mock value
        });

      } catch (err) {
        console.error(err);
        toast.error("Failed to load analytics.");
      } finally {
        setLoading(false);
      }
    };
    fetchAnalytics();
  }, [facultyData]);

  if (loading) {
    return (
      <div className="animate-pulse space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          {[1,2,3,4].map(i => <div key={i} className="h-24 bg-gray-200 dark:bg-gray-800 rounded-xl"></div>)}
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="h-64 bg-gray-200 dark:bg-gray-800 rounded-xl"></div>
          <div className="h-64 bg-gray-200 dark:bg-gray-800 rounded-xl"></div>
        </div>
      </div>
    );
  }

  const COLORS = ['#10B981', '#EF4444', '#9CA3AF'];

  return (
    <div className="space-y-6">
      
      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <div className="bg-white dark:bg-gray-800 p-6 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 flex items-center">
          <div className="p-3 bg-blue-100 text-blue-600 rounded-lg mr-4">
            <FaCalendarCheck size={24} />
          </div>
          <div>
            <p className="text-sm text-gray-500 font-semibold uppercase">Classes Today</p>
            <p className="text-2xl font-bold text-gray-900 dark:text-white">{stats.todayClasses.completed} / {stats.todayClasses.total}</p>
          </div>
        </div>

        <div className="bg-white dark:bg-gray-800 p-6 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 flex items-center">
          <div className="p-3 bg-purple-100 text-purple-600 rounded-lg mr-4">
            <FaChartBar size={24} />
          </div>
          <div>
            <p className="text-sm text-gray-500 font-semibold uppercase">Avg Attendance</p>
            <p className="text-2xl font-bold text-gray-900 dark:text-white">{stats.overall.avgAttendance}%</p>
          </div>
        </div>

        <div className="bg-white dark:bg-gray-800 p-6 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 flex items-center">
          <div className="p-3 bg-green-100 text-green-600 rounded-lg mr-4">
            <FaUsers size={24} />
          </div>
          <div>
            <p className="text-sm text-gray-500 font-semibold uppercase">Total Sessions</p>
            <p className="text-2xl font-bold text-gray-900 dark:text-white">{stats.overall.sessionsConducted}</p>
          </div>
        </div>

        <div className="bg-white dark:bg-gray-800 p-6 rounded-xl shadow-sm border border-red-200 dark:border-red-900/50 flex items-center">
          <div className="p-3 bg-red-100 text-red-600 rounded-lg mr-4">
            <FaExclamationTriangle size={24} />
          </div>
          <div>
            <p className="text-sm text-red-500 font-semibold uppercase">Risk Students</p>
            <p className="text-2xl font-bold text-red-600 dark:text-red-400">{stats.lowAttendanceStudents} <span className="text-sm font-normal text-red-400">&lt; 75%</span></p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        
        <DashboardCard title="Subject-wise Attendance %">
          <div className="h-72 w-full mt-4">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={subjectData}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#374151" opacity={0.2} />
                <XAxis dataKey="name" axisLine={false} tickLine={false} />
                <YAxis domain={[0, 100]} axisLine={false} tickLine={false} />
                <RechartsTooltip cursor={{ fill: 'rgba(0,0,0,0.05)' }} contentStyle={{ borderRadius: '8px' }} />
                <Bar dataKey="avg" fill="#4f8ef7" radius={[4, 4, 0, 0]} barSize={40} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </DashboardCard>

        <DashboardCard title="Today's Overview">
          <div className="h-72 w-full mt-4 flex items-center justify-center">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={pieData}
                  cx="50%"
                  cy="50%"
                  innerRadius={60}
                  outerRadius={100}
                  paddingAngle={5}
                  dataKey="value"
                >
                  {pieData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <RechartsTooltip contentStyle={{ borderRadius: '8px' }} />
              </PieChart>
            </ResponsiveContainer>
            
            <div className="absolute flex flex-col space-y-2 mt-4 ml-48">
              {pieData.map((entry, index) => (
                <div key={entry.name} className="flex items-center text-sm">
                  <span className="w-3 h-3 rounded-full mr-2" style={{ backgroundColor: COLORS[index % COLORS.length] }}></span>
                  <span className="text-gray-600 dark:text-gray-300">{entry.name} ({entry.value})</span>
                </div>
              ))}
            </div>
          </div>
        </DashboardCard>

        <div className="lg:col-span-2">
          <DashboardCard title="Attendance Trend (Last 7 Days)">
            <div className="h-72 w-full mt-4">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={trendData}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#374151" opacity={0.2} />
                  <XAxis dataKey="date" axisLine={false} tickLine={false} />
                  <YAxis domain={[0, 100]} axisLine={false} tickLine={false} />
                  <RechartsTooltip contentStyle={{ borderRadius: '8px', backgroundColor: '#1F2937', color: '#fff', border: 'none' }} />
                  <Line type="monotone" dataKey="percentage" stroke="#10B981" strokeWidth={3} dot={{ r: 4, fill: '#10B981', strokeWidth: 2, stroke: '#fff' }} activeDot={{ r: 6 }} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </DashboardCard>
        </div>

      </div>
    </div>
  );
};

export default FacultyAnalytics;
