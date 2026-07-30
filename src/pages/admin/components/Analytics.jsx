import React, { useState, useEffect } from 'react';
import { collection, getDocs, query, limit } from 'firebase/firestore';
import { db } from '../../../firebase/config';
import DashboardCard from '../../../components/ui/DashboardCard';
import { FaUserGraduate, FaChalkboardTeacher, FaBookOpen } from 'react-icons/fa';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend,
} from 'chart.js';
import { Bar } from 'react-chartjs-2';

ChartJS.register(CategoryScale, LinearScale, BarElement, Title, Tooltip, Legend);

const Analytics = () => {
  const [stats, setStats] = useState({
    totalStudents: 0,
    totalFaculty: 0,
    activeClassesToday: 0
  });
  
  const [branchData, setBranchData] = useState({ labels: [], datasets: [] });
  const [defaulters, setDefaulters] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchAnalytics = async () => {
      try {
        setLoading(true);
        // Fetch Students
        const studentsSnap = await getDocs(query(collection(db, 'students'), limit(200)));
        const students = [];
        const branchTotals = {};
        const branchCounts = {};

        studentsSnap.forEach(doc => {
          const s = doc.data();
          students.push({ id: doc.id, ...s });
          
          const dept = s.department || 'Unknown';
          const att = s.attendancePercentage || 0;
          
          if (!branchTotals[dept]) {
            branchTotals[dept] = 0;
            branchCounts[dept] = 0;
          }
          branchTotals[dept] += att;
          branchCounts[dept] += 1;
        });

        // Fetch Faculty
        const facultySnap = await getDocs(collection(db, 'faculty'));
        const totalFaculty = facultySnap.size;

        // Fetch Timetable to count today's classes
        const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
        const todayStr = days[new Date().getDay()];
        const timetableSnap = await getDocs(collection(db, 'timetable'));
        let activeClassesToday = 0;
        timetableSnap.forEach(doc => {
          if (doc.data().day === todayStr) {
            activeClassesToday++;
          }
        });

        // Compute Branch-wise averages
        const labels = Object.keys(branchTotals);
        const data = labels.map(dept => Math.round(branchTotals[dept] / branchCounts[dept]));

        setBranchData({
          labels,
          datasets: [
            {
              label: 'Average Attendance %',
              data,
              backgroundColor: 'rgba(99, 102, 241, 0.8)',
              borderRadius: 4
            }
          ]
        });

        // Top 10 Defaulters (Lowest attendance, let's say below 75%)
        const sortedStudents = [...students].sort((a, b) => (a.attendancePercentage || 0) - (b.attendancePercentage || 0));
        setDefaulters(sortedStudents.slice(0, 10));

        setStats({
          totalStudents: students.length,
          totalFaculty,
          activeClassesToday
        });

      } catch (error) {
        console.error("Error fetching analytics:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchAnalytics();
  }, []);

  if (loading) {
    return (
      <DashboardCard title="System Analytics">
        <div className="py-20 flex flex-col justify-center items-center text-gray-500">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mb-4"></div>
          <span>Loading Analytics...</span>
        </div>
      </DashboardCard>
    );
  }

  return (
    <div className="space-y-6">
      
      {/* View A: KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white dark:bg-gray-800 p-6 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700 flex items-center space-x-4">
          <div className="p-4 bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400 rounded-lg">
            <FaUserGraduate size={24} />
          </div>
          <div>
            <p className="text-sm font-bold text-gray-500 dark:text-gray-400 uppercase">Total Students</p>
            <p className="text-2xl font-black text-gray-900 dark:text-white">{stats.totalStudents}</p>
          </div>
        </div>
        
        <div className="bg-white dark:bg-gray-800 p-6 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700 flex items-center space-x-4">
          <div className="p-4 bg-green-50 dark:bg-green-900/20 text-green-600 dark:text-green-400 rounded-lg">
            <FaChalkboardTeacher size={24} />
          </div>
          <div>
            <p className="text-sm font-bold text-gray-500 dark:text-gray-400 uppercase">Total Faculty</p>
            <p className="text-2xl font-black text-gray-900 dark:text-white">{stats.totalFaculty}</p>
          </div>
        </div>
        
        <div className="bg-white dark:bg-gray-800 p-6 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700 flex items-center space-x-4">
          <div className="p-4 bg-purple-50 dark:bg-purple-900/20 text-purple-600 dark:text-purple-400 rounded-lg">
            <FaBookOpen size={24} />
          </div>
          <div>
            <p className="text-sm font-bold text-gray-500 dark:text-gray-400 uppercase">Active Classes Today</p>
            <p className="text-2xl font-black text-gray-900 dark:text-white">{stats.activeClassesToday}</p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* View B: Branch-wise Attendance Chart */}
        <DashboardCard title="Branch-wise Attendance" subtitle="Average attendance percentage per branch.">
          <div className="h-72 flex items-center justify-center p-4">
             {branchData.labels.length > 0 ? (
               <Bar 
                 data={branchData} 
                 options={{ 
                   responsive: true, 
                   maintainAspectRatio: false,
                   scales: {
                     y: { beginAtZero: true, max: 100 }
                   }
                 }} 
               />
             ) : (
               <p className="text-gray-400 italic">No branch data available.</p>
             )}
          </div>
        </DashboardCard>

        {/* View C: Top 10 Defaulters */}
        <DashboardCard title="Top 10 Defaulters" subtitle="Students with the lowest overall attendance.">
           <div className="overflow-x-auto">
             <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
               <thead className="bg-gray-50/80 dark:bg-gray-900/80">
                 <tr>
                   <th className="px-4 py-3 text-left text-xs font-bold text-gray-500 uppercase">Student Name</th>
                   <th className="px-4 py-3 text-left text-xs font-bold text-gray-500 uppercase">Roll No</th>
                   <th className="px-4 py-3 text-left text-xs font-bold text-gray-500 uppercase">Branch</th>
                   <th className="px-4 py-3 text-right text-xs font-bold text-gray-500 uppercase">Attendance</th>
                 </tr>
               </thead>
               <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                 {defaulters.map(student => (
                   <tr key={student.id} className="hover:bg-gray-50 dark:hover:bg-gray-750">
                     <td className="px-4 py-3 text-sm font-bold text-gray-900 dark:text-white">{student.name}</td>
                     <td className="px-4 py-3 text-sm text-gray-500">{student.studentId || 'N/A'}</td>
                     <td className="px-4 py-3 text-sm text-gray-500">{student.department || 'N/A'}</td>
                     <td className="px-4 py-3 text-sm text-right font-bold text-red-500">
                       {student.attendancePercentage || 0}%
                     </td>
                   </tr>
                 ))}
                 {defaulters.length === 0 && (
                   <tr>
                     <td colSpan="4" className="px-4 py-6 text-center text-sm text-gray-500">No students found.</td>
                   </tr>
                 )}
               </tbody>
             </table>
           </div>
        </DashboardCard>
      </div>

    </div>
  );
};

export default Analytics;
