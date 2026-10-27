import { useState, useEffect, useRef } from 'react';
import toast from 'react-hot-toast';
import api from '../services/api';
import ConfirmModal from './ConfirmModal';

const PRESET_AVATARS = [
  { id: 'bot-1', label: 'Robot Alpha', url: 'https://api.dicebear.com/7.x/bottts/svg?seed=Felix' },
  { id: 'bot-2', label: 'Robot Beta', url: 'https://api.dicebear.com/7.x/bottts/svg?seed=Aneka' },
  { id: 'human-1', label: 'Oliver', url: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Oliver' },
  { id: 'human-2', label: 'Sophia', url: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Sophia' },
  { id: 'human-3', label: 'Jasper', url: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Jasper' },
  { id: 'human-4', label: 'Zoe', url: 'https://api.dicebear.com/7.x/lorelei/svg?seed=Zoe' },
  { id: 'human-5', label: 'Leo', url: 'https://api.dicebear.com/7.x/micah/svg?seed=Leo' },
  { id: 'human-6', label: 'Luna', url: 'https://api.dicebear.com/7.x/notionists/svg?seed=Luna' },
];

export default function AccountSettingsModal({ user, onUpdateUser, onClose }) {
  const [activeTab, setActiveTab] = useState('profile'); // profile | security | appearance | stats
  const [loading, setLoading] = useState(false);
  const [statsLoading, setStatsLoading] = useState(false);
  const [userData, setUserData] = useState(user || {});
  const [stats, setStats] = useState(null);
  const [showDeleteAvatarConfirm, setShowDeleteAvatarConfirm] = useState(false);

  // Profile Form State
  const [name, setName] = useState(user?.name || '');
  const [phone, setPhone] = useState(user?.phone || '');
  const [jobTitle, setJobTitle] = useState(user?.job_title || '');
  const [department, setDepartment] = useState(user?.department || '');
  const [bio, setBio] = useState(user?.bio || '');
  const [avatarUrl, setAvatarUrl] = useState(user?.avatar_url || '');

  // Avatar Upload State
  const [selectedFile, setSelectedFile] = useState(null);
  const [previewUrl, setPreviewUrl] = useState(null);
  const [showPresets, setShowPresets] = useState(false);
  const fileInputRef = useRef(null);

  // Security Form State
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showCurrentPw, setShowCurrentPw] = useState(false);
  const [showNewPw, setShowNewPw] = useState(false);
  const [showConfirmPw, setShowConfirmPw] = useState(false);
  const [sessions, setSessions] = useState([]);

  // Preferences State
  const [theme, setTheme] = useState(user?.theme_preference || localStorage.getItem('theme') || 'light');
  const [notifications, setNotifications] = useState(
    user?.notification_settings || {
      email_reminders: true,
      due_date_alerts: true,
      system_updates: true,
      sound_enabled: true,
    }
  );

  // Fetch latest user data, stats, and sessions
  useEffect(() => {
    let isMounted = true;
    const fetchUserData = async () => {
      setStatsLoading(true);
      try {
        const { data } = await api.get('/auth/me');
        if (isMounted && data.success) {
          const freshUser = data.data.user;
          setUserData(freshUser);
          setName(freshUser.name || '');
          setPhone(freshUser.phone || '');
          setJobTitle(freshUser.job_title || '');
          setDepartment(freshUser.department || '');
          setBio(freshUser.bio || '');
          setAvatarUrl(freshUser.avatar_url || '');
          if (freshUser.theme_preference) setTheme(freshUser.theme_preference);
          if (freshUser.notification_settings) setNotifications(freshUser.notification_settings);
          if (freshUser.stats) setStats(freshUser.stats);
        }
      } catch (err) {
        console.error('Không thể tải dữ liệu tài khoản:', err);
      } finally {
        if (isMounted) setStatsLoading(false);
      }
    };

    const fetchSessions = async () => {
      try {
        const { data } = await api.get('/auth/sessions');
        if (isMounted && data.success) {
          setSessions(data.data.sessions || []);
        }
      } catch (_) {}
    };

    fetchUserData();
    fetchSessions();

    return () => {
      isMounted = false;
    };
  }, []);

  // Handle local avatar file selection
  const handleFileChange = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      toast.error('Vui lòng chọn một file ảnh hợp lệ (PNG, JPG, WEBP, GIF)');
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      toast.error('Kích thước ảnh tối đa là 5MB');
      return;
    }

    setSelectedFile(file);
    const objectUrl = URL.createObjectURL(file);
    setPreviewUrl(objectUrl);
  };

  // Upload Avatar to backend
  const handleUploadAvatar = async () => {
    if (!selectedFile) return;
    setLoading(true);
    try {
      const formData = new FormData();
      formData.append('avatar', selectedFile);

      const { data } = await api.post('/auth/avatar', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });

      if (data.success) {
        toast.success('Cập nhật ảnh đại diện thành công!');
        setAvatarUrl(data.data.avatar_url);
        setSelectedFile(null);
        setPreviewUrl(null);
        if (onUpdateUser) onUpdateUser(data.data.user);
      }
    } catch (err) {
      toast.error(err.response?.data?.message || 'Tải ảnh đại diện thất bại');
    } finally {
      setLoading(false);
    }
  };

  // Select Preset Avatar
  const handleSelectPreset = async (presetUrl) => {
    setLoading(true);
    try {
      const { data } = await api.post('/auth/avatar', { avatar_url: presetUrl });
      if (data.success) {
        toast.success('Đã áp dụng avatar mẫu!');
        setAvatarUrl(presetUrl);
        setSelectedFile(null);
        setPreviewUrl(null);
        setShowPresets(false);
        if (onUpdateUser) onUpdateUser(data.data.user);
      }
    } catch (err) {
      toast.error(err.response?.data?.message || 'Không thể chọn avatar này');
    } finally {
      setLoading(false);
    }
  };

  // Delete / Reset Avatar
  const handleDeleteAvatar = () => {
    setShowDeleteAvatarConfirm(true);
  };

  const confirmDeleteAvatar = async () => {
    setLoading(true);
    try {
      const { data } = await api.delete('/auth/avatar');
      if (data.success) {
        toast.success('Đã xóa ảnh đại diện');
        setAvatarUrl('');
        setSelectedFile(null);
        setPreviewUrl(null);
        if (onUpdateUser) onUpdateUser(data.data.user);
      }
    } catch (err) {
      toast.error(err.response?.data?.message || 'Xóa ảnh thất bại');
    } finally {
      setLoading(false);
      setShowDeleteAvatarConfirm(false);
    }
  };

  // Cancel selected local file
  const handleCancelSelectedFile = () => {
    setSelectedFile(null);
    setPreviewUrl(null);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  // Vietnam Phone Format Validation Algorithm
  const isPhoneValid = (p) => {
    if (!p || !p.trim()) return true;
    return /^(0|\+84)(3[2-9]|5[2689]|7[06-9]|8[1-9]|9[0-9])[0-9]{7}$/.test(p.trim().replace(/\s+/g, ''));
  };

  // Save Profile Info (Automatically uploads selected avatar file if present)
  const handleSaveProfile = async (e) => {
    e.preventDefault();
    if (!name.trim()) {
      toast.error('Họ và tên không được để trống');
      return;
    }

    if (phone && !isPhoneValid(phone)) {
      toast.error('Số điện thoại không đúng định dạng Việt Nam (10 chữ số)');
      return;
    }

    setLoading(true);
    try {
      let freshAvatarUrl = avatarUrl;
      // If a local image file is chosen, upload it first seamlessly!
      if (selectedFile) {
        toast.loading('Đang xử lý ảnh đại diện...', { id: 'save-profile' });
        const formData = new FormData();
        formData.append('avatar', selectedFile);
        const avatarRes = await api.post('/auth/avatar', formData, {
          headers: { 'Content-Type': 'multipart/form-data' },
        });
        if (avatarRes.data.success) {
          freshAvatarUrl = avatarRes.data.data.avatar_url;
          setAvatarUrl(freshAvatarUrl);
          setSelectedFile(null);
          setPreviewUrl(null);
        }
      }

      const payload = {
        name: name.trim(),
        phone: phone ? phone.trim().replace(/\s+/g, '') : null,
        job_title: jobTitle.trim(),
        department: department.trim(),
        bio: bio.trim(),
        avatar_url: freshAvatarUrl,
      };

      const { data } = await api.put('/auth/profile', payload);
      if (data.success) {
        toast.success('Cập nhật thông tin tài khoản thành công!', { id: 'save-profile' });
        setUserData(data.data.user);
        if (onUpdateUser) onUpdateUser(data.data.user);
      }
    } catch (err) {
      toast.error(err.response?.data?.message || 'Cập nhật thất bại', { id: 'save-profile' });
    } finally {
      setLoading(false);
    }
  };

  // Real-time Password Security Criteria & Strength Algorithm
  const getPasswordDetails = (pwd) => {
    if (!pwd) {
      return {
        score: 0,
        label: 'Chưa nhập',
        color: 'var(--text-muted)',
        criteria: { length: false, case: false, number: false, special: false },
      };
    }
    const criteria = {
      length: pwd.length >= 8,
      case: /[A-Z]/.test(pwd) && /[a-z]/.test(pwd),
      number: /[0-9]/.test(pwd),
      special: /[^A-Za-z0-9]/.test(pwd),
    };
    const validCount = Object.values(criteria).filter(Boolean).length;
    if (pwd.length < 6) return { score: 1, label: 'Quá ngắn (< 6 ký tự)', color: '#ef4444', criteria };
    if (validCount <= 1) return { score: 1, label: 'Yếu', color: '#ef4444', criteria };
    if (validCount <= 3) return { score: 2, label: 'Trung bình', color: '#f59e0b', criteria };
    return { score: 3, label: 'Rất mạnh (Khuyên dùng)', color: '#10b981', criteria };
  };

  const pwDetails = getPasswordDetails(newPassword);

  // Change Password
  const handleChangePassword = async (e) => {
    e.preventDefault();
    if (userData.hasPassword && !currentPassword) {
      toast.error('Vui lòng nhập mật khẩu hiện tại');
      return;
    }
    if (!newPassword || newPassword.length < 6) {
      toast.error('Mật khẩu mới phải có tối thiểu 6 ký tự');
      return;
    }
    if (newPassword !== confirmPassword) {
      toast.error('Mật khẩu xác nhận không khớp');
      return;
    }

    setLoading(true);
    try {
      const payload = {
        currentPassword: currentPassword || undefined,
        newPassword,
        confirmPassword,
      };

      const { data } = await api.post('/auth/change-password', payload);
      if (data.success) {
        toast.success(data.message || 'Đổi mật khẩu thành công!');
        setCurrentPassword('');
        setNewPassword('');
        setConfirmPassword('');
        setUserData(prev => ({ ...prev, hasPassword: true }));
      }
    } catch (err) {
      toast.error(err.response?.data?.message || 'Đổi mật khẩu thất bại');
    } finally {
      setLoading(false);
    }
  };

  // Change Theme with Instant Dynamic Sync
  const handleThemeChange = async (newTheme) => {
    setTheme(newTheme);
    localStorage.setItem('theme', newTheme);
    if (newTheme === 'dark') {
      document.documentElement.setAttribute('data-theme', 'dark');
    } else if (newTheme === 'light') {
      document.documentElement.removeAttribute('data-theme');
    } else {
      // System
      const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
      if (prefersDark) document.documentElement.setAttribute('data-theme', 'dark');
      else document.documentElement.removeAttribute('data-theme');
    }

    window.dispatchEvent(new CustomEvent('theme-change', { detail: newTheme }));

    try {
      await api.put('/auth/profile', { theme_preference: newTheme });
    } catch (_) {}
  };

  // Toggle Notification Setting
  const handleToggleNotification = async (key) => {
    const updated = { ...notifications, [key]: !notifications[key] };
    setNotifications(updated);
    try {
      await api.put('/auth/profile', { notification_settings: updated });
      toast.success('Đã lưu tùy chọn thông báo');
    } catch (_) {
      toast.error('Không thể lưu cài đặt');
    }
  };

  const userInitials = (name || user?.name || user?.email || 'U').charAt(0).toUpperCase();
  const currentAvatarDisplay = previewUrl || avatarUrl;

  return (
    <div className="modal-overlay" onClick={e => e.target === e.currentTarget && onClose()} style={{ zIndex: 999 }}>
      <div
        className="modal animate-fadein"
        style={{
          maxWidth: 'min(94vw, 860px)',
          width: '100%',
          maxHeight: '90vh',
          display: 'flex',
          flexDirection: 'column',
          padding: 0,
          overflow: 'hidden',
          borderRadius: 16,
          boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)',
          background: 'var(--bg-card)',
          color: 'var(--text-primary)',
        }}
      >
        {/* Modal Header */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            padding: '1.25rem 1.75rem',
            borderBottom: '1px solid var(--border)',
            background: 'var(--bg-elevated)',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.85rem' }}>
            <div
              style={{
                width: 40,
                height: 40,
                borderRadius: 10,
                background: 'linear-gradient(135deg, var(--primary) 0%, #a855f7 100%)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: '#fff',
                fontSize: '1.2rem',
                boxShadow: '0 4px 10px rgba(79, 70, 229, 0.3)',
              }}
            >
              ⚙️
            </div>
            <div>
              <h2 style={{ fontSize: '1.15rem', fontWeight: 700, margin: 0, color: 'var(--text-primary)' }}>
                Cài đặt tài khoản & Hồ sơ
              </h2>
              <p style={{ fontSize: '0.78rem', color: 'var(--text-muted)', margin: 0, marginTop: 2 }}>
                Quản lý ảnh đại diện, bảo mật mật khẩu, thống kê và tùy chọn hệ thống
              </p>
            </div>
          </div>
          <button
            className="btn-icon"
            onClick={onClose}
            title="Đóng cửa sổ"
            style={{ fontSize: '1.1rem', width: 34, height: 34 }}
          >
            ✕
          </button>
        </div>

        {/* Modal Body with Sidebar Tabs */}
        <div style={{ display: 'flex', flex: 1, overflow: 'hidden', minHeight: 480 }}>
          {/* Left Navigation Tabs */}
          <aside
            style={{
              width: 220,
              borderRight: '1px solid var(--border)',
              background: 'var(--bg)',
              padding: '1rem 0.75rem',
              display: 'flex',
              flexDirection: 'column',
              gap: '0.35rem',
              flexShrink: 0,
            }}
          >
            {[
              { id: 'profile', icon: '👤', label: 'Hồ sơ cá nhân' },
              { id: 'security', icon: '🔒', label: 'Bảo mật & Mật khẩu' },
              { id: 'appearance', icon: '🎨', label: 'Giao diện & Tùy chọn' },
              { id: 'stats', icon: '📊', label: 'Thống kê tài khoản' },
            ].map(tab => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.65rem',
                  padding: '0.65rem 0.85rem',
                  borderRadius: 8,
                  fontSize: '0.86rem',
                  fontWeight: activeTab === tab.id ? 600 : 500,
                  color: activeTab === tab.id ? 'var(--primary)' : 'var(--text-secondary)',
                  background: activeTab === tab.id ? 'var(--primary-light)' : 'transparent',
                  border: 'none',
                  cursor: 'pointer',
                  textAlign: 'left',
                  transition: 'all 0.15s ease',
                }}
              >
                <span style={{ fontSize: '1.05rem' }}>{tab.icon}</span>
                <span>{tab.label}</span>
              </button>
            ))}

            {/* Quick User Badge in Nav */}
            <div
              style={{
                marginTop: 'auto',
                padding: '0.75rem',
                borderRadius: 10,
                background: 'var(--bg-elevated)',
                border: '1px solid var(--border)',
                display: 'flex',
                alignItems: 'center',
                gap: '0.65rem',
              }}
            >
              <div
                className="user-avatar"
                style={{ width: 32, height: 32, fontSize: '0.8rem', flexShrink: 0 }}
              >
                {currentAvatarDisplay ? (
                  <img src={currentAvatarDisplay} alt="" />
                ) : (
                  userInitials
                )}
              </div>
              <div style={{ overflow: 'hidden' }}>
                <div
                  style={{
                    fontSize: '0.78rem',
                    fontWeight: 600,
                    whiteSpace: 'nowrap',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                  }}
                >
                  {name || user?.name}
                </div>
                <div style={{ fontSize: '0.68rem', color: 'var(--text-muted)' }}>
                  {user?.role === 'admin' ? '🛡️ Quản trị viên' : '👤 Thành viên'}
                </div>
              </div>
            </div>
          </aside>

          {/* Right Content Area */}
          <main style={{ flex: 1, padding: '1.75rem', overflowY: 'auto', background: 'var(--bg-card)' }}>
            {/* ════════════════════════════════════════════════════════
               TAB 1: HỒ SƠ CÁ NHÂN (PROFILE)
               ════════════════════════════════════════════════════════ */}
            {activeTab === 'profile' && (
              <div>
                <h3 style={{ fontSize: '1.05rem', fontWeight: 700, marginBottom: '0.35rem' }}>
                  Thông tin cá nhân
                </h3>
                <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: '1.5rem' }}>
                  Cập nhật ảnh đại diện, họ tên và chi tiết công việc của bạn.
                </p>

                {/* Avatar Section */}
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '1.5rem',
                    padding: '1.25rem',
                    background: 'var(--bg-elevated)',
                    borderRadius: 12,
                    border: '1px solid var(--border)',
                    marginBottom: '1.5rem',
                  }}
                >
                  {/* Avatar Circle Preview */}
                  <div style={{ position: 'relative' }}>
                    <div
                      className="user-avatar"
                      style={{
                        width: 80,
                        height: 80,
                        fontSize: '2rem',
                        boxShadow: '0 4px 14px rgba(0, 0, 0, 0.12)',
                        border: '3px solid var(--bg-card)',
                      }}
                    >
                      {currentAvatarDisplay ? (
                        <img src={currentAvatarDisplay} alt="Avatar" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                      ) : (
                        userInitials
                      )}
                    </div>
                    {user?.role === 'admin' && (
                      <span
                        title="Quản trị viên"
                        style={{
                          position: 'absolute',
                          bottom: -4,
                          right: -4,
                          background: 'var(--primary)',
                          color: '#fff',
                          borderRadius: '50%',
                          width: 24,
                          height: 24,
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          fontSize: '0.75rem',
                          boxShadow: '0 2px 5px rgba(0,0,0,0.2)',
                        }}
                      >
                        🛡️
                      </span>
                    )}
                  </div>

                  {/* Actions for Avatar */}
                  <div style={{ flex: 1 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap' }}>
                      <input
                        type="file"
                        ref={fileInputRef}
                        onChange={handleFileChange}
                        accept="image/*"
                        style={{ display: 'none' }}
                      />
                      <button
                        type="button"
                        className="btn btn-secondary btn-sm"
                        onClick={() => fileInputRef.current?.click()}
                      >
                        📷 Tải ảnh từ máy
                      </button>

                      <button
                        type="button"
                        className="btn btn-ghost btn-sm"
                        onClick={() => setShowPresets(!showPresets)}
                      >
                        🎭 Chọn avatar mẫu
                      </button>

                      {(avatarUrl || previewUrl) && (
                        <button
                          type="button"
                          className="btn btn-ghost btn-sm"
                          style={{ color: 'var(--danger)' }}
                          onClick={handleDeleteAvatar}
                        >
                          🗑️ Xóa ảnh
                        </button>
                      )}
                    </div>

                    {selectedFile && (
                      <div
                        style={{
                          marginTop: '0.65rem',
                          padding: '0.5rem 0.75rem',
                          background: 'var(--primary-light)',
                          borderRadius: 8,
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'space-between',
                          gap: '0.5rem',
                          flexWrap: 'wrap',
                        }}
                      >
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                          <span style={{ fontSize: '0.85rem' }}>🖼️</span>
                          <span style={{ fontSize: '0.78rem', color: 'var(--primary-text)', fontWeight: 600 }}>
                            {selectedFile.name} ({(selectedFile.size / 1024).toFixed(0)} KB)
                          </span>
                          <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>— Chưa lưu</span>
                        </div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                          <button
                            type="button"
                            className="btn btn-primary btn-sm"
                            onClick={handleUploadAvatar}
                            disabled={loading}
                            style={{ padding: '0.25rem 0.65rem', fontSize: '0.74rem' }}
                          >
                            {loading ? 'Đang lưu...' : 'Lưu ảnh ngay'}
                          </button>
                          <button
                            type="button"
                            className="btn btn-ghost btn-sm"
                            onClick={handleCancelSelectedFile}
                            style={{ padding: '0.25rem 0.5rem', fontSize: '0.74rem', color: 'var(--danger)' }}
                            title="Hủy file đã chọn"
                          >
                            ✕ Hủy
                          </button>
                        </div>
                      </div>
                    )}

                    <div style={{ fontSize: '0.74rem', color: 'var(--text-muted)', marginTop: '0.5rem' }}>
                      Hỗ trợ định dạng JPG, PNG, WEBP hoặc GIF. Tối đa 5MB.
                    </div>
                  </div>
                </div>

                {/* Preset Avatars Drawer */}
                {showPresets && (
                  <div
                    style={{
                      padding: '1rem',
                      background: 'var(--bg-elevated)',
                      borderRadius: 12,
                      border: '1px dashed var(--primary)',
                      marginBottom: '1.5rem',
                      animation: 'fadeIn 0.2s ease',
                    }}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem' }}>
                      <span style={{ fontSize: '0.82rem', fontWeight: 600 }}>Bộ sưu tập avatar mẫu:</span>
                      <button
                        type="button"
                        className="btn-icon"
                        style={{ width: 22, height: 22, fontSize: '0.7rem' }}
                        onClick={() => setShowPresets(false)}
                      >
                        ✕
                      </button>
                    </div>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(64px, 1fr))', gap: '0.75rem' }}>
                      {PRESET_AVATARS.map(preset => (
                        <button
                          key={preset.id}
                          type="button"
                          onClick={() => handleSelectPreset(preset.url)}
                          title={preset.label}
                          style={{
                            border: avatarUrl === preset.url ? '2px solid var(--primary)' : '1px solid var(--border)',
                            borderRadius: 10,
                            padding: 4,
                            background: 'var(--bg-card)',
                            cursor: 'pointer',
                            display: 'flex',
                            flexDirection: 'column',
                            alignItems: 'center',
                            transition: 'all 0.15s ease',
                          }}
                        >
                          <img src={preset.url} alt={preset.label} style={{ width: 44, height: 44, borderRadius: 8 }} />
                          <span style={{ fontSize: '0.62rem', marginTop: 4, color: 'var(--text-muted)' }}>
                            {preset.label}
                          </span>
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                {/* Form Fields */}
                <form onSubmit={handleSaveProfile}>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '1rem' }}>
                    <div className="form-group" style={{ margin: 0 }}>
                      <label className="form-label">Họ và tên *</label>
                      <input
                        type="text"
                        className="form-input"
                        placeholder="Nhập họ và tên..."
                        value={name}
                        onChange={e => setName(e.target.value)}
                        required
                      />
                    </div>

                    <div className="form-group" style={{ margin: 0 }}>
                      <label className="form-label">Email (Tài khoản)</label>
                      <div style={{ position: 'relative' }}>
                        <input
                          type="email"
                          className="form-input"
                          value={user?.email || ''}
                          disabled
                          style={{ opacity: 0.7, cursor: 'not-allowed', paddingRight: '5rem' }}
                        />
                        <span
                          style={{
                            position: 'absolute',
                            right: 8,
                            top: '50%',
                            transform: 'translateY(-50%)',
                            fontSize: '0.68rem',
                            fontWeight: 600,
                            color: '#10b981',
                            background: 'rgba(16, 185, 129, 0.1)',
                            padding: '0.15rem 0.45rem',
                            borderRadius: 4,
                          }}
                        >
                          ✓ Đã xác thực
                        </span>
                      </div>
                    </div>
                  </div>

                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '1rem' }}>
                    <div className="form-group" style={{ margin: 0 }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <label className="form-label" style={{ margin: 0 }}>Số điện thoại</label>
                        {phone && !isPhoneValid(phone) && (
                          <span style={{ fontSize: '0.7rem', color: '#f59e0b', fontWeight: 600 }}>
                            ⚠️ Cần 10 chữ số (VD: 0912 345 678)
                          </span>
                        )}
                        {phone && isPhoneValid(phone) && (
                          <span style={{ fontSize: '0.7rem', color: '#10b981', fontWeight: 600 }}>
                            ✓ Hợp lệ
                          </span>
                        )}
                      </div>
                      <input
                        type="tel"
                        className={`form-input ${phone && !isPhoneValid(phone) ? 'input-error' : ''}`}
                        placeholder="VD: 0912 345 678"
                        value={phone}
                        onChange={e => setPhone(e.target.value)}
                      />
                    </div>

                    <div className="form-group" style={{ margin: 0 }}>
                      <label className="form-label">Chức danh / Vị trí</label>
                      <input
                        type="text"
                        className="form-input"
                        placeholder="VD: Project Manager, Kỹ sư phần mềm..."
                        value={jobTitle}
                        onChange={e => setJobTitle(e.target.value)}
                      />
                    </div>
                  </div>

                  <div className="form-group">
                    <label className="form-label">Phòng ban / Bộ phận</label>
                    <input
                      type="text"
                      className="form-input"
                      placeholder="VD: Khối Công nghệ thông tin, Thiết kế UI/UX..."
                      value={department}
                      onChange={e => setDepartment(e.target.value)}
                    />
                  </div>

                  <div className="form-group">
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <label className="form-label">Giới thiệu bản thân (Bio)</label>
                      <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>
                        {bio.length}/250 ký tự
                      </span>
                    </div>
                    <textarea
                      className="form-input"
                      rows={3}
                      maxLength={250}
                      placeholder="Viết một vài dòng ngắn gọn về bạn và mục tiêu công việc..."
                      value={bio}
                      onChange={e => setBio(e.target.value)}
                    />
                  </div>

                  <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem', marginTop: '1.5rem' }}>
                    <button type="submit" className="btn btn-primary" disabled={loading}>
                      {loading ? 'Đang lưu...' : '💾 Lưu thông tin'}
                    </button>
                  </div>
                </form>
              </div>
            )}

            {/* ════════════════════════════════════════════════════════
               TAB 2: BẢO MẬT & MẬT KHẨU (SECURITY)
               ════════════════════════════════════════════════════════ */}
            {activeTab === 'security' && (
              <div>
                <h3 style={{ fontSize: '1.05rem', fontWeight: 700, marginBottom: '0.35rem' }}>
                  Bảo mật & Đổi mật khẩu
                </h3>
                <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: '1.5rem' }}>
                  Bảo vệ tài khoản với mật khẩu mạnh và xem xét các phiên đăng nhập hiện thời.
                </p>

                {/* Google OAuth Linked Card */}
                {userData.google_id && (
                  <div
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '0.85rem',
                      padding: '1rem',
                      background: 'rgba(59, 130, 246, 0.08)',
                      border: '1px solid rgba(59, 130, 246, 0.25)',
                      borderRadius: 10,
                      marginBottom: '1.5rem',
                    }}
                  >
                    <span style={{ fontSize: '1.5rem' }}>🌐</span>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontWeight: 600, fontSize: '0.88rem', color: 'var(--text-primary)' }}>
                        Đã liên kết với Google OAuth
                      </div>
                      <div style={{ fontSize: '0.76rem', color: 'var(--text-secondary)' }}>
                        Bạn có thể đăng nhập bằng tài khoản Google ({userData.email}) bất kỳ lúc nào.
                      </div>
                    </div>
                    <span
                      style={{
                        fontSize: '0.74rem',
                        color: '#10b981',
                        fontWeight: 600,
                        background: '#ecfdf5',
                        padding: '0.2rem 0.5rem',
                        borderRadius: 6,
                      }}
                    >
                      Đang kết nối
                    </span>
                  </div>
                )}

                {/* Password Form */}
                <form onSubmit={handleChangePassword} style={{ marginBottom: '2rem' }}>
                  {userData.hasPassword && (
                    <div className="form-group">
                      <label className="form-label">Mật khẩu hiện tại *</label>
                      <div style={{ position: 'relative', width: '100%' }}>
                        <input
                          type={showCurrentPw ? 'text' : 'password'}
                          className="form-input"
                          style={{ width: '100%', paddingRight: '2.75rem' }}
                          placeholder="Nhập mật khẩu hiện tại..."
                          value={currentPassword}
                          onChange={e => setCurrentPassword(e.target.value)}
                          required
                        />
                        <button
                          type="button"
                          className="btn-icon"
                          onClick={() => setShowCurrentPw(!showCurrentPw)}
                          style={{ position: 'absolute', right: 8, top: '50%', transform: 'translateY(-50%)', border: 'none', background: 'transparent', cursor: 'pointer', fontSize: '1.05rem' }}
                          title={showCurrentPw ? 'Ẩn mật khẩu' : 'Hiển thị mật khẩu'}
                        >
                          {showCurrentPw ? '👁️' : '🙈'}
                        </button>
                      </div>
                    </div>
                  )}

                  <div className="form-group">
                    <label className="form-label">
                      {userData.hasPassword ? 'Mật khẩu mới *' : 'Thiết lập mật khẩu mới *'}
                    </label>
                    <div style={{ position: 'relative', width: '100%' }}>
                      <input
                        type={showNewPw ? 'text' : 'password'}
                        className="form-input"
                        style={{ width: '100%', paddingRight: '2.75rem' }}
                        placeholder="Tối thiểu 6 ký tự (khuyên dùng 8+ ký tự)..."
                        value={newPassword}
                        onChange={e => setNewPassword(e.target.value)}
                        required
                      />
                      <button
                        type="button"
                        className="btn-icon"
                        onClick={() => setShowNewPw(!showNewPw)}
                        style={{ position: 'absolute', right: 8, top: '50%', transform: 'translateY(-50%)', border: 'none', background: 'transparent', cursor: 'pointer', fontSize: '1.05rem' }}
                        title={showNewPw ? 'Ẩn mật khẩu' : 'Hiển thị mật khẩu'}
                      >
                        {showNewPw ? '👁️' : '🙈'}
                      </button>
                    </div>

                    {/* Password Strength Indicator & Checklist */}
                    {newPassword && (
                      <div
                        style={{
                          marginTop: '0.65rem',
                          padding: '0.75rem',
                          background: 'var(--bg-elevated)',
                          borderRadius: 10,
                          border: '1px solid var(--border)',
                        }}
                      >
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 }}>
                          <span style={{ fontSize: '0.74rem', color: 'var(--text-secondary)', fontWeight: 600 }}>Độ an toàn mật khẩu:</span>
                          <span style={{ fontSize: '0.74rem', fontWeight: 700, color: pwDetails.color }}>
                            {pwDetails.label}
                          </span>
                        </div>
                        <div style={{ display: 'flex', gap: 4, height: 5, borderRadius: 3, overflow: 'hidden', marginBottom: '0.65rem' }}>
                          <div style={{ flex: 1, background: pwDetails.score >= 1 ? pwDetails.color : 'var(--border)', transition: 'background 0.2s' }} />
                          <div style={{ flex: 1, background: pwDetails.score >= 2 ? pwDetails.color : 'var(--border)', transition: 'background 0.2s' }} />
                          <div style={{ flex: 1, background: pwDetails.score >= 3 ? pwDetails.color : 'var(--border)', transition: 'background 0.2s' }} />
                        </div>
                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: '0.35rem', fontSize: '0.72rem' }}>
                          <div style={{ color: pwDetails.criteria.length ? '#10b981' : 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: 4 }}>
                            <span>{pwDetails.criteria.length ? '✓' : '○'}</span> Tối thiểu 8 ký tự
                          </div>
                          <div style={{ color: pwDetails.criteria.case ? '#10b981' : 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: 4 }}>
                            <span>{pwDetails.criteria.case ? '✓' : '○'}</span> Chữ hoa & chữ thường
                          </div>
                          <div style={{ color: pwDetails.criteria.number ? '#10b981' : 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: 4 }}>
                            <span>{pwDetails.criteria.number ? '✓' : '○'}</span> Ít nhất 1 số (0-9)
                          </div>
                          <div style={{ color: pwDetails.criteria.special ? '#10b981' : 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: 4 }}>
                            <span>{pwDetails.criteria.special ? '✓' : '○'}</span> Ký tự đặc biệt (!@#$)
                          </div>
                        </div>
                      </div>
                    )}
                  </div>

                  <div className="form-group">
                    <label className="form-label">Xác nhận mật khẩu mới *</label>
                    <div style={{ position: 'relative', width: '100%' }}>
                      <input
                        type={showConfirmPw ? 'text' : 'password'}
                        className="form-input"
                        style={{ width: '100%', paddingRight: '2.75rem' }}
                        placeholder="Nhập lại mật khẩu mới..."
                        value={confirmPassword}
                        onChange={e => setConfirmPassword(e.target.value)}
                        required
                      />
                      <button
                        type="button"
                        className="btn-icon"
                        onClick={() => setShowConfirmPw(!showConfirmPw)}
                        style={{ position: 'absolute', right: 8, top: '50%', transform: 'translateY(-50%)', border: 'none', background: 'transparent', cursor: 'pointer', fontSize: '1.05rem' }}
                        title={showConfirmPw ? 'Ẩn mật khẩu' : 'Hiển thị mật khẩu'}
                      >
                        {showConfirmPw ? '👁️' : '🙈'}
                      </button>
                    </div>

                    {confirmPassword && (
                      <div
                        style={{
                          fontSize: '0.74rem',
                          marginTop: 6,
                          fontWeight: 600,
                          color: newPassword === confirmPassword ? '#10b981' : 'var(--danger)',
                          display: 'flex',
                          alignItems: 'center',
                          gap: 4,
                        }}
                      >
                        {newPassword === confirmPassword ? '✓ Mật khẩu xác nhận hoàn toàn trùng khớp' : '✕ Mật khẩu xác nhận không khớp'}
                      </div>
                    )}
                  </div>

                  <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '1.25rem' }}>
                    <button
                      type="submit"
                      className="btn btn-primary"
                      disabled={loading || (confirmPassword && newPassword !== confirmPassword)}
                    >
                      {loading ? 'Đang cập nhật...' : '🔐 Cập nhật mật khẩu'}
                    </button>
                  </div>
                </form>

                {/* Sessions Section */}
                <div>
                  <h4 style={{ fontSize: '0.92rem', fontWeight: 600, marginBottom: '0.5rem' }}>
                    Phiên đăng nhập hiện thời
                  </h4>
                  <div
                    style={{
                      border: '1px solid var(--border)',
                      borderRadius: 10,
                      padding: '0.85rem 1rem',
                      background: 'var(--bg-elevated)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                      <span style={{ fontSize: '1.4rem' }}>💻</span>
                      <div>
                        <div style={{ fontSize: '0.84rem', fontWeight: 600 }}>
                          {sessions[0]?.browser || 'Google Chrome'} trên {sessions[0]?.os || 'Windows PC'}
                        </div>
                        <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>
                          Địa chỉ IP: {sessions[0]?.ip || '127.0.0.1'} • Đang hoạt động
                        </div>
                      </div>
                    </div>
                    <span
                      style={{
                        fontSize: '0.72rem',
                        fontWeight: 600,
                        color: '#10b981',
                        background: 'rgba(16, 185, 129, 0.1)',
                        padding: '0.2rem 0.5rem',
                        borderRadius: 6,
                      }}
                    >
                      🟢 Thiết bị này
                    </span>
                  </div>
                </div>
              </div>
            )}

            {/* ════════════════════════════════════════════════════════
               TAB 3: GIAO DIỆN & TÙY CHỌN (APPEARANCE & PREFERENCES)
               ════════════════════════════════════════════════════════ */}
            {activeTab === 'appearance' && (
              <div>
                <h3 style={{ fontSize: '1.05rem', fontWeight: 700, marginBottom: '0.35rem' }}>
                  Giao diện & Tùy chọn hệ thống
                </h3>
                <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: '1.5rem' }}>
                  Tùy biến chế độ sáng/tối, ngôn ngữ và các cảnh báo thông báo phù hợp với bạn.
                </p>

                {/* Theme Selector Cards */}
                <div style={{ marginBottom: '2rem' }}>
                  <label className="form-label" style={{ marginBottom: '0.75rem' }}>Chủ đề giao diện</label>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '1rem' }}>
                    {[
                      { id: 'light', icon: '☀️', label: 'Chế độ Sáng', desc: 'Màu sáng thanh thoát, tập trung' },
                      { id: 'dark', icon: '🌙', label: 'Chế độ Tối', desc: 'Dịu mắt khi làm việc ban đêm' },
                      { id: 'system', icon: '💻', label: 'Theo hệ thống', desc: 'Tự động đồng bộ với thiết bị' },
                    ].map(t => (
                      <div
                        key={t.id}
                        onClick={() => handleThemeChange(t.id)}
                        style={{
                          border: theme === t.id ? '2px solid var(--primary)' : '1px solid var(--border)',
                          borderRadius: 12,
                          padding: '1rem',
                          background: theme === t.id ? 'var(--primary-light)' : 'var(--bg-elevated)',
                          cursor: 'pointer',
                          transition: 'all 0.18s ease',
                          display: 'flex',
                          flexDirection: 'column',
                          gap: '0.35rem',
                        }}
                      >
                        <span style={{ fontSize: '1.6rem' }}>{t.icon}</span>
                        <div style={{ fontWeight: 600, fontSize: '0.86rem', color: theme === t.id ? 'var(--primary)' : 'var(--text-primary)' }}>
                          {t.label}
                        </div>
                        <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>
                          {t.desc}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Notifications Toggles */}
                <div>
                  <label className="form-label" style={{ marginBottom: '0.75rem' }}>Cài đặt thông báo & Nhắc nhở</label>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                    {[
                      {
                        key: 'email_reminders',
                        icon: '📬',
                        title: 'Email nhắc nhở nhiệm vụ hàng ngày',
                        desc: 'Nhận tóm tắt danh sách công việc cần làm vào mỗi buổi sáng qua email',
                      },
                      {
                        key: 'due_date_alerts',
                        icon: '⏰',
                        title: 'Cảnh báo hạn chót (Deadline 24h)',
                        desc: 'Tự động cảnh báo khi có công việc sắp đến hạn trong vòng 24 giờ tới',
                      },
                      {
                        key: 'system_updates',
                        icon: '💬',
                        title: 'Thông báo dự án & bình luận',
                        desc: 'Nhận thông báo khi được giao nhiệm vụ mới hoặc có phản hồi từ thành viên',
                      },
                      {
                        key: 'sound_enabled',
                        icon: '🔔',
                        title: 'Âm thanh hiệu ứng hoàn thành',
                        desc: 'Phát âm thanh nhẹ nhàng chúc mừng khi bạn tick hoàn thành một nhiệm vụ',
                      },
                    ].map(item => (
                      <div
                        key={item.key}
                        onClick={() => handleToggleNotification(item.key)}
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'space-between',
                          padding: '0.85rem 1rem',
                          background: 'var(--bg-elevated)',
                          border: '1px solid var(--border)',
                          borderRadius: 10,
                          cursor: 'pointer',
                        }}
                      >
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                          <span style={{ fontSize: '1.25rem' }}>{item.icon}</span>
                          <div>
                            <div style={{ fontSize: '0.85rem', fontWeight: 600 }}>{item.title}</div>
                            <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>{item.desc}</div>
                          </div>
                        </div>

                        {/* Switch */}
                        <div
                          style={{
                            width: 38,
                            height: 22,
                            borderRadius: 99,
                            background: notifications[item.key] ? 'var(--primary)' : 'var(--border)',
                            position: 'relative',
                            transition: 'background 0.2s',
                          }}
                        >
                          <div
                            style={{
                              width: 16,
                              height: 16,
                              borderRadius: '50%',
                              background: '#fff',
                              position: 'absolute',
                              top: 3,
                              left: notifications[item.key] ? 19 : 3,
                              transition: 'left 0.2s',
                              boxShadow: '0 1px 3px rgba(0,0,0,0.2)',
                            }}
                          />
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {/* ════════════════════════════════════════════════════════
               TAB 4: THỐNG KÊ TÀI KHOẢN (STATS)
               ════════════════════════════════════════════════════════ */}
            {activeTab === 'stats' && (
              <div>
                <h3 style={{ fontSize: '1.05rem', fontWeight: 700, marginBottom: '0.35rem' }}>
                  Hiệu suất & Thống kê tài khoản
                </h3>
                <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: '1.5rem' }}>
                  Xem tổng quan năng suất công việc và sự đóng góp của bạn.
                </p>

                {statsLoading ? (
                  <div style={{ display: 'flex', justifyContent: 'center', padding: '3rem' }}>
                    <div className="spinner" />
                  </div>
                ) : (
                  <div>
                    {/* Stat Grid */}
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))', gap: '0.85rem', marginBottom: '1.5rem' }}>
                      <div
                        style={{
                          background: 'linear-gradient(135deg, rgba(79, 70, 229, 0.08) 0%, rgba(99, 102, 241, 0.02) 100%)',
                          border: '1px solid rgba(79, 70, 229, 0.2)',
                          borderRadius: 12,
                          padding: '1rem',
                        }}
                      >
                        <div style={{ fontSize: '0.74rem', color: 'var(--primary)', fontWeight: 600 }}>📋 Tổng nhiệm vụ</div>
                        <div style={{ fontSize: '1.6rem', fontWeight: 800, marginTop: 4, color: 'var(--text-primary)' }}>
                          {stats?.totalTasks || 0}
                        </div>
                      </div>

                      <div
                        style={{
                          background: 'linear-gradient(135deg, rgba(16, 185, 129, 0.08) 0%, rgba(16, 185, 129, 0.02) 100%)',
                          border: '1px solid rgba(16, 185, 129, 0.2)',
                          borderRadius: 12,
                          padding: '1rem',
                        }}
                      >
                        <div style={{ fontSize: '0.74rem', color: '#10b981', fontWeight: 600 }}>✅ Đã hoàn thành</div>
                        <div style={{ fontSize: '1.6rem', fontWeight: 800, marginTop: 4, color: '#10b981' }}>
                          {stats?.completedTasks ?? stats?.doneTasks ?? 0}
                        </div>
                      </div>

                      <div
                        style={{
                          background: 'linear-gradient(135deg, rgba(59, 130, 246, 0.08) 0%, rgba(59, 130, 246, 0.02) 100%)',
                          border: '1px solid rgba(59, 130, 246, 0.2)',
                          borderRadius: 12,
                          padding: '1rem',
                        }}
                      >
                        <div style={{ fontSize: '0.74rem', color: '#3b82f6', fontWeight: 600 }}>⚡ Đang thực hiện</div>
                        <div style={{ fontSize: '1.6rem', fontWeight: 800, marginTop: 4, color: '#3b82f6' }}>
                          {stats?.inProgressTasks || 0}
                        </div>
                      </div>

                      <div
                        style={{
                          background: 'linear-gradient(135deg, rgba(239, 68, 68, 0.08) 0%, rgba(239, 68, 68, 0.02) 100%)',
                          border: '1px solid rgba(239, 68, 68, 0.2)',
                          borderRadius: 12,
                          padding: '1rem',
                        }}
                      >
                        <div style={{ fontSize: '0.74rem', color: '#ef4444', fontWeight: 600 }}>🔴 Quá hạn</div>
                        <div style={{ fontSize: '1.6rem', fontWeight: 800, marginTop: 4, color: '#ef4444' }}>
                          {stats?.overdueTasks || 0}
                        </div>
                      </div>
                    </div>

                    {/* Completion Rate Widget */}
                    <div
                      style={{
                        padding: '1.25rem',
                        borderRadius: 12,
                        background: 'var(--bg-elevated)',
                        border: '1px solid var(--border)',
                        marginBottom: '1.5rem',
                      }}
                    >
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.65rem' }}>
                        <span style={{ fontSize: '0.88rem', fontWeight: 600 }}>Tỷ lệ hoàn thành công việc</span>
                        <span style={{ fontSize: '1rem', fontWeight: 700, color: 'var(--primary)' }}>
                          {stats?.completionRate || 0}%
                        </span>
                      </div>
                      <div style={{ width: '100%', height: 10, background: 'var(--border)', borderRadius: 99, overflow: 'hidden' }}>
                        <div
                          style={{
                            width: `${stats?.completionRate || 0}%`,
                            height: '100%',
                            background: 'linear-gradient(90deg, var(--primary) 0%, #10b981 100%)',
                            borderRadius: 99,
                            transition: 'width 0.4s ease',
                          }}
                        />
                      </div>
                    </div>

                    {/* Account Info Details */}
                    <div style={{ borderTop: '1px solid var(--border)', paddingTop: '1rem' }}>
                      <div style={{ fontSize: '0.82rem', fontWeight: 600, marginBottom: '0.5rem' }}>Chi tiết tài khoản</div>
                      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.5rem', fontSize: '0.78rem' }}>
                        <div style={{ color: 'var(--text-muted)' }}>
                          Ngày tham gia: <strong style={{ color: 'var(--text-primary)' }}>{new Date(userData.createdAt || Date.now()).toLocaleDateString('vi-VN')}</strong>
                        </div>
                        <div style={{ color: 'var(--text-muted)' }}>
                          Vai trò tài khoản: <strong style={{ color: 'var(--text-primary)' }}>{userData.role === 'admin' ? 'Quản trị viên' : 'Thành viên'}</strong>
                        </div>
                        <div style={{ color: 'var(--text-muted)' }}>
                          Dự án tham gia: <strong style={{ color: 'var(--text-primary)' }}>{stats?.totalProjects || 0} dự án</strong>
                        </div>
                        <div style={{ color: 'var(--text-muted)' }}>
                          Trạng thái: <strong style={{ color: '#10b981' }}>🟢 Hoạt động bình thường</strong>
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )}
          </main>
        </div>
      </div>

      {showDeleteAvatarConfirm && (
        <ConfirmModal
          isOpen={showDeleteAvatarConfirm}
          title="Xác nhận xóa ảnh đại diện"
          message="Bạn có chắc chắn muốn xóa ảnh đại diện hiện tại không?"
          confirmText="Xóa ảnh đại diện"
          cancelText="Hủy bỏ"
          variant="danger"
          icon="🖼️"
          onConfirm={confirmDeleteAvatar}
          onClose={() => setShowDeleteAvatarConfirm(false)}
        />
      )}
    </div>
  );
}
