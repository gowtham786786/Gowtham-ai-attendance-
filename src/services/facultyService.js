import { doc, setDoc } from 'firebase/firestore';
import { db } from '../firebase/config';

export const createFacultyProfile = async (uid, facultyData) => {
  await setDoc(doc(db, 'faculty', uid), {
    ...facultyData,
    uid,
    createdAt: new Date(),
    status: 'active'
  });
};
