import { collection, query, getDocs, doc, setDoc } from 'firebase/firestore';
import { ref, uploadString, getDownloadURL } from 'firebase/storage';
import { db, storage } from '../firebase/config';

export const createStudentProfile = async (uid, studentData, faceEmbedding, referenceImage) => {
  let profileImageUrl = null;
  if (referenceImage) {
    try {
      const imageRef = ref(storage, `profile_images/${uid}.jpg`);
      await uploadString(imageRef, referenceImage, 'data_url');
      profileImageUrl = await getDownloadURL(imageRef);
    } catch (err) {
      console.error("Error uploading profile image:", err);
    }
  }

  await setDoc(doc(db, 'students', uid), {
    ...studentData,
    uid,
    profileImageUrl,
    faceRegistered: true,
    registrationDate: new Date().toISOString(),
    createdAt: new Date(),
    status: 'pending_approval'
  });

  await setDoc(doc(db, 'face_embeddings', uid), {
    embedding: faceEmbedding,
    studentId: studentData.studentId,
    updatedAt: new Date()
  });
};

export const getStudentsBySection = async (section, department) => {
  const studentsSnapshot = await getDocs(query(collection(db, 'students')));
  const sectionStudents = [];
  studentsSnapshot.forEach(doc => {
    if (doc.data().section === section && doc.data().branch === department) {
      sectionStudents.push(doc.data());
    }
  });
  return sectionStudents;
};

export const getValidFaceEmbeddings = async (sectionStudents) => {
  const embeddingsSnapshot = await getDocs(query(collection(db, 'face_embeddings')));
  const validEmbeddings = [];
  embeddingsSnapshot.forEach(doc => {
    const studentInfo = sectionStudents.find(s => s.uid === doc.id);
    if (studentInfo) {
      validEmbeddings.push({
        uid: doc.id,
        studentId: studentInfo.studentId,
        name: studentInfo.name,
        descriptor: new Float32Array(doc.data().embedding)
      });
    }
  });
  return validEmbeddings;
};
