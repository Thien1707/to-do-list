import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { startGoogleSignIn } from '../utils/googleAuth';
import toast from 'react-hot-toast';
import {
  TaskFlowLogo,
  EyeIcon,
  EyeOffIcon,
  MailIcon,
  LockIcon,
  UserIcon,
  AlertCircleIcon,
  SparklesIcon,
  CheckIcon,
} from '../../components/Icons';

export default function Register() {
  const [form, setForm] = useState({ name: '', email: '', password: '', confirm: '' });
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  const [errors, setErrors] = useState({});
  const { register, loginWithGoogleFirebase } = useAuth();
  const navigate = useNavigate();

  const validate = () => {
    const errs = {};
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

    if (!form.name.trim()) {
      errs.name = 'Vui lòng nhập họ và tên của bạn';
    } else if (form.name.trim().length < 2) {
      errs.name = 'Họ và tên quá ngắn (tối thiểu 2 ký tự)';
    }

    if (!form.email.trim()) {
      errs.email = 'Vui lòng nhập địa chỉ email';
    } else if (!emailRegex.test(form.email.trim())) {
      errs.email = 'Email không hợp lệ (ví dụ: ten@example.com)';
    }

    if (!form.password) {
      errs.password = 'Vui lòng nhập mật khẩu';
    } else if (form.password.length < 6) {
      errs.password = 'Mật khẩu phải có ít nhất 6 ký tự';
    } else if (!/[a-zA-Z]/.test(form.password)) {
      errs.password = 'Mật khẩu phải chứa ít nhất một chữ cái (A-Z hoặc a-z)';
    } else if (!/[0-9]/.test(form.password)) {
      errs.password = 'Mật khẩu phải chứa ít nhất một chữ số (0-9)';
    } else if (!/[^a-zA-Z0-9]/.test(form.password)) {
      errs.password = 'Mật khẩu phải chứa ít nhất một ký tự đặc biệt (VD: !@#$%^&*)';
    }

    if (!form.confirm) {
      errs.confirm = 'Vui lòng nhập lại mật khẩu xác nhận';
    } else if (form.password !== form.confirm) {
      errs.confirm = 'Mật khẩu xác nhận không trùng khớp';
    }

    setErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const handleChange = (field, value) => {
    setForm(prev => ({ ...prev, [field]: value }));
    // Clear error as user types
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: '' }));
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!validate()) {
      return;
    }

    setLoading(true);
    try {
      await register(form.name.trim(), form.email.trim(), form.password);
      toast.success('Đăng ký tài khoản thành công!');
      navigate('/dashboard');
    } catch (err) {
      let msg = err.response?.data?.message || 'Đăng ký thất bại. Vui lòng thử lại';
      if (err.response?.status === 404) {
        msg = 'API backend 404 — kiểm tra RENDER_API_ORIGIN trên Vercel (URL Render đúng) rồi redeploy.';
      }
      toast.error(msg, { duration: err.response?.status === 404 ? 8000 : 4000 });
      if (msg.toLowerCase().includes('email')) {
        setErrors(prev => ({ ...prev, email: msg }));
      }
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleLogin = async () => {
    if (!auth || !googleProvider) {
      toast.error('Chưa thể kết nối Google Firebase. Vui lòng đăng ký bằng Email và Mật khẩu.');
      return;
    }
    setGoogleLoading(true);
    try {
      const result = await startGoogleSignIn();
      if (!result) return;
      await loginWithGoogleFirebase(result.user);
      toast.success(`Chào mừng, ${result.user.displayName || result.user.email}! 👋`);
      navigate('/dashboard');
    } catch (err) {
      console.error('Google Sign-in error:', err);
      if (err.response?.status === 404) {
        toast.error('Backend API 404 — cấu hình RENDER_API_ORIGIN trên Vercel.', { duration: 8000 });
        return;
      }
      if (err.code === 'auth/popup-closed-by-user') {
        toast('Đã đóng cửa sổ đăng nhập Google');
      } else if (err.code === 'auth/cancelled-popup-request') {
        // cancelled
      } else if (err.code === 'auth/operation-not-allowed' || err.code === 'auth/configuration-not-found') {
        toast.error('Chưa bật Google Provider trên Firebase! Hãy vào Firebase Console > Authentication > Sign-in method > Bật Google.', { duration: 6000 });
      } else if (err.code === 'auth/unauthorized-domain') {
        toast.error(
          'Domain Vercel chưa có trong Firebase (project datt-04 → Authentication → Authorized domains).',
          { duration: 7000 }
        );
      } else {
        toast.error(err.response?.data?.message || err.message || 'Đăng ký bằng Google thất bại');
      }
    } finally {
      setGoogleLoading(false);
    }
  };

  return (
    <div className="auth-page">
      {/* Decorative ambient background glows */}
      <div className="auth-ambient-glow auth-ambient-glow-1" aria-hidden="true" />
      <div className="auth-ambient-glow auth-ambient-glow-2" aria-hidden="true" />

      <div className="auth-box animate-fadein">
        <div className="auth-logo">
          <TaskFlowLogo size={46} />
          <span className="auth-brand-name">TaskFlow</span>
        </div>

        <div className="auth-badge-pill">
          <SparklesIcon size={14} />
          <span>Bắt đầu miễn phí hôm nay</span>
        </div>

        <div className="auth-title">
          <h1>Tạo tài khoản mới</h1>
          <p>Bắt đầu quản lý công việc và mục tiêu của bạn</p>
        </div>

        <form className="auth-form" onSubmit={handleSubmit} noValidate>
          <div className="form-group">
            <label className="form-label" htmlFor="reg-name">Họ và tên *</label>
            <div className="auth-input-wrapper">
              <span className="auth-input-icon">
                <UserIcon size={18} />
              </span>
              <input
                id="reg-name"
                type="text"
                className={`form-input auth-input-with-icon ${errors.name ? 'input-error' : ''}`}
                placeholder="Nguyễn Văn A"
                autoComplete="name"
                value={form.name}
                onChange={e => handleChange('name', e.target.value)}
                autoFocus
              />
            </div>
            {errors.name && (
              <div className="field-error-text">
                <AlertCircleIcon size={14} />
                <span>{errors.name}</span>
              </div>
            )}
          </div>

          <div className="form-group">
            <label className="form-label" htmlFor="reg-email">Email *</label>
            <div className="auth-input-wrapper">
              <span className="auth-input-icon">
                <MailIcon size={18} />
              </span>
              <input
                id="reg-email"
                type="email"
                className={`form-input auth-input-with-icon ${errors.email ? 'input-error' : ''}`}
                placeholder="you@example.com"
                autoComplete="email"
                value={form.email}
                onChange={e => handleChange('email', e.target.value)}
              />
            </div>
            {errors.email && (
              <div className="field-error-text">
                <AlertCircleIcon size={14} />
                <span>{errors.email}</span>
              </div>
            )}
          </div>

          <div className="form-group">
            <label className="form-label" htmlFor="reg-password">Mật khẩu *</label>
            <div className="auth-input-wrapper">
              <span className="auth-input-icon">
                <LockIcon size={18} />
              </span>
              <input
                id="reg-password"
                type={showPassword ? 'text' : 'password'}
                className={`form-input auth-input-with-icon ${errors.password ? 'input-error' : ''}`}
                placeholder="Gồm chữ cái, số và ký tự đặc biệt"
                autoComplete="new-password"
                value={form.password}
                onChange={e => handleChange('password', e.target.value)}
                style={{ paddingRight: '2.75rem' }}
              />
              <button
                type="button"
                className="password-toggle-btn"
                onClick={() => setShowPassword(!showPassword)}
                title={showPassword ? 'Ẩn mật khẩu' : 'Hiện mật khẩu'}
                aria-label={showPassword ? 'Ẩn mật khẩu' : 'Hiện mật khẩu'}
              >
                {showPassword ? <EyeOffIcon size={18} /> : <EyeIcon size={18} />}
              </button>
            </div>

            {/* Real-time Password Rules Checklist */}
            {form.password && (
              <div
                style={{
                  marginTop: '0.5rem',
                  padding: '0.65rem 0.85rem',
                  background: 'var(--bg-elevated)',
                  borderRadius: 8,
                  border: '1px solid var(--border)',
                  fontSize: '0.72rem',
                }}
              >
                <div style={{ fontWeight: 600, color: 'var(--text-secondary)', marginBottom: 6 }}>
                  Quy ước mật khẩu an toàn:
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.35rem' }}>
                  <div style={{ color: form.password.length >= 6 ? '#10b981' : 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: 5 }}>
                    {form.password.length >= 6 ? <CheckIcon size={12} /> : <span>○</span>}
                    <span>Tối thiểu 6 ký tự</span>
                  </div>
                  <div style={{ color: /[a-zA-Z]/.test(form.password) ? '#10b981' : 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: 5 }}>
                    {/[a-zA-Z]/.test(form.password) ? <CheckIcon size={12} /> : <span>○</span>}
                    <span>Chữ cái (A-Z, a-z)</span>
                  </div>
                  <div style={{ color: /[0-9]/.test(form.password) ? '#10b981' : 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: 5 }}>
                    {/[0-9]/.test(form.password) ? <CheckIcon size={12} /> : <span>○</span>}
                    <span>Chữ số (0-9)</span>
                  </div>
                  <div style={{ color: /[^a-zA-Z0-9]/.test(form.password) ? '#10b981' : 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: 5 }}>
                    {/[^a-zA-Z0-9]/.test(form.password) ? <CheckIcon size={12} /> : <span>○</span>}
                    <span>Ký tự đặc biệt (!@#$...)</span>
                  </div>
                </div>
              </div>
            )}

            {errors.password && (
              <div className="field-error-text">
                <AlertCircleIcon size={14} />
                <span>{errors.password}</span>
              </div>
            )}
          </div>

          <div className="form-group">
            <label className="form-label" htmlFor="reg-confirm">Xác nhận mật khẩu *</label>
            <div className="auth-input-wrapper">
              <span className="auth-input-icon">
                <LockIcon size={18} />
              </span>
              <input
                id="reg-confirm"
                type={showPassword ? 'text' : 'password'}
                className={`form-input auth-input-with-icon ${errors.confirm ? 'input-error' : ''}`}
                placeholder="Nhập lại mật khẩu"
                autoComplete="new-password"
                value={form.confirm}
                onChange={e => handleChange('confirm', e.target.value)}
              />
            </div>
            {errors.confirm && (
              <div className="field-error-text">
                <AlertCircleIcon size={14} />
                <span>{errors.confirm}</span>
              </div>
            )}
          </div>

          <button
            id="reg-submit"
            type="submit"
            className="btn btn-primary btn-full"
            disabled={loading}
            style={{ marginTop: '0.5rem' }}
          >
            {loading ? 'Đang tạo tài khoản...' : 'Đăng ký'}
          </button>

          <div className="auth-divider">hoặc tiếp tục với</div>

          <button
            id="reg-google"
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
          Đã có tài khoản? <Link to="/login">Đăng nhập ngay</Link>
        </div>
      </div>
    </div>
  );
}
