import { initializeApp } from "firebase/app";
import { getDatabase } from "firebase/database";
import { getStorage } from "firebase/storage";
import { getAuth } from "firebase/auth";

/**
 * Safely access Vite environment variables.
 * We use the provided configuration as fallbacks to ensure the app never fails
 * even if the environment loading is inconsistent in the browser.
 */
// Fixed: Cast import.meta to any to bypass TypeScript property check for .env when Vite types are not explicitly globally declared.
const env: any = (typeof import.meta !== 'undefined' && (import.meta as any).env) ? (import.meta as any).env : {};

const firebaseConfig = {
  apiKey: env.VITE_FIREBASE_API_KEY || "AIzaSyBNgp4ZKBq_sHjVC0OGwSidhzCOtoGYR4k",
  authDomain: env.VITE_FIREBASE_AUTH_DOMAIN || "smart-health-dce40.firebaseapp.com",
  // FIX: Hardcoded databaseURL as requested to resolve "Cannot parse Firebase url"
  databaseURL: env.VITE_FIREBASE_DATABASE_URL || "https://smart-health-dce40-default-rtdb.asia-southeast1.firebasedatabase.app",
  projectId: env.VITE_FIREBASE_PROJECT_ID || "smart-health-dce40",
  storageBucket: env.VITE_FIREBASE_STORAGE_BUCKET || "smart-health-dce40.firebasestorage.app",
  messagingSenderId: env.VITE_FIREBASE_MESSAGING_SENDER_ID || "81529782106",
  appId: env.VITE_FIREBASE_APP_ID || "1:81529782106:web:286029a5dc050cd0423d63",
  measurementId: env.VITE_FIREBASE_MEASUREMENT_ID || "G-CSK81WMJEQ"
};

// Diagnostic log for connection health
if (!firebaseConfig.databaseURL) {
    console.error("Firebase Configuration Error: Database URL is still missing.");
} else {
    console.log("Firebase initialized with URL:", firebaseConfig.databaseURL);
}

const app = initializeApp(firebaseConfig);
export const db = getDatabase(app);
export const auth = getAuth(app);
export const storage = getStorage(app);

/**
 * Encodes keys to be safe for Firebase Realtime Database
 * (replaces forbidden characters: ., #, $, /, [, ])
 */
export const safeEncodeKey = (key: string): string => {
  return key
    .replace(/%/g, '%25')
    .replace(/\./g, '%2E')
    .replace(/#/g, '%23')
    .replace(/\$/g, '%24')
    .replace(/\//g, '%2F')
    .replace(/\[/g, '%5B')
    .replace(/\]/g, '%5D');
};

/**
 * Decodes Firebase-safe keys back to their original strings
 */
export const safeDecodeKey = (key: string): string => {
  return key
    .replace(/%2E/g, '.')
    .replace(/%23/g, '#')
    .replace(/%24/g, '$')
    .replace(/%2F/g, '/')
    .replace(/%5B/g, '[')
    .replace(/%5D/g, ']')
    .replace(/%25/g, '%');
};