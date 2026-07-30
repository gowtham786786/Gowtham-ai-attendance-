import React, { createContext, useContext, useState, useEffect } from 'react';
import { doc, onSnapshot } from 'firebase/firestore';
import { db, auth } from '../firebase/config';
import { useAuth } from './AuthContext';
import { toast } from 'react-toastify';
import { useNavigate, useLocation } from 'react-router-dom';
import { signOut } from 'firebase/auth';
import Skeleton from 'react-loading-skeleton';
import 'react-loading-skeleton/dist/skeleton.css';

const StudentContext = createContext();

export const useStudent = () => useContext(StudentContext);

export const StudentProvider = ({ children }) => {
  const { currentUser, userRole, loading: authLoading } = useAuth();
  const [studentData, setStudentData] = useState(null);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();
  const location = useLocation();

  // Enforce Face Registration Redirect
  useEffect(() => {
    if (!studentData) return;
    if (studentData.faceRegistered === false && location.pathname !== '/student/face-registration') {
      navigate('/student/face-registration');
    } else if (studentData.faceRegistered === true && location.pathname === '/student/face-registration') {
      navigate('/student/dashboard');
    }
  }, [studentData, location.pathname, navigate]);

  useEffect(() => {
    if (authLoading) return;

    if (!currentUser || userRole !== 'student') {
      setLoading(false);
      navigate('/student/login');
      return;
    }

    const studentRef = doc(db, 'students', currentUser.uid);
    
    const unsub = onSnapshot(studentRef, (docSnap) => {
      if (docSnap.exists()) {
        const data = docSnap.data();
        
        const statusStr = data.status?.toLowerCase() || '';
        // 1. Check if Status is Active
        if (statusStr !== 'active' && statusStr !== 'approved') {
          toast.error('Your account is inactive. Contact Admin.');
          signOut(auth);
          navigate('/student/login');
          return;
        }

        // 2. Data Matching Rule (Ensure vital fields exist)
        if (!data.branch || !data.year || !data.section) {
          toast.warning('Profile setup incomplete. Please contact Admin.');
        }

        setStudentData({ id: docSnap.id, ...data });
      } else {
        toast.error('Account not configured by Admin.');
        signOut(auth);
        navigate('/student/login');
      }
      setLoading(false);
    }, (error) => {
      console.error("Student real-time sync error", error);
      toast.error("Lost connection to real-time sync.");
      setLoading(false);
    });

    return () => unsub();
  }, [currentUser, userRole, authLoading, navigate]);

  if (loading || authLoading) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center min-h-screen bg-gray-50 dark:bg-gray-900 space-y-4">
        <Skeleton height={40} width={300} />
        <Skeleton height={200} width={500} />
      </div>
    );
  }

  return (
    <StudentContext.Provider value={{ studentData, loading }}>
      {children}
    </StudentContext.Provider>
  );
};
