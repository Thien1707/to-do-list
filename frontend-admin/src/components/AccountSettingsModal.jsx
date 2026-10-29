import { useState, useEffect, useRef } from 'react';
import toast from 'react-hot-toast';
import api from '../services/api';
import ConfirmModal from './ConfirmModal';

const PRESET_AVATARS = [
  { id: 'admin-1', label: 'Shield Boss', url: 'https://api.dicebear.com/7.x/bottts/svg?seed=AdminBoss' },
  { id: 'admin-2', label: 'Cyber Tech', url: 'https://api.dicebear.com/7.x/bottts/svg?seed=AdminCyber' },
  { id: 'human-1', label: 'Executive', url: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Executive' },
  { id: 'human-2', label: 'Director', url: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Director' },
  { id: 'human-3', label: 'Commander', url: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Commander' },
  { id: 'human-4', label: 'Lead Zoe', url: 'https://api.dicebear.com/7.x/lorelei/svg?seed=LeadZoe' },
  { id: 'human-5', label: 'Master Leo', url: 'https://api.dicebear.com/7.x/micah/svg?seed=MasterLeo' },
  { id: 'human-6', label: 'Admin Luna', url: 'https://api.dicebear.com/7.x/notionists/svg?seed=AdminLuna' },
];

export default function AccountSettingsModal({ admin, onUpdateAdmin, onClose }) {
  const [activeTab, setActiveTab] = useState('profile'); // profile | security | appearance | stats
  const [loading, setLoading] = useState(false);
  const [statsLoading, setStatsLoading] = useState(false);
  const [adminData, setAdminData] = useState(admin || {});
  const [stats, setStats] = useState(null);
  const [showDeleteAvatarConfirm, setShowDeleteAvatarConfirm] = useState(false);

  // Profile Form State
  const [name, setName] = useState(admin?.name || '');
  const [phone, setPhone] = useState(admin?.phone || '');
  const [jobTitle, setJobTitle] = useState(admin?.job_title || '');
  const [department, setDepartment] = useState(admin?.department || '');
  const [bio, setBio] = useState(admin?.bio || '');
  const [avatarUrl, setAvatarUrl] = useState(admin?.avatar_url || '');

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
  const [theme, setTheme] = useState(admin?.theme_preference || localStorage.getItem('theme') || 'light');
  const [notifications, setNotifications] = useState(
    admin?.notification_settings || {
      email_reminders: true,
      due_date_alerts: true,
      system_updates: true,
      sound_enabled: true,
    }
  );

  // Fetch fresh admin data, stats & sessions
  useEffect(() => {
    let isMounted = true;
    const fetchAdminData = async () => {
      setStatsLoading(true);
      try {
        const { data } = await api.get('/auth/me');
        if (isMounted && data.success) {
          const fresh = data.data.user;
          setAdminData(fresh);
          setName(fresh.name || '');
          setPhone(fresh.phone || '');
          setJobTitle(fresh.job_title || '');
          setDepartment(fresh.department || '');
          setBio(fresh.bio || '');
          setAvatarUrl(fresh.avatar_url || '');
          if (fresh.theme_preference) setTheme(fresh.theme_preference);
          if (fresh.notification_settings) setNotifications(fresh.notification_settings);
          if (fresh.stats) setStats(fresh.stats);
        }
      } catch (err) {
        console.error('Không thể tải dữ liệu admin:', err);
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

    fetchAdminData();
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
        toast.success('Cập nhật ảnh đại diện quản trị viên thành công!');
        setAvatarUrl(data.data.avatar_url);
        setSelectedFile(null);
        setPreviewUrl(null);
        if (onUpdateAdmin) onUpdateAdmin(data.data.user);
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
        if (onUpdateAdmin) onUpdateAdmin(data.data.user);
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

  const executeDeleteAvatar = async () => {
    setShowDeleteAvatarConfirm(false);
    setLoading(true);
    try {
      const { data } = await api.delete('/auth/avatar');
      if (data.success) {
        toast.success('Đã xóa ảnh đại diện');
        setAvatarUrl('');
        setSelectedFile(null);
        setPreviewUrl(null);
        if (onUpdateAdmin) onUpdateAdmin(data.data.user);
      }
    } catch (err) {
      toast.error(err.response?.data?.message || 'Xóa ảnh thất bại');
    } finally {
      setLoading(false);
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
        toast.success('Cập nhật thông tin quản trị viên thành công!', { id: 'save-profile' });
        setAdminData(data.data.user);
        if (onUpdateAdmin) onUpdateAdmin(data.data.user);
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
    if (adminData.hasPassword && !currentPassword) {
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
        setAdminData(prev => ({ ...prev, hasPassword: true }));
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

  const adminInitials = (name || admin?.name || admin?.email || 'A').charAt(0).toUpperCase();
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
                background: 'linear-gradient(135deg, var(--primary) 0%, #3b82f6 100%)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: '#fff',
                fontSize: '1.2rem',
                boxShadow: '0 4px 10px rgba(79, 70, 229, 0.3)',
              }}
            >
              🛡️
            </div>
            <div>
              <h2 style={{ fontSize: '1.15rem', fontWeight: 700, margin: 0, color: 'var(--text-primary)' }}>
                Tài khoản & Thiết lập Quản trị viên
              </h2>
              <p style={{ fontSize: '0.78rem', color: 'var(--text-muted)', margin: 0, marginTop: 2 }}>
                Quản lý ảnh đại diện admin, bảo mật hệ thống, mật khẩu và tùy chọn hiển thị
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
              width: 230,
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
              { id: 'profile', icon: '👤', label: 'Hồ sơ Quản trị' },
              { id: 'security', icon: '🔒', label: 'Mật khẩu & Bảo mật' },
              { id: 'appearance', icon: '🎨', label: 'Giao diện & Tùy chọn' },
              { id: 'stats', icon: '📊', label: 'Tổng quan Hệ thống' },
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

            {/* Quick Admin Badge in Nav */}
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
                style={{ width: 34, height: 34, fontSize: '0.82rem', flexShrink: 0 }}
              >
                {currentAvatarDisplay ? (
                  <img src={currentAvatarDisplay} alt="" />
                ) : (
                  adminInitials
                )}
              </div>
              <div style={{ overflow: 'hidden' }}>
                <div
                  style={{
                    fontSize: '0.8rem',
                    fontWeight: 600,
                    whiteSpace: 'nowrap',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                  }}
                >
                  {name || admin?.name}
                </div>
                <div style={{ fontSize: '0.68rem', color: 'var(--primary)', fontWeight: 600 }}>
                  🛡️ Quản trị viên
                </div>
              </div>
            </div>
          </aside>

          {/* Right Content Area */}
          <main style={{ flex: 1, padding: '1.75rem', overflowY: 'auto', background: 'var(--bg-card)' }}>
            {/* ════════════════════════════════════════════════════════
               TAB 1: HỒ SƠ ADMIN (PROFILE)
               ════════════════════════════════════════════════════════ */}
            {activeTab === 'profile' && (
              <div>
                <h3 style={{ fontSize: '1.05rem', fontWeight: 700, marginBottom: '0.35rem' }}>
                  Thông tin Quản trị viên
                </h3>
                <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: '1.5rem' }}>
                  Cập nhật ảnh nhận diện và thông tin quản trị tài khoản của bạn.
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
                        adminInitials
                      )}
                    </div>
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
                      Định dạng JPG, PNG, WEBP hoặc GIF. Kích thước tối đa 5MB.
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
                      <span style={{ fontSize: '0.82rem', fontWeight: 600 }}>Avatar phong cách Quản trị:</span>
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
                      <label className="form-label">Tên hiển thị Quản trị viên *</label>
                      <input
                        type="text"
                        className="form-input"
                        placeholder="Nhập tên hiển thị..."
                        value={name}
                        onChange={e => setName(e.target.value)}
                        required
                      />
                    </div>

                    <div className="form-group" style={{ margin: 0 }}>
                      <label className="form-label">Email Quản trị viên</label>
                      <div style={{ position: 'relative' }}>
                        <input
                          type="email"
                          className="form-input"
                          value={admin?.email || ''}
                          disabled
                          style={{ opacity: 0.7, cursor: 'not-allowed', paddingRight: '5.5rem' }}
                        />
                        <span
                          style={{
                            position: 'absolute',
                            right: 8,
                            top: '50%',
                            transform: 'translateY(-50%)',
                            fontSize: '0.68rem',
                            fontWeight: 600,
                            color: 'var(--primary)',
                            background: 'var(--primary-light)',
                            padding: '0.15rem 0.45rem',
                            borderRadius: 4,
                          }}
                        >
                          🛡️ Toàn quyền
                        </span>
                      </div>
                    </div>
                  </div>

                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '1rem' }}>
                    <div className="form-group" style={{ margin: 0 }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <label className="form-label" style={{ margin: 0 }}>Số điện thoại liên hệ</label>
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
                      <label className="form-label">Chức danh / Trách nhiệm</label>
                      <input
                        type="text"
                        className="form-input"
                        placeholder="VD: Quản trị viên hệ thống (Root Admin)..."
                        value={jobTitle}
                        onChange={e => setJobTitle(e.target.value)}
                      />
                    </div>
                  </div>

                  <div className="form-group">
                    <label className="form-label">Phòng ban / Đơn vị quản lý</label>
                    <input
                      type="text"
                      className="form-input"
                      placeholder="VD: Ban Quản trị Hệ thống & Công nghệ..."
                      value={department}
                      onChange={e => setDepartment(e.target.value)}
                    />
                  </div>

                  <div className="form-group">
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <label className="form-label">Ghi chú cá nhân (Bio)</label>
                      <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>
                        {bio.length}/250 ký tự
                      </span>
                    </div>
                    <textarea
                      className="form-input"
                      rows={3}
                      maxLength={250}
                      placeholder="Ghi chú về phân quyền hoặc mô tả công việc quản trị..."
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
                  Bảo mật tài khoản Quản trị
                </h3>
                <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: '1.5rem' }}>
                  Mật khẩu tài khoản admin yêu cầu độ phức tạp cao để bảo vệ an toàn toàn bộ dữ liệu hệ thống.
                </p>

                {/* Password Form */}
                <form onSubmit={handleChangePassword} style={{ marginBottom: '2rem' }}>
                  {adminData.hasPassword && (
                    <div className="form-group">
                      <label className="form-label">Mật khẩu admin hiện tại *</label>
                      <div style={{ position: 'relative', width: '100%' }}>
                        <input
                          type={showCurrentPw ? 'text' : 'password'}
                          className="form-input"
                          style={{ width: '100%', paddingRight: '2.75rem' }}
                          placeholder="Nhập mật khẩu admin hiện tại..."
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
                    <label className="form-label">Mật khẩu mới *</label>
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
                      {loading ? 'Đang cập nhật...' : '🔐 Cập nhật mật khẩu Admin'}
                    </button>
                  </div>
                </form>

                {/* Sessions Section */}
                <div>
                  <h4 style={{ fontSize: '0.92rem', fontWeight: 600, marginBottom: '0.5rem' }}>
                    Phiên truy cập Quản trị
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
                      <span style={{ fontSize: '1.4rem' }}>🖥️</span>
                      <div>
                        <div style={{ fontSize: '0.84rem', fontWeight: 600 }}>
                          {sessions[0]?.browser || 'Google Chrome'} trên {sessions[0]?.os || 'Windows PC'}
                        </div>
                        <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>
                          IP: {sessions[0]?.ip || '127.0.0.1'} • Phiên quản trị viên hiện tại
                        </div>
                      </div>
                    </div>
                    <span
                      style={{
                        fontSize: '0.72rem',
                        fontWeight: 600,
                        color: 'var(--primary)',
                        background: 'var(--primary-light)',
                        padding: '0.2rem 0.5rem',
                        borderRadius: 6,
                      }}
                    >
                      🛡️ Phiên an toàn
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
                  Giao diện Bảng điều khiển Admin
                </h3>
                <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: '1.5rem' }}>
                  Tùy chỉnh chế độ hiển thị và âm thanh thông báo của bảng điều trị.
                </p>

                {/* Theme Selector Cards */}
                <div style={{ marginBottom: '2rem' }}>
                  <label className="form-label" style={{ marginBottom: '0.75rem' }}>Chủ đề giao diện Bảng quản trị</label>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '1rem' }}>
                    {[
                      { id: 'light', icon: '☀️', label: 'Chế độ Sáng', desc: 'Sáng sủa, rõ ràng các chỉ số' },
                      { id: 'dark', icon: '🌙', label: 'Chế độ Tối', desc: 'Dịu mắt, phong cách hiện đại' },
                      { id: 'system', icon: '💻', label: 'Theo hệ thống', desc: 'Tự động theo giao diện máy' },
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
                  <label className="form-label" style={{ marginBottom: '0.75rem' }}>Cảnh báo & Tùy chọn Quản trị</label>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                    {[
                      {
                        key: 'email_reminders',
                        icon: '📬',
                        title: 'Thông báo báo cáo hệ thống định kỳ',
                        desc: 'Gửi báo cáo tổng hợp tiến độ toàn hệ thống vào đầu tuần',
                      },
                      {
                        key: 'due_date_alerts',
                        icon: '⚠️',
                        title: 'Cảnh báo nhiệm vụ trễ hạn người dùng',
                        desc: 'Hiển thị cảnh báo khi số lượng nhiệm vụ trễ hạn vượt mức bình thường',
                      },
                      {
                        key: 'system_updates',
                        icon: '👥',
                        title: 'Thông báo người dùng mới đăng ký',
                        desc: 'Nhận thông báo khi có tài khoản mới được tạo trong hệ thống',
                      },
                      {
                        key: 'sound_enabled',
                        icon: '🔔',
                        title: 'Âm thanh thông báo khi thao tác',
                        desc: 'Phát âm thanh thông báo nhẹ khi lưu hoặc xóa dữ liệu thành công',
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
               TAB 4: TỔNG QUAN HỆ THỐNG (STATS)
               ════════════════════════════════════════════════════════ */}
            {activeTab === 'stats' && (
              <div>
                <h3 style={{ fontSize: '1.05rem', fontWeight: 700, marginBottom: '0.35rem' }}>
                  Tổng quan Nền tảng & Hệ thống
                </h3>
                <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: '1.5rem' }}>
                  Chỉ số sức khỏe hệ thống và thống kê tổng quát của nền tảng Quản lý Nhiệm vụ.
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
                        <div style={{ fontSize: '0.74rem', color: 'var(--primary)', fontWeight: 600 }}>👥 Người dùng</div>
                        <div style={{ fontSize: '1.6rem', fontWeight: 800, marginTop: 4, color: 'var(--text-primary)' }}>
                          {stats?.totalUsers || 0}
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
                        <div style={{ fontSize: '0.74rem', color: '#10b981', fontWeight: 600 }}>📁 Tổng dự án</div>
                        <div style={{ fontSize: '1.6rem', fontWeight: 800, marginTop: 4, color: '#10b981' }}>
                          {stats?.totalProjects || 0}
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
                        <div style={{ fontSize: '0.74rem', color: '#3b82f6', fontWeight: 600 }}>📋 Tổng nhiệm vụ</div>
                        <div style={{ fontSize: '1.6rem', fontWeight: 800, marginTop: 4, color: '#3b82f6' }}>
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
                          {stats?.doneTasks || 0}
                        </div>
                      </div>
                    </div>

                    {/* System Info Details */}
                    <div style={{ borderTop: '1px solid var(--border)', paddingTop: '1rem' }}>
                      <div style={{ fontSize: '0.82rem', fontWeight: 600, marginBottom: '0.5rem' }}>Trạng thái Hạ tầng</div>
                      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.5rem', fontSize: '0.78rem' }}>
                        <div style={{ color: 'var(--text-muted)' }}>
                          Hệ cơ sở dữ liệu: <strong style={{ color: 'var(--text-primary)' }}>MySQL (Sequelize ORM)</strong>
                        </div>
                        <div style={{ color: 'var(--text-muted)' }}>
                          Phiên bản Backend: <strong style={{ color: 'var(--text-primary)' }}>Express v5.3.0</strong>
                        </div>
                        <div style={{ color: 'var(--text-muted)' }}>
                          Cổng dịch vụ: <strong style={{ color: 'var(--text-primary)' }}>Port 3000</strong>
                        </div>
                        <div style={{ color: 'var(--text-muted)' }}>
                          Tình trạng: <strong style={{ color: '#10b981' }}>🟢 Trực tuyến 100%</strong>
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
          title="Xóa ảnh đại diện"
          message="Bạn có chắc chắn muốn xóa ảnh đại diện hiện tại? Ảnh đại diện sẽ được đặt lại về dạng mặc định."
          confirmText="🗑️ Xóa ảnh"
          cancelText="Hủy bỏ"
          variant="danger"
          icon="🖼️"
          onConfirm={executeDeleteAvatar}
          onClose={() => setShowDeleteAvatarConfirm(false)}
        />
      )}
    </div>
  );
}
