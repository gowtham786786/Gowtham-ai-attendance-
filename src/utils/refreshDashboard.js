import { doc, getDoc, collection, query, where, getDocs } from 'firebase/firestore';
import { db } from '../firebase/config';

export const refreshAnalytics = async (uid, role) => {
  try {
    if (role === "student") {
      // Re-fetch student doc to update overall percentages
      const studentDoc = await getDoc(doc(db, "students", uid));
      if (studentDoc.exists()) {
        const data = studentDoc.data();
        // Since React Query / Context typically handles global state, this utility 
        // can return the latest data so components can update their local state or store.
        return data;
      }
    }
    
    if (role === "faculty") {
      // Return attendance sessions created by this faculty
      const attQuery = query(collection(db, "attendance"), where("facultyId", "==", uid));
      const attSnap = await getDocs(attQuery);
      return attSnap.docs.map(d => d.data());
    }
    
    if (role === "admin") {
      // Admin dashboard uses onSnapshot hooks directly in Overview.jsx
      // So this might just be a manual trigger for Recharts if needed.
      const overall = await getDoc(doc(db, "analytics", "overall"));
      return overall.data();
    }
    
    return null;
  } catch (error) {
    console.error("Failed to refresh dashboard:", error);
    throw error;
  }
};
