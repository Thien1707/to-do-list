import { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { getRedirectResult } from 'firebase/auth';
import toast from 'react-hot-toast';
import api from '../services/api';
import { auth } from '../config/firebase';

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  const navigate = useNavigate();
  const [user, setUser] = useState(() => {
    try {
      return JSON.parse(localStorage.getItem('user'));
    } catch {
      return null;
    }
  });
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
    let active = true;
    (async () => {
      try {
        const result = await getRedirectResult(auth);
        if (!active) return;
        if (result?.user) {
          setGoogleRedirectPending(true);
          await loginWithGoogleFirebase(result.user);
          toast.success(`Xin chào, ${result.user.displayName || result.user.email}! 👋`);
          navigate('/dashboard', { replace: true });
        }
      } catch (err) {
        console.error('Google redirect sign-in:', err);
        if (err.response?.status === 404) {
          toast.error(
            'Backend API 404. Đặt RENDER_API_ORIGIN trên Vercel = URL Render đúng, rồi redeploy.',
            { duration: 8000 }
          );
        } else {
          toast.error(err.response?.data?.message || err.message || 'Đăng nhập Google thất bại');
        }
      } finally {
        if (active) {
          setGoogleRedirectPending(false);
          setBootstrapping(false);
        }
      }
    })();

    return () => {
      active = false;
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
          {googleRedirectPending ? 'Đang hoàn tất đăng nhập Google...' : 'Đang tải...'}
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
