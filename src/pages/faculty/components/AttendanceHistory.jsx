import React, { useState, useEffect } from 'react';
import { collection, query, where, getDocs, orderBy, updateDoc, doc, serverTimestamp, addDoc } from 'firebase/firestore';
import { db } from '../../../firebase/config';
import { useFaculty } from '../../../context/FacultyContext';
import { toast } from 'react-toastify';
import DashboardCard from '../../../components/ui/DashboardCard';
import { FaChevronDown, FaChevronUp, FaEdit, FaCheck, FaTimes, FaHistory } from 'react-icons/fa';

const AttendanceHistory = () => {
  const { facultyData } = useFaculty();
  const [sessions, setSessions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [expandedSession, setExpandedSession] = useState(null);
  const [sessionRecords, setSessionRecords] = useState({});
  const [loadingRecords, setLoadingRecords] = useState(false);

  useEffect(() => {
    const fetchSessions = async () => {
      if (!facultyData) return;
      try {
        const q = query(
          collection(db, 'attendance'),
          where('type', '==', 'session_tracker'),
          where('facultyId', '==', facultyData.id)
        );
        const snap = await getDocs(q);
        const sess = [];
        snap.forEach(d => sess.push({ id: d.id, ...d.data() }));
        
        // Sort by date descending (client side to avoid missing index errors)
        sess.sort((a, b) => new Date(b.date) - new Date(a.date));
        setSessions(sess);
      } catch (err) {
        console.error(err);
        toast.error("Failed to load sessions.");
      } finally {
        setLoading(false);
      }
    };
    fetchSessions();
  }, [facultyData]);

  const toggleSession = async (sessionId) => {
    if (expandedSession === sessionId) {
      setExpandedSession(null);
      return;
    }
    setExpandedSession(sessionId);
    
    if (!sessionRecords[sessionId]) {
      setLoadingRecords(true);
      try {
        const q = query(
          collection(db, 'attendance'),
          where('sessionId', '==', sessionId)
        );
        const snap = await getDocs(q);
        const recs = [];
        snap.forEach(d => recs.push({ id: d.id, ...d.data() }));
        setSessionRecords(prev => ({ ...prev, [sessionId]: recs }));
      } catch (err) {
        console.error(err);
        toast.error("Failed to load records for this session.");
      } finally {
        setLoadingRecords(false);
      }
    }
  };

  const toggleStudentAttendance = async (record, sessionId, sessionDate) => {
    const isToday = sessionDate === new Date().toISOString().split('T')[0];
    
    if (!isToday) {
      toast.warning("You can only modify attendance for today's sessions directly. Please submit a correction request for past records.");
      return;
    }

    const newStatus = record.status === 'Present' ? 'Absent' : 'Present';
    
    try {
      // 1. Update the record
      await updateDoc(doc(db, 'attendance', record.id), {
        status: newStatus,
        modifiedAt: serverTimestamp(),
        modifiedBy: facultyData.id
      });

      // 2. Add Audit Log
      await addDoc(collection(db, 'auditLogs'), {
        action: 'FACULTY_ATTENDANCE_EDIT',
        facultyId: facultyData.id,
        studentId: record.student_uid,
        sessionId: sessionId,
        oldStatus: record.status,
        newStatus: newStatus,
        reason: 'Manual override by faculty',
        timestamp: serverTimestamp()
      });

      // 3. Update local state
      setSessionRecords(prev => {
        const updated = prev[sessionId].map(r => 
          r.id === record.id ? { ...r, status: newStatus } : r
        );
        return { ...prev, [sessionId]: updated };
      });

      toast.success(`Marked ${newStatus}`);
    } catch (err) {
      console.error(err);
      toast.error("Failed to modify attendance.");
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center bg-white dark:bg-gray-800 p-4 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700">
        <div>
          <h2 className="text-xl font-bold text-gray-900 dark:text-white flex items-center">
            <FaHistory className="mr-2 text-primary" /> Attendance History
          </h2>
          <p className="text-sm text-gray-500">View and modify your conducted sessions</p>
        </div>
      </div>

      <DashboardCard>
        {loading ? (
          <div className="animate-pulse space-y-4">
             {[1,2,3].map(i => <div key={i} className="h-16 bg-gray-100 dark:bg-gray-700 rounded-xl"></div>)}
          </div>
        ) : sessions.length === 0 ? (
          <div className="py-12 text-center text-gray-500">
             <p>No sessions conducted yet.</p>
          </div>
        ) : (
          <div className="space-y-4">
            {sessions.map(session => (
              <div key={session.id} className="border border-gray-200 dark:border-gray-700 rounded-xl overflow-hidden bg-white dark:bg-gray-800">
                {/* Session Header (Clickable) */}
                <div 
                  className="p-4 bg-gray-50 dark:bg-gray-900/50 cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors flex justify-between items-center"
                  onClick={() => toggleSession(session.id)}
                >
                  <div className="flex flex-col md:flex-row md:items-center gap-2 md:gap-6">
                    <div>
                      <p className="font-bold text-gray-900 dark:text-white">{session.subject}</p>
                      <p className="text-xs text-gray-500">{session.date} • Period {session.period}</p>
                    </div>
                    <div>
                      <span className="bg-gray-200 dark:bg-gray-700 text-gray-800 dark:text-gray-200 text-xs px-2 py-1 rounded">Section {session.section}</span>
                    </div>
                    <div>
                      <span className={`text-xs px-2 py-1 rounded font-bold ${session.status === 'closed' ? 'bg-green-100 text-green-800' : 'bg-yellow-100 text-yellow-800'}`}>
                        {session.status.toUpperCase()}
                      </span>
                    </div>
                  </div>
                  <div className="text-gray-400">
                    {expandedSession === session.id ? <FaChevronUp /> : <FaChevronDown />}
                  </div>
                </div>

                {/* Expanded Session Records */}
                {expandedSession === session.id && (
                  <div className="p-4 border-t border-gray-200 dark:border-gray-700">
                    {loadingRecords ? (
                      <p className="text-center text-gray-500 py-4">Loading records...</p>
                    ) : sessionRecords[session.id] && sessionRecords[session.id].length > 0 ? (
                      <div className="overflow-x-auto">
                        <table className="w-full text-left border-collapse">
                          <thead>
                            <tr className="border-b border-gray-200 dark:border-gray-700">
                              <th className="py-2 px-4 text-xs font-semibold text-gray-500">Student Name</th>
                              <th className="py-2 px-4 text-xs font-semibold text-gray-500">ID</th>
                              <th className="py-2 px-4 text-xs font-semibold text-gray-500">Status</th>
                              <th className="py-2 px-4 text-xs font-semibold text-gray-500 text-right">Action</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
                            {sessionRecords[session.id].map(record => (
                              <tr key={record.id} className="hover:bg-gray-50 dark:hover:bg-gray-750 transition-colors">
                                <td className="py-2 px-4 font-medium text-gray-900 dark:text-white">{record.student_name}</td>
                                <td className="py-2 px-4 text-gray-500 text-sm">{record.student_id}</td>
                                <td className="py-2 px-4">
                                  <span className={`flex items-center space-x-1 text-sm font-bold ${record.status === 'Present' ? 'text-green-600' : 'text-red-600'}`}>
                                    {record.status === 'Present' ? <FaCheck size={10} /> : <FaTimes size={10} />}
                                    <span>{record.status}</span>
                                  </span>
                                </td>
                                <td className="py-2 px-4 text-right">
                                  <button 
                                    onClick={() => toggleStudentAttendance(record, session.id, session.date)}
                                    className="text-blue-500 hover:text-blue-700 bg-blue-50 hover:bg-blue-100 p-2 rounded-lg transition-colors"
                                    title="Toggle Attendance (Today only)"
                                  >
                                    <FaEdit size={14} />
                                  </button>
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    ) : (
                      <p className="text-center text-gray-500 py-4">No records found for this session.</p>
                    )}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </DashboardCard>
    </div>
  );
};

export default AttendanceHistory;
