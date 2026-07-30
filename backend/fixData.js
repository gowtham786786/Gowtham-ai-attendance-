const { db } = require('./config/firebase-admin');

async function fixData() {
  try {
    const snapshot = await db.collection('timetable').where('year', '==', '13').get();
    
    if (snapshot.empty) {
      console.log('No documents with year 13 found.');
      return;
    }

    let batch = db.batch();
    snapshot.forEach(doc => {
      console.log(`Deleting doc: ${doc.id}`);
      batch.delete(doc.ref);
    });

    await batch.commit();
    console.log('Successfully deleted bad data (year 13).');
  } catch (error) {
    console.error('Error fixing data:', error);
  }
}

fixData();
