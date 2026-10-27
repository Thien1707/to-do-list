import { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import api from '../services/api';
import toast from 'react-hot-toast';
import AccountSettingsModal from './AccountSettingsModal';
import ConfirmModal from './ConfirmModal';

const NAV_ITEMS = [
  { icon: '🏠', label: 'Tất cả nhiệm vụ', filter: '', route: null },
  { icon: '📋', label: 'Cần làm', filter: 'todo', route: null },
  { icon: '⚡', label: 'Đang làm', filter: 'in_progress', route: null },
  { icon: '✅', label: 'Hoàn thành', filter: 'done', route: null },
];

const PRESET_ICONS = [
  '💼', '💻', '📚', '🎯', '🚀', '💡', '🏃', '🛒',
  '💰', '✈️', '🏠', '⭐', '🎨', '🎮', '☕', '📅',
  '📝', '🔔', '🏆', '🍕', '🏥', '🔑', '🛠️', '🎵',
];

export default function Sidebar({
  categories = [],
  user,
  activeFilter,
  activeCategory,
  onFilterChange,
  onCategoryChange,
  onRefresh,
  onOpenStats,
  streak = 0,
  isOpen,
  onClose,
}) {
  const navigate = useNavigate();
  const location = useLocation();
  const { user: authUser, logout, updateUser } = useAuth();
  const displayUser = user || authUser;
  const effectiveStreak = displayUser?.id
    ? (localStorage.getItem(`user_streak_${displayUser.id}`) !== null
        ? parseInt(localStorage.getItem(`user_streak_${displayUser.id}`), 10)
        : (streak || 0))
    : (streak || 0);

  const [showAccountModal, setShowAccountModal] = useState(false);
  const [showCatModal, setShowCatModal] = useState(false);
  const [newCat, setNewCat] = useState({ name: '', color: '#4f46e5', icon: '📁' });
  const [customIconPreview, setCustomIconPreview] = useState(null);
  const [saving, setSaving] = useState(false);
  const [catToDelete, setCatToDelete] = useState(null);
  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);
  const [theme, setTheme] = useState(() => localStorage.getItem('theme') || 'light');

  useEffect(() => {
    const onThemeChange = (e) => {
      const nextTheme = e.detail || localStorage.getItem('theme') || 'light';
      setTheme(nextTheme);
    };
    window.addEventListener('theme-change', onThemeChange);
    return () => window.removeEventListener('theme-change', onThemeChange);
  }, []);

  useEffect(() => {
    if (theme === 'dark') {
      document.documentElement.setAttribute('data-theme', 'dark');
    } else if (theme === 'light') {
      document.documentElement.removeAttribute('data-theme');
    } else if (theme === 'system') {
      const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
      if (prefersDark) document.documentElement.setAttribute('data-theme', 'dark');
      else document.documentElement.removeAttribute('data-theme');
    }
    localStorage.setItem('theme', theme);
  }, [theme]);

  const toggleTheme = () => {
    const nextTheme = theme === 'light' ? 'dark' : 'light';
    setTheme(nextTheme);
    window.dispatchEvent(new CustomEvent('theme-change', { detail: nextTheme }));
  };

  const handleLogout = async () => {
    setShowLogoutConfirm(false);
    await logout();
    toast.success('Đã đăng xuất');
    navigate('/login');
  };

  const handleFileUpload = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      toast.error('Vui lòng chọn file hình ảnh');
      return;
    }

    if (file.size > 500 * 1024) {
      toast.error('Ảnh quá lớn (tối đa 500KB)');
      return;
    }

    const reader = new FileReader();
    reader.onload = (event) => {
      const dataUrl = event.target.result;
      setCustomIconPreview(dataUrl);
      setNewCat(c => ({ ...c, icon: dataUrl }));
      toast.success('Đã tải icon từ máy lên thành công!');
    };
    reader.readAsDataURL(file);
  };

  const handleAddCategory = async (e) => {
    e.preventDefault();
    if (!newCat.name.trim()) return;
    setSaving(true);
    try {
      await api.post('/tasks/categories', newCat);
      toast.success('Đã thêm danh mục mới');
      setShowCatModal(false);
      setNewCat({ name: '', color: '#4f46e5', icon: '📁' });
      setCustomIconPreview(null);
      onRefresh();
    } catch {
      toast.error('Thêm danh mục thất bại');
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteCategory = (e, cat) => {
    e.stopPropagation();
    setCatToDelete(cat);
  };

  const confirmDeleteCategory = async () => {
    if (!catToDelete) return;
    try {
      await api.delete(`/tasks/categories/${catToDelete.id}`);
      toast.success('Đã xóa danh mục');
      if (activeCategory === catToDelete.id) onCategoryChange('');
      onRefresh();
    } catch {
      toast.error('Không thể xóa danh mục');
    } finally {
      setCatToDelete(null);
    }
  };

  const renderIcon = (icon) => {
    if (!icon) return '📁';
    if (typeof icon === 'string' && icon.startsWith('data:image')) {
      return (
        <img
          src={icon}
          alt="icon"
          style={{ width: 18, height: 18, borderRadius: 4, objectFit: 'cover', verticalAlign: 'middle' }}
        />
      );
    }
    return <span>{icon}</span>;
  };

  const initials = displayUser?.name
    ? displayUser.name.split(' ').map(w => w[0]).slice(0, 2).join('').toUpperCase()
    : (displayUser?.email?.[0] || '?').toUpperCase();

  return (
    <>
      {/* Mobile backdrop */}
      {isOpen && <div className="mobile-overlay" onClick={onClose} />}

      <aside className={`sidebar ${isOpen ? 'mobile-open' : ''}`}>
        <div className="sidebar-logo">
          <div className="sidebar-logo-icon">✅</div>
          <span className="sidebar-logo-text">TaskFlow</span>
          <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
            <button
              className="btn-icon"
              onClick={toggleTheme}
              title={theme === 'light' ? 'Chuyển sang nền tối' : 'Chuyển sang nền sáng'}
              style={{ fontSize: '0.9rem' }}
            >
              {theme === 'light' ? '🌙' : '☀️'}
            </button>
            <button
              className="btn-icon mobile-menu-btn"
              onClick={onClose}
              title="Đóng menu"
              style={{ display: 'none' }}
            >
              ✕
            </button>
          </div>
        </div>

        {/* Daily Streak Highlight */}
        <div style={{ padding: '0.75rem 0.75rem 0.25rem' }}>
          <div
            onClick={onOpenStats}
            style={{
              background: 'var(--bg-elevated)',
              border: '1px solid var(--border)',
              borderRadius: 'var(--radius-sm)',
              padding: '0.55rem 0.75rem',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              cursor: 'pointer',
              transition: 'var(--transition)',
            }}
            title="Xem báo cáo năng suất & thành tựu"
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.45rem' }}>
              <span style={{ fontSize: '1.15rem' }}>🔥</span>
              <div>
                <div style={{ fontSize: '0.78rem', fontWeight: 700, color: '#f97316' }}>
                  Chuỗi {effectiveStreak} ngày
                </div>
                <div style={{ fontSize: '0.68rem', color: 'var(--text-muted)' }}>
                  Duy trì thói quen tốt
                </div>
              </div>
            </div>
            <span style={{ fontSize: '0.75rem', color: 'var(--primary)', fontWeight: 600 }}>
              Xem 📊
            </span>
          </div>
        </div>

        <nav className="sidebar-nav">
          <div className="sidebar-section-label">
            <span>Trạng thái</span>
          </div>

          {NAV_ITEMS.map(item => {
            const isActive = activeFilter === item.filter && !activeCategory;
            return (
              <button
                key={item.label}
                className={`nav-item ${isActive ? 'active' : ''}`}
                onClick={() => {
                  onCategoryChange('');
                  onFilterChange(item.filter);
                  if (onClose) onClose();
                }}
              >
                <span className="nav-icon">{item.icon}</span>
                <span>{item.label}</span>
              </button>
            );
          })}

          {/* Projects Button */}
          <button
            className={`nav-item ${location.pathname.startsWith('/projects') ? 'active' : ''}`}
            onClick={() => { navigate('/projects'); if (onClose) onClose(); }}
          >
            <span className="nav-icon">🗂️</span>
            <span>Projects</span>
          </button>

          {/* Quick Statistics Button */}
          <button
            className="nav-item"
            onClick={() => { onOpenStats(); if (onClose) onClose(); }}
          >
            <span className="nav-icon">📊</span>
            <span>Biểu đồ & Thành tựu</span>
          </button>

          <div className="sidebar-section-label" style={{ marginTop: '0.75rem' }}>
            <span>Danh mục</span>
            <button
              style={{
                background: 'none',
                border: 'none',
                color: 'var(--primary)',
                cursor: 'pointer',
                fontSize: '1rem',
                padding: '0 0.25rem',
                fontWeight: 700,
              }}
              onClick={() => setShowCatModal(true)}
              title="Thêm danh mục mới"
            >
              ＋
            </button>
          </div>

          {categories.length === 0 ? (
            <p style={{ fontSize: '0.78rem', color: 'var(--text-muted)', padding: '0.4rem 0.75rem' }}>
              Chưa có danh mục nào
            </p>
          ) : (
            categories.map(cat => {
              const isCatActive = activeCategory === cat.id;
              return (
                <div
                  key={cat.id}
                  className={`nav-item ${isCatActive ? 'active' : ''}`}
                  onClick={() => {
                    onCategoryChange(isCatActive ? '' : cat.id);
                    if (onClose) onClose();
                  }}
                  style={{ justifyContent: 'space-between', cursor: 'pointer' }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.55rem', overflow: 'hidden' }}>
                    <span style={{ fontSize: '0.95rem' }}>{renderIcon(cat.icon)}</span>
                    <span style={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                      {cat.name}
                    </span>
                  </div>
                  <button
                    className="btn-icon"
                    style={{ width: 20, height: 20, fontSize: '0.7rem', padding: 0 }}
                    onClick={(e) => handleDeleteCategory(e, cat)}
                    title="Xóa danh mục"
                  >
                    ✕
                  </button>
                </div>
              );
            })
          )}
        </nav>

        {/* User Card & Settings */}
        <div style={{ padding: '0.5rem 0.75rem', borderTop: '1px solid var(--border)' }}>
          <div
            className="sidebar-user"
            onClick={() => setShowAccountModal(true)}
            style={{
              margin: 0,
              marginBottom: '0.45rem',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              padding: '0.55rem 0.65rem',
              borderRadius: 8,
              transition: 'all 0.15s ease',
            }}
            title="Nhấn để mở Cài đặt tài khoản & Hồ sơ"
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem', overflow: 'hidden' }}>
              <div className="user-avatar" style={{ width: 34, height: 34, flexShrink: 0 }}>
                {displayUser?.avatar_url ? (
                  <img src={displayUser.avatar_url} alt="avatar" />
                ) : (
                  initials
                )}
              </div>
              <div className="user-info" style={{ overflow: 'hidden' }}>
                <div className="user-name" style={{ fontSize: '0.85rem', fontWeight: 600, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                  {displayUser?.name || displayUser?.email}
                </div>
                <div className="user-role" style={{ fontSize: '0.72rem', color: 'var(--text-muted)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                  {displayUser?.email}
                </div>
              </div>
            </div>
            <span
              style={{
                fontSize: '0.9rem',
                color: 'var(--text-muted)',
                padding: '4px',
                borderRadius: '6px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
              title="Cài đặt"
            >
              ⚙️
            </span>
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
              title="Mở hồ sơ và cài đặt tài khoản"
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

        {/* Account & Profile Settings Modal */}
        {showAccountModal && (
          <AccountSettingsModal
            user={displayUser}
            onUpdateUser={(updatedUser) => {
              if (updateUser) updateUser(updatedUser);
              if (onRefresh) onRefresh();
            }}
            onClose={() => setShowAccountModal(false)}
          />
        )}

        {/* Modal: Add Category with rich icon picker & file upload */}
        {showCatModal && (
          <div
            className="modal-overlay"
            onClick={e => e.target === e.currentTarget && setShowCatModal(false)}
            style={{ zIndex: 300 }}
          >
            <div className="modal animate-fadein" style={{ maxWidth: 'min(94vw, 460px)' }}>
              <div className="modal-header">
                <h3>➕ Thêm danh mục mới</h3>
                <button className="btn-icon" onClick={() => setShowCatModal(false)}>✕</button>
              </div>
              <form onSubmit={handleAddCategory}>
                <div className="modal-body">
                  <div className="form-group">
                    <label className="form-label">Tên danh mục *</label>
                    <input
                      className="form-input"
                      placeholder="Ví dụ: Công việc, Đồ án, Học tập, Thể thao..."
                      value={newCat.name}
                      onChange={e => setNewCat(c => ({ ...c, name: e.target.value }))}
                      required
                      autoFocus
                    />
                  </div>

                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
                    <div className="form-group">
                      <label className="form-label">Màu nhận diện</label>
                      <input
                        type="color"
                        className="form-input"
                        style={{ height: '38px', padding: '0.2rem', cursor: 'pointer' }}
                        value={newCat.color}
                        onChange={e => setNewCat(c => ({ ...c, color: e.target.value }))}
                      />
                    </div>
                    <div className="form-group">
                      <label className="form-label">Xem trước</label>
                      <div
                        style={{
                          height: '38px',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '0.4rem',
                          padding: '0 0.75rem',
                          background: 'var(--bg-elevated)',
                          border: '1px solid var(--border)',
                          borderRadius: 'var(--radius-sm)',
                          fontSize: '0.85rem',
                          fontWeight: 600,
                        }}
                      >
                        {renderIcon(newCat.icon)}
                        <span style={{ color: newCat.color }}>{newCat.name || 'Tên danh mục'}</span>
                      </div>
                    </div>
                  </div>

                  {/* Icon Selection with Emojis & Custom Upload */}
                  <div className="form-group">
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.35rem' }}>
                      <label className="form-label" style={{ margin: 0 }}>Chọn Icon danh mục</label>
                      <label
                        style={{
                          fontSize: '0.74rem',
                          color: 'var(--primary)',
                          cursor: 'pointer',
                          fontWeight: 600,
                          display: 'flex',
                          alignItems: 'center',
                          gap: '0.25rem',
                        }}
                      >
                        📁 Tải ảnh từ máy
                        <input
                          type="file"
                          accept="image/*"
                          style={{ display: 'none' }}
                          onChange={handleFileUpload}
                        />
                      </label>
                    </div>

                    {/* Presets Grid */}
                    <div
                      style={{
                        display: 'grid',
                        gridTemplateColumns: 'repeat(8, 1fr)',
                        gap: '0.35rem',
                        background: 'var(--bg-elevated)',
                        padding: '0.5rem',
                        borderRadius: 'var(--radius-sm)',
                        border: '1px solid var(--border)',
                        maxHeight: '130px',
                        overflowY: 'auto',
                      }}
                    >
                      {PRESET_ICONS.map(emoji => (
                        <button
                          key={emoji}
                          type="button"
                          onClick={() => {
                            setCustomIconPreview(null);
                            setNewCat(c => ({ ...c, icon: emoji }));
                          }}
                          style={{
                            background: newCat.icon === emoji && !customIconPreview ? 'var(--primary-light)' : 'var(--bg-card)',
                            border: `1px solid ${newCat.icon === emoji && !customIconPreview ? 'var(--primary)' : 'var(--border)'}`,
                            borderRadius: '4px',
                            fontSize: '1.1rem',
                            padding: '0.3rem 0',
                            cursor: 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            transition: 'var(--transition)',
                          }}
                        >
                          {emoji}
                        </button>
                      ))}
                    </div>

                    {customIconPreview && (
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginTop: '0.45rem', fontSize: '0.78rem', color: '#10b981' }}>
                        <span>✓ Đang dùng ảnh tùy chỉnh từ máy:</span>
                        <img src={customIconPreview} alt="custom" style={{ width: 22, height: 22, borderRadius: 4, objectFit: 'cover' }} />
                        <button
                          type="button"
                          className="btn-icon"
                          style={{ width: 18, height: 18, fontSize: '0.65rem' }}
                          onClick={() => {
                            setCustomIconPreview(null);
                            setNewCat(c => ({ ...c, icon: '📁' }));
                          }}
                          title="Hủy ảnh"
                        >
                          ✕
                        </button>
                      </div>
                    )}
                  </div>
                </div>

                <div className="modal-footer">
                  <button type="button" className="btn btn-ghost" onClick={() => setShowCatModal(false)}>
                    Hủy
                  </button>
                  <button type="submit" className="btn btn-primary" disabled={saving}>
                    {saving ? 'Đang lưu...' : 'Thêm danh mục'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
        {catToDelete && (
          <ConfirmModal
            isOpen={!!catToDelete}
            title="Xác nhận xóa danh mục"
            message={`Bạn có chắc muốn xóa danh mục "${catToDelete.name}"? Các nhiệm vụ trong danh mục này sẽ không bị xóa.`}
            confirmText="Xóa danh mục"
            cancelText="Hủy bỏ"
            variant="danger"
            icon="📁"
            onConfirm={confirmDeleteCategory}
            onClose={() => setCatToDelete(null)}
          />
        )}
        {showLogoutConfirm && (
          <ConfirmModal
            isOpen={showLogoutConfirm}
            title="Đăng xuất"
            message="Bạn có chắc chắn muốn đăng xuất khỏi tài khoản TaskFlow?"
            confirmText="🚪 Đăng xuất"
            cancelText="Ở lại"
            variant="warning"
            icon="🚪"
            onConfirm={handleLogout}
            onClose={() => setShowLogoutConfirm(false)}
          />
        )}
      </aside>
    </>
  );
}
