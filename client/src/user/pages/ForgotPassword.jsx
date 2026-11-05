import { useState } from 'react';
import { Link } from 'react-router-dom';
import toast from 'react-hot-toast';
import api from '../services/api';

export default function ForgotPassword() {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    const trimmed = email.trim();
    if (!trimmed) {
      toast.error('Vui lòng nhập email');
      return;
    }

    setLoading(true);
    try {
      const { data } = await api.post('/auth/forgot-password', { email: trimmed });
      setSent(true);
      toast.success(data.message || 'Đã gửi hướng dẫn (nếu email tồn tại)');
      if (data.data?.devResetUrl) {
        console.info('Dev reset URL:', data.data.devResetUrl);
        toast('Dev: xem link reset trong Console (F12)', { duration: 6000 });
      }
    } catch (err) {
      const msg =
        err.response?.data?.message ||
        (err.response?.status === 404
          ? 'Không kết nối được API backend. Kiểm tra Render + biến RENDER_API_ORIGIN trên Vercel.'
          : 'Gửi yêu cầu thất bại');
      toast.error(msg);
    } finally {
      setLoading(false);
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
          <h1>Quên mật khẩu</h1>
          <p>Nhập email đã đăng ký — chúng tôi gửi link đặt lại mật khẩu</p>
        </div>

        {sent ? (
          <p style={{ fontSize: '0.9rem', color: 'var(--text-secondary)', lineHeight: 1.6 }}>
            Kiểm tra hộp thư (và thư rác). Link có hiệu lực 1 giờ.
          </p>
        ) : (
          <form className="auth-form" onSubmit={handleSubmit} noValidate>
            <div className="form-group">
              <label className="form-label" htmlFor="forgot-email">Email *</label>
              <input
                id="forgot-email"
                type="email"
                className="form-input"
                placeholder="you@example.com"
                autoComplete="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                autoFocus
              />
            </div>
            <button type="submit" className="btn btn-primary btn-full" disabled={loading}>
              {loading ? 'Đang gửi...' : 'Gửi link đặt lại mật khẩu'}
            </button>
          </form>
        )}

        <div className="auth-footer" style={{ marginTop: '1.25rem' }}>
          <Link to="/login">← Quay lại đăng nhập</Link>
        </div>
      </div>
    </div>
  );
}
