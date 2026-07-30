import React, { useState, useEffect, useRef } from 'react';
import { collection, query, where, onSnapshot, doc, getDoc, setDoc, updateDoc, serverTimestamp, arrayUnion, increment } from 'firebase/firestore';
import { db } from '../../../firebase/config';
import { useStudent } from '../../../context/StudentContext';
import * as faceapi from 'face-api.js';
import { toast } from 'react-toastify';
import { FaCamera, FaCheckCircle, FaTimesCircle, FaClock, FaExclamationTriangle } from 'react-icons/fa';
import Skeleton from 'react-loading-skeleton';

const MarkAttendance = () => {
  const { studentData } = useStudent();
  const [sessions, setSessions] = useState([]);
  const [loadingSessions, setLoadingSessions] = useState(true);
  
  // Face Verification State
  const [activeSession, setActiveSession] = useState(null);
  const [isCameraActive, setIsCameraActive] = useState(false);
  const [stream, setStream] = useState(null);
  const [verifying, setVerifying] = useState(false);
  const [modelsLoaded, setModelsLoaded] = useState(false);
  
  const videoRef = useRef(null);

  useEffect(() => {
    const loadModels = async () => {
      try {
        await Promise.all([
          faceapi.nets.ssdMobilenetv1.loadFromUri('/models'),
          faceapi.nets.faceLandmark68Net.loadFromUri('/models'),
          faceapi.nets.faceRecognitionNet.loadFromUri('/models')
        ]);
        setModelsLoaded(true);
      } catch (err) {
        console.error('Error loading models:', err);
      }
    };
    loadModels();
  }, []);

  useEffect(() => {
    if (!studentData) return;

    const q = query(
      collection(db, 'attendance_sessions'),
      where('branch', '==', studentData.department),
      where('year', '==', studentData.year),
      where('section', '==', studentData.section),
      where('status', '==', 'open')
    );

    const unsub = onSnapshot(q, (snapshot) => {
      const openSessions = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      
      // Filter out sessions already marked
      const pending = openSessions.filter(s => !(s.markedStudents || []).includes(studentData.id));
      setSessions(pending);
      setLoadingSessions(false);
    });

    return () => unsub();
  }, [studentData]);

  // Attach stream to video when active
  useEffect(() => {
    if (isCameraActive && videoRef.current && stream) {
      videoRef.current.srcObject = stream;
    }
  }, [isCameraActive, stream]);

  const startCamera = async (session) => {
    if (!studentData.faceRegistered) {
      toast.error('Please register your face in your Profile first!');
      return;
    }
    setActiveSession(session);
    try {
      const mediaStream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: "user" } });
      setStream(mediaStream);
      setIsCameraActive(true);
    } catch (err) {
      console.error(err);
      toast.error('Camera access denied or failed.');
    }
  };

  const stopCamera = () => {
    if (stream) {
      stream.getTracks().forEach(track => track.stop());
    }
    setStream(null);
    setIsCameraActive(false);
    setActiveSession(null);
  };

  const verifyAndMark = async () => {
    if (!videoRef.current || !activeSession) return;
    setVerifying(true);
    
    try {
      // 1. Fetch stored embedding
      const embedDoc = await getDoc(doc(db, 'face_embeddings', studentData.id));
      if (!embedDoc.exists()) {
        toast.error('Stored face data not found. Please re-register your face.');
        setVerifying(false);
        stopCamera();
        return;
      }
      
      const storedEmbedding = new Float32Array(embedDoc.data().embedding);

      // 2. Detect live face
      const options = new faceapi.SsdMobilenetv1Options({ minConfidence: 0.2 });
      const detection = await faceapi.detectSingleFace(videoRef.current, options)
        .withFaceLandmarks()
        .withFaceDescriptor();

      if (!detection) {
        toast.error('No face detected. Please look clearly at the camera.');
        setVerifying(false);
        return;
      }

      // 3. Compare Descriptors
      const liveDescriptor = detection.descriptor;
      const distance = faceapi.euclideanDistance(storedEmbedding, liveDescriptor);
      
      console.log(`Face distance: ${distance}`);

      // Threshold is 0.5 for match
      if (distance < 0.5) {
        // MATCH! Mark Attendance
        const recordId = `${activeSession.id}_${studentData.id}`;
        
        await setDoc(doc(db, `attendance/${studentData.id}/records`, recordId), {
          sessionId: activeSession.id,
          date: activeSession.date,
          day: activeSession.day,
          subject: activeSession.subject,
          facultyId: activeSession.facultyId,
          facultyName: activeSession.facultyName,
          branch: studentData.department,
          year: studentData.year,
          section: studentData.section,
          period: activeSession.period,
          timeIn: new Date().toLocaleTimeString(),
          status: 'Present',
          markedBy: 'face_recognition',
          verificationScore: distance,
          timestamp: serverTimestamp()
        });

        // Update Session Document
        await updateDoc(doc(db, 'attendance_sessions', activeSession.id), {
          presentCount: increment(1),
          markedStudents: arrayUnion(studentData.id)
        });

        toast.success(`Success! Attendance marked for ${activeSession.subject}.`);
        stopCamera();
      } else {
        // NO MATCH
        toast.error('Face verification failed! Distance too high.');
        
        // Log failure
        await setDoc(doc(db, `face_verification_logs`, `${Date.now()}_${studentData.id}`), {
          studentId: studentData.id,
          sessionId: activeSession.id,
          distance: distance,
          timestamp: serverTimestamp(),
          status: 'failed'
        });
      }
    } catch (err) {
      console.error(err);
      toast.error('Verification process encountered an error.');
    } finally {
      setVerifying(false);
    }
  };

  if (!studentData) return null;

  return (
    <div className="space-y-6 max-w-4xl mx-auto pb-10">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white">Pending Attendance</h2>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
            Complete face verification to mark your presence.
          </p>
        </div>
      </div>

      {!studentData.faceRegistered && (
        <div className="bg-red-50 dark:bg-red-900/20 border-l-4 border-red-500 p-4 rounded-md flex space-x-3 mb-6">
          <FaExclamationTriangle className="text-red-500 text-xl" />
          <p className="text-sm text-red-800 dark:text-red-300 font-medium">
            You have not registered your face. You cannot mark attendance until your face is registered in your Profile.
          </p>
        </div>
      )}

      {loadingSessions ? (
        <Skeleton height={150} />
      ) : sessions.length === 0 ? (
        <div className="glass-card p-12 rounded-2xl flex flex-col items-center justify-center text-center">
          <div className="bg-gray-100 dark:bg-gray-800 p-4 rounded-full mb-4 text-gray-400 dark:text-gray-500 text-4xl">
            <FaCheckCircle />
          </div>
          <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-2">You're all caught up!</h3>
          <p className="text-gray-500 dark:text-gray-400">There are no active attendance sessions for your class right now.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-6">
          {sessions.map(session => (
            <div key={session.id} className="glass-card p-6 rounded-2xl border-l-4 border-green-500 shadow-sm flex flex-col md:flex-row justify-between items-center gap-4">
              <div>
                <div className="flex items-center space-x-2 mb-1">
                  <span className="bg-green-100 text-green-700 text-xs font-bold px-2 py-0.5 rounded uppercase tracking-wider animate-pulse-slow">Live</span>
                  <span className="text-sm text-gray-500 font-medium"><FaClock className="inline mr-1" /> Period {session.period}</span>
                </div>
                <h3 className="text-xl font-bold text-gray-900 dark:text-white">{session.subject}</h3>
                <p className="text-gray-600 dark:text-gray-300 font-medium">{session.facultyName}</p>
              </div>

              {!isCameraActive || activeSession?.id !== session.id ? (
                <button
                  onClick={() => startCamera(session)}
                  disabled={!modelsLoaded || !studentData.faceRegistered}
                  className="btn-primary flex items-center space-x-2 py-3 px-6 text-lg"
                >
                  <FaCamera /> <span>{modelsLoaded ? 'Start Verification' : 'Loading Models...'}</span>
                </button>
              ) : (
                <div className="flex flex-col items-center space-y-4 bg-gray-50 dark:bg-gray-800 p-4 rounded-xl border border-gray-200 dark:border-gray-700 w-full md:w-auto">
                  <video ref={videoRef} autoPlay playsInline muted className="w-64 h-48 bg-black rounded-lg object-cover shadow-inner transform scale-x-[-1]" />
                  <div className="flex space-x-3 w-full">
                    <button onClick={stopCamera} className="flex-1 bg-gray-500 text-white py-2 rounded-lg hover:bg-gray-600 transition-colors">
                      Cancel
                    </button>
                    <button onClick={verifyAndMark} disabled={verifying} className="flex-1 bg-green-600 text-white py-2 rounded-lg font-bold hover:bg-green-700 shadow-sm disabled:opacity-50 transition-all hover:scale-105 disabled:transform-none">
                      {verifying ? 'Scanning...' : 'Verify Me'}
                    </button>
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default MarkAttendance;
