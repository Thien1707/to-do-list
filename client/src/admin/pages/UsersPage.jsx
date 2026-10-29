import { useState, useEffect, useCallback } from 'react';
import api from '../services/api';
import toast from 'react-hot-toast';
import AdminLayout from '../components/AdminLayout';
import ConfirmModal from '../components/ConfirmModal';

export default function UsersPage() {
  const [users, setUsers] = useState([]);
  const [pagination, setPagination] = useState({ total: 0, page: 1, pages: 1 });
  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [loading, setLoading] = useState(true);

  // In-app Confirm Modal (replaces browser confirm)
  const [confirmModalConfig, setConfirmModalConfig] = useState(null);

  // Reset Password Modal
  const [resetModalUser, setResetModalUser] = useState(null);
  const [newPassword, setNewPassword] = useState('');
  const [resetting, setResetting] = useState(false);

  // Debounce search input
  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedSearch(search);
    }, 300);
    return () => clearTimeout(handler);
  }, [search]);

  const fetchUsers = useCallback(async (page = 1) => {
    setLoading(true);
    try {
      const params = { page, limit: 15 };
      if (debouncedSearch.trim()) params.search = debouncedSearch.trim();
      const { data } = await api.get('/admin/users', { params });
      setUsers(data.data.users);
      setPagination(data.data.pagination);
    } catch {
      toast.error('Không thể tải danh sách người dùng');
    } finally {
      setLoading(false);
    }
  }, [debouncedSearch]);

  useEffect(() => {
    fetchUsers(1);
  }, [fetchUsers]);

  const handleToggleActive = async (user) => {
    try {
      await api.put(`/admin/users/${user.id}`, { is_active: !user.is_active });
      toast.success(`Đã ${user.is_active ? 'khóa' : 'kích hoạt'} tài khoản`);
      fetchUsers(pagination.page);
    } catch {
      toast.error('Thao tác thất bại');
    }
  };

  const handleChangeRole = (user) => {
    const nextRole = user.role === 'admin' ? 'user' : 'admin';
    const actionText = nextRole === 'admin' ? 'nâng lên làm Quản trị viên' : 'chuyển về làm Người dùng thường';
    setConfirmModalConfig({
      title: 'Thay đổi vai trò người dùng',
      message: `Bạn có chắc muốn ${actionText} cho "${user.name}"?`,
      confirmText: nextRole === 'admin' ? '👑 Cấp quyền Admin' : '👤 Chuyển thành User',
      variant: 'primary',
      icon: '👤',
      onConfirm: async () => {
        try {
          await api.put(`/admin/users/${user.id}/role`, { role: nextRole });
          toast.success(`Đã cập nhật vai trò cho ${user.name}`);
          setConfirmModalConfig(null);
          fetchUsers(pagination.page);
        } catch {
          toast.error('Đổi vai trò thất bại');
        }
      },
    });
  };

  const handleResetPassword = async (e) => {
    e.preventDefault();
    if (newPassword.length < 6) {
      toast.error('Mật khẩu mới phải có tối thiểu 6 ký tự');
      return;
    }

    setResetting(true);
    try {
      await api.put(`/admin/users/${resetModalUser.id}/reset-password`, { new_password: newPassword });
      toast.success(`Đã đặt lại mật khẩu mới cho ${resetModalUser.name}`);
      setResetModalUser(null);
      setNewPassword('');
    } catch {
      toast.error('Đặt lại mật khẩu thất bại');
    } finally {
      setResetting(false);
    }
  };

  const handleDelete = (user) => {
    setConfirmModalConfig({
      title: 'Xóa vĩnh viễn người dùng',
      message: `Bạn có chắc muốn xóa vĩnh viễn người dùng "${user.name}"?\nMọi nhiệm vụ của người dùng này cũng sẽ bị xóa vĩnh viễn!`,
      confirmText: '🗑️ Xóa vĩnh viễn',
      variant: 'danger',
      icon: '🗑️',
      onConfirm: async () => {
        try {
          await api.delete(`/admin/users/${user.id}`);
          toast.success('Đã xóa người dùng thành công');
          setConfirmModalConfig(null);
          fetchUsers(pagination.page);
        } catch {
          toast.error('Xóa thất bại');
        }
      },
    });
  };

  const handleExportCSV = () => {
    if (users.length === 0) {
      toast.error('Không có dữ liệu để xuất');
      return;
    }

    const headers = ['ID', 'Họ và tên', 'Email', 'Vai trò', 'Trạng thái', 'Phương thức', 'Ngày tạo'];
    const rows = users.map(u => [
      u.id,
      `"${(u.name || '').replace(/"/g, '""')}"`,
      `"${u.email || ''}"`,
      u.role === 'admin' ? 'Quản trị viên' : 'Người dùng',
      u.is_active ? 'Hoạt động' : 'Bị khóa',
      u.google_id ? 'Google' : 'Email/Mật khẩu',
      u.createdAt ? new Date(u.createdAt).toLocaleDateString('vi-VN') : '',
    ]);

    const csvContent = '\uFEFF' + [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `danh_sach_nguoi_dung_${new Date().toISOString().split('T')[0]}.csv`;
    link.click();
    URL.revokeObjectURL(url);
    toast.success('Đã xuất file người dùng thành công!');
  };

  const formatDate = (d) => (d ? new Date(d).toLocaleDateString('vi-VN') : '—');
  const initials = (name) =>
    name ? name.split(' ').map(w => w[0]).slice(0, 2).join('').toUpperCase() : '?';

  return (
    <AdminLayout active="users">
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1.25rem', flexWrap: 'wrap', gap: '0.75rem' }}>
        <div>
          <h2>👥 Quản lý Người dùng</h2>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.85rem' }}>
            Tổng cộng: {pagination.total} tài khoản | Khóa/Mở tài khoản, Đặt lại mật khẩu và Phân quyền
          </p>
        </div>
        <button className="btn btn-secondary btn-sm" onClick={handleExportCSV}>
          📥 Xuất Excel/CSV
        </button>
      </div>

      <div className="filter-bar">
        <div className="search-wrapper" style={{ flex: 1 }}>
          <span className="search-icon">🔍</span>
          <input
            id="user-search"
            type="text"
            className="form-input"
            placeholder="Tìm theo họ tên, email người dùng..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            style={{ paddingLeft: '2.15rem' }}
          />
        </div>
        {search && (
          <button className="btn btn-ghost btn-sm" onClick={() => setSearch('')}>
            ✕ Xóa tìm kiếm
          </button>
        )}
      </div>

      <div className="data-table-wrapper">
        {loading ? (
          <div style={{ display: 'flex', justifyContent: 'center', padding: '3rem' }}>
            <div className="spinner" />
          </div>
        ) : users.length === 0 ? (
          <div className="empty-state">
            <div className="empty-icon">👤</div>
            <h3>Không tìm thấy người dùng</h3>
            <p>Không có tài khoản nào phù hợp với từ khóa tìm kiếm</p>
          </div>
        ) : (
          <table className="data-table">
            <thead>
              <tr>
                <th>Người dùng</th>
                <th>Email</th>
                <th>Vai trò</th>
                <th>Trạng thái</th>
                <th>Ngày tạo</th>
                <th>Phương thức</th>
                <th style={{ textAlign: 'right' }}>Thao tác</th>
              </tr>
            </thead>
            <tbody>
              {users.map(user => (
                <tr key={user.id}>
                  <td>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
                      <div className="user-avatar">
                        {user.avatar_url ? <img src={user.avatar_url} alt={user.name} /> : initials(user.name)}
                      </div>
                      <div>
                        <div style={{ fontWeight: 600 }}>{user.name}</div>
                        <div style={{ fontSize: '0.74rem', color: 'var(--text-muted)' }}>ID #{user.id}</div>
                      </div>
                    </div>
                  </td>
                  <td style={{ color: 'var(--text-secondary)' }}>{user.email}</td>
                  <td>
                    <span
                      className="badge"
                      style={{
                        background: user.role === 'admin' ? 'rgba(79, 70, 229, 0.12)' : 'var(--bg-elevated)',
                        color: user.role === 'admin' ? 'var(--primary)' : 'var(--text-secondary)',
                        fontWeight: 600,
                      }}
                    >
                      {user.role === 'admin' ? '🛡️ Admin' : '👤 User'}
                    </span>
                  </td>
                  <td>
                    <span className={`badge ${user.is_active ? 'badge-active' : 'badge-inactive'}`}>
                      {user.is_active ? '● Đang hoạt động' : '● Bị vô hiệu hóa'}
                    </span>
                  </td>
                  <td style={{ color: 'var(--text-secondary)', fontSize: '0.82rem' }}>
                    {formatDate(user.createdAt)}
                  </td>
                  <td>
                    <span
                      className="badge"
                      style={{
                        background: user.google_id ? '#eff6ff' : 'var(--bg-elevated)',
                        color: user.google_id ? '#1d4ed8' : 'var(--text-secondary)',
                        border: `1px solid ${user.google_id ? '#bfdbfe' : 'var(--border)'}`,
                      }}
                    >
                      {user.google_id ? '🔷 Google' : '🔑 Email'}
                    </span>
                  </td>
                  <td>
                    <div style={{ display: 'flex', gap: '0.35rem', justifyContent: 'flex-end', alignItems: 'center' }}>
                      <button
                        className="btn btn-sm btn-ghost"
                        onClick={() => {
                          setResetModalUser(user);
                          setNewPassword('');
                        }}
                        title="Đặt lại mật khẩu mới cho người này"
                      >
                        🔑 Đổi mật khẩu
                      </button>
                      <button
                        className="btn btn-sm btn-ghost"
                        onClick={() => handleChangeRole(user)}
                        title={user.role === 'admin' ? 'Hạ quyền xuống User' : 'Nâng cấp lên Quản trị viên'}
                      >
                        {user.role === 'admin' ? 'Hạ quyền' : 'Lên Admin'}
                      </button>
                      <button
                        className={`btn btn-sm ${user.is_active ? 'btn-ghost' : 'btn-success'}`}
                        onClick={() => handleToggleActive(user)}
                        title={user.is_active ? 'Khóa tài khoản này' : 'Mở khóa tài khoản'}
                      >
                        {user.is_active ? 'Khóa' : 'Kích hoạt'}
                      </button>
                      <button
                        className="btn-icon"
                        onClick={() => handleDelete(user)}
                        title="Xóa tài khoản vĩnh viễn"
                        style={{ color: 'var(--danger)' }}
                      >
                        🗑️
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* Full Pagination Bar */}
      <div className="pagination-wrapper">
        <div className="pagination-info">
          Trang <strong>{pagination.page}</strong> trên <strong>{pagination.pages || 1}</strong> (Tổng cộng: <strong>{pagination.total}</strong> người dùng)
        </div>

        <div className="pagination">
          <button
            className="page-btn"
            disabled={pagination.page <= 1}
            onClick={() => fetchUsers(1)}
            title="Về đầu trang"
          >
            « Đầu
          </button>
          <button
            className="page-btn"
            disabled={pagination.page <= 1}
            onClick={() => fetchUsers(pagination.page - 1)}
            title="Trang trước"
          >
            ‹
          </button>
          {Array.from({ length: Math.min(pagination.pages || 1, 7) }, (_, i) => {
            let p = i + 1;
            if (pagination.pages > 7) {
              if (pagination.page <= 4) p = i + 1;
              else if (pagination.page >= pagination.pages - 3) p = pagination.pages - 6 + i;
              else p = pagination.page - 3 + i;
            }
            return (
              <button
                key={p}
                className={`page-btn ${pagination.page === p ? 'active' : ''}`}
                onClick={() => fetchUsers(p)}
              >
                {p}
              </button>
            );
          })}
          <button
            className="page-btn"
            disabled={pagination.page >= pagination.pages}
            onClick={() => fetchUsers(pagination.page + 1)}
            title="Trang sau"
          >
            ›
          </button>
          <button
            className="page-btn"
            disabled={pagination.page >= pagination.pages}
            onClick={() => fetchUsers(pagination.pages)}
            title="Đến cuối trang"
          >
            Cuối »
          </button>
        </div>
      </div>

      {/* Reset Password Modal */}
      {resetModalUser && (
        <div
          className="modal-overlay"
          onClick={e => e.target === e.currentTarget && setResetModalUser(null)}
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(15, 23, 42, 0.5)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 300,
            padding: '1rem',
          }}
        >
          <div className="card animate-fadein" style={{ width: '100%', maxWidth: 'min(94vw, 440px)', padding: '1.5rem', background: 'var(--bg-card)' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1rem' }}>
              <h3 style={{ fontSize: '1.05rem' }}>🔑 Đặt lại mật khẩu</h3>
              <button className="btn-icon" onClick={() => setResetModalUser(null)}>✕</button>
            </div>

            <p style={{ fontSize: '0.82rem', color: 'var(--text-secondary)', marginBottom: '1rem' }}>
              Cấp mật khẩu mới cho tài khoản: <strong>{resetModalUser.email}</strong> ({resetModalUser.name})
            </p>

            <form onSubmit={handleResetPassword}>
              <div className="form-group">
                <label className="form-label">Mật khẩu mới (tối thiểu 6 ký tự) *</label>
                <input
                  type="text"
                  className="form-input"
                  placeholder="Nhập mật khẩu mới..."
                  value={newPassword}
                  onChange={e => setNewPassword(e.target.value)}
                  required
                  autoFocus
                />
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.5rem', marginTop: '1.25rem' }}>
                <button type="button" className="btn btn-ghost" onClick={() => setResetModalUser(null)}>
                  Hủy
                </button>
                <button type="submit" className="btn btn-primary" disabled={resetting}>
                  {resetting ? 'Đang cập nhật...' : 'Xác nhận cấp mật khẩu'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* In-app Confirmation Modal */}
      {confirmModalConfig && (
        <ConfirmModal
          isOpen={!!confirmModalConfig}
          title={confirmModalConfig.title}
          message={confirmModalConfig.message}
          confirmText={confirmModalConfig.confirmText}
          cancelText="Hủy bỏ"
          variant={confirmModalConfig.variant}
          icon={confirmModalConfig.icon}
          onConfirm={confirmModalConfig.onConfirm}
          onClose={() => setConfirmModalConfig(null)}
        />
      )}
    </AdminLayout>
  );
}
