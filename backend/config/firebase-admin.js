const { initializeApp, getApps, cert } = require('firebase-admin/app');
const { getFirestore } = require('firebase-admin/firestore');
const { getAuth } = require('firebase-admin/auth');
const admin = require('firebase-admin');
const path = require('path');
const fs = require('fs');

require('dotenv').config();

const serviceAccountPath = path.join(__dirname, 'serviceAccountKey.json');
let db = null;
let auth = null;

if (!getApps().length) {
  if (process.env.FIREBASE_SERVICE_ACCOUNT_KEY) {
    const serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT_KEY);
    initializeApp({
      credential: cert(serviceAccount)
    });
    console.log('Firebase Admin initialized successfully using FIREBASE_SERVICE_ACCOUNT_KEY env var');
  } else if (fs.existsSync(serviceAccountPath)) {
    const serviceAccount = require(serviceAccountPath);
    initializeApp({
      credential: cert(serviceAccount)
    });
    console.log('Firebase Admin initialized successfully using serviceAccountKey.json');
  } else if (process.env.FIREBASE_PROJECT_ID && process.env.FIREBASE_CLIENT_EMAIL && process.env.FIREBASE_PRIVATE_KEY) {
    initializeApp({
      credential: cert({
        projectId: process.env.FIREBASE_PROJECT_ID,
        clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
        privateKey: process.env.FIREBASE_PRIVATE_KEY.replace(/\\n/g, '\n'),
      }),
    });
    console.log('Firebase Admin initialized successfully using .env');
  } else {
    try {
      initializeApp();
      console.warn("⚠️ Firebase Admin initialized without credentials.");
    } catch(e) {
      console.warn("⚠️ Firebase Admin initialization failed completely.");
    }
  }
}

db = getFirestore();
auth = getAuth();

module.exports = { admin, db, auth };
