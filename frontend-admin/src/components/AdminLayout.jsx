import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAdminAuth } from '../context/AdminAuthContext';
import toast from 'react-hot-toast';

const NAV = [
  { key: 'dashboard', icon: '📊', label: 'Tổng quan hệ thống', path: '/dashboard' },
  { key: 'users', icon: '👥', label: 'Quản lý người dùng', path: '/users' },
  { key: 'tasks', icon: '📋', label: 'Tất cả nhiệm vụ', path: '/tasks' },
  { key: 'system', icon: '⚙️', label: 'Hệ thống & Dữ liệu', path: '/system' },
];

export default function AdminLayout({ children, active }) {
  const { admin, logout } = useAdminAuth();
  const navigate = useNavigate();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const handleLogout = async () => {
    await logout();
    toast.success('Đã đăng xuất khỏi phiên Admin');
    navigate('/login');
  };

  const initials = admin?.name
    ? admin.name.split(' ').map(w => w[0]).slice(0, 2).join('').toUpperCase()
    : 'AD';

  return (
    <div className="admin-layout">
      {/* Mobile Backdrop */}
      {sidebarOpen && <div className="mobile-overlay" onClick={() => setSidebarOpen(false)} />}

      <aside className={`sidebar ${sidebarOpen ? 'mobile-open' : ''}`}>
        <div className="sidebar-logo">
          <div className="sidebar-logo-icon">🛡️</div>
          <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <span style={{ fontWeight: 700, fontSize: '1.05rem', color: 'var(--text-primary)' }}>TaskFlow</span>
            <span className="sidebar-badge">Admin</span>
          </div>
          <button
            className="btn-icon mobile-menu-btn"
            onClick={() => setSidebarOpen(false)}
            title="Đóng menu"
            style={{ display: 'none' }}
          >
            ✕
          </button>
        </div>

        <nav className="sidebar-nav">
          <div className="nav-section">Quản lý & Giám sát</div>
          {NAV.map(item => (
            <button
              key={item.key}
              className={`nav-item ${active === item.key ? 'active' : ''}`}
              onClick={() => {
                navigate(item.path);
                setSidebarOpen(false);
              }}
            >
              <span className="nav-icon">{item.icon}</span>
              <span>{item.label}</span>
            </button>
          ))}
        </nav>

        {/* User Card & Logout */}
        <div style={{ padding: '0.75rem', borderTop: '1px solid var(--border)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem', marginBottom: '0.65rem', padding: '0.5rem', background: 'var(--bg-elevated)', borderRadius: 6 }}>
            <div className="user-avatar">
              {initials}
            </div>
            <div style={{ overflow: 'hidden', flex: 1 }}>
              <div style={{ fontWeight: 600, fontSize: '0.85rem', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                {admin?.name || 'Administrator'}
              </div>
              <div style={{ fontSize: '0.72rem', color: 'var(--primary)' }}>Quản trị viên</div>
            </div>
          </div>

          <button
            className="nav-item"
            style={{ color: 'var(--danger)', width: '100%', padding: '0.45rem 0.65rem' }}
            onClick={handleLogout}
          >
            <span className="nav-icon">🚪</span>
            <span>Đăng xuất</span>
          </button>
        </div>
      </aside>

      <div className="admin-main">
        <header className="header">
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            <button
              className="mobile-menu-btn"
              onClick={() => setSidebarOpen(true)}
              title="Mở menu"
            >
              ☰
            </button>
            <div className="header-title">
              {NAV.find(n => n.key === active)?.icon} {NAV.find(n => n.key === active)?.label || 'Bảng quản trị'}
            </div>
          </div>
          <span className="header-badge">🛡️ Quản trị viên</span>
        </header>

        <div className="page-container">
          {children}
        </div>
      </div>
    </div>
  );
}
