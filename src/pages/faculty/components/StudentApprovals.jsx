import { useState, useEffect } from 'react';
import { collection, query, where, getDocs, doc, updateDoc } from 'firebase/firestore';
import { db } from '../../../firebase/config';
import { toast } from 'react-toastify';
import DashboardCard from '../../../components/ui/DashboardCard';

const StudentApprovals = () => {
  const [students, setStudents] = useState([]);
  const [loading, setLoading] = useState(true);

  const fetchPendingStudents = async () => {
    try {
      setLoading(true);
      const q = query(collection(db, 'students'), where('status', '==', 'pending'));
      const querySnapshot = await getDocs(q);
      const pending = [];
      querySnapshot.forEach((doc) => {
        pending.push({ id: doc.id, ...doc.data() });
      });
      setStudents(pending);
    } catch (error) {
      console.error(error);
      toast.error('Failed to load pending students');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPendingStudents();
  }, []);

  const handleStatusChange = async (studentId, newStatus) => {
    try {
      await updateDoc(doc(db, 'users', studentId), { status: newStatus });
      await updateDoc(doc(db, 'students', studentId), { status: newStatus });
      toast.success(`Student ${newStatus === 'active' ? 'approved' : 'rejected'} successfully`);
      fetchPendingStudents();
    } catch (error) {
      console.error(error);
      toast.error('Failed to update student status');
    }
  };

  if (loading) return <div>Loading...</div>;

  return (
    <DashboardCard title="Student Approvals" subtitle="Review and approve pending student registrations.">
      <div className="overflow-x-auto -mx-6 -mb-6 mt-[-1.5rem]">
        <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
          <thead className="bg-gray-50/80 dark:bg-gray-900/80">
            <tr>
              <th className="px-6 py-4 text-left text-xs font-bold text-gray-500 uppercase">ID</th>
              <th className="px-6 py-4 text-left text-xs font-bold text-gray-500 uppercase">Name</th>
              <th className="px-6 py-4 text-left text-xs font-bold text-gray-500 uppercase">Branch & Section</th>
              <th className="px-6 py-4 text-right text-xs font-bold text-gray-500 uppercase">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200 dark:divide-gray-700 bg-white dark:bg-gray-800">
            {students.length === 0 ? (
              <tr><td colSpan="4" className="text-center py-8 text-gray-500">No pending student registrations.</td></tr>
            ) : (
              students.map((student) => (
                <tr key={student.id} className="hover:bg-gray-50 dark:hover:bg-gray-750 transition-colors">
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-bold text-gray-900 dark:text-gray-100">{student.studentId}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-bold text-gray-900 dark:text-gray-100">{student.name}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{student.branch} - Year {student.year} Sec {student.section}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium space-x-2">
                    <button onClick={() => handleStatusChange(student.id, 'active')} className="text-green-600 hover:text-green-900 font-bold border border-green-200 px-2 py-1 rounded transition-colors hover:bg-green-50">Approve</button>
                    <button onClick={() => handleStatusChange(student.id, 'rejected')} className="text-red-600 hover:text-red-900 font-bold border border-red-200 px-2 py-1 rounded transition-colors hover:bg-red-50">Reject</button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </DashboardCard>
  );
};
export default StudentApprovals;
