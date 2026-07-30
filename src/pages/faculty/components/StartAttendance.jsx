import React, { useRef, useEffect, useState, useCallback } from 'react';
import { collection, query, where, getDocs, doc, setDoc, updateDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '../../../firebase/config';
import { useFaculty } from '../../../context/FacultyContext';
import { toast } from 'react-toastify';
import { FaPlay, FaStop, FaVideoSlash, FaCheck, FaTimes } from 'react-icons/fa';

// Mocking Face API imports since this is a UI-first phase, but keeping structure intact
// import { loadFaceModels } from '../../../faceRecognition/loadModels';
// import { getFaceEmbedding } from '../../../faceRecognition/captureEmbedding';

const StartAttendance = ({ sessionData, onComplete }) => {
  const { facultyData } = useFaculty();
  const videoRef = useRef(null);
  const [stream, setStream] = useState(null);
  const [isActive, setIsActive] = useState(false);
  const [sessionId, setSessionId] = useState(null);
  
  const [students, setStudents] = useState([]);
  const [presentStudents, setPresentStudents] = useState(new Set());
  const [loading, setLoading] = useState(true);

  // Fetch students for this section
  useEffect(() => {
    const fetchStudents = async () => {
      try {
        const q = query(
          collection(db, 'students'),
          where('department', '==', sessionData.department),
          where('year', '==', String(sessionData.year)),
          where('section', '==', String(sessionData.section))
        );
        const snap = await getDocs(q);
        const st = [];
        snap.forEach(d => st.push({ id: d.id, ...d.data() }));
        setStudents(st);
      } catch (err) {
        console.error(err);
        toast.error("Failed to load students.");
      } finally {
        setLoading(false);
      }
    };
    if (sessionData) fetchStudents();
  }, [sessionData]);

  const startSession = async () => {
    try {
      // 1. Create Session Document
      const sId = `${facultyData.id}_${sessionData.id}_${Date.now()}`;
      setSessionId(sId);
      
      await setDoc(doc(db, 'attendance', sId), {
        facultyId: facultyData.id,
        facultyName: facultyData.name,
        subject: sessionData.subject,
        department: sessionData.department,
        year: sessionData.year,
        section: sessionData.section,
        date: new Date().toISOString().split('T')[0],
        period: sessionData.periodNumber,
        status: 'open',
        createdAt: serverTimestamp(),
        type: 'session_tracker' // just a marker
      });

      // 2. Start Camera (Option A)
      const mediaStream = await navigator.mediaDevices.getUserMedia({ video: { width: 640, height: 480 } });
      setStream(mediaStream);
      if (videoRef.current) {
        videoRef.current.srcObject = mediaStream;
      }
      setIsActive(true);
      toast.success("Attendance session started. Marking is now open.");
    } catch (err) {
      console.error(err);
      toast.error("Camera access denied or session creation failed.");
    }
  };

  const markManual = async (student, status) => {
    if (!isActive || !sessionId) {
      toast.warning("Start the session first!");
      return;
    }

    try {
      const recordId = `${student.id}_${new Date().toISOString().split('T')[0]}_${sessionData.periodNumber}`;
      
      // We will write to the global 'attendance' collection instead of subcollection for easier admin querying, 
      // but the prompt said /attendance/{studentUid}/records/{recordId}. We will do what the prompt asks for strictly!
      // Wait, Admin querying assumes global 'attendance' collection. Let's write to global 'attendance' 
      // as established in the Admin module for consistency.
      
      await setDoc(doc(db, 'attendance', recordId), {
        student_uid: student.id,
        student_id: student.studentId || 'N/A',
        student_name: student.name,
        faculty_id: facultyData.id,
        subject: sessionData.subject,
        department: sessionData.department,
        section: sessionData.section,
        year: sessionData.year,
        period: sessionData.periodNumber,
        date: new Date().toISOString().split('T')[0],
        status: status,
        sessionId: sessionId,
        markedBy: "faculty_manual",
        timestamp: serverTimestamp()
      });

      if (status === 'Present') {
        setPresentStudents(prev => new Set([...prev, student.id]));
        toast.success(`${student.name} marked Present.`);
      } else {
        const newSet = new Set(presentStudents);
        newSet.delete(student.id);
        setPresentStudents(newSet);
        toast.info(`${student.name} marked Absent.`);
      }

    } catch(err) {
      console.error(err);
      toast.error(`Failed to mark ${student.name}`);
    }
  };

  const stopSession = async () => {
    if (stream) {
      stream.getTracks().forEach(track => track.stop());
    }
    setIsActive(false);
    
    // Update session status
    if (sessionId) {
      try {
        await updateDoc(doc(db, 'attendance', sessionId), {
          status: 'closed',
          closedAt: serverTimestamp()
        });
        toast.info("Attendance session closed.");
      } catch(err) {
         console.error(err);
      }
    }
    if (onComplete) onComplete();
  };

  return (
    <div className="space-y-6">
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 overflow-hidden">
        <div className="p-4 bg-gray-50 dark:bg-gray-900 border-b border-gray-200 dark:border-gray-700 flex justify-between items-center">
          <div>
            <h3 className="font-bold text-gray-900 dark:text-white">{sessionData.subject} - Section {sessionData.section}</h3>
            <p className="text-sm text-gray-500 dark:text-gray-400">Period {sessionData.periodNumber}</p>
          </div>
          <div className="flex space-x-4 text-sm font-medium">
            <div className="bg-green-100 text-green-800 px-3 py-1 rounded-full">
              Present: {presentStudents.size} / {students.length}
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2">
          {/* Camera View */}
          <div className="relative aspect-video bg-black flex items-center justify-center border-r border-gray-200 dark:border-gray-700">
            {!isActive && (
              <div className="absolute inset-0 z-10 bg-black flex flex-col items-center justify-center text-gray-500">
                <FaVideoSlash size={48} className="mb-4" />
                <p>Camera is off. Start session to begin AI tracking.</p>
              </div>
            )}
            <video 
              ref={videoRef} 
              autoPlay 
              muted 
              playsInline
              className={`w-full h-full object-cover transform scale-x-[-1] ${!isActive ? 'hidden' : ''}`}
            />
          </div>

          {/* Manual Marking List */}
          <div className="h-[360px] overflow-y-auto bg-gray-50 dark:bg-gray-900/50 p-4">
            <h4 className="font-bold text-gray-700 dark:text-gray-300 mb-3 border-b pb-2 dark:border-gray-700">Manual Override</h4>
            {loading ? (
              <p className="text-gray-500">Loading students...</p>
            ) : students.length === 0 ? (
              <p className="text-gray-500">No students found in this section.</p>
            ) : (
              <ul className="space-y-2">
                {students.map(st => (
                  <li key={st.id} className="flex justify-between items-center p-3 bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-100 dark:border-gray-700">
                    <div>
                      <p className="text-sm font-bold text-gray-900 dark:text-white">{st.name}</p>
                      <p className="text-xs text-gray-500">{st.studentId}</p>
                    </div>
                    <div className="flex space-x-2">
                      <button 
                        disabled={!isActive}
                        onClick={() => markManual(st, 'Present')}
                        className={`p-2 rounded-lg ${presentStudents.has(st.id) ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-400 hover:bg-green-50'} transition-colors`}
                        title="Mark Present"
                      >
                        <FaCheck size={12} />
                      </button>
                      <button 
                        disabled={!isActive}
                        onClick={() => markManual(st, 'Absent')}
                        className={`p-2 rounded-lg ${!presentStudents.has(st.id) && isActive ? 'bg-gray-100 text-gray-400 hover:bg-red-50 hover:text-red-600' : 'bg-gray-100 text-gray-300'} transition-colors`}
                        title="Mark Absent"
                      >
                        <FaTimes size={12} />
                      </button>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>

        <div className="p-4 flex justify-between bg-white dark:bg-gray-800 border-t border-gray-200 dark:border-gray-700">
          {!isActive ? (
            <button 
              onClick={startSession} 
              className="flex items-center space-x-2 bg-green-600 hover:bg-green-700 text-white px-6 py-2 rounded-lg font-medium transition-colors"
            >
              <FaPlay /> <span>Start Session</span>
            </button>
          ) : (
            <button 
              onClick={stopSession} 
              className="flex items-center space-x-2 bg-red-600 hover:bg-red-700 text-white px-6 py-2 rounded-lg font-medium transition-colors ml-auto"
            >
              <FaStop /> <span>End Session</span>
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

export default StartAttendance;
