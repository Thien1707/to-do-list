import { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import api from '../services/api';

const GOOGLE_REDIRECT_PENDING_KEY = 'taskflow_google_redirect_pending';

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

    // Thông báo nếu server khởi động chậm (Render cold start)
    const coldTimer = setTimeout(() => {
      toast.loading('Máy chủ Render đang khởi động lại (thường mất 30-50s), vui lòng đợi...', { id: 'render-cold' });
    }, 3500);

    try {
      const payload = {
        idToken,
        name: firebaseUser.displayName,
        email: firebaseUser.email,
        avatar_url: firebaseUser.photoURL,
        google_id: firebaseUser.uid,
      };

      // Gửi request với timeout 90s cho Render cold start
      let res;
      try {
        res = await api.post('/auth/google-firebase', payload, { timeout: 90000 });
      } catch (firstErr) {
        // Tự động thử lại 1 lần nếu gặp timeout / network error (do server vừa boot xong)
        const isTimeout = firstErr.code === 'ECONNABORTED' || firstErr.message?.includes('timeout');
        const isNetworkErr = firstErr.message === 'Network Error' || !firstErr.response;
        if (isTimeout || isNetworkErr) {
          toast.loading('Đang thử kết nối lại với máy chủ...', { id: 'render-cold' });
          await new Promise((r) => setTimeout(r, 2000));
          res = await api.post('/auth/google-firebase', payload, { timeout: 90000 });
        } else {
          throw firstErr;
        }
      }

      clearTimeout(coldTimer);
      toast.dismiss('render-cold');

      const data = res.data;
      localStorage.setItem('accessToken', data.data.accessToken);
      localStorage.setItem('user', JSON.stringify(data.data.user));
      if (data.data.user?.role === 'admin') {
        localStorage.setItem('adminToken', data.data.accessToken);
        localStorage.setItem('adminUser', JSON.stringify(data.data.user));
      }
      setUser(data.data.user);
      return data;
    } catch (err) {
      clearTimeout(coldTimer);
      toast.dismiss('render-cold');
      throw err;
    }
  }, []);

  useEffect(() => {
    let cancelled = false;

    (async () => {
      const pendingGoogle = sessionStorage.getItem(GOOGLE_REDIRECT_PENDING_KEY) === '1';

      if (!pendingGoogle) {
        setBootstrapping(false);
        return;
      }

      try {
        const { getGoogleRedirectResultOnce, waitForFirebaseUser } = await import('../utils/googleAuth');
        const result = await getGoogleRedirectResultOnce();
        if (cancelled) return;

        let firebaseUser = result?.user || null;

        if (!firebaseUser) {
          firebaseUser = await waitForFirebaseUser();
        }

        if (!firebaseUser) {
          sessionStorage.removeItem(GOOGLE_REDIRECT_PENDING_KEY);
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
        const isTimeout = err.code === 'ECONNABORTED' || err.message?.includes('timeout');
        const isNetworkErr = err.message === 'Network Error' || !err.response;

        if (err.response?.status === 404) {
          toast.error(
            'Lỗi 404: Không kết nối được backend. Hãy kiểm tra URL Render hoặc biến môi trường RENDER_API_ORIGIN trên Vercel.',
            { duration: 10000 }
          );
        } else if (isTimeout) {
          toast.error(
            'Hết thời gian chờ kết nối tới máy chủ (Timeout). Máy chủ Render có thể đang ở chế độ ngủ (Sleep) hoặc URL backend chưa đúng. Vui lòng thử đăng nhập lại!',
            { duration: 10000 }
          );
        } else if (isNetworkErr) {
          toast.error(
            'Không thể kết nối đến máy chủ backend (Network Error). Hãy kiểm tra xem backend trên Render có đang hoạt động không.',
            { duration: 10000 }
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
    if (data.data.user?.role === 'admin') {
      localStorage.setItem('adminToken', data.data.accessToken);
      localStorage.setItem('adminUser', JSON.stringify(data.data.user));
    }
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
    if (updatedUser?.role === 'admin') {
      localStorage.setItem('adminUser', JSON.stringify(updatedUser));
    }
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
