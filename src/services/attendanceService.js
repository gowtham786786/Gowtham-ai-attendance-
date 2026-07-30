import { doc, setDoc } from 'firebase/firestore';
import { db } from '../firebase/config';

export const markStudentPresent = async (recordId, attendanceData) => {
  await setDoc(doc(db, 'attendance', recordId), {
    ...attendanceData,
    status: 'Present',
    timestamp: new Date()
  }, { merge: true });
};
