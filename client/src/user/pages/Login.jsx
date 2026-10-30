import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { auth, googleProvider } from '../config/firebase';
import { signInWithPopup } from 'firebase/auth';
import toast from 'react-hot-toast';

export default function Login() {
  const [form, setForm] = useState({ email: '', password: '' });
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  const [errors, setErrors] = useState({});
  const { login, loginWithGoogleFirebase } = useAuth();
  const navigate = useNavigate();

  const validate = () => {
    const errs = {};
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

    if (!form.email.trim()) {
      errs.email = 'Vui lòng nhập địa chỉ email';
    } else if (!emailRegex.test(form.email.trim())) {
      errs.email = 'Email không hợp lệ (ví dụ: ten@example.com)';
    }

    if (!form.password) {
      errs.password = 'Vui lòng nhập mật khẩu';
    }

    setErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const handleChange = (field, value) => {
    setForm(prev => ({ ...prev, [field]: value }));
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: '' }));
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!validate()) return;

    setLoading(true);
    try {
      await login(form.email.trim(), form.password);
      toast.success('Đăng nhập thành công!');
      navigate('/dashboard');
    } catch (err) {
      const msg = err.response?.data?.message || 'Đăng nhập thất bại. Vui lòng kiểm tra lại';
      toast.error(msg);
      if (msg.toLowerCase().includes('email') || msg.toLowerCase().includes('tài khoản')) {
        setErrors(prev => ({ ...prev, email: msg }));
      } else if (msg.toLowerCase().includes('mật khẩu')) {
        setErrors(prev => ({ ...prev, password: msg }));
      }
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleLogin = async () => {
    setGoogleLoading(true);
    try {
      const result = await signInWithPopup(auth, googleProvider);
      await loginWithGoogleFirebase(result.user);
      toast.success(`Xin chào, ${result.user.displayName || result.user.email}! 👋`);
      navigate('/');
    } catch (err) {
      console.error('Google Sign-in error:', err);
      if (err.code === 'auth/popup-closed-by-user') {
        toast('Đã đóng cửa sổ đăng nhập Google');
      } else if (err.code === 'auth/cancelled-popup-request') {
        // popup request cancelled
      } else if (err.code === 'auth/operation-not-allowed' || err.code === 'auth/configuration-not-found') {
        toast.error('Chưa bật Google Provider trên Firebase! Hãy vào Firebase Console > Authentication > Sign-in method > Bật Google.', { duration: 6000 });
      } else if (err.code === 'auth/unauthorized-domain') {
        toast.error('Miền này chưa được thêm vào Authorized Domains trên Firebase Console!', { duration: 6000 });
      } else {
        toast.error(err.response?.data?.message || err.message || 'Đăng nhập Google thất bại');
      }
    } finally {
      setGoogleLoading(false);
    }
  };

  return (
    <div className="auth-page">
      <div className="auth-box animate-fadein">
        <div className="auth-logo">
          <div className="auth-logo-icon">✅</div>
          <span style={{ fontWeight: 700, fontSize: '1.25rem' }}>TaskFlow</span>
        </div>

        <div className="auth-title">
          <h1>Đăng nhập tài khoản</h1>
          <p>Chào mừng bạn quay trở lại</p>
        </div>

        <form className="auth-form" onSubmit={handleSubmit} noValidate>
          <div className="form-group">
            <label className="form-label" htmlFor="login-email">Email *</label>
            <input
              id="login-email"
              type="email"
              className={`form-input ${errors.email ? 'input-error' : ''}`}
              placeholder="you@example.com"
              autoComplete="email"
              value={form.email}
              onChange={e => handleChange('email', e.target.value)}
              autoFocus
            />
            {errors.email && <div className="field-error-text">⚠️ {errors.email}</div>}
          </div>

          <div className="form-group">
            <label className="form-label" htmlFor="login-password">Mật khẩu *</label>
            <div style={{ position: 'relative' }}>
              <input
                id="login-password"
                type={showPassword ? 'text' : 'password'}
                className={`form-input ${errors.password ? 'input-error' : ''}`}
                placeholder="Nhập mật khẩu..."
                autoComplete="current-password"
                value={form.password}
                onChange={e => handleChange('password', e.target.value)}
                style={{ paddingRight: '2.5rem' }}
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                style={{
                  position: 'absolute',
                  right: '0.6rem',
                  top: '50%',
                  transform: 'translateY(-50%)',
                  background: 'none',
                  border: 'none',
                  cursor: 'pointer',
                  color: 'var(--text-muted)',
                  fontSize: '0.9rem',
                }}
                title={showPassword ? 'Ẩn mật khẩu' : 'Hiện mật khẩu'}
              >
                {showPassword ? '🙈' : '👁️'}
              </button>
            </div>
            {errors.password && <div className="field-error-text">⚠️ {errors.password}</div>}
          </div>

          <button
            id="login-submit"
            type="submit"
            className="btn btn-primary btn-full"
            disabled={loading}
            style={{ marginTop: '0.5rem' }}
          >
            {loading ? 'Đang xác thực...' : 'Đăng nhập'}
          </button>

          <div className="auth-divider">hoặc tiếp tục với</div>

          <button
            id="login-google"
            type="button"
            className="btn btn-google"
            onClick={handleGoogleLogin}
            disabled={googleLoading || loading}
          >
            <svg width="18" height="18" viewBox="0 0 48 48" style={{ marginRight: '0.5rem' }}>
              <path fill="#EA4335" d="M24 9.5c3.5 0 6.6 1.2 9.1 3.2l6.8-6.8C35.8 2.5 30.2 0 24 0 14.6 0 6.5 5.5 2.7 13.5l7.9 6.1C12.5 13.3 17.8 9.5 24 9.5z"/>
              <path fill="#4285F4" d="M46.5 24.5c0-1.6-.1-3.1-.4-4.5H24v8.5h12.7c-.6 3-2.3 5.5-4.8 7.2l7.5 5.8c4.4-4.1 7.1-10.1 7.1-17z"/>
              <path fill="#FBBC05" d="M10.6 28.4c-.5-1.4-.8-2.9-.8-4.4s.3-3 .8-4.4L2.7 13.5C1 16.8 0 20.3 0 24s1 7.2 2.7 10.5l7.9-6.1z"/>
              <path fill="#34A853" d="M24 48c6.2 0 11.4-2 15.2-5.5l-7.5-5.8c-2 1.4-4.7 2.2-7.7 2.2-6.2 0-11.5-3.8-13.4-9.1l-7.9 6.1C6.5 42.5 14.6 48 24 48z"/>
            </svg>
            {googleLoading ? 'Đang mở Google...' : 'Đăng nhập với Google'}
          </button>
        </form>

        <div className="auth-footer">
          Chưa có tài khoản? <Link to="/register">Đăng ký ngay</Link>
        </div>
      </div>
    </div>
  );
}
