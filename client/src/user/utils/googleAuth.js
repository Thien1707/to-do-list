import { signInWithPopup, signInWithRedirect, getRedirectResult, onAuthStateChanged } from 'firebase/auth';
import { auth, googleProvider } from '../config/firebase';

export const GOOGLE_REDIRECT_PENDING_KEY = 'taskflow_google_redirect_pending';

/** Chỉ gọi getRedirectResult một lần mỗi page load (tránh Strict Mode / double mount). */
let redirectResultPromise = null;

export function getGoogleRedirectResultOnce() {
  if (!redirectResultPromise) {
    redirectResultPromise = getRedirectResult(auth);
  }
  return redirectResultPromise;
}

function isLocalDevHost() {
  if (typeof window === 'undefined') return false;
  const h = window.location.hostname;
  return h === 'localhost' || h === '127.0.0.1';
}

export function useGooglePopup() {
  return isLocalDevHost() && import.meta.env.VITE_GOOGLE_SIGNIN_POPUP !== 'false';
}

export async function startGoogleSignIn() {
  if (useGooglePopup()) {
    return signInWithPopup(auth, googleProvider);
  }
  sessionStorage.setItem(GOOGLE_REDIRECT_PENDING_KEY, '1');
  await signInWithRedirect(auth, googleProvider);
  return null;
}

/** Sau redirect, đôi khi getRedirectResult null nhưng auth.currentUser đã có. */
export function waitForFirebaseUser(timeoutMs = 10000) {
  if (auth.currentUser) {
    return Promise.resolve(auth.currentUser);
  }

  return new Promise((resolve) => {
    const timer = setTimeout(() => {
      unsub();
      resolve(auth.currentUser || null);
    }, timeoutMs);

    const unsub = onAuthStateChanged(auth, (user) => {
      if (user) {
        clearTimeout(timer);
        unsub();
        resolve(user);
      }
    });
  });
}
