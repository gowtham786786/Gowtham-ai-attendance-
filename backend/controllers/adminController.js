const { db, auth } = require('../config/firebase-admin');
const { FieldValue } = require('firebase-admin/firestore');
const transporter = require('../config/mailer');

const addUser = async (req, res) => {
  try {
    const { email, password, userData, role } = req.body;
    
    if (!email || !password || !userData || !role) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    // 1. Create Firebase Auth User
    let userRecord;
    try {
      userRecord = await auth.createUser({
        email: email,
        password: password,
        displayName: userData.name,
      });
    } catch (authErr) {
      if (authErr.code === 'auth/email-already-exists') {
        return res.status(400).json({ error: 'Email is already registered' });
      }
      throw authErr;
    }

    // 2. Save Profile in Firestore
    const payload = {
      ...userData,
      id: userRecord.uid,
      email: email,
      role: role,
      status: 'approved',
      faceRegistered: false, // Need to register later
      registrationDate: new Date().toISOString(),
      createdAt: FieldValue.serverTimestamp()
    };

    const collectionName = role === 'student' ? 'students' : 'faculty';
    const finalPayload = {
      ...payload,
      role: role === 'faculty' ? 'Faculty' : role,
      status: role === 'faculty' ? 'Approved' : 'approved',
      approvedAt: role === 'faculty' ? FieldValue.serverTimestamp() : null,
      approvedBy: role === 'faculty' ? 'Admin' : null,
      rejectedAt: null,
      rejectedBy: null
    };
    
    await db.collection(collectionName).doc(userRecord.uid).set(finalPayload);
    
    if (role === 'student') {
      // Also save basic record in users collection for RBAC (students only now)
      await db.collection('users').doc(userRecord.uid).set({
        email: email,
        role: role,
        name: userData.name,
        status: 'approved'
      });
    }

    // 3. Send Welcome Email
    const mailOptions = {
      from: `"Smart Attendance System" <${process.env.EMAIL_USER}>`,
      to: email,
      subject: 'Welcome to Smart Attendance - Your Credentials',
      html: `
        <h2>Welcome ${userData.name}!</h2>
        <p>An admin has created an account for you on the Smart Attendance System.</p>
        <p><strong>Role:</strong> ${role}</p>
        <p><strong>Login Email:</strong> ${email}</p>
        <p><strong>Password:</strong> ${password}</p>
        <br/>
        <p>Please log in and update your profile and face registration.</p>
      `
    };

    try {
      await transporter.sendMail(mailOptions);
    } catch (mailErr) {
      console.error('Failed to send welcome email:', mailErr);
      // We don't fail the request if email fails, but log it
    }

    res.status(201).json({ 
      message: `${role} registered successfully by Admin`, 
      uid: userRecord.uid 
    });

  } catch (error) {
    console.error('addUser error:', error);
    res.status(500).json({ error: 'Failed to add user', details: error.message });
  }
};

const deleteUser = async (req, res) => {
  try {
    const { uid } = req.params;
    const { adminUid, role } = req.body;

    if (!uid || !adminUid || !role) {
      return res.status(400).json({ error: 'Missing required fields (uid, adminUid, role)' });
    }

    // 1. Delete from Firebase Auth
    try {
      await auth.deleteUser(uid);
    } catch (authErr) {
      console.error('Error deleting auth user:', authErr);
    }

    // 2. Delete Firestore Document
    const collectionName = role === 'student' ? 'students' : 'faculty';
    await db.collection(collectionName).doc(uid).delete();
    await db.collection('users').doc(uid).delete();
    await db.collection('face_embeddings').doc(uid).delete();

    if (role === 'student') {
        await db.collection('attendance').doc(uid).set({
            status: '[ACCOUNT DELETED]',
            deletedAt: FieldValue.serverTimestamp()
        }, { merge: true });
    }

    // 3. Log the deletion action
    await db.collection('auditLogs').add({
      action: 'USER_DELETED',
      adminUid: adminUid,
      targetUid: uid,
      targetRole: role,
      timestamp: FieldValue.serverTimestamp()
    });

    res.status(200).json({ message: 'User deleted successfully' });
  } catch (error) {
    console.error('deleteUser error:', error);
    res.status(500).json({ error: 'Failed to delete user', details: error.message });
  }
};

const getFacultyRequests = async (req, res) => {
  try {
    const snapshot = await db.collection('faculty').get();
    const requests = snapshot.docs.map(doc => doc.data());
    res.status(200).json({ success: true, data: requests });
  } catch (error) {
    console.error('getFacultyRequests Error:', error);
    if (error.code === 8 || error.message.includes('Quota exceeded')) {
      return res.status(429).json({ success: false, error: 'Database quota exceeded. Please try again tomorrow.' });
    }
    res.status(500).json({ success: false, error: error.message });
  }
};

const getStudentRequests = async (req, res) => {
  try {
    const snapshot = await db.collection('students').get();
    const requests = snapshot.docs.map(doc => doc.data());
    res.status(200).json({ success: true, data: requests });
  } catch (error) {
    console.error('getStudentRequests Error:', error);
    if (error.code === 8 || error.message.includes('Quota exceeded')) {
      return res.status(429).json({ success: false, error: 'Database quota exceeded. Please try again tomorrow.' });
    }
    res.status(500).json({ success: false, error: error.message });
  }
};

const approveFaculty = async (req, res) => {
  try {
    const { uid } = req.body;
    const requestRef = db.collection('faculty').doc(uid);
    const doc = await requestRef.get();
    if (!doc.exists) return res.status(404).json({ error: 'Faculty not found' });
    
    const data = doc.data();
    
    await requestRef.update({
      status: 'Approved',
      assignedSubjects: [],
      assignedSections: [],
      assignedYears: [],
      faceRegistered: false,
      approvedAt: FieldValue.serverTimestamp(),
      approvedBy: 'Admin'
    });

    const mailOptions = {
      from: `"Smart Attendance System" <${process.env.EMAIL_USER}>`,
      to: data.email,
      subject: 'Registration Approved',
      html: `<p>Dear User,</p><p>Your registration has been approved by the Administrator.</p><p>You can now log in to the AI Attendance System.</p><p>Thank you.</p>`
    };
    try { await transporter.sendMail(mailOptions); } catch (e) { console.error(e); }

    res.status(200).json({ message: 'Faculty approved' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

const approveStudent = async (req, res) => {
  try {
    const { uid } = req.body;
    const requestRef = db.collection('students').doc(uid);
    const doc = await requestRef.get();
    if (!doc.exists) return res.status(404).json({ error: 'Student not found' });
    
    const data = doc.data();

    await requestRef.update({
      status: 'Approved',
      faceRegistered: false,
      overallAttendance: 0
    });
    await db.collection('users').doc(uid).set({ status: 'Approved' }, { merge: true });

    const mailOptions = {
      from: `"Smart Attendance System" <${process.env.EMAIL_USER}>`,
      to: data.email,
      subject: 'Registration Approved',
      html: `<p>Dear User,</p><p>Your registration has been approved by the Administrator.</p><p>You can now log in to the AI Attendance System.</p><p>Thank you.</p>`
    };
    try { await transporter.sendMail(mailOptions); } catch (e) { console.error(e); }

    res.status(200).json({ message: 'Student approved' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

const rejectFaculty = async (req, res) => {
  try {
    const { uid } = req.body;
    const requestRef = db.collection('faculty').doc(uid);
    const doc = await requestRef.get();
    if (!doc.exists) return res.status(404).json({ error: 'Faculty not found' });
    const data = doc.data();
    
    await requestRef.update({ 
      status: 'Rejected',
      rejectedAt: FieldValue.serverTimestamp(),
      rejectedBy: 'Admin'
    });

    const mailOptions = {
      from: `"Smart Attendance System" <${process.env.EMAIL_USER}>`,
      to: data.email,
      subject: 'Registration Rejected',
      html: `<p>Dear User,</p><p>Your registration request has been rejected by the Administrator.</p><p>Please contact the Administrator for more information.</p><p>Thank you.</p>`
    };
    try { await transporter.sendMail(mailOptions); } catch (e) { console.error(e); }

    res.status(200).json({ message: 'Faculty rejected' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

const rejectStudent = async (req, res) => {
  try {
    const { uid } = req.body;
    const requestRef = db.collection('students').doc(uid);
    const doc = await requestRef.get();
    if (!doc.exists) return res.status(404).json({ error: 'Student not found' });
    const data = doc.data();
    
    await requestRef.update({ status: 'Rejected' });
    await db.collection('users').doc(uid).set({ status: 'Rejected' }, { merge: true });

    const mailOptions = {
      from: `"Smart Attendance System" <${process.env.EMAIL_USER}>`,
      to: data.email,
      subject: 'Registration Rejected',
      html: `<p>Dear User,</p><p>Your registration request has been rejected by the Administrator.</p><p>Please contact the Administrator for more information.</p><p>Thank you.</p>`
    };
    try { await transporter.sendMail(mailOptions); } catch (e) { console.error(e); }

    res.status(200).json({ message: 'Student rejected' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

module.exports = {
  addUser,
  deleteUser,
  getFacultyRequests,
  getStudentRequests,
  approveFaculty,
  approveStudent,
  rejectFaculty,
  rejectStudent
};
