import { initializeApp, getApps } from 'firebase/app';
import { getAuth, GoogleAuthProvider } from 'firebase/auth';

/**
 * Cấu hình Firebase Authentication (Google OAuth)
 * - Mặc định fallback về project credentials hoạt động (datt-e2bc9) để trang đăng nhập không bao giờ bị lỗi trắng.
 * - Cho phép ghi đè linh hoạt qua biến môi trường VITE_FIREBASE_* (nếu cấu hình trên Vercel / .env).
 */
const DEFAULT_CONFIG = {
  apiKey: 'AIzaSyBpG9zAb9al-cFcmTU1ycu2FDlwkLsUv-M',
  authDomain: 'datt-e2bc9.firebaseapp.com',
  projectId: 'datt-e2bc9',
  storageBucket: 'datt-e2bc9.firebasestorage.app',
  messagingSenderId: '733852076761',
  appId: '1:733852076761:web:90c4508e3863de47fe0cc8',
  measurementId: 'G-GZP3VGGMY6',
};

const projectId = import.meta.env.VITE_FIREBASE_PROJECT_ID || DEFAULT_CONFIG.projectId;
const apiKey = import.meta.env.VITE_FIREBASE_API_KEY || DEFAULT_CONFIG.apiKey;

const firebaseConfig = {
  apiKey,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN || `${projectId}.firebaseapp.com`,
  projectId,
  storageBucket:
    import.meta.env.VITE_FIREBASE_STORAGE_BUCKET || `${projectId}.firebasestorage.app`,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID || DEFAULT_CONFIG.messagingSenderId,
  appId: import.meta.env.VITE_FIREBASE_APP_ID || DEFAULT_CONFIG.appId,
  measurementId: import.meta.env.VITE_FIREBASE_MEASUREMENT_ID || DEFAULT_CONFIG.measurementId,
};

let app = null;
let auth = null;
let googleProvider = null;

try {
  app = getApps().length > 0 ? getApps()[0] : initializeApp(firebaseConfig);
  auth = getAuth(app);
  googleProvider = new GoogleAuthProvider();
  googleProvider.setCustomParameters({ prompt: 'select_account' });
} catch (err) {
  console.warn('⚠️ [Firebase] Khởi tạo Firebase thất bại:', err.message);
}

export { auth, googleProvider };
export default app;
