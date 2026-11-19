import { useState } from 'react';
import { useNavigate, useLocation, Outlet } from 'react-router-dom';
import { useAdminAuth } from '../context/AdminAuthContext';
import toast from 'react-hot-toast';
import AccountSettingsModal from './AccountSettingsModal';
import ConfirmModal from './ConfirmModal';
import {
  ShieldIcon,
  BarChartIcon,
  UserIcon,
  ClipboardListIcon,
  SettingsIcon,
  LogOutIcon,
} from '../../components/Icons';

const NAV = [
  { key: 'dashboard', icon: BarChartIcon, label: 'Tổng quan hệ thống', path: '/admin/dashboard' },
  { key: 'users', icon: UserIcon, label: 'Quản lý người dùng', path: '/admin/users' },
  { key: 'tasks', icon: ClipboardListIcon, label: 'Tất cả nhiệm vụ', path: '/admin/tasks' },
  { key: 'system', icon: SettingsIcon, label: 'Hệ thống & Dữ liệu', path: '/admin/system' },
];

export default function AdminLayout({ children, active }) {
  const { admin, logout, updateAdmin } = useAdminAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [showAccountModal, setShowAccountModal] = useState(false);
  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);

  const activeKey =
    active ||
    NAV.find((n) => location.pathname === n.path || location.pathname.startsWith(n.path + '/'))?.key ||
    'dashboard';

  const handleLogout = async () => {
    setShowLogoutConfirm(false);
    await logout();
    toast.success('Đã đăng xuất khỏi phiên Admin');
    navigate('/admin/login');
  };

  const initials = admin?.name
    ? admin.name.split(' ').map((w) => w[0]).slice(0, 2).join('').toUpperCase()
    : 'AD';

  return (
    <div className="admin-layout">
      {/* Mobile Backdrop */}
      {sidebarOpen && <div className="mobile-overlay" onClick={() => setSidebarOpen(false)} />}

      <aside className={`sidebar ${sidebarOpen ? 'mobile-open' : ''}`}>
        <div className="sidebar-logo">
          <div
            onClick={() => navigate('/admin/dashboard')}
            style={{ display: 'flex', alignItems: 'center', gap: '0.65rem', cursor: 'pointer', flex: 1, userSelect: 'none' }}
            title="Quay lại bảng điều khiển Admin"
          >
            <ShieldIcon size={34} />
            <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <span style={{ fontWeight: 700, fontSize: '1.05rem', color: 'var(--text-primary)' }}>TaskFlow</span>
              <span className="sidebar-badge">Admin</span>
            </div>
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
          {NAV.map((item) => {
            const NavIcon = item.icon;
            const isActive = activeKey === item.key;
            return (
              <button
                key={item.key}
                className={`nav-item ${isActive ? 'active' : ''}`}
                onClick={() => {
                  navigate(item.path);
                  setSidebarOpen(false);
                }}
              >
                <span className="nav-icon"><NavIcon size={18} /></span>
                <span>{item.label}</span>
              </button>
            );
          })}
        </nav>

        {/* User Gateway Button: Switch back to User Dashboard (Styled like Ảnh 3) */}
        <div style={{ padding: '0 0.75rem', marginBottom: '0.65rem' }}>
          <button
            onClick={() => navigate('/dashboard')}
            className="btn btn-sm btn-full"
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '0.4rem',
              width: '100%',
              boxSizing: 'border-box',
              padding: '0.45rem 0.5rem',
              fontWeight: 600,
              fontSize: '0.75rem',
              borderRadius: 8,
              background: 'linear-gradient(135deg, #0284c7 0%, #2563eb 100%)',
              color: '#ffffff',
              boxShadow: '0 2px 8px rgba(37, 99, 235, 0.25)',
              border: 'none',
              cursor: 'pointer',
              overflow: 'hidden',
              transition: 'all 0.15s ease',
            }}
            title="Chuyển sang Bảng làm việc của Người dùng (User)"
          >
            <UserIcon size={14} style={{ flexShrink: 0, color: '#e0f2fe' }} />
            <span style={{ fontWeight: 600, letterSpacing: '0.1px', whiteSpace: 'nowrap' }}>Xem giao diện User</span>
            <span
              style={{
                fontSize: '0.62rem',
                background: 'rgba(255, 255, 255, 0.25)',
                padding: '1px 5px',
                borderRadius: 4,
                fontWeight: 700,
                letterSpacing: '0.5px',
                lineHeight: 1.2,
                flexShrink: 0,
              }}
            >
              USER
            </span>
          </button>
        </div>

        {/* User Card & Logout (Clean, no redundant Settings button) */}
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
            <div className="user-avatar" style={{ width: 34, height: 34, flexShrink: 0, overflow: 'hidden', borderRadius: '50%' }}>
              {admin?.avatar_url ? (
                <img
                  src={admin.avatar_url}
                  alt={admin?.name || 'Admin'}
                  style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                  onError={(e) => {
                    e.currentTarget.style.display = 'none';
                  }}
                />
              ) : (
                initials
              )}
            </div>
            <div style={{ overflow: 'hidden', flex: 1 }}>
              <div style={{ fontWeight: 600, fontSize: '0.85rem', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                {admin?.name || 'Administrator'}
              </div>
              <div style={{ fontSize: '0.72rem', color: 'var(--primary)', fontWeight: 500, display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                <ShieldIcon size={12} />
                <span>Quản trị viên</span>
              </div>
            </div>
          </div>

          <button
            className="btn btn-ghost btn-sm btn-full"
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '0.45rem',
              width: '100%',
              padding: '0.5rem 0.75rem',
              fontSize: '0.82rem',
              borderRadius: 8,
              color: 'var(--danger)',
              background: 'var(--bg-elevated)',
              border: '1px solid var(--border)',
              cursor: 'pointer',
              transition: 'all 0.15s ease',
            }}
            onClick={() => setShowLogoutConfirm(true)}
            title="Đăng xuất khỏi bảng quản trị"
          >
            <LogOutIcon size={15} />
            <span>Đăng xuất</span>
          </button>
        </div>
      </aside>

      <main className="admin-main" id="main-content">
        <header className="header">
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            <button
              className="mobile-menu-btn"
              onClick={() => setSidebarOpen(true)}
              title="Mở menu"
            >
              ☰
            </button>
            <div className="header-title" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              {(() => {
                const currentNav = NAV.find((n) => n.key === activeKey);
                if (!currentNav) return 'Bảng quản trị';
                const IconComponent = currentNav.icon;
                return (
                  <>
                    <IconComponent size={20} style={{ color: 'var(--primary)' }} />
                    <span>{currentNav.label}</span>
                  </>
                );
              })()}
            </div>
          </div>
        </header>

        <div className="page-container">
          {children || <Outlet />}
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
      </main>
    </div>
  );
}
