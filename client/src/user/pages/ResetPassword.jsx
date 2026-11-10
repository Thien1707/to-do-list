import { useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import toast from 'react-hot-toast';
import api from '../services/api';

export default function ResetPassword() {
  const [searchParams] = useSearchParams();
  const token = searchParams.get('token') || '';
  const navigate = useNavigate();
  const [form, setForm] = useState({ newPassword: '', confirmPassword: '' });
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!token) {
      toast.error('Link không hợp lệ. Yêu cầu gửi lại email quên mật khẩu.');
      return;
    }
    if (form.newPassword.length < 6) {
      toast.error('Mật khẩu tối thiểu 6 ký tự');
      return;
    }
    if (form.newPassword !== form.confirmPassword) {
      toast.error('Mật khẩu xác nhận không khớp');
      return;
    }

    setLoading(true);
    try {
      const { data } = await api.post('/auth/reset-password', {
        token,
        new_password: form.newPassword,
        confirm_password: form.confirmPassword,
      });
      toast.success(data.message || 'Đặt lại mật khẩu thành công');
      navigate('/login');
    } catch (err) {
      toast.error(err.response?.data?.message || 'Không thể đặt lại mật khẩu');
    } finally {
      setLoading(false);
    }
  };

  if (!token) {
    return (
      <div className="auth-page">
        <div className="auth-box animate-fadein">
          <div className="auth-title">
            <h1>Link không hợp lệ</h1>
            <p>Token thiếu hoặc hết hạn.</p>
          </div>
          <div className="auth-footer">
            <Link to="/forgot-password">Gửi lại email quên mật khẩu</Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="auth-page">
      <div className="auth-box animate-fadein">
        <div className="auth-title">
          <h1>Mật khẩu mới</h1>
          <p>Nhập mật khẩu mới cho tài khoản của bạn</p>
        </div>

        <form className="auth-form" onSubmit={handleSubmit} noValidate>
          <div className="form-group">
            <label className="form-label" htmlFor="reset-new">Mật khẩu mới *</label>
            <div style={{ position: 'relative' }}>
              <input
                id="reset-new"
                type={showPassword ? 'text' : 'password'}
                className="form-input"
                value={form.newPassword}
                onChange={(e) => setForm((p) => ({ ...p, newPassword: e.target.value }))}
                autoComplete="new-password"
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
                }}
              >
                {showPassword ? '🙈' : '👁️'}
              </button>
            </div>
          </div>
          <div className="form-group">
            <label className="form-label" htmlFor="reset-confirm">Xác nhận mật khẩu *</label>
            <input
              id="reset-confirm"
              type={showPassword ? 'text' : 'password'}
              className="form-input"
              value={form.confirmPassword}
              onChange={(e) => setForm((p) => ({ ...p, confirmPassword: e.target.value }))}
              autoComplete="new-password"
            />
          </div>
          <button type="submit" className="btn btn-primary btn-full" disabled={loading}>
            {loading ? 'Đang lưu...' : 'Cập nhật mật khẩu'}
          </button>
        </form>

        <div className="auth-footer" style={{ marginTop: '1rem' }}>
          <Link to="/login">← Đăng nhập</Link>
        </div>
      </div>
    </div>
  );
}
