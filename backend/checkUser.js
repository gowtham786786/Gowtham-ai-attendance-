const { auth, db } = require('./config/firebase-admin');

async function checkUser(email) {
  try {
    const userRecord = await auth.getUserByEmail(email);
    console.log('User found in Firebase Auth:', userRecord.toJSON());
    
    // Also check Firestore collections
    const facultySnapshot = await db.collection('faculty').where('email', '==', email).get();
    if (!facultySnapshot.empty) {
      console.log('User found in faculty collection:', facultySnapshot.docs[0].data());
    } else {
      console.log('User NOT found in faculty collection');
    }
  } catch (error) {
    if (error.code === 'auth/user-not-found') {
      console.log('User not found in Firebase Auth for email:', email);
    } else {
      console.error('Error fetching user data:', error);
    }
  }
}

checkUser('2300032792ird@gmail.com');
