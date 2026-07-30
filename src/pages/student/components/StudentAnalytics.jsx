import React, { useState, useEffect } from 'react';
import { collection, query, onSnapshot } from 'firebase/firestore';
import { db } from '../../../firebase/config';
import { useStudent } from '../../../context/StudentContext';
import { PieChart, Pie, Cell, BarChart, Bar, XAxis, YAxis, Tooltip, Legend, ResponsiveContainer, CartesianGrid } from 'recharts';
import Skeleton from 'react-loading-skeleton';
import { FaCheckCircle, FaExclamationTriangle, FaRadiation } from 'react-icons/fa';

const StudentAnalytics = () => {
  const { studentData } = useStudent();
  const [records, setRecords] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!studentData) return;

    const q = query(collection(db, `attendance/${studentData.id}/records`));
    
    const unsub = onSnapshot(q, (snapshot) => {
      const recs = snapshot.docs.map(doc => doc.data());
      setRecords(recs);
      setLoading(false);
    });

    return () => unsub();
  }, [studentData]);

  if (!studentData) return null;

  if (loading) {
    return <Skeleton height={400} count={2} className="rounded-2xl mb-6" />;
  }

  // --- Calculations ---
  let present = 0;
  let absent = 0;
  const subjectMap = {};

  records.forEach(r => {
    if (r.status === 'Present' || r.status === 'Late') present++;
    else absent++;

    if (!subjectMap[r.subject]) {
      subjectMap[r.subject] = { present: 0, absent: 0, total: 0 };
    }
    subjectMap[r.subject].total++;
    if (r.status === 'Present' || r.status === 'Late') {
      subjectMap[r.subject].present++;
    } else {
      subjectMap[r.subject].absent++;
    }
  });

  const total = present + absent;
  const overallPercent = total > 0 ? Math.round((present / total) * 100) : 100;

  // Pie Chart Data
  const pieData = [
    { name: 'Present', value: present },
    { name: 'Absent', value: absent },
  ];
  const COLORS = ['#10b981', '#ef4444'];

  // Bar Chart Data & Alert Table Data
  const barData = [];
  const alertData = [];

  Object.keys(subjectMap).forEach(sub => {
    const sData = subjectMap[sub];
    const percent = sData.total > 0 ? Math.round((sData.present / sData.total) * 100) : 0;
    
    barData.push({
      subject: sub.length > 10 ? sub.substring(0, 10) + '...' : sub,
      Percentage: percent
    });

    // Calculate classes needed
    let needed = 0;
    if (percent < 75) {
      needed = Math.ceil((0.75 * sData.total - sData.present) / 0.25);
    }

    alertData.push({
      subject: sub,
      percent,
      needed,
      tier: percent >= 75 ? 'Good' : percent >= 65 ? 'Warning' : 'Critical'
    });
  });

  const getTierDetails = (tier) => {
    switch (tier) {
      case 'Good':
        return { color: 'bg-green-100 text-green-800 border-green-200', icon: <FaCheckCircle className="text-green-500" />, label: 'Good Standing' };
      case 'Warning':
        return { color: 'bg-yellow-100 text-yellow-800 border-yellow-200', icon: <FaExclamationTriangle className="text-yellow-500" />, label: 'Warning' };
      case 'Critical':
        return { color: 'bg-red-100 text-red-800 border-red-200', icon: <FaRadiation className="text-red-500" />, label: 'Critical' };
      default:
        return { color: 'bg-gray-100 text-gray-800', icon: null, label: 'Unknown' };
    }
  };

  return (
    <div className="space-y-6 pb-10">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white">Attendance Analytics</h2>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
            Deep dive into your attendance patterns and alerts.
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Pie Chart */}
        <div className="glass-card p-6 rounded-2xl border border-gray-200 dark:border-gray-700 shadow-sm flex flex-col items-center">
          <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-4 self-start">Overall Distribution</h3>
          {total === 0 ? (
            <p className="text-gray-500 py-20">No attendance data yet.</p>
          ) : (
            <div className="h-64 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={pieData}
                    cx="50%"
                    cy="50%"
                    innerRadius={60}
                    outerRadius={80}
                    paddingAngle={5}
                    dataKey="value"
                  >
                    {pieData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip />
                  <Legend />
                </PieChart>
              </ResponsiveContainer>
            </div>
          )}
        </div>

        {/* Bar Chart */}
        <div className="glass-card p-6 rounded-2xl border border-gray-200 dark:border-gray-700 shadow-sm flex flex-col items-center">
          <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-4 self-start">Subject-wise Percentage</h3>
          {barData.length === 0 ? (
            <p className="text-gray-500 py-20">No subject data yet.</p>
          ) : (
            <div className="h-64 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={barData} margin={{ top: 20, right: 30, left: 0, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#374151" opacity={0.2} />
                  <XAxis dataKey="subject" tick={{fontSize: 12}} />
                  <YAxis domain={[0, 100]} />
                  <Tooltip cursor={{fill: 'transparent'}} />
                  <Bar dataKey="Percentage" fill="#4f8ef7" radius={[4, 4, 0, 0]}>
                    {barData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.Percentage >= 75 ? '#10b981' : entry.Percentage >= 65 ? '#f59e0b' : '#ef4444'} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}
        </div>
      </div>

      {/* 3-Tier Alert System Table */}
      <div className="glass-card p-6 rounded-2xl border border-gray-200 dark:border-gray-700 shadow-sm mt-6">
        <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-1">3-Tier Alert System</h3>
        <p className="text-sm text-gray-500 mb-6">Subject status and classes required to reach safe standing.</p>
        
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-gray-50 dark:bg-gray-800 text-gray-500 dark:text-gray-400 text-sm uppercase tracking-wider border-b border-gray-200 dark:border-gray-700">
                <th className="p-4 font-medium">Subject</th>
                <th className="p-4 font-medium">Current %</th>
                <th className="p-4 font-medium">Status Badge</th>
                <th className="p-4 font-medium">Action Required</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
              {alertData.length > 0 ? (
                alertData.map((row, idx) => {
                  const tier = getTierDetails(row.tier);
                  return (
                    <tr key={idx} className="hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors">
                      <td className="p-4 font-medium text-gray-900 dark:text-white">{row.subject}</td>
                      <td className="p-4 font-bold text-gray-700 dark:text-gray-300">{row.percent}%</td>
                      <td className="p-4">
                        <span className={`inline-flex items-center space-x-1.5 px-3 py-1 rounded-full text-xs font-bold border ${tier.color}`}>
                          {tier.icon} <span>{tier.label}</span>
                        </span>
                      </td>
                      <td className="p-4">
                        {row.needed > 0 ? (
                          <div className="text-sm">
                            <span className="font-bold text-gray-900 dark:text-white">{row.needed}</span> more class{row.needed > 1 ? 'es' : ''} needed to reach 75%.
                          </div>
                        ) : (
                          <span className="text-sm text-gray-500 italic">No action needed.</span>
                        )}
                      </td>
                    </tr>
                  );
                })
              ) : (
                <tr>
                  <td colSpan="4" className="p-8 text-center text-gray-500 italic">No alert data available.</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default StudentAnalytics;
