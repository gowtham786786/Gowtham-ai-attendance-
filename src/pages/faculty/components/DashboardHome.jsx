import React, { useState, useEffect } from 'react';
import { collection, query, where, onSnapshot, limit } from 'firebase/firestore';
import { db } from '../../../firebase/config';
import { useFaculty } from '../../../context/FacultyContext';
import DashboardCard from '../../../components/ui/DashboardCard';
import { FaClock, FaCheckCircle, FaHourglassHalf, FaPlayCircle } from 'react-icons/fa';

const PERIOD_TIMES = {
  1: { start: '09:00', end: '09:50' },
  2: { start: '09:50', end: '10:40' },
  3: { start: '10:50', end: '11:40' },
  4: { start: '11:40', end: '12:30' },
  5: { start: '13:30', end: '14:20' },
  6: { start: '14:20', end: '15:10' }
};

const getPeriodStatus = (periodNumber) => {
  if (!PERIOD_TIMES[periodNumber]) return 'unknown';
  
  const now = new Date();
  const currentHours = now.getHours();
  const currentMinutes = now.getMinutes();
  const currentTime = currentHours * 60 + currentMinutes;

  const [startH, startM] = PERIOD_TIMES[periodNumber].start.split(':').map(Number);
  const startTime = startH * 60 + startM;

  const [endH, endM] = PERIOD_TIMES[periodNumber].end.split(':').map(Number);
  const endTime = endH * 60 + endM;

  if (currentTime >= startTime - 5 && currentTime <= endTime) { // 5 min buffer before
    return 'current';
  } else if (currentTime > endTime) {
    return 'completed';
  } else {
    return 'remaining';
  }
};

const formatTime = (time24) => {
  const [h, m] = time24.split(':');
  const hours = parseInt(h);
  const ampm = hours >= 12 ? 'PM' : 'AM';
  const hours12 = hours % 12 || 12;
  return `${hours12}:${m} ${ampm}`;
};

const DashboardHome = ({ onStartAttendance }) => {
  const { facultyData } = useFaculty();
  const [todayClasses, setTodayClasses] = useState([]);
  const [facultyStats, setFacultyStats] = useState({ totalConducted: 0, presentCount: 0, absentCount: 0 });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!facultyData) return;

    const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
    const todayName = days[new Date().getDay()];

    const q = query(
      collection(db, 'timetable'),
      where('facultyId', '==', facultyData.id),
      where('day', '==', todayName)
    );

    const unsub = onSnapshot(q, (snapshot) => {
      const classes = [];
      snapshot.forEach(doc => {
        classes.push({ id: doc.id, ...doc.data() });
      });
      // Sort by period number
      classes.sort((a, b) => a.periodNumber - b.periodNumber);
      setTodayClasses(classes);
      setLoading(false);
    });

    // Limit to 1000 to prevent performance issues with large seeded datasets
    const attQuery = query(collection(db, 'attendance'), where('facultyId', '==', facultyData.id), limit(1000));
    const unsubAtt = onSnapshot(attQuery, (snapshot) => {
      let sessions = new Set();
      let present = 0;
      let absent = 0;
      snapshot.forEach(doc => {
        const data = doc.data();
        if (data.sessionId) sessions.add(data.sessionId);
        if (data.status === 'Present') present++;
        else absent++;
      });
      setFacultyStats({
        totalConducted: sessions.size,
        presentCount: present,
        absentCount: absent
      });
    });

    return () => {
      unsub();
      unsubAtt();
    };
  }, [facultyData]);

  if (loading) {
    return <div className="animate-pulse h-64 bg-gray-200 dark:bg-gray-800 rounded-xl"></div>;
  }

  const currentClass = todayClasses.find(c => getPeriodStatus(c.periodNumber) === 'current');
  const remainingClasses = todayClasses.filter(c => getPeriodStatus(c.periodNumber) === 'remaining');
  const completedClasses = todayClasses.filter(c => getPeriodStatus(c.periodNumber) === 'completed');
  const nextClass = remainingClasses.length > 0 ? remainingClasses[0] : null;

  const renderClassCard = (cls, type) => {
    const times = PERIOD_TIMES[cls.periodNumber];
    const isCurrent = type === 'current';
    
    return (
      <div key={cls.id} className={`p-5 rounded-xl border ${isCurrent ? 'bg-blue-50 border-blue-200 dark:bg-blue-900/20 dark:border-blue-800' : 'bg-white border-gray-100 dark:bg-gray-800 dark:border-gray-700'} shadow-sm`}>
        <div className="flex justify-between items-start mb-3">
          <div>
            <h3 className={`font-bold text-lg ${isCurrent ? 'text-blue-700 dark:text-blue-300' : 'text-gray-900 dark:text-white'}`}>
              {cls.subject}
            </h3>
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
              {cls.department} • Year {cls.year} • Section {cls.section}
            </p>
          </div>
          <div className="text-right">
            <span className="inline-block px-3 py-1 bg-gray-100 dark:bg-gray-700 text-gray-800 dark:text-gray-200 text-xs font-bold rounded-full">
              Period {cls.periodNumber}
            </span>
            <p className="text-xs text-gray-500 mt-1">{formatTime(times.start)} - {formatTime(times.end)}</p>
          </div>
        </div>

        {isCurrent && (
          <button 
            onClick={() => onStartAttendance(cls)}
            className="w-full mt-4 flex justify-center items-center space-x-2 bg-blue-600 hover:bg-blue-700 text-white py-2 rounded-lg font-medium transition-colors"
          >
            <FaPlayCircle />
            <span>Start Attendance</span>
          </button>
        )}
        
        {!isCurrent && type === 'remaining' && (
          <button disabled className="w-full mt-4 flex justify-center items-center space-x-2 bg-gray-100 dark:bg-gray-700 text-gray-400 dark:text-gray-500 py-2 rounded-lg font-medium cursor-not-allowed">
            <span>Opens at {formatTime(times.start)}</span>
          </button>
        )}
      </div>
    );
  };

  return (
    <div className="space-y-6">
      {/* Faculty Overall Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <DashboardCard 
          title="Total Sessions Conducted" 
          value={facultyStats.totalConducted} 
          icon={<FaCheckCircle />} 
          color="indigo" 
        />
        <DashboardCard 
          title="Total Students Present" 
          value={facultyStats.presentCount} 
          icon={<FaCheckCircle />} 
          color="green" 
        />
        <DashboardCard 
          title="Total Students Absent" 
          value={facultyStats.absentCount} 
          icon={<FaCheckCircle />} 
          color="red" 
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        
        {/* Current & Next Class */}
        <div className="space-y-6">
          <DashboardCard title="Current Class" icon={<FaClock className="text-blue-500" />}>
            {currentClass ? renderClassCard(currentClass, 'current') : (
              <div className="p-8 text-center text-gray-500 bg-gray-50 dark:bg-gray-800/50 rounded-xl border border-dashed border-gray-200 dark:border-gray-700">
                <p>No active class right now.</p>
              </div>
            )}
          </DashboardCard>

          <DashboardCard title="Next Class" icon={<FaHourglassHalf className="text-yellow-500" />}>
            {nextClass ? renderClassCard(nextClass, 'remaining') : (
              <div className="p-8 text-center text-gray-500 bg-gray-50 dark:bg-gray-800/50 rounded-xl border border-dashed border-gray-200 dark:border-gray-700">
                <p>No upcoming classes today.</p>
              </div>
            )}
          </DashboardCard>
        </div>

        {/* Completed & Remaining Summary */}
        <div className="space-y-6">
          <DashboardCard title="Remaining Classes Today" icon={<FaHourglassHalf className="text-gray-400" />}>
             <div className="space-y-3 max-h-64 overflow-y-auto pr-2">
               {remainingClasses.length === 0 && <p className="text-gray-500 text-sm">None</p>}
               {remainingClasses.map(c => renderClassCard(c, 'remaining'))}
             </div>
          </DashboardCard>

          <DashboardCard title="Completed Classes" icon={<FaCheckCircle className="text-green-500" />}>
             <div className="space-y-3 max-h-64 overflow-y-auto pr-2">
               {completedClasses.length === 0 && <p className="text-gray-500 text-sm">None</p>}
               {completedClasses.map(c => renderClassCard(c, 'completed'))}
             </div>
          </DashboardCard>
        </div>

      </div>
    </div>
  );
};

export default DashboardHome;
