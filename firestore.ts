import { initializeApp, getApps } from "firebase/app";
import { getFirestore } from "firebase/firestore";

const env: any = (typeof import.meta !== 'undefined' && (import.meta as any).env) ? (import.meta as any).env : {};

const firebaseConfig = {
  apiKey: env.VITE_FIREBASE_API_KEY || "AIzaSyBNgp4ZKBq_sHjVC0OGwSidhzCOtoGYR4k",
  authDomain: env.VITE_FIREBASE_AUTH_DOMAIN || "smart-health-dce40.firebaseapp.com",
  projectId: env.VITE_FIREBASE_PROJECT_ID || "smart-health-dce40",
  storageBucket: env.VITE_FIREBASE_STORAGE_BUCKET || "smart-health-dce40.firebasestorage.app",
  messagingSenderId: env.VITE_FIREBASE_MESSAGING_SENDER_ID || "81529782106",
  appId: env.VITE_FIREBASE_APP_ID || "1:81529782106:web:286029a5dc050cd0423d63",
};

const app = !getApps().length ? initializeApp(firebaseConfig) : getApps()[0];
export const db = getFirestore(app);
