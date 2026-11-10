import { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import api from '../services/api';
import { auth } from '../config/firebase';
import {
  getGoogleRedirectResultOnce,
  GOOGLE_REDIRECT_PENDING_KEY,
  waitForFirebaseUser,
} from '../utils/googleAuth';

const AuthContext = createContext(null);

function readStoredUser() {
  try {
    return JSON.parse(localStorage.getItem('user'));
  } catch {
    return null;
  }
}

export const AuthProvider = ({ children }) => {
  const navigate = useNavigate();
  const [user, setUser] = useState(() => readStoredUser());
  const [bootstrapping, setBootstrapping] = useState(true);
  const [googleRedirectPending, setGoogleRedirectPending] = useState(false);

  const loginWithGoogleFirebase = useCallback(async (firebaseUser) => {
    let idToken = null;
    try {
      idToken = await firebaseUser.getIdToken();
    } catch (_) {}
    const { data } = await api.post('/auth/google-firebase', {
      idToken,
      name: firebaseUser.displayName,
      email: firebaseUser.email,
      avatar_url: firebaseUser.photoURL,
      google_id: firebaseUser.uid,
    });
    localStorage.setItem('accessToken', data.data.accessToken);
    localStorage.setItem('user', JSON.stringify(data.data.user));
    setUser(data.data.user);
    return data;
  }, []);

  useEffect(() => {
    let cancelled = false;

    (async () => {
      const pendingGoogle = sessionStorage.getItem(GOOGLE_REDIRECT_PENDING_KEY) === '1';

      try {
        const result = await getGoogleRedirectResultOnce();
        if (cancelled) return;

        let firebaseUser = result?.user || null;

        if (!firebaseUser && pendingGoogle) {
          firebaseUser = await waitForFirebaseUser();
        }

        if (!firebaseUser) {
          if (pendingGoogle) {
            sessionStorage.removeItem(GOOGLE_REDIRECT_PENDING_KEY);
          }
          return;
        }

        setGoogleRedirectPending(true);
        await loginWithGoogleFirebase(firebaseUser);
        sessionStorage.removeItem(GOOGLE_REDIRECT_PENDING_KEY);

        toast.success(`Xin chào, ${firebaseUser.displayName || firebaseUser.email}! 👋`);
        navigate('/dashboard', { replace: true });
      } catch (err) {
        console.error('Google redirect sign-in:', err);
        sessionStorage.removeItem(GOOGLE_REDIRECT_PENDING_KEY);
        if (err.response?.status === 404) {
          toast.error(
            'Đăng nhập Google OK nhưng backend trả 404. Cấu hình RENDER_API_ORIGIN (URL Render) trên Vercel.',
            { duration: 9000 }
          );
        } else {
          toast.error(
            err.response?.data?.message ||
              err.message ||
              'Không đồng bộ được tài khoản với server. Thử lại hoặc kiểm tra Render.'
          );
        }
      } finally {
        if (!cancelled) {
          setGoogleRedirectPending(false);
          setBootstrapping(false);
        }
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [loginWithGoogleFirebase, navigate]);

  const login = async (email, password) => {
    const { data } = await api.post('/auth/login', { email, password });
    localStorage.setItem('accessToken', data.data.accessToken);
    localStorage.setItem('user', JSON.stringify(data.data.user));
    setUser(data.data.user);
    return data;
  };

  const register = async (name, email, password) => {
    const { data } = await api.post('/auth/register', { name, email, password });
    localStorage.setItem('accessToken', data.data.accessToken);
    localStorage.setItem('user', JSON.stringify(data.data.user));
    setUser(data.data.user);
    return data;
  };

  const logout = async () => {
    try {
      await api.post('/auth/logout');
    } catch {}
    localStorage.removeItem('accessToken');
    localStorage.removeItem('user');
    sessionStorage.removeItem(GOOGLE_REDIRECT_PENDING_KEY);
    setUser(null);
  };

  const updateUser = (updatedUser) => {
    localStorage.setItem('user', JSON.stringify(updatedUser));
    setUser(updatedUser);
  };

  if (googleRedirectPending || bootstrapping) {
    return (
      <div className="page-loader">
        <div className="spinner" />
        <p style={{ marginTop: '1rem', color: 'var(--text-secondary)' }}>
          {googleRedirectPending ? 'Đang đồng bộ tài khoản Google với server...' : 'Đang tải...'}
        </p>
      </div>
    );
  }

  return (
    <AuthContext.Provider
      value={{
        user,
        loading: false,
        login,
        register,
        logout,
        setUser,
        updateUser,
        loginWithGoogleFirebase,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
