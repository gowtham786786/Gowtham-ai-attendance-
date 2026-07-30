import { useState, useEffect } from 'react';
import { doc, collection, getDocs, onSnapshot, query, where } from 'firebase/firestore';
import { db } from '../../../firebase/config';
import DashboardCard from '../../../components/ui/DashboardCard';
import { FaUserGraduate, FaChalkboardTeacher, FaCheckCircle, FaUserClock, FaChartPie, FaCalendarCheck } from 'react-icons/fa';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, Legend, ResponsiveContainer,
  LineChart, Line, PieChart, Pie, Cell
} from 'recharts';

const COLORS = ['#00C49F', '#FF8042'];

const Overview = () => {
  const [stats, setStats] = useState(null);
  const [monthlyData, setMonthlyData] = useState([]);
  const [deptData, setDeptData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    let unsubscribeOverall;
    
    const fetchAnalytics = async () => {
      try {
        // Listen to overall stats
        unsubscribeOverall = onSnapshot(doc(db, 'analytics', 'overall'), (docSnap) => {
          if (docSnap.exists()) {
            setStats(docSnap.data());
          }
        }, (err) => {
          console.error("Error fetching overall stats:", err);
          setError(err.message);
        });

        // Fetch monthly stats
        const monthlySnap = await getDocs(query(collection(db, 'analytics'), where('month', '!=', null)));
        const mData = monthlySnap.docs.map(d => d.data()).sort((a, b) => a.month.localeCompare(b.month));
        setMonthlyData(mData);

        // Fetch dept stats
        const deptSnap = await getDocs(query(collection(db, 'analytics'), where('department', '!=', null)));
        const dData = deptSnap.docs.map(d => d.data());
        setDeptData(dData);

        setLoading(false);
      } catch (err) {
        console.error("Error fetching analytics:", err);
        setError(err.message);
        setLoading(false);
      }
    };

    fetchAnalytics();
    return () => {
      if (unsubscribeOverall) unsubscribeOverall();
    };
  }, []);

  if (loading) {
    return (
      <DashboardCard title="Analytics Dashboard">
        <div className="py-20 flex justify-center items-center">
           <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
        </div>
      </DashboardCard>
    );
  }

  if (!stats) {
    return (
      <DashboardCard title="Analytics Dashboard">
        <div className="py-20 text-center text-gray-500">
           No analytics data found. Please run the seeder script.
        </div>
      </DashboardCard>
    );
  }

  const statCards = [
    { title: 'Total Students', value: stats.totalStudents || 0, icon: <FaUserGraduate />, color: 'bg-blue-500' },
    { title: 'Total Faculty', value: stats.totalFaculty || 0, icon: <FaChalkboardTeacher />, color: 'bg-green-500' },
    { title: 'Total Attendance Records', value: stats.totalRecords || 0, icon: <FaCheckCircle />, color: 'bg-purple-500' },
    { title: "Average Attendance", value: `${stats.averageAttendance || 0}%`, icon: <FaChartPie />, color: 'bg-teal-500' },
    { title: 'Students Above 75%', value: stats.studentsAbove75 || 0, icon: <FaCheckCircle />, color: 'bg-green-600' },
    { title: 'Students Below 75%', value: stats.studentsBelow75 || 0, icon: <FaUserClock />, color: 'bg-red-500' }
  ];

  // 1. Daily Attendance Bar Chart (Last 7 Days)
  const last7DaysData = [];
  if (monthlyData.length > 0) {
    const latestMonth = monthlyData[monthlyData.length - 1];
    if (latestMonth && latestMonth.dailyBreakdown) {
      const dates = Object.keys(latestMonth.dailyBreakdown).sort();
      const last7 = dates.slice(-7);
      last7.forEach(date => {
        last7DaysData.push({
          date: date.substring(5), // MM-DD
          present: latestMonth.dailyBreakdown[date].present,
          absent: latestMonth.dailyBreakdown[date].absent
        });
      });
    }
  }

  // 2. Monthly Trend Line Chart
  const trendData = monthlyData.map(m => ({
    month: m.month,
    percentage: parseFloat(m.percentage || 0)
  }));

  // 3. Present vs Absent Pie Chart
  let totalPresent = 0;
  let totalAbsent = 0;
  monthlyData.forEach(m => {
    totalPresent += (m.presentCount || 0);
    totalAbsent += (m.absentCount || 0);
  });
  const pieData = [
    { name: 'Present', value: totalPresent },
    { name: 'Absent', value: totalAbsent }
  ];

  // 4. Department-wise Bar Chart
  const deptChartData = deptData.map(d => ({
    name: d.department || 'Unknown',
    attendance: parseFloat(d.averageAttendance || 0)
  }));

  // 5. Weekly Attendance Chart
  const weeklyAvg = { 'Mon': 0, 'Tue': 0, 'Wed': 0, 'Thu': 0, 'Fri': 0 };
  const weeklyCounts = { 'Mon': 0, 'Tue': 0, 'Wed': 0, 'Thu': 0, 'Fri': 0 };
  
  if (monthlyData.length > 0) {
    monthlyData.forEach(m => {
      if (m.dailyBreakdown) {
        Object.entries(m.dailyBreakdown).forEach(([dateStr, data]) => {
          const d = new Date(dateStr);
          const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
          const dayName = days[d.getDay()];
          if (weeklyAvg[dayName] !== undefined) {
            weeklyAvg[dayName] += data.present;
            weeklyCounts[dayName] += 1;
          }
        });
      }
    });
  }
  const weeklyChartData = Object.keys(weeklyAvg).map(day => ({
    day,
    avgPresent: weeklyCounts[day] ? Math.round(weeklyAvg[day] / weeklyCounts[day]) : 0
  }));

  return (
    <div className="space-y-6">
      {error && (
        <div className="bg-red-50 border-l-4 border-red-500 p-4 rounded-md shadow-sm">
          <p className="text-sm text-red-700">{error}</p>
        </div>
      )}
      
      <DashboardCard title="Analytics Overview" subtitle="Real-time statistics from generated data">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
          {statCards.map((stat, idx) => (
            <div key={idx} className="bg-white dark:bg-gray-800 p-6 rounded-xl border border-gray-100 dark:border-gray-700 shadow-sm flex items-center space-x-4">
              <div className={`p-4 rounded-full text-white ${stat.color}`}>
                {stat.icon}
              </div>
              <div>
                <p className="text-sm text-gray-500 dark:text-gray-400 font-medium">{stat.title}</p>
                <h3 className="text-2xl font-bold text-gray-900 dark:text-white">{stat.value.toLocaleString()}</h3>
              </div>
            </div>
          ))}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Daily Attendance Bar Chart */}
          <div className="bg-white dark:bg-gray-800 p-4 rounded-xl border border-gray-100 dark:border-gray-700">
            <h4 className="text-lg font-semibold mb-4 dark:text-white">Last 7 Days Attendance</h4>
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={last7DaysData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="date" />
                  <YAxis />
                  <RechartsTooltip />
                  <Legend />
                  <Bar dataKey="present" fill="#00C49F" name="Present" />
                  <Bar dataKey="absent" fill="#FF8042" name="Absent" />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Monthly Trend Line Chart */}
          <div className="bg-white dark:bg-gray-800 p-4 rounded-xl border border-gray-100 dark:border-gray-700">
            <h4 className="text-lg font-semibold mb-4 dark:text-white">Monthly Trend (%)</h4>
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={trendData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="month" />
                  <YAxis domain={[0, 100]} />
                  <RechartsTooltip />
                  <Legend />
                  <Line type="monotone" dataKey="percentage" stroke="#8884d8" name="Attendance %" />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Present vs Absent Pie Chart */}
          <div className="bg-white dark:bg-gray-800 p-4 rounded-xl border border-gray-100 dark:border-gray-700">
            <h4 className="text-lg font-semibold mb-4 dark:text-white">Overall Present vs Absent</h4>
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie data={pieData} cx="50%" cy="50%" labelLine={false} label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`} outerRadius={80} fill="#8884d8" dataKey="value">
                    {pieData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <RechartsTooltip />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Department-wise Bar Chart */}
          <div className="bg-white dark:bg-gray-800 p-4 rounded-xl border border-gray-100 dark:border-gray-700">
            <h4 className="text-lg font-semibold mb-4 dark:text-white">Department Average (%)</h4>
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={deptChartData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="name" />
                  <YAxis domain={[0, 100]} />
                  <RechartsTooltip />
                  <Bar dataKey="attendance" fill="#82ca9d" name="Avg Attendance %" />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Weekly Attendance Chart */}
          <div className="bg-white dark:bg-gray-800 p-4 rounded-xl border border-gray-100 dark:border-gray-700 lg:col-span-2">
            <h4 className="text-lg font-semibold mb-4 dark:text-white">Average Present by Day of Week</h4>
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={weeklyChartData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="day" />
                  <YAxis />
                  <RechartsTooltip />
                  <Bar dataKey="avgPresent" fill="#8884d8" name="Avg Students Present" />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

        </div>
      </DashboardCard>
    </div>
  );
};

export default Overview;
