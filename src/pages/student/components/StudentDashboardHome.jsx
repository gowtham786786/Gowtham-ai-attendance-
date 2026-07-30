import React, { useState, useEffect } from 'react';
import { collection, query, where, onSnapshot, doc } from 'firebase/firestore';
import { db } from '../../../firebase/config';
import { useStudent } from '../../../context/StudentContext';
import { FaClock, FaCalendarDay, FaChartLine, FaCheckCircle, FaTimesCircle, FaBook, FaBell, FaExclamationCircle } from 'react-icons/fa';
import DashboardCard from '../../../components/ui/DashboardCard';
import Skeleton from 'react-loading-skeleton';

const StudentDashboardHome = () => {
  const { studentData } = useStudent();
  const [time, setTime] = useState(new Date());
  
  // Real-time Data States
  const [timetableToday, setTimetableToday] = useState([]);
  const [pendingAttendance, setPendingAttendance] = useState([]);
  const [stats, setStats] = useState({
    present: 0,
    absent: 0,
    totalClasses: 0,
    overallPercent: 0,
    todaysAttendanceCount: 0
  });
  const [loading, setLoading] = useState(true);

  // Live clock
  useEffect(() => {
    const timer = setInterval(() => setTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  // Fetch real-time data
  useEffect(() => {
    if (!studentData?.section || !studentData?.department || !studentData?.year) return;

    // 1. Fetch Today's Timetable
    const currentDayStr = new Date().toLocaleDateString('en-US', { weekday: 'long' });
    const ttQuery = query(
      collection(db, 'timetable'),
      where('branch', '==', studentData.department),
      where('year', '==', studentData.year),
      where('section', '==', studentData.section),
      where('day', '==', currentDayStr)
    );

    const unsubTT = onSnapshot(ttQuery, (snapshot) => {
      const todayClasses = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      todayClasses.sort((a, b) => a.startTime.localeCompare(b.startTime));
      setTimetableToday(todayClasses);
    });

    // 2. Fetch Pending Attendance Sessions
    const sessionQuery = query(
      collection(db, 'attendance_sessions'),
      where('branch', '==', studentData.department),
      where('year', '==', studentData.year),
      where('section', '==', studentData.section),
      where('status', '==', 'open')
    );

    const unsubSessions = onSnapshot(sessionQuery, (snapshot) => {
      const openSessions = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      // Filter out sessions the student has already marked (we check markedStudents array)
      const pending = openSessions.filter(s => !(s.markedStudents || []).includes(studentData.id));
      setPendingAttendance(pending);
    });

    // 3. Fetch Real-time Student Stats (from seed or manual update)
    const unsubStudent = onSnapshot(doc(db, "students", studentData.id || studentData.uid), (docSnap) => {
      if (docSnap.exists()) {
        const data = docSnap.data();
        setStats(prev => ({
          ...prev,
          present: data.presentCount || 0,
          absent: data.absentCount || 0,
          totalClasses: data.totalClasses || 0,
          overallPercent: parseFloat(data.overallAttendance || 0)
        }));
      }
    });

    // 4. Fetch Today's Attendance count
    const todayStr = new Date().toISOString().split('T')[0];
    const todayAttQuery = query(
      collection(db, "attendance"),
      where("studentId", "==", studentData.id || studentData.uid),
      where("date", "==", todayStr)
    );
    
    const unsubTodayAtt = onSnapshot(todayAttQuery, (snapshot) => {
      setStats(prev => ({
        ...prev,
        todaysAttendanceCount: snapshot.size
      }));
      setLoading(false);
    });

    return () => {
      unsubTT();
      unsubSessions();
      unsubStudent();
      unsubTodayAtt();
    };
  }, [studentData]);

  const parseTimeToMinutes = (timeStr) => {
    if (!timeStr) return 0;
    const [t, modifier] = timeStr.split(' ');
    let [hours, minutes] = t.split(':');
    if (hours === '12') hours = '00';
    if (modifier === 'PM') hours = parseInt(hours, 10) + 12;
    return parseInt(hours, 10) * 60 + parseInt(minutes, 10);
  };

  const currentMinutes = time.getHours() * 60 + time.getMinutes();
  
  let currentClass = null;
  let nextClass = null;

  timetableToday.forEach(period => {
    const startMins = parseTimeToMinutes(period.startTime);
    const endMins = parseTimeToMinutes(period.endTime);

    if (currentMinutes >= startMins && currentMinutes <= endMins) {
      currentClass = period;
    } else if (currentMinutes < startMins && !nextClass) {
      nextClass = period;
    }
  });

  if (!studentData) return null;

  return (
    <div className="space-y-6 pb-10">
      {/* Date & Time Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center bg-primary/5 dark:bg-primary/10 p-6 rounded-2xl border border-primary/20">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
            Welcome back, {studentData.name.split(' ')[0]}!
          </h1>
          <p className="text-gray-500 dark:text-gray-400 mt-1 flex items-center space-x-2">
            <FaCalendarDay />
            <span>{time.toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}</span>
          </p>
        </div>
        <div className="mt-4 md:mt-0 flex items-center space-x-3 text-3xl font-mono font-bold text-primary bg-white dark:bg-gray-800 px-6 py-3 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700">
          <FaClock className="text-xl text-primary-light" />
          <span>{time.toLocaleTimeString()}</span>
        </div>
      </div>

      {pendingAttendance.length > 0 && (
        <div className="bg-gradient-to-r from-yellow-500 to-amber-500 rounded-2xl p-6 text-white shadow-lg flex items-center justify-between animate-pulse-slow">
          <div className="flex items-center space-x-4">
            <div className="bg-white/20 p-3 rounded-full text-2xl">
              <FaExclamationCircle />
            </div>
            <div>
              <h3 className="font-bold text-xl">Attendance Open!</h3>
              <p className="text-yellow-50 text-sm mt-1">You have {pendingAttendance.length} pending attendance session(s) to mark.</p>
            </div>
          </div>
          <button className="bg-white text-yellow-600 font-bold px-6 py-2.5 rounded-lg shadow-sm hover:bg-yellow-50 transition-colors">
            Mark Now
          </button>
        </div>
      )}

      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          <Skeleton height={120} count={4} className="rounded-2xl" />
        </div>
      ) : (
        <>
          {/* Main Stat Row */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            <DashboardCard
              title="Overall Attendance"
              value={`${stats.overallPercent}%`}
              icon={<FaChartLine />}
              color={stats.overallPercent >= 75 ? 'green' : stats.overallPercent >= 65 ? 'yellow' : 'red'}
              trend={`${stats.present} classes attended`}
            />
            <DashboardCard
              title="Today's Attendance"
              value={stats.todaysAttendanceCount}
              icon={<FaCheckCircle />}
              color="indigo"
              trend={currentClass ? 'In Progress' : 'Completed'}
            />
            <DashboardCard
              title="Total Present"
              value={stats.present}
              icon={<FaCheckCircle />}
              color="green"
            />
            <DashboardCard
              title="Total Absent"
              value={stats.absent}
              icon={<FaTimesCircle />}
              color="red"
            />
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="glass-card p-6 rounded-2xl border-l-4 border-primary shadow-sm relative overflow-hidden">
              <div className="absolute top-0 right-0 p-8 opacity-5">
                <FaChalkboardTeacher className="text-9xl" />
              </div>
              <h3 className="text-sm font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-4">Current Class</h3>
              {currentClass ? (
                <div>
                  <h2 className="text-3xl font-black text-gray-900 dark:text-white mb-2">{currentClass.subject}</h2>
                  <p className="text-lg text-gray-600 dark:text-gray-300 font-medium mb-4 flex items-center space-x-2">
                    <span>{currentClass.facultyName}</span>
                    <span className="text-gray-300 dark:text-gray-600">•</span>
                    <span>Room {currentClass.roomNumber || 'TBA'}</span>
                  </p>
                  <div className="inline-block bg-primary/10 text-primary font-bold px-4 py-2 rounded-lg">
                    {currentClass.startTime} - {currentClass.endTime}
                  </div>
                </div>
              ) : (
                <div className="py-8">
                  <p className="text-gray-500 dark:text-gray-400 font-medium">No class running currently.</p>
                </div>
              )}
            </div>

            <div className="glass-card p-6 rounded-2xl border-l-4 border-indigo-500 shadow-sm relative overflow-hidden">
              <h3 className="text-sm font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-4">Next Class</h3>
              {nextClass ? (
                <div>
                  <h2 className="text-2xl font-black text-gray-900 dark:text-white mb-2">{nextClass.subject}</h2>
                  <p className="text-gray-600 dark:text-gray-300 font-medium mb-4 flex items-center space-x-2">
                    <span>{nextClass.facultyName}</span>
                    <span className="text-gray-300 dark:text-gray-600">•</span>
                    <span>Room {nextClass.roomNumber || 'TBA'}</span>
                  </p>
                  <div className="inline-block bg-indigo-50 dark:bg-indigo-900/20 text-indigo-600 dark:text-indigo-400 font-bold px-4 py-2 rounded-lg">
                    Starts at {nextClass.startTime}
                  </div>
                </div>
              ) : (
                <div className="py-8 text-center">
                  <FaCheckCircle className="text-4xl text-green-500 mx-auto mb-3" />
                  <p className="text-gray-500 dark:text-gray-400 font-medium">You have no more classes today!</p>
                </div>
              )}
            </div>
          </div>
        </>
      )}
    </div>
  );
};

export default StudentDashboardHome;
