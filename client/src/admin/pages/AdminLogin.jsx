import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAdminAuth } from '../context/AdminAuthContext';
import toast from 'react-hot-toast';

export default function AdminLogin() {
  const [form, setForm] = useState({ email: '', password: '' });
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState({});
  const { login } = useAdminAuth();
  const navigate = useNavigate();

  const validate = () => {
    const errs = {};
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

    if (!form.email.trim()) {
      errs.email = 'Vui lòng nhập email quản trị viên';
    } else if (!emailRegex.test(form.email.trim())) {
      errs.email = 'Email không hợp lệ (ví dụ: admin@taskmanager.com)';
    }

    if (!form.password) {
      errs.password = 'Vui lòng nhập mật khẩu quản trị';
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
      toast.success('Đăng nhập quản trị viên thành công!');
      navigate('/admin/dashboard');
    } catch (err) {
      const msg = err.response?.data?.message || 'Đăng nhập thất bại. Kiểm tra email/mật khẩu';
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

  return (
    <div className="auth-page">
      <div className="auth-box animate-fadein">
        <div className="auth-logo">
          <div className="auth-logo-icon">🛡️</div>
          <span style={{ fontWeight: 700, fontSize: '1.2rem', color: 'var(--text-primary)' }}>
            TaskFlow <span style={{ fontSize: '0.75rem', color: 'var(--primary)', fontWeight: 600 }}>ADMIN</span>
          </span>
        </div>

        <div className="auth-title">
          <h1>Đăng nhập Quản trị</h1>
          <p>Truy cập bảng điều khiển hệ thống TaskFlow</p>
        </div>

        <form className="auth-form" onSubmit={handleSubmit} noValidate>
          <div className="form-group">
            <label className="form-label" htmlFor="admin-email">Email Quản trị *</label>
            <input
              id="admin-email"
              type="email"
              className={`form-input ${errors.email ? 'input-error' : ''}`}
              placeholder="admin@taskmanager.com"
              autoComplete="email"
              value={form.email}
              onChange={e => handleChange('email', e.target.value)}
              autoFocus
            />
            {errors.email && <div className="field-error-text">⚠️ {errors.email}</div>}
          </div>

          <div className="form-group">
            <label className="form-label" htmlFor="admin-password">Mật khẩu *</label>
            <div style={{ position: 'relative' }}>
              <input
                id="admin-password"
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

          {/* Account hint */}
          <div
            style={{
              background: 'var(--bg-elevated)',
              border: '1px solid var(--border)',
              borderRadius: 6,
              padding: '0.65rem 0.85rem',
              fontSize: '0.78rem',
              color: 'var(--text-secondary)',
            }}
          >
            <span style={{ fontWeight: 600, color: 'var(--text-primary)' }}>💡 Tài khoản mặc định:</span>
            <div style={{ marginTop: '0.2rem', fontFamily: 'monospace' }}>
              admin@taskmanager.com / Admin@123
            </div>
          </div>

          <button
            id="admin-login-btn"
            type="submit"
            className="btn btn-primary btn-full"
            disabled={loading}
            style={{ marginTop: '0.4rem' }}
          >
            {loading ? 'Đang xác thực...' : 'Đăng nhập vào Hệ thống'}
          </button>
        </form>
      </div>
    </div>
  );
}
