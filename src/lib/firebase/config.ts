import { initializeApp, getApps, getApp, FirebaseApp } from 'firebase/app';
import { getFirestore, Firestore } from 'firebase/firestore';
import { getAuth, Auth } from 'firebase/auth';
import appletConfig from '../../../firebase-applet-config.json';

export interface FirebaseConfig {
  apiKey?: string;
  authDomain?: string;
  projectId?: string;
  storageBucket?: string;
  messagingSenderId?: string;
  appId?: string;
  firestoreDatabaseId?: string;
}

export const firebaseConfig: FirebaseConfig = {
  apiKey: appletConfig.apiKey || (typeof import.meta !== 'undefined' && import.meta.env ? import.meta.env.VITE_FIREBASE_API_KEY : undefined),
  authDomain: appletConfig.authDomain || (typeof import.meta !== 'undefined' && import.meta.env ? import.meta.env.VITE_FIREBASE_AUTH_DOMAIN : undefined),
  projectId: appletConfig.projectId || (typeof import.meta !== 'undefined' && import.meta.env ? import.meta.env.VITE_FIREBASE_PROJECT_ID : undefined),
  storageBucket: appletConfig.storageBucket || (typeof import.meta !== 'undefined' && import.meta.env ? import.meta.env.VITE_FIREBASE_STORAGE_BUCKET : undefined),
  messagingSenderId: appletConfig.messagingSenderId || (typeof import.meta !== 'undefined' && import.meta.env ? import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID : undefined),
  appId: appletConfig.appId || (typeof import.meta !== 'undefined' && import.meta.env ? import.meta.env.VITE_FIREBASE_APP_ID : undefined),
  firestoreDatabaseId: appletConfig.firestoreDatabaseId,
};

export const isFirebaseConfigured = Boolean(
  firebaseConfig.apiKey &&
  firebaseConfig.projectId &&
  !firebaseConfig.apiKey.includes('placeholder')
);

let app: FirebaseApp | null = null;
let db: Firestore | null = null;
let auth: Auth | null = null;

if (isFirebaseConfigured) {
  try {
    app = getApps().length > 0 ? getApp() : initializeApp(firebaseConfig);
    db = firebaseConfig.firestoreDatabaseId
      ? getFirestore(app, firebaseConfig.firestoreDatabaseId)
      : getFirestore(app);
    auth = getAuth(app);
    console.log('[Firebase] Initialized live Firestore & Auth with project:', firebaseConfig.projectId);
  } catch (err) {
    console.warn('[Firebase] Live init failed, falling back gracefully:', err);
  }
}

export { app, db, auth };
export const isMockMode = !isFirebaseConfigured || !db;
