import { useState, useEffect } from 'react';
import { collection, query, where, getDocs, limit } from 'firebase/firestore';
import { db, auth } from '../../../firebase/config';
import { toast } from 'react-toastify';
import DashboardCard from '../../../components/ui/DashboardCard';

const AttendanceRecords = () => {
  const [records, setRecords] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchRecords = async () => {
      if (!auth.currentUser) return;
      try {
        setLoading(true);
        // We fetch attendance records created by this faculty
        const q = query(
          collection(db, 'attendance'), 
          where('faculty_id', '==', auth.currentUser.uid),
          limit(200)
        );
        const querySnapshot = await getDocs(q);
        const fetched = [];
        querySnapshot.forEach((doc) => {
          fetched.push({ id: doc.id, ...doc.data() });
        });
        
        // Sort by timestamp descending
        fetched.sort((a, b) => {
          const dateA = a.timestamp?.toDate ? a.timestamp.toDate() : new Date(0);
          const dateB = b.timestamp?.toDate ? b.timestamp.toDate() : new Date(0);
          return dateB - dateA;
        });

        setRecords(fetched);
      } catch (error) {
        console.error(error);
        toast.error('Failed to load attendance records');
      } finally {
        setLoading(false);
      }
    };
    fetchRecords();
  }, []);

  if (loading) return <div>Loading...</div>;

  return (
    <DashboardCard title="Attendance Records" subtitle="View historical attendance records for your sessions.">
      <div className="overflow-x-auto -mx-6 -mb-6 mt-[-1.5rem]">
        <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
          <thead className="bg-gray-50/80 dark:bg-gray-900/80">
            <tr>
              <th className="px-6 py-4 text-left text-xs font-bold text-gray-500 uppercase">Date</th>
              <th className="px-6 py-4 text-left text-xs font-bold text-gray-500 uppercase">Student Name</th>
              <th className="px-6 py-4 text-left text-xs font-bold text-gray-500 uppercase">Subject</th>
              <th className="px-6 py-4 text-left text-xs font-bold text-gray-500 uppercase">Status</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200 dark:divide-gray-700 bg-white dark:bg-gray-800">
            {records.length === 0 ? (
              <tr><td colSpan="4" className="text-center py-8 text-gray-500">No attendance records found.</td></tr>
            ) : (
              records.map((record) => (
                <tr key={record.id} className="hover:bg-gray-50 dark:hover:bg-gray-750 transition-colors">
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {record.timestamp?.toDate ? record.timestamp.toDate().toLocaleString() : 'Unknown'}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-bold text-gray-900 dark:text-gray-100">{record.student_name}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{record.subject} (Sec {record.section})</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-bold text-green-600">{record.status}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </DashboardCard>
  );
};
export default AttendanceRecords;
