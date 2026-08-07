import { initializeApp, getApps } from "firebase/app";
import { getFirestore } from "firebase/firestore";

const env: any = (typeof import.meta !== 'undefined' && (import.meta as any).env) ? (import.meta as any).env : {};

const firebaseConfig = {
  apiKey: env.VITE_FIREBASE_API_KEY,
  authDomain: env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: env.VITE_FIREBASE_APP_ID,
};

if (!firebaseConfig.apiKey) {
  console.warn("Firebase API Key is missing. Database connection might fail.");
}

const app = !getApps().length ? initializeApp(firebaseConfig) : getApps()[0];
export const db = getFirestore(app);
