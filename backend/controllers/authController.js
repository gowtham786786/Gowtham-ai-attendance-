const { db, auth } = require('../config/firebase-admin');
const { FieldValue } = require('firebase-admin/firestore');

const registerStudent = async (req, res) => {
  try {
    const { email, password, studentData, faceEmbedding } = req.body;

    if (!email || !password || !studentData || !faceEmbedding) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    // 1. Verify that the OTP was actually verified
    const otpDoc = await db.collection('otp_requests').doc(email).get();
    if (!otpDoc.exists || !otpDoc.data().verified) {
      return res.status(403).json({ error: 'Email not verified. Please complete OTP verification first.' });
    }

    // 2. Create Firebase Auth User
    let userRecord;
    try {
      userRecord = await auth.createUser({
        email: email,
        password: password,
        displayName: studentData.name,
      });
    } catch (authErr) {
      if (authErr.code === 'auth/email-already-exists') {
        return res.status(400).json({ error: 'Email is already registered' });
      }
      throw authErr;
    }

    // 3. Save Student Profile in Firestore
    const studentPayload = {
      ...studentData,
      id: userRecord.uid,
      email: email,
      role: 'student',
      status: 'pending_approval',
      faceRegistered: true,
      registrationDate: new Date().toISOString(),
      createdAt: FieldValue.serverTimestamp()
    };

    await db.collection('students').doc(userRecord.uid).set(studentPayload);
    
    // Also save basic record in users collection for RBAC
    await db.collection('users').doc(userRecord.uid).set({
      email: email,
      role: 'student',
      name: studentData.name,
      status: 'pending_approval'
    });

    // 4. Save Face Embedding
    await db.collection('face_embeddings').doc(userRecord.uid).set({
      studentId: userRecord.uid,
      embedding: faceEmbedding,
      createdAt: FieldValue.serverTimestamp()
    });

    // 5. Clean up OTP (optional but good practice)
    await db.collection('otp_requests').doc(email).delete();

    res.status(201).json({ 
      message: 'Student registered successfully', 
      uid: userRecord.uid 
    });

  } catch (error) {
    console.error('registerStudent error:', error);
    res.status(500).json({ error: 'Failed to register student', details: error.message });
  }
};

const registerFaculty = async (req, res) => {
  try {
    const { email, password, facultyData, faceEmbedding } = req.body;

    if (!email || !password || !facultyData || !faceEmbedding) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    // 1. Verify OTP
    const otpDoc = await db.collection('otp_requests').doc(email).get();
    if (!otpDoc.exists || !otpDoc.data().verified) {
      return res.status(403).json({ error: 'Email not verified.' });
    }

    // 2. Create Auth User
    let userRecord;
    try {
      userRecord = await auth.createUser({
        email: email,
        password: password,
        displayName: facultyData.name,
      });
    } catch (authErr) {
      if (authErr.code === 'auth/email-already-exists') {
        return res.status(400).json({ error: 'Email is already registered' });
      }
      throw authErr;
    }

    // 3. Save Faculty Profile
    const facultyPayload = {
      ...facultyData,
      id: userRecord.uid,
      email: email,
      role: 'Faculty',
      status: 'Pending',
      faceRegistered: true,
      registrationDate: new Date().toISOString(),
      createdAt: FieldValue.serverTimestamp(),
      approvedBy: null,
      approvedAt: null,
      rejectedBy: null,
      rejectedAt: null
    };

    await db.collection('faculty').doc(userRecord.uid).set(facultyPayload);

    // 4. Save Face Embedding
    await db.collection('face_embeddings').doc(userRecord.uid).set({
      facultyId: userRecord.uid, // Support faculty too
      embedding: faceEmbedding,
      createdAt: FieldValue.serverTimestamp()
    });

    // 5. Clean up OTP
    await db.collection('otp_requests').doc(email).delete();

    res.status(201).json({ 
      message: 'Faculty registered successfully', 
      uid: userRecord.uid 
    });

  } catch (error) {
    console.error('registerFaculty error:', error);
    res.status(500).json({ error: 'Failed to register faculty', details: error.message });
  }
};

module.exports = {
  registerStudent,
  registerFaculty
};
