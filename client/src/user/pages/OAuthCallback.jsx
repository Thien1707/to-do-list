import { useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import toast from 'react-hot-toast';

export default function OAuthCallback() {
  const [params] = useSearchParams();
  const navigate = useNavigate();
  const { setUser } = useAuth();

  useEffect(() => {
    const token = params.get('token');
    if (token) {
      localStorage.setItem('accessToken', token);
      try {
        const payload = JSON.parse(atob(token.split('.')[1]));
        const user = { id: payload.id, email: payload.email, role: payload.role };
        localStorage.setItem('user', JSON.stringify(user));
        setUser(user);
        toast.success('Đăng nhập Google thành công!');
        navigate('/dashboard');
      } catch {
        toast.error('Không thể xác thực thông tin tài khoản');
        navigate('/login');
      }
    } else {
      toast.error(params.get('error') || 'Đăng nhập Google thất bại');
      navigate('/login');
    }
  }, [params, navigate, setUser]);

  return (
    <div className="page-loader">
      <div className="spinner" />
      <p style={{ color: 'var(--text-secondary)' }}>Đang hoàn tất đăng nhập...</p>
    </div>
  );
}
