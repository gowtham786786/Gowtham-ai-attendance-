import React, { useState, useEffect } from 'react';
import { collection, query, where, onSnapshot } from 'firebase/firestore';
import { db } from '../../../firebase/config';
import { useStudent } from '../../../context/StudentContext';
import { FaClock, FaChalkboardTeacher, FaDoorOpen, FaExclamationTriangle } from 'react-icons/fa';
import Skeleton from 'react-loading-skeleton';

const DAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

const StudentTimetable = () => {
  const { studentData } = useStudent();
  const [timetable, setTimetable] = useState({});
  const [loading, setLoading] = useState(true);

  // Parse current time to compare
  const now = new Date();
  const currentDayStr = now.toLocaleDateString('en-US', { weekday: 'long' });
  const currentMinutes = now.getHours() * 60 + now.getMinutes();

  useEffect(() => {
    if (!studentData) return;

    const q = query(
      collection(db, 'timetable'),
      where('branch', '==', studentData.department),
      where('year', '==', studentData.year),
      where('section', '==', studentData.section)
    );

    const unsub = onSnapshot(q, (snapshot) => {
      const parsedData = {};
      DAYS.forEach(day => parsedData[day] = []);

      snapshot.docs.forEach(doc => {
        const data = doc.data();
        if (parsedData[data.day]) {
          parsedData[data.day].push({ id: doc.id, ...data });
        }
      });

      // Sort periods by startTime
      Object.keys(parsedData).forEach(day => {
        parsedData[day].sort((a, b) => a.startTime.localeCompare(b.startTime));
      });

      setTimetable(parsedData);
      setLoading(false);
    });

    return () => unsub();
  }, [studentData]);

  const parseTimeToMinutes = (timeStr) => {
    if (!timeStr) return 0;
    const [time, modifier] = timeStr.split(' ');
    let [hours, minutes] = time.split(':');
    if (hours === '12') {
      hours = '00';
    }
    if (modifier === 'PM') {
      hours = parseInt(hours, 10) + 12;
    }
    return parseInt(hours, 10) * 60 + parseInt(minutes, 10);
  };

  const getPeriodStatus = (day, period) => {
    if (day !== currentDayStr) return 'default';
    
    const startMins = parseTimeToMinutes(period.startTime);
    const endMins = parseTimeToMinutes(period.endTime);

    if (currentMinutes >= startMins && currentMinutes <= endMins) {
      return 'current';
    } else if (currentMinutes < startMins) {
      return 'upcoming';
    }
    return 'past';
  };

  if (!studentData) return null;

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white">Class Timetable</h2>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
            {studentData.department} • Year {studentData.year} • Section {studentData.section}
          </p>
        </div>
      </div>

      {!studentData.branch || !studentData.year || !studentData.section ? (
        <div className="bg-yellow-50 dark:bg-yellow-900/20 border-l-4 border-yellow-400 p-4 rounded-md flex space-x-3">
          <FaExclamationTriangle className="text-yellow-500 text-xl" />
          <p className="text-sm text-yellow-800 dark:text-yellow-300">
            <strong>Incomplete Profile:</strong> Your branch, year, or section is missing. Contact Admin to complete your profile to view the timetable.
          </p>
        </div>
      ) : loading ? (
        <div className="space-y-4">
          <Skeleton height={150} />
          <Skeleton height={150} />
          <Skeleton height={150} />
        </div>
      ) : (
        <div className="grid grid-cols-1 xl:grid-cols-2 gap-6 pb-10">
          {DAYS.map(day => (
            <div key={day} className={`glass-card p-6 rounded-2xl ${currentDayStr === day ? 'border-2 border-primary shadow-lg dark:shadow-primary/10' : ''}`}>
              <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-4 border-b border-gray-200 dark:border-gray-700 pb-2 flex items-center justify-between">
                <span>{day}</span>
                {currentDayStr === day && <span className="text-xs bg-primary/10 text-primary px-2 py-1 rounded-full">Today</span>}
              </h3>
              
              <div className="space-y-3">
                {timetable[day] && timetable[day].length > 0 ? (
                  timetable[day].map((period, idx) => {
                    const status = getPeriodStatus(day, period);
                    let statusClasses = "bg-gray-50 dark:bg-gray-800 border-transparent text-gray-700 dark:text-gray-300";
                    
                    if (status === 'current') {
                      statusClasses = "bg-primary/5 dark:bg-primary/10 border-primary shadow-sm animate-pulse-slow border-l-4";
                    } else if (status === 'upcoming') {
                      statusClasses = "bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-600 border border-l-2 opacity-80";
                    } else if (status === 'past') {
                      statusClasses = "bg-gray-50 dark:bg-gray-800 border-transparent opacity-60";
                    }

                    return (
                      <div key={period.id} className={`p-4 rounded-xl border transition-all ${statusClasses}`}>
                        <div className="flex justify-between items-start mb-2">
                          <h4 className={`font-bold ${status === 'current' ? 'text-primary' : 'text-gray-900 dark:text-white'}`}>
                            {period.subject}
                          </h4>
                          <span className="text-xs font-semibold bg-white dark:bg-gray-900 px-2 py-1 rounded shadow-sm border border-gray-200 dark:border-gray-700 whitespace-nowrap">
                            <FaClock className="inline mr-1 text-primary" />
                            {period.startTime} - {period.endTime}
                          </span>
                        </div>
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between text-sm text-gray-500 dark:text-gray-400 gap-2">
                          <span className="flex items-center">
                            <FaChalkboardTeacher className="mr-1.5" />
                            {period.facultyName}
                          </span>
                          <span className="flex items-center font-medium bg-gray-100 dark:bg-gray-700 px-2 py-0.5 rounded text-xs">
                            <FaDoorOpen className="mr-1" />
                            Room {period.roomNumber || 'TBA'}
                          </span>
                        </div>
                      </div>
                    );
                  })
                ) : (
                  <p className="text-sm text-gray-400 dark:text-gray-500 italic text-center py-6 bg-gray-50 dark:bg-gray-800 rounded-lg">
                    No classes scheduled.
                  </p>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default StudentTimetable;
