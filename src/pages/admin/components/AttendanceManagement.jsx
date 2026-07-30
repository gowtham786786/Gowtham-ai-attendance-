import React, { useState, useEffect } from 'react';
import { collection, query, getDocs, doc, updateDoc, addDoc, serverTimestamp, getDoc, limit, where } from 'firebase/firestore';
import { db, auth } from '../../../firebase/config';
import { toast } from 'react-toastify';
import DashboardCard from '../../../components/ui/DashboardCard';
import { FaSearch, FaEdit, FaTimes, FaCheck } from 'react-icons/fa';

const AttendanceManagement = () => {
  const [records, setRecords] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  
  // Edit State
  const [editingRecord, setEditingRecord] = useState(null);
  const [newStatus, setNewStatus] = useState('');

  const fetchRecords = async () => {
    try {
      setLoading(true);
      const q = query(collection(db, 'attendance'), limit(150));
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

  useEffect(() => {
    fetchRecords();
  }, []);

  const filteredRecords = records.filter(r => {
    if (!searchTerm) return true;
    const s = searchTerm.toLowerCase();
    return (
      (r.student_name?.toLowerCase() || '').includes(s) ||
      (r.student_id?.toLowerCase() || '').includes(s) ||
      (r.subject?.toLowerCase() || '').includes(s) ||
      (r.date?.toLowerCase() || '').includes(s)
    );
  });

  const handleUpdateStatus = async (e) => {
    e.preventDefault();
    if (!editingRecord || !newStatus) return;
    if (editingRecord.status === newStatus) {
      setEditingRecord(null);
      return;
    }

    try {
      const adminId = auth.currentUser?.uid;
      const oldStatus = editingRecord.status;

      // Update Attendance Record
      const recordRef = doc(db, 'attendance', editingRecord.id);
      await updateDoc(recordRef, { status: newStatus });

      // Create Audit Log
      await addDoc(collection(db, 'attendance_audit'), {
        student_id: editingRecord.student_id || 'Unknown',
        student_name: editingRecord.student_name || 'Unknown',
        date: editingRecord.date || new Date().toISOString(),
        old_status: oldStatus,
        new_status: newStatus,
        admin_id: adminId || 'admin',
        timestamp: serverTimestamp(),
        attendance_record_id: editingRecord.id
      });

      // Recalculate Percentage for the student
      if (editingRecord.student_uid) {
        await recalculateAttendance(editingRecord.student_uid);
      }

      toast.success('Attendance status updated and audited successfully.');
      setEditingRecord(null);
      fetchRecords();
    } catch (err) {
      console.error(err);
      toast.error('Failed to update attendance status.');
    }
  };

  const recalculateAttendance = async (studentUid) => {
    // Fetch all records for this student
    // Assuming student_uid is stored in attendance docs. If not, we might need to search by student_id
    // But let's fetch all and filter for now (not efficient for scale, but works for the demo)
    // Optimize by using where clause instead of fetching all attendance records
    const allRecordsQ = query(collection(db, 'attendance'), where('studentId', '==', studentUid));
    const allSnap = await getDocs(allRecordsQ);
    let total = 0;
    let present = 0;
    allSnap.forEach(d => {
      const data = d.data();
      total++;
      if (data.status === 'Present') present++;
    });

    if (total > 0) {
      const percentage = Math.round((present / total) * 100);
      try {
        await updateDoc(doc(db, 'students', studentUid), { attendancePercentage: percentage });
      } catch(e) {
        console.warn("Could not update student percentage on doc", e);
      }
    }
  };

  return (
    <div className="space-y-6">
      <DashboardCard title="Modify Attendance & Audit Trail" subtitle="Search and modify attendance records. Audits will be generated for changes.">
        
        <div className="relative mb-6">
          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-gray-400">
            <FaSearch />
          </div>
          <input
            type="text"
            placeholder="Search by Roll No, Name, or Date (YYYY-MM-DD)..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10 input-field bg-gray-50 dark:bg-gray-900"
          />
        </div>

        <div className="overflow-x-auto -mx-6 -mb-6 mt-[-1.5rem]">
          <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
            <thead className="bg-gray-50/80 dark:bg-gray-900/80">
              <tr>
                <th className="px-6 py-4 text-left text-xs font-bold text-gray-500 uppercase">Date / Time</th>
                <th className="px-6 py-4 text-left text-xs font-bold text-gray-500 uppercase">Student Name & Roll No</th>
                <th className="px-6 py-4 text-left text-xs font-bold text-gray-500 uppercase">Subject & Section</th>
                <th className="px-6 py-4 text-left text-xs font-bold text-gray-500 uppercase">Status</th>
                <th className="px-6 py-4 text-right text-xs font-bold text-gray-500 uppercase">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200 dark:divide-gray-700 bg-white dark:bg-gray-800">
              {loading ? (
                <tr><td colSpan="5" className="text-center py-8 text-gray-500">Loading records...</td></tr>
              ) : filteredRecords.length === 0 ? (
                <tr><td colSpan="5" className="text-center py-8 text-gray-500">No attendance records found.</td></tr>
              ) : (
                filteredRecords.map((record) => (
                  <tr key={record.id} className="hover:bg-gray-50 dark:hover:bg-gray-750 transition-colors">
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {record.timestamp?.toDate ? record.timestamp.toDate().toLocaleString() : record.date || 'Unknown'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm font-bold text-gray-900 dark:text-gray-100">{record.student_name || 'N/A'}</div>
                      <div className="text-xs text-gray-500">{record.student_id || 'No Roll No'}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      <div className="text-sm font-bold text-gray-900 dark:text-gray-100">{record.subject || 'N/A'}</div>
                      <div className="text-xs text-gray-500">Sec: {record.section || 'N/A'}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-bold">
                      <span className={`px-2 py-1 rounded-full text-xs ${record.status === 'Present' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
                        {record.status}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                      <button 
                        onClick={() => { setEditingRecord(record); setNewStatus(record.status); }} 
                        className="text-blue-600 hover:text-blue-900 bg-blue-50 p-2 rounded-full hover:bg-blue-100"
                        title="Modify Status"
                      >
                        <FaEdit size={12} />
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </DashboardCard>

      {/* Edit Modal */}
      {editingRecord && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <form onSubmit={handleUpdateStatus} className="bg-white dark:bg-gray-800 p-8 rounded-xl max-w-sm w-full shadow-2xl relative">
            <h3 className="text-xl font-bold mb-4 dark:text-white">Modify Attendance</h3>
            <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">
              Modifying status for <strong>{editingRecord.student_name}</strong>. An audit log will be created.
            </p>
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Status</label>
                <select 
                  value={newStatus}
                  onChange={(e) => setNewStatus(e.target.value)}
                  className="input-field cursor-pointer"
                >
                  <option value="Present">Present</option>
                  <option value="Absent">Absent</option>
                </select>
              </div>
            </div>

            <div className="mt-6 flex space-x-3">
              <button type="button" onClick={() => setEditingRecord(null)} className="flex-1 py-2 bg-gray-200 text-gray-800 rounded-lg hover:bg-gray-300 font-medium">
                Cancel
              </button>
              <button type="submit" className="flex-1 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-lg font-medium transition-colors shadow-sm flex justify-center items-center">
                <FaCheck className="mr-2" /> Save
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
};

export default AttendanceManagement;
