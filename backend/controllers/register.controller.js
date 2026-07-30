const jwt = require('jsonwebtoken');
const { admin, db, auth } = require('../config/firebase-admin');

const sanitizeEmail = (email) => email.replace(/[@.]/g, '_');

const verifySessionToken = (token) => {
  return new Promise((resolve, reject) => {
    jwt.verify(token, process.env.JWT_SECRET || 'super_secret_jwt_key_32_chars_long', (err, decoded) => {
      if (err) reject(err);
      resolve(decoded);
    });
  });
};

exports.registerStudent = async (req, res) => {
  try {
    const { formData, verificationToken } = req.body;
    
    // 1. Verify JWT token
    if (!verificationToken) {
      return res.status(401).json({ error: 'Verification token missing. Please verify OTP first.' });
    }

    let decodedToken;
    try {
      decodedToken = await verifySessionToken(verificationToken);
    } catch (err) {
      return res.status(401).json({ error: 'Verification token invalid or expired. Please restart registration.' });
    }

    const { email: verifiedEmail } = decodedToken;
    
    if (verifiedEmail !== formData.email) {
      return res.status(400).json({ error: 'Email mismatch. Use the verified email.' });
    }

    // 2. Check otp_requests.verified === true
    const sanitizedEmail = sanitizeEmail(verifiedEmail);
    const otpRef = db.collection('otp_requests').doc(sanitizedEmail);
    const otpDoc = await otpRef.get();

    if (!otpDoc.exists || otpDoc.data().verified !== true) {
      return res.status(400).json({ error: 'Email not verified. Please verify OTP first.' });
    }

    // 3. Validate duplicate studentId
    const existingStudent = await db.collection('students').where('studentId', '==', formData.studentId).get();
    if (!existingStudent.empty) {
      return res.status(400).json({ error: 'Student ID already registered.' });
    }



    console.log(`[REGISTER] Creating Firebase Auth user for ${verifiedEmail}...`);
    // 4. Create Firebase Auth user
    const userRecord = await auth.createUser({
      email: formData.email,
      password: formData.password,
      displayName: formData.name
    });
    
    const uid = userRecord.uid;

    // 5. Write to /students
    await db.collection('students').doc(uid).set({
      id: uid,
      studentId: formData.studentId,
      name: formData.name,
      email: formData.email,
      phone: formData.phone || '',
      branch: formData.branch || '',
      department: formData.department || '', // mapping branch to department if needed
      year: formData.year || '',
      section: formData.section || '',
      gender: formData.gender || '',
      status: 'Pending',
      createdAt: new Date()
    });

    // 6. Write to /users
    await db.collection('users').doc(uid).set({
      role: 'student',
      email: formData.email,
      status: 'Pending',
      createdAt: new Date()
    });

    // 7. Delete /otp_requests doc
    await otpRef.delete();

    console.log(`[REGISTER] ✓ Student registered: uid=${uid}`);
    res.status(201).json({ success: true, uid });

  } catch (error) {
    console.error(`[REGISTER] ✗ Failed:`, error.message);
    res.status(500).json({ error: error.message || 'Registration failed' });
  }
};

exports.registerFaculty = async (req, res) => {
  try {
    const { formData, verificationToken } = req.body;
    
    if (!verificationToken) {
      return res.status(401).json({ error: 'Verification token missing. Please verify OTP first.' });
    }

    let decodedToken;
    try {
      decodedToken = await verifySessionToken(verificationToken);
    } catch (err) {
      return res.status(401).json({ error: 'Verification token invalid or expired.' });
    }

    const { email: verifiedEmail } = decodedToken;
    
    if (verifiedEmail !== formData.email) {
      return res.status(400).json({ error: 'Email mismatch.' });
    }

    const sanitizedEmail = sanitizeEmail(verifiedEmail);
    const otpRef = db.collection('otp_requests').doc(sanitizedEmail);
    const otpDoc = await otpRef.get();

    if (!otpDoc.exists || otpDoc.data().verified !== true) {
      return res.status(400).json({ error: 'Email not verified.' });
    }

    // Validate facultyId range and duplicates
    const facultyIdNum = parseInt(formData.facultyId, 10);
    if (isNaN(facultyIdNum) || facultyIdNum < 100 || facultyIdNum > 999) {
      return res.status(400).json({ error: 'Faculty ID must be between 100 and 999.' });
    }

    const existingFac = await db.collection('faculty').where('facultyId', '==', formData.facultyId).get();
    if (!existingFac.empty) {
      return res.status(400).json({ error: 'Faculty ID already registered.' });
    }



    console.log(`[REGISTER] Creating Firebase Auth user for ${verifiedEmail}...`);
    
    const userRecord = await auth.createUser({
      email: formData.email,
      password: formData.password,
      displayName: formData.name
    });
    
    const uid = userRecord.uid;

    await db.collection('faculty').doc(uid).set({
      id: uid,
      facultyId: formData.facultyId,
      name: formData.name,
      email: formData.email,
      phone: formData.phone || '',
      department: formData.department || '',
      designation: formData.designation || '',
      status: 'Pending',
      role: 'Faculty',
      createdAt: new Date(),
      approvedBy: null,
      approvedAt: null,
      rejectedBy: null,
      rejectedAt: null
    });

    await otpRef.delete();

    console.log(`[REGISTER] ✓ Faculty registered: uid=${uid}`);
    res.status(201).json({ success: true, uid });

  } catch (error) {
    console.error(`[REGISTER] ✗ Failed:`, error.message);
    res.status(500).json({ error: error.message || 'Registration failed' });
  }
};
