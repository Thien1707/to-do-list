import { initializeApp } from "firebase/app";
import { getAuth, GoogleAuthProvider } from "firebase/auth";

// Your web app's Firebase configuration
const firebaseConfig = {
  apiKey: "AIzaSyBpG9zAb9al-cFcmTU1ycu2FDlwkLsUv-M",
  authDomain: "datt-e2bc9.firebaseapp.com",
  projectId: "datt-e2bc9",
  storageBucket: "datt-e2bc9.firebasestorage.app",
  messagingSenderId: "733852076761",
  appId: "1:733852076761:web:90c4508e3863de47fe0cc8",
  measurementId: "G-GZP3VGGMY6"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const googleProvider = new GoogleAuthProvider();
googleProvider.setCustomParameters({ prompt: 'select_account' });

export default app;
