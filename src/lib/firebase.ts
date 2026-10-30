import { initializeApp, getApps, getApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getFirestore, doc, getDocFromServer, setLogLevel } from 'firebase/firestore';
import firebaseConfig from '../../firebase-applet-config.json';

// Silence benign internal gRPC idle stream disconnect warnings
try {
  setLogLevel('silent');
} catch (e) {
  // Ignore if already set
}

export const app = !getApps().length ? initializeApp(firebaseConfig) : getApp();
export const auth = getAuth(app);

// Use custom firestoreDatabaseId if provisioned
export const db = getFirestore(app, firebaseConfig.firestoreDatabaseId || '(default)');

// Validate connection
async function testFirestoreConnection() {
  try {
    await getDocFromServer(doc(db, 'test', 'connection'));
  } catch (error) {
    if (error instanceof Error && error.message.includes('the client is offline')) {
      console.warn("Firebase client is offline, check configuration.");
    }
  }
}

testFirestoreConnection();
