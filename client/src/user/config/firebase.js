import { initializeApp } from 'firebase/app';
import { getAuth, GoogleAuthProvider } from 'firebase/auth';

/**
 * Project Firebase: datt-04
 * Lấy config tại: Firebase Console → datt-04 → Project settings → Your apps (Web)
 * Vercel: thêm các biến VITE_FIREBASE_* (Production + Preview)
 */
const projectId = import.meta.env.VITE_FIREBASE_PROJECT_ID || 'datt-04';

const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN || `${projectId}.firebaseapp.com`,
  projectId,
  storageBucket:
    import.meta.env.VITE_FIREBASE_STORAGE_BUCKET || `${projectId}.firebasestorage.app`,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID,
  measurementId: import.meta.env.VITE_FIREBASE_MEASUREMENT_ID,
};

if (!firebaseConfig.apiKey || !firebaseConfig.appId) {
  console.error(
    '[Firebase] Thiếu VITE_FIREBASE_API_KEY hoặc VITE_FIREBASE_APP_ID. ' +
      'Thêm trên Vercel hoặc client/.env.local (project datt-04).'
  );
}

const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const googleProvider = new GoogleAuthProvider();
googleProvider.setCustomParameters({ prompt: 'select_account' });

export default app;
