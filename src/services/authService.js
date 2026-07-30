import { signInWithEmailAndPassword, createUserWithEmailAndPassword, signOut } from 'firebase/auth';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { auth, db } from '../firebase/config';

export const loginUser = async (email, password, expectedRole) => {
  const userCredential = await signInWithEmailAndPassword(auth, email, password);
  const user = userCredential.user;

  let collectionName = 'users';
  // Removed the overriding of collectionName for faculty/student since registerUserAccount saves them all to 'users'

  const userDoc = await getDoc(doc(db, collectionName, user.uid));
  const userData = userDoc.data();
  if (!userDoc.exists() || (userData.role && userData.role.toLowerCase() !== expectedRole?.toLowerCase())) {
    await signOut(auth);
    throw new Error(`Invalid credentials for ${expectedRole} portal`);
  }

  if (userData.status === 'Pending') {
    await signOut(auth);
    throw new Error('Your account is waiting for administrator approval.');
  }

  if (userData.status === 'Rejected') {
    await signOut(auth);
    throw new Error('Your registration has been rejected. Please contact the administrator.');
  }

  return user;
};

export const registerUserAccount = async (email, password, role) => {
  const userCredential = await createUserWithEmailAndPassword(auth, email, password);
  const user = userCredential.user;
  
  await setDoc(doc(db, 'users', user.uid), {
    email: user.email,
    role: role,
    status: role === 'admin' ? 'active' : 'pending',
    createdAt: new Date()
  });
  
  return user;
};

export const logoutUser = async () => {
  return await signOut(auth);
};
