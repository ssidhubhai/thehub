import { initializeApp, getApps, getApp, FirebaseApp } from 'firebase/app';
import { getFirestore, Firestore } from 'firebase/firestore';
import { getAuth, Auth } from 'firebase/auth';

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
  apiKey: (typeof import.meta !== 'undefined' && import.meta.env && import.meta.env.VITE_FIREBASE_API_KEY) || "AIzaSyDFuBTcMS0YZcDMLyJqcToalE4wQq_MFYY",
  authDomain: (typeof import.meta !== 'undefined' && import.meta.env && import.meta.env.VITE_FIREBASE_AUTH_DOMAIN) || "nimble-symbol-0ghtt.firebaseapp.com",
  projectId: (typeof import.meta !== 'undefined' && import.meta.env && import.meta.env.VITE_FIREBASE_PROJECT_ID) || "nimble-symbol-0ghtt",
  storageBucket: (typeof import.meta !== 'undefined' && import.meta.env && import.meta.env.VITE_FIREBASE_STORAGE_BUCKET) || "nimble-symbol-0ghtt.firebasestorage.app",
  messagingSenderId: (typeof import.meta !== 'undefined' && import.meta.env && import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID) || "438740322547",
  appId: (typeof import.meta !== 'undefined' && import.meta.env && import.meta.env.VITE_FIREBASE_APP_ID) || "1:438740322547:web:e9e315f43df52fc040cf86",
  firestoreDatabaseId: (typeof import.meta !== 'undefined' && import.meta.env && import.meta.env.VITE_FIREBASE_FIRESTORE_DATABASE_ID) || "ai-studio-thehub-ee155c96-79c1-4a87-9b9f-e5f913535489",
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
