import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";
import { getStorage } from "firebase/storage";
import { getFunctions } from "firebase/functions";

const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY || "AIzaSyDrUPQghytYG_XkyOTYop8Ch5puthClBlE",
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN || "ai-attendance-system-edbe3.firebaseapp.com",
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID || "ai-attendance-system-edbe3",
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET || "ai-attendance-system-edbe3.firebasestorage.app",
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID || "191168381188",
  appId: import.meta.env.VITE_FIREBASE_APP_ID || "1:191168381188:web:91d1b3ece29318a95f1051",
  measurementId: import.meta.env.VITE_FIREBASE_MEASUREMENT_ID || "G-X1W3KCY5QT"
};

const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getFirestore(app);
export const storage = getStorage(app);
export const functions = getFunctions(app);

export default app;
