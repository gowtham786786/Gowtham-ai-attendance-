const admin = require('firebase-admin');
const serviceAccount = require('./serviceAccountKey.json');

if (!admin.apps.length) {
  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount)
  });
}

const db = admin.firestore();

const DAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'];
const PERIODS = [1, 2, 3, 5, 6]; // 4 is Lunch

async function assignFaculty() {
  try {
    const email = '2300032792ird@gmail.com';
    const facultySnapshot = await db.collection('faculty').where('email', '==', email).get();

    if (facultySnapshot.empty) {
      console.log('Faculty not found');
      return;
    }

    const facultyDoc = facultySnapshot.docs[0];
    const facultyId = facultyDoc.id;
    const facultyName = facultyDoc.data().name;

    console.log(`Found faculty: ${facultyName} (${facultyId})`);

    // 1. Update Faculty Document
    await db.collection('faculty').doc(facultyId).update({
      assignedSubjects: ['Data Structures', 'Java Programming'],
      assignedSections: ['A', 'B'],
      assignedYears: ['3'],
      sectionsHandled: ['3 Year - Section A', '3 Year - Section B']
    });
    console.log('Updated faculty document with assignments.');

    // 2. Create Timetable Slots (Full Schedule)
    const department = 'Computer Science Engineering (CSE)';
    const year = '3';
    const section = 'A';
    
    let batch = db.batch();
    
    for (const day of DAYS) {
      for (const period of PERIODS) {
        const subject = period % 2 === 0 ? 'Data Structures' : 'Java Programming';
        
        const payload = {
          department,
          year,
          section,
          day,
          periodNumber: period,
          period: `Period ${period}`,
          subject,
          facultyId,
          facultyName
        };

        const customId = `${department.replace(/\s+/g, '_')}_${year}_${section}_${day}_${period}`;
        const slotRef = db.collection('timetable').doc(customId);
        
        batch.set(slotRef, {
          ...payload,
          id: customId
        });
      }
    }
    
    await batch.commit();
    console.log('Full timetable assigned successfully for 3 Year - Section A.');
  } catch (error) {
    console.error('Error:', error);
  }
}

assignFaculty();
