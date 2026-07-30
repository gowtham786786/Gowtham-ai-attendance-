const { initializeApp, getApps, cert } = require('firebase-admin/app');
const { getFirestore } = require('firebase-admin/firestore');
const { getAuth } = require('firebase-admin/auth');
const path = require('path');
const fs = require('fs');

let db = null;
let auth = null;

try {
  const serviceAccountPath = path.join(__dirname, 'serviceAccountKey.json');
  
  if (!fs.existsSync(serviceAccountPath)) {
    console.warn('\n⚠️  WARNING: serviceAccountKey.json not found in backend/config/');
    console.warn('⚠️  Please download it from Firebase Console (Project Settings -> Service Accounts) and place it here to enable backend Firebase features.\n');
  } else {
    const serviceAccount = require(serviceAccountPath);
    
    if (getApps().length === 0) {
      initializeApp({
        credential: cert(serviceAccount)
      });
    }
    
    db = getFirestore();
    auth = getAuth();
    console.log('Firebase Admin initialized successfully.');
  }
} catch (error) {
  console.error('Error initializing Firebase Admin:', error);
}

module.exports = { db, auth };
