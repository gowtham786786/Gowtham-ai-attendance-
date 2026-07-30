import { useState, useEffect } from 'react';
import { collection, query, where, getDocs, doc, updateDoc } from 'firebase/firestore';
import { db } from '../../../firebase/config';
import { toast } from 'react-toastify';
import DashboardCard from '../../../components/ui/DashboardCard';

const ManageStudents = () => {
  const [students, setStudents] = useState([]);
  const [loading, setLoading] = useState(true);

  const fetchActiveStudents = async () => {
    try {
      setLoading(true);
      const q = query(collection(db, 'students'), where('status', '==', 'active'));
      const querySnapshot = await getDocs(q);
      const active = [];
      querySnapshot.forEach((doc) => {
        active.push({ id: doc.id, ...doc.data() });
      });
      setStudents(active);
    } catch (error) {
      console.error(error);
      toast.error('Failed to load active students');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchActiveStudents();
  }, []);

  const handleRemoveStudent = async (studentId) => {
    if (!window.confirm("Are you sure you want to remove this student?")) return;
    try {
      await updateDoc(doc(db, 'users', studentId), { status: 'rejected' });
      await updateDoc(doc(db, 'students', studentId), { status: 'rejected' });
      toast.success('Student removed successfully');
      fetchActiveStudents();
    } catch (error) {
      console.error(error);
      toast.error('Failed to remove student');
    }
  };

  if (loading) return <div>Loading...</div>;

  return (
    <DashboardCard title="Manage Students" subtitle="View and remove active students from the system.">
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
              <tr><td colSpan="4" className="text-center py-8 text-gray-500">No active students found.</td></tr>
            ) : (
              students.map((student) => (
                <tr key={student.id} className="hover:bg-gray-50 dark:hover:bg-gray-750 transition-colors">
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-bold text-gray-900 dark:text-gray-100">{student.studentId}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-bold text-gray-900 dark:text-gray-100">{student.name}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{student.branch} - Year {student.year} Sec {student.section}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                    <button onClick={() => handleRemoveStudent(student.id)} className="text-red-600 hover:text-red-900 font-bold border border-red-200 px-2 py-1 rounded transition-colors hover:bg-red-50">Remove</button>
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
export default ManageStudents;
