import React, { createContext, useContext, useState, useEffect } from 'react';
import { doc, onSnapshot } from 'firebase/firestore';
import { db, auth } from '../firebase/config';
import { useAuth } from './AuthContext';
import { toast } from 'react-toastify';
import { useNavigate } from 'react-router-dom';
import { signOut } from 'firebase/auth';
import Skeleton from 'react-loading-skeleton';
import 'react-loading-skeleton/dist/skeleton.css';

const FacultyContext = createContext();

export const useFaculty = () => useContext(FacultyContext);

export const FacultyProvider = ({ children }) => {
  const { currentUser, userRole, loading: authLoading } = useAuth();
  const [facultyData, setFacultyData] = useState(null);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    if (authLoading) return;

    if (!currentUser || userRole !== 'faculty') {
      setLoading(false);
      navigate('/faculty/login');
      return;
    }

    const facultyRef = doc(db, 'faculty', currentUser.uid);
    
    const unsub = onSnapshot(facultyRef, (docSnap) => {
      if (docSnap.exists()) {
        const data = docSnap.data();
        const statusStr = data.status?.toLowerCase() || '';
        // Allow 'active' or 'approved' (as created by adminController)
        if (statusStr !== 'active' && statusStr !== 'approved') {
          toast.error('Your account is inactive. Contact Admin.');
          signOut(auth);
          navigate('/faculty/login');
        } else {
          setFacultyData({ id: docSnap.id, ...data });
        }
      } else {
        toast.error('Account not configured by Admin.');
        signOut(auth);
        navigate('/faculty/login');
      }
      setLoading(false);
    }, (error) => {
      console.error("Faculty real-time sync error", error);
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
    <FacultyContext.Provider value={{ facultyData, loading }}>
      {children}
    </FacultyContext.Provider>
  );
};
