import { signInWithPopup, signInWithRedirect } from 'firebase/auth';
import { auth, googleProvider } from '../config/firebase';

function isLocalDevHost() {
  if (typeof window === 'undefined') return false;
  const h = window.location.hostname;
  return h === 'localhost' || h === '127.0.0.1';
}

/** Chỉ localhost dùng popup; Vercel/production luôn redirect (tránh COOP / window.closed). */
export function useGooglePopup() {
  return isLocalDevHost() && import.meta.env.VITE_GOOGLE_SIGNIN_POPUP !== 'false';
}

export async function startGoogleSignIn() {
  if (useGooglePopup()) {
    return signInWithPopup(auth, googleProvider);
  }
  await signInWithRedirect(auth, googleProvider);
  return null;
}
