import React, { useState, useEffect } from 'react';
import { collection, query, orderBy, onSnapshot } from 'firebase/firestore';
import { db } from '../../../firebase/config';
import { useStudent } from '../../../context/StudentContext';
import { FaCalendarAlt, FaTable, FaFilter, FaCheckCircle, FaExclamationTriangle } from 'react-icons/fa';
import Skeleton from 'react-loading-skeleton';
// Removed xlsx and jspdf imports temporarily to unblock Vite error

const AttendanceHistory = () => {
  const { studentData } = useStudent();
  const [records, setRecords] = useState([]);
  const [loading, setLoading] = useState(true);
  
  const [filterMode, setFilterMode] = useState('all'); // 'all', 'this_month', 'today'
  const [subjectFilter, setSubjectFilter] = useState('all');
  const [viewMode, setViewMode] = useState('table'); // 'table', 'calendar'

  useEffect(() => {
    if (!studentData) return;

    const q = query(
      collection(db, `attendance/${studentData.id}/records`),
      orderBy('timestamp', 'desc')
    );

    const unsub = onSnapshot(q, (snapshot) => {
      const recs = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setRecords(recs);
      setLoading(false);
    });

    return () => unsub();
  }, [studentData]);

  // Derived filters
  const subjectsList = [...new Set(records.map(r => r.subject))];

  const filteredRecords = records.filter(r => {
    if (subjectFilter !== 'all' && r.subject !== subjectFilter) return false;
    
    const recDate = new Date(r.date);
    const today = new Date();
    
    if (filterMode === 'today') {
      return recDate.toDateString() === today.toDateString();
    } else if (filterMode === 'this_month') {
      return recDate.getMonth() === today.getMonth() && recDate.getFullYear() === today.getFullYear();
    }
    return true;
  });

  const exportExcel = () => {
    alert("Export to Excel is temporarily disabled.");
  };

  const exportPDF = () => {
    alert("Export to PDF is temporarily disabled.");
  };

  if (!studentData) return null;

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-10">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center bg-white dark:bg-gray-800 p-6 rounded-2xl shadow-sm border border-gray-200 dark:border-gray-700">
        <div>
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white">Attendance History</h2>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
            Track and download your past attendance records.
          </p>
        </div>
        <div className="flex space-x-3 mt-4 md:mt-0">
          <button onClick={exportExcel} className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors">
            Export Excel
          </button>
          <button onClick={exportPDF} className="bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors">
            Export PDF
          </button>
        </div>
      </div>

      <div className="glass-card p-6 rounded-2xl border border-gray-200 dark:border-gray-700 shadow-sm flex flex-col md:flex-row gap-4 items-center justify-between">
        <div className="flex flex-col sm:flex-row gap-4 w-full md:w-auto">
          <div className="flex items-center space-x-2 bg-gray-50 dark:bg-gray-800 p-2 rounded-lg border border-gray-200 dark:border-gray-700">
            <FaFilter className="text-gray-400 ml-2" />
            <select value={filterMode} onChange={(e) => setFilterMode(e.target.value)} className="bg-transparent border-none text-sm font-medium focus:ring-0 text-gray-700 dark:text-gray-200 cursor-pointer outline-none">
              <option value="all">All Time</option>
              <option value="this_month">This Month</option>
              <option value="today">Today</option>
            </select>
          </div>
          
          <div className="flex items-center space-x-2 bg-gray-50 dark:bg-gray-800 p-2 rounded-lg border border-gray-200 dark:border-gray-700">
            <select value={subjectFilter} onChange={(e) => setSubjectFilter(e.target.value)} className="bg-transparent border-none text-sm font-medium focus:ring-0 text-gray-700 dark:text-gray-200 cursor-pointer outline-none">
              <option value="all">All Subjects</option>
              {subjectsList.map(s => <option key={s} value={s}>{s}</option>)}
            </select>
          </div>
        </div>

        <div className="flex bg-gray-100 dark:bg-gray-800 rounded-lg p-1">
          <button onClick={() => setViewMode('table')} className={`flex items-center space-x-2 px-4 py-2 text-sm font-medium rounded-md transition-colors ${viewMode === 'table' ? 'bg-white dark:bg-gray-700 text-primary shadow-sm' : 'text-gray-500'}`}>
            <FaTable /> <span>Table</span>
          </button>
          <button onClick={() => setViewMode('calendar')} className={`flex items-center space-x-2 px-4 py-2 text-sm font-medium rounded-md transition-colors ${viewMode === 'calendar' ? 'bg-white dark:bg-gray-700 text-primary shadow-sm' : 'text-gray-500'}`}>
            <FaCalendarAlt /> <span>Summary</span>
          </button>
        </div>
      </div>

      {loading ? (
        <Skeleton height={300} className="rounded-2xl" />
      ) : viewMode === 'table' ? (
        <div className="glass-card rounded-2xl overflow-hidden shadow-sm border border-gray-200 dark:border-gray-700">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-gray-50 dark:bg-gray-800 text-gray-500 dark:text-gray-400 text-sm uppercase tracking-wider">
                  <th className="p-4 font-medium">Date & Day</th>
                  <th className="p-4 font-medium">Subject</th>
                  <th className="p-4 font-medium">Faculty</th>
                  <th className="p-4 font-medium">Period</th>
                  <th className="p-4 font-medium">Time Marked</th>
                  <th className="p-4 font-medium">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                {filteredRecords.length > 0 ? (
                  filteredRecords.map(r => (
                    <tr key={r.id} className="hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors">
                      <td className="p-4">
                        <div className="font-medium text-gray-900 dark:text-white">{r.date}</div>
                        <div className="text-xs text-gray-500">{r.day}</div>
                      </td>
                      <td className="p-4 font-medium text-gray-900 dark:text-white">{r.subject}</td>
                      <td className="p-4 text-gray-600 dark:text-gray-300">{r.facultyName}</td>
                      <td className="p-4 font-medium text-gray-900 dark:text-white">{r.period}</td>
                      <td className="p-4 text-gray-500 font-mono text-sm">{r.timeIn}</td>
                      <td className="p-4">
                        <span className={`inline-flex items-center space-x-1 px-2.5 py-1 rounded-full text-xs font-medium ${
                          r.status === 'Present' ? 'bg-green-100 text-green-800' :
                          r.status === 'Late' ? 'bg-yellow-100 text-yellow-800' :
                          'bg-red-100 text-red-800'
                        }`}>
                          {r.status === 'Present' ? <FaCheckCircle /> : <FaExclamationTriangle />}
                          <span>{r.status}</span>
                        </span>
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan="6" className="p-8 text-center text-gray-500 dark:text-gray-400 italic">
                      No attendance records found for the selected filters.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {/* Subject-wise Summary Cards */}
          {subjectsList.map(subject => {
            const subjectRecs = records.filter(r => r.subject === subject);
            const present = subjectRecs.filter(r => r.status === 'Present' || r.status === 'Late').length;
            const total = subjectRecs.length;
            const percentage = total > 0 ? Math.round((present / total) * 100) : 0;
            
            return (
              <div key={subject} className="glass-card p-6 rounded-2xl border-l-4 shadow-sm" style={{ borderLeftColor: percentage >= 75 ? '#10b981' : percentage >= 65 ? '#f59e0b' : '#ef4444' }}>
                <h3 className="font-bold text-lg text-gray-900 dark:text-white mb-2">{subject}</h3>
                <div className="flex justify-between items-center mb-4">
                  <span className="text-gray-500 dark:text-gray-400 text-sm">Classes Attended</span>
                  <span className="font-bold text-gray-900 dark:text-white">{present} / {total}</span>
                </div>
                
                <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2.5 mb-2">
                  <div 
                    className="h-2.5 rounded-full" 
                    style={{ 
                      width: `${percentage}%`,
                      backgroundColor: percentage >= 75 ? '#10b981' : percentage >= 65 ? '#f59e0b' : '#ef4444'
                    }}
                  ></div>
                </div>
                
                <div className="flex justify-between items-center text-sm">
                  <span className={`font-bold ${percentage >= 75 ? 'text-green-600' : percentage >= 65 ? 'text-yellow-600' : 'text-red-600'}`}>
                    {percentage}%
                  </span>
                  <span className="text-xs text-gray-500">
                    {percentage >= 75 ? 'Good Standing' : 'Needs Attention'}
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default AttendanceHistory;
