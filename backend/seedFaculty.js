const { db, auth } = require('./config/firebase-admin');

const seedFaculty = async () => {
  try {
    const email = 'faculty@test.com';
    const password = 'faculty123';
    
    // 1. Create Auth User
    let userRecord;
    try {
      userRecord = await auth.getUserByEmail(email);
      console.log('User already exists, updating...');
    } catch (e) {
      userRecord = await auth.createUser({
        email: email,
        password: password,
        displayName: 'Test Faculty',
      });
      console.log('Created auth user:', userRecord.uid);
    }

    // 2. Set Firestore Documents
    const facultyData = {
      id: userRecord.uid,
      name: 'Test Faculty',
      email: email,
      phone: '1234567890',
      department: 'CSE',
      designation: 'Professor',
      assignedSubjects: ['Java', 'Python'],
      sectionsHandled: ['A', 'B'],
      status: 'Active',
      role: 'faculty',
      createdAt: new Date().toISOString()
    };

    await db.collection('faculty').doc(userRecord.uid).set(facultyData);
    
    // Set basic role in users collection for RBAC
    await db.collection('users').doc(userRecord.uid).set({
      email: email,
      role: 'faculty',
      name: 'Test Faculty',
      status: 'approved'
    });

    console.log('Faculty seeded successfully! You can log in with:');
    console.log('Email: faculty@test.com');
    console.log('Password: faculty123');
    process.exit(0);
  } catch (err) {
    console.error('Error seeding faculty:', err);
    process.exit(1);
  }
};

seedFaculty();
