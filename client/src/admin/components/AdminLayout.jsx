import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAdminAuth } from '../context/AdminAuthContext';
import toast from 'react-hot-toast';
import AccountSettingsModal from './AccountSettingsModal';
import ConfirmModal from './ConfirmModal';

const NAV = [
  { key: 'dashboard', icon: '📊', label: 'Tổng quan hệ thống', path: '/admin/dashboard' },
  { key: 'users', icon: '👥', label: 'Quản lý người dùng', path: '/admin/users' },
  { key: 'tasks', icon: '📋', label: 'Tất cả nhiệm vụ', path: '/admin/tasks' },
  { key: 'system', icon: '⚙️', label: 'Hệ thống & Dữ liệu', path: '/admin/system' },
];

export default function AdminLayout({ children, active }) {
  const { admin, logout, updateAdmin } = useAdminAuth();
  const navigate = useNavigate();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [showAccountModal, setShowAccountModal] = useState(false);
  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);

  const handleLogout = async () => {
    setShowLogoutConfirm(false);
    await logout();
    toast.success('Đã đăng xuất khỏi phiên Admin');
    navigate('/admin/login');
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

        {/* User Card & Settings */}
        <div style={{ padding: '0.75rem', borderTop: '1px solid var(--border)' }}>
          <div
            onClick={() => setShowAccountModal(true)}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '0.65rem',
              marginBottom: '0.55rem',
              padding: '0.55rem',
              background: 'var(--bg-elevated)',
              borderRadius: 8,
              cursor: 'pointer',
              transition: 'all 0.15s ease',
            }}
            title="Nhấn để mở Cài đặt tài khoản Admin"
          >
            <div className="user-avatar" style={{ width: 34, height: 34, flexShrink: 0 }}>
              {admin?.avatar_url ? (
                <img src={admin.avatar_url} alt="avatar" />
              ) : (
                initials
              )}
            </div>
            <div style={{ overflow: 'hidden', flex: 1 }}>
              <div style={{ fontWeight: 600, fontSize: '0.85rem', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                {admin?.name || 'Administrator'}
              </div>
              <div style={{ fontSize: '0.72rem', color: 'var(--primary)', fontWeight: 500 }}>
                🛡️ Quản trị viên
              </div>
            </div>
            <span style={{ fontSize: '0.9rem', color: 'var(--text-muted)' }}>⚙️</span>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.4rem' }}>
            <button
              className="btn btn-ghost btn-sm"
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '0.35rem',
                padding: '0.45rem 0.35rem',
                fontSize: '0.78rem',
                whiteSpace: 'nowrap',
                borderRadius: 6,
                background: 'var(--bg-elevated)',
                border: '1px solid var(--border)',
              }}
              onClick={() => setShowAccountModal(true)}
              title="Mở cài đặt tài khoản quản trị"
            >
              <span>⚙️</span>
              <span>Cài đặt</span>
            </button>
            <button
              className="btn btn-ghost btn-sm"
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '0.35rem',
                padding: '0.45rem 0.35rem',
                fontSize: '0.78rem',
                whiteSpace: 'nowrap',
                borderRadius: 6,
                color: 'var(--danger)',
                background: 'var(--bg-elevated)',
                border: '1px solid var(--border)',
              }}
              onClick={() => setShowLogoutConfirm(true)}
              title="Đăng xuất khỏi hệ thống"
            >
              <span>🚪</span>
              <span>Đăng xuất</span>
            </button>
          </div>
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
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
            <button
              onClick={() => setShowAccountModal(true)}
              className="btn btn-sm btn-ghost"
              style={{ display: 'flex', alignItems: 'center', gap: '0.45rem', padding: '0.3rem 0.65rem', borderRadius: 99, background: 'var(--bg-elevated)', border: '1px solid var(--border)' }}
              title="Nhấn để mở Cài đặt tài khoản"
            >
              <div className="user-avatar" style={{ width: 22, height: 22, fontSize: '0.65rem' }}>
                {admin?.avatar_url ? <img src={admin.avatar_url} alt="" /> : initials}
              </div>
              <span style={{ fontSize: '0.8rem', fontWeight: 600 }}>{admin?.name?.split(' ')[0] || 'Admin'}</span>
              <span style={{ fontSize: '0.75rem', color: 'var(--primary)' }}>⚙️</span>
            </button>
          </div>
        </header>

        <div className="page-container">
          {children}
        </div>

        {/* Admin Account Settings Modal */}
        {showAccountModal && (
          <AccountSettingsModal
            admin={admin}
            onUpdateAdmin={(updatedAdmin) => {
              if (updateAdmin) updateAdmin(updatedAdmin);
            }}
            onClose={() => setShowAccountModal(false)}
          />
        )}

        {/* Logout Confirmation Modal */}
        {showLogoutConfirm && (
          <ConfirmModal
            isOpen={showLogoutConfirm}
            title="Đăng xuất quản trị"
            message="Bạn có chắc chắn muốn đăng xuất khỏi phiên làm việc Quản trị viên?"
            confirmText="🚪 Đăng xuất"
            cancelText="Ở lại"
            variant="warning"
            icon="🚪"
            onConfirm={handleLogout}
            onClose={() => setShowLogoutConfirm(false)}
          />
        )}
      </div>
    </div>
  );
}
