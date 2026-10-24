import { useState, useEffect, useCallback, useMemo } from 'react';
import api from '../services/api';
import toast from 'react-hot-toast';
import AdminLayout from '../components/AdminLayout';

const STATUS_MAP = {
  todo: '📋 Cần làm',
  in_progress: '⚡ Đang làm',
  done: '✅ Hoàn thành',
  cancelled: '❌ Đã hủy',
};

const PRIORITY_MAP = {
  low: 'Thấp',
  medium: 'Trung bình',
  high: 'Cao',
  urgent: 'Khẩn cấp',
};

export default function TasksPage() {
  const [tasks, setTasks] = useState([]);
  const [pagination, setPagination] = useState({ total: 0, page: 1, pages: 1 });
  const [pageSize, setPageSize] = useState(15);
  const [filterStatus, setFilterStatus] = useState('');
  const [filterPriority, setFilterPriority] = useState('');
  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [loading, setLoading] = useState(true);

  // View Mode: 'grouped' (theo người dùng) | 'flat' (danh sách phẳng)
  const [viewMode, setViewMode] = useState('grouped');
  // Expanded user IDs in grouped mode
  const [expandedUsers, setExpandedUsers] = useState({});

  // Edit Task Modal state
  const [editingTask, setEditingTask] = useState(null);
  const [editForm, setEditForm] = useState({ title: '', description: '', status: 'todo', priority: 'medium', due_date: '' });
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => setDebouncedSearch(search), 300);
    return () => clearTimeout(timer);
  }, [search]);

  const fetchTasks = useCallback(async (page = 1) => {
    setLoading(true);
    try {
      const params = { page, limit: pageSize };
      if (filterStatus) params.status = filterStatus;
      if (filterPriority) params.priority = filterPriority;
      if (debouncedSearch.trim()) params.search = debouncedSearch.trim();
      const { data } = await api.get('/admin/tasks', { params });
      setTasks(data.data.tasks);
      setPagination(data.data.pagination);
    } catch {
      toast.error('Không thể tải danh sách nhiệm vụ');
    } finally {
      setLoading(false);
    }
  }, [filterStatus, filterPriority, debouncedSearch, pageSize]);

  useEffect(() => {
    fetchTasks(1);
  }, [fetchTasks]);

  // Group tasks by User
  const groupedByUser = useMemo(() => {
    const map = {};
    tasks.forEach(task => {
      const userId = task.User?.id || 'unknown';
      if (!map[userId]) {
        map[userId] = {
          user: task.User || { id: 'unknown', name: 'Không xác định', email: '—', avatar_url: null },
          tasks: [],
          total: 0,
          done: 0,
          in_progress: 0,
          todo: 0,
          overdue: 0,
        };
      }
      map[userId].tasks.push(task);
      map[userId].total += 1;
      if (task.status === 'done') map[userId].done += 1;
      if (task.status === 'in_progress') map[userId].in_progress += 1;
      if (task.status === 'todo') map[userId].todo += 1;
      if (task.due_date && new Date(task.due_date) < new Date() && task.status !== 'done' && task.status !== 'cancelled') {
        map[userId].overdue += 1;
      }
    });
    return Object.values(map);
  }, [tasks]);

  const toggleUserExpand = (userId) => {
    setExpandedUsers(prev => ({ ...prev, [userId]: !prev[userId] }));
  };

  const expandAll = () => {
    const all = {};
    groupedByUser.forEach(g => { all[g.user.id] = true; });
    setExpandedUsers(all);
  };

  const collapseAll = () => {
    setExpandedUsers({});
  };

  const handleDelete = async (task) => {
    if (!confirm(`Bạn có chắc muốn xóa nhiệm vụ "${task.title}" của người dùng "${task.User?.name || 'Vô danh'}"?`)) return;
    try {
      await api.delete(`/admin/tasks/${task.id}`);
      toast.success('Đã xóa nhiệm vụ thành công');
      fetchTasks(pagination.page);
    } catch {
      toast.error('Xóa nhiệm vụ thất bại');
    }
  };

  const handleOpenEdit = (task) => {
    setEditingTask(task);
    setEditForm({
      title: task.title || '',
      description: task.description || '',
      status: task.status || 'todo',
      priority: task.priority || 'medium',
      due_date: task.due_date ? task.due_date.split('T')[0] : '',
    });
  };

  const handleSaveEdit = async (e) => {
    e.preventDefault();
    if (!editForm.title.trim()) {
      toast.error('Tiêu đề không được để trống');
      return;
    }
    setSaving(true);
    try {
      await api.put(`/admin/tasks/${editingTask.id}`, editForm);
      toast.success('Cập nhật nhiệm vụ thành công');
      setEditingTask(null);
      fetchTasks(pagination.page);
    } catch {
      toast.error('Cập nhật thất bại');
    } finally {
      setSaving(false);
    }
  };

  const handleExportCSV = () => {
    if (tasks.length === 0) {
      toast.error('Không có dữ liệu để xuất');
      return;
    }

    const headers = ['ID', 'Tiêu đề', 'Mô tả', 'Người tạo', 'Email', 'Trạng thái', 'Mức ưu tiên', 'Hạn chót', 'Ngày tạo'];
    const rows = tasks.map(t => [
      t.id,
      `"${(t.title || '').replace(/"/g, '""')}"`,
      `"${(t.description || '').replace(/"/g, '""')}"`,
      `"${t.User?.name || ''}"`,
      `"${t.User?.email || ''}"`,
      STATUS_MAP[t.status] || t.status,
      PRIORITY_MAP[t.priority] || t.priority,
      t.due_date || '',
      t.createdAt ? new Date(t.createdAt).toLocaleDateString('vi-VN') : '',
    ]);

    const csvContent = '\uFEFF' + [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `danh_sach_nhiem_vu_${new Date().toISOString().split('T')[0]}.csv`;
    link.click();
    URL.revokeObjectURL(url);
    toast.success('Đã xuất file CSV thành công!');
  };

  const formatDate = (d) => (d ? new Date(d).toLocaleDateString('vi-VN') : '—');
  const initials = (name) =>
    name ? name.split(' ').map(w => w[0]).slice(0, 2).join('').toUpperCase() : '?';

  return (
    <AdminLayout active="tasks">
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1.25rem', flexWrap: 'wrap', gap: '0.75rem' }}>
        <div>
          <h2>📋 Quản trị Nhiệm vụ Hệ thống</h2>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.85rem' }}>
            Tổng cộng: {pagination.total} nhiệm vụ | Gom nhóm theo từng người dùng để quản lý trực quan
          </p>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap' }}>
          {/* Switch View Mode */}
          <div className="view-mode-tabs">
            <button
              className={`view-mode-tab ${viewMode === 'grouped' ? 'active' : ''}`}
              onClick={() => setViewMode('grouped')}
              title="Gom nhóm từng người dùng, click vào tên để mở xem danh sách"
            >
              👥 Xem theo Người dùng
            </button>
            <button
              className={`view-mode-tab ${viewMode === 'flat' ? 'active' : ''}`}
              onClick={() => setViewMode('flat')}
              title="Xem danh sách bảng phẳng truyền thống"
            >
              📋 Xem danh sách phẳng
            </button>
          </div>

          <button className="btn btn-secondary btn-sm" onClick={handleExportCSV}>
            📥 Xuất CSV
          </button>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="filter-bar">
        <div className="search-wrapper" style={{ flex: 1, minWidth: 220 }}>
          <span className="search-icon">🔍</span>
          <input
            type="text"
            className="form-input"
            placeholder="Tìm theo tiêu đề hoặc nội dung nhiệm vụ..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            style={{ paddingLeft: '2.15rem' }}
          />
        </div>

        <select
          id="filter-status"
          className="form-select"
          style={{ width: 'auto' }}
          value={filterStatus}
          onChange={e => setFilterStatus(e.target.value)}
        >
          <option value="">Tất cả trạng thái</option>
          <option value="todo">📋 Cần làm</option>
          <option value="in_progress">⚡ Đang làm</option>
          <option value="done">✅ Hoàn thành</option>
          <option value="cancelled">❌ Đã hủy</option>
        </select>

        <select
          id="filter-priority"
          className="form-select"
          style={{ width: 'auto' }}
          value={filterPriority}
          onChange={e => setFilterPriority(e.target.value)}
        >
          <option value="">Tất cả mức ưu tiên</option>
          <option value="low">Thấp</option>
          <option value="medium">Trung bình</option>
          <option value="high">Cao</option>
          <option value="urgent">Khẩn cấp</option>
        </select>

        {(filterStatus || filterPriority || search) && (
          <button
            className="btn btn-ghost btn-sm"
            onClick={() => {
              setFilterStatus('');
              setFilterPriority('');
              setSearch('');
            }}
          >
            ✕ Xóa bộ lọc
          </button>
        )}

        {viewMode === 'grouped' && groupedByUser.length > 0 && (
          <div style={{ display: 'flex', gap: '0.35rem', marginLeft: 'auto' }}>
            <button className="btn btn-sm btn-ghost" onClick={expandAll} title="Mở rộng tất cả người dùng">
              ▼ Mở tất cả
            </button>
            <button className="btn btn-sm btn-ghost" onClick={collapseAll} title="Thu gọn tất cả người dùng">
              ▲ Thu gọn
            </button>
          </div>
        )}
      </div>

      {/* Content Area */}
      {loading ? (
        <div style={{ display: 'flex', justifyContent: 'center', padding: '3rem' }}>
          <div className="spinner" />
        </div>
      ) : tasks.length === 0 ? (
        <div className="empty-state">
          <div className="empty-icon">📭</div>
          <h3>Không có nhiệm vụ nào</h3>
          <p>Không có nhiệm vụ nào phù hợp với bộ lọc hiện tại</p>
        </div>
      ) : viewMode === 'grouped' ? (
        /* ============================================
           MODE 1: USER GROUPED ACCORDION VIEW
           ============================================ */
        <div>
          {groupedByUser.map(group => {
            const isExpanded = !!expandedUsers[group.user.id];
            const completionPct = group.total > 0 ? Math.round((group.done / group.total) * 100) : 0;

            return (
              <div key={group.user.id} className="user-group-card">
                {/* User Row Header - Click to toggle */}
                <div className="user-group-header" onClick={() => toggleUserExpand(group.user.id)}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', minWidth: 240 }}>
                    <span style={{ fontSize: '0.85rem', color: 'var(--primary)', transform: isExpanded ? 'rotate(90deg)' : 'none', transition: 'transform 0.15s' }}>
                      ▶
                    </span>
                    <div className="user-avatar" style={{ width: 34, height: 34, fontSize: '0.82rem' }}>
                      {group.user.avatar_url ? (
                        <img src={group.user.avatar_url} alt="" />
                      ) : (
                        initials(group.user.name)
                      )}
                    </div>
                    <div>
                      <div style={{ fontWeight: 600, fontSize: '0.92rem', color: 'var(--text-primary)' }}>
                        {group.user.name}
                      </div>
                      <div style={{ fontSize: '0.74rem', color: 'var(--text-muted)' }}>
                        {group.user.email}
                      </div>
                    </div>
                  </div>

                  {/* Summary Badges */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem', flexWrap: 'wrap' }}>
                    <span className="badge" style={{ background: 'var(--bg-elevated)', border: '1px solid var(--border)', fontWeight: 600 }}>
                      📋 {group.total} nhiệm vụ
                    </span>
                    <span className="badge badge-done">
                      ✅ {group.done} xong
                    </span>
                    <span className="badge badge-in_progress">
                      ⚡ {group.in_progress} đang làm
                    </span>
                    {group.overdue > 0 && (
                      <span className="badge badge-cancelled">
                        🔴 {group.overdue} quá hạn
                      </span>
                    )}

                    {/* Progress Bar */}
                    <div style={{ width: 100, display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                      <div style={{ flex: 1, height: 6, background: 'var(--border)', borderRadius: 99, overflow: 'hidden' }}>
                        <div style={{ width: `${completionPct}%`, height: '100%', background: '#10b981', borderRadius: 99 }} />
                      </div>
                      <span style={{ fontSize: '0.72rem', fontWeight: 600, color: 'var(--text-secondary)' }}>
                        {completionPct}%
                      </span>
                    </div>

                    <button
                      className="btn btn-sm btn-ghost"
                      onClick={(e) => {
                        e.stopPropagation();
                        toggleUserExpand(group.user.id);
                      }}
                      style={{ fontSize: '0.78rem' }}
                    >
                      {isExpanded ? '▲ Thu gọn' : '▼ Xem chi tiết'}
                    </button>
                  </div>
                </div>

                {/* Expanded Tasks List for this user */}
                {isExpanded && (
                  <div className="user-group-body">
                    <table className="data-table" style={{ background: 'var(--bg-card)', borderRadius: 'var(--radius-sm)' }}>
                      <thead>
                        <tr>
                          <th>Tiêu đề & Nội dung</th>
                          <th>Trạng thái</th>
                          <th>Ưu tiên</th>
                          <th>Hạn hoàn thành</th>
                          <th>Ngày tạo</th>
                          <th style={{ textAlign: 'right' }}>Thao tác</th>
                        </tr>
                      </thead>
                      <tbody>
                        {group.tasks.map(task => {
                          const isOverdue =
                            task.due_date &&
                            new Date(task.due_date) < new Date() &&
                            task.status !== 'done' &&
                            task.status !== 'cancelled';

                          return (
                            <tr key={task.id}>
                              <td>
                                <div style={{ fontWeight: 600, maxWidth: 300 }}>
                                  {task.title}
                                </div>
                                {task.description && (
                                  <div style={{ fontSize: '0.78rem', color: 'var(--text-secondary)', marginTop: '0.15rem', maxWidth: 300 }}>
                                    {task.description}
                                  </div>
                                )}
                              </td>
                              <td>
                                <span className={`badge badge-${task.status}`}>{STATUS_MAP[task.status]}</span>
                              </td>
                              <td>
                                <span className="badge" style={{ background: 'var(--bg-elevated)', color: 'var(--text-secondary)' }}>
                                  {PRIORITY_MAP[task.priority]}
                                </span>
                              </td>
                              <td>
                                <span
                                  style={{
                                    fontSize: '0.82rem',
                                    color: isOverdue ? 'var(--danger-text)' : 'var(--text-secondary)',
                                    fontWeight: isOverdue ? 600 : 400,
                                    background: isOverdue ? 'var(--danger-bg)' : 'transparent',
                                    padding: isOverdue ? '0.15rem 0.45rem' : '0',
                                    borderRadius: '4px',
                                  }}
                                >
                                  {formatDate(task.due_date)} {isOverdue && '(Quá hạn)'}
                                </span>
                              </td>
                              <td style={{ fontSize: '0.82rem', color: 'var(--text-secondary)' }}>
                                {formatDate(task.createdAt)}
                              </td>
                              <td>
                                <div style={{ display: 'flex', gap: '0.35rem', justifyContent: 'flex-end' }}>
                                  <button
                                    className="btn btn-sm btn-ghost"
                                    onClick={() => handleOpenEdit(task)}
                                    title="Chỉnh sửa nhiệm vụ này"
                                  >
                                    ✏️ Sửa
                                  </button>
                                  <button
                                    className="btn-icon"
                                    onClick={() => handleDelete(task)}
                                    title="Xóa nhiệm vụ này"
                                    style={{ color: 'var(--danger)' }}
                                  >
                                    🗑️
                                  </button>
                                </div>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      ) : (
        /* ============================================
           MODE 2: FLAT TABLE VIEW
           ============================================ */
        <div className="data-table-wrapper">
          <table className="data-table">
            <thead>
              <tr>
                <th>Tiêu đề & Nội dung</th>
                <th>Người tạo</th>
                <th>Trạng thái</th>
                <th>Ưu tiên</th>
                <th>Hạn hoàn thành</th>
                <th>Ngày tạo</th>
                <th style={{ textAlign: 'right' }}>Thao tác</th>
              </tr>
            </thead>
            <tbody>
              {tasks.map(task => {
                const isOverdue =
                  task.due_date &&
                  new Date(task.due_date) < new Date() &&
                  task.status !== 'done' &&
                  task.status !== 'cancelled';

                return (
                  <tr key={task.id}>
                    <td>
                      <div style={{ fontWeight: 600, maxWidth: 260, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {task.title}
                      </div>
                      {task.description && (
                        <div style={{ fontSize: '0.78rem', color: 'var(--text-secondary)', marginTop: '0.15rem', maxWidth: 260, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                          {task.description}
                        </div>
                      )}
                    </td>
                    <td>
                      {task.User ? (
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.55rem' }}>
                          <div className="user-avatar" style={{ width: 28, height: 28, fontSize: '0.72rem' }}>
                            {task.User.avatar_url ? <img src={task.User.avatar_url} alt="" /> : initials(task.User.name)}
                          </div>
                          <div>
                            <div style={{ fontSize: '0.82rem', fontWeight: 500 }}>{task.User.name}</div>
                            <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>{task.User.email}</div>
                          </div>
                        </div>
                      ) : (
                        <span style={{ color: 'var(--text-muted)', fontSize: '0.8rem' }}>—</span>
                      )}
                    </td>
                    <td>
                      <span className={`badge badge-${task.status}`}>{STATUS_MAP[task.status]}</span>
                    </td>
                    <td>
                      <span className="badge" style={{ background: 'var(--bg-elevated)', color: 'var(--text-secondary)' }}>
                        {PRIORITY_MAP[task.priority]}
                      </span>
                    </td>
                    <td>
                      <span
                        style={{
                          fontSize: '0.82rem',
                          color: isOverdue ? 'var(--danger-text)' : 'var(--text-secondary)',
                          fontWeight: isOverdue ? 600 : 400,
                          background: isOverdue ? 'var(--danger-bg)' : 'transparent',
                          padding: isOverdue ? '0.15rem 0.45rem' : '0',
                          borderRadius: '4px',
                        }}
                      >
                        {formatDate(task.due_date)} {isOverdue && '(Quá hạn)'}
                      </span>
                    </td>
                    <td style={{ fontSize: '0.82rem', color: 'var(--text-secondary)' }}>
                      {formatDate(task.createdAt)}
                    </td>
                    <td>
                      <div style={{ display: 'flex', gap: '0.35rem', justifyContent: 'flex-end' }}>
                        <button
                          className="btn btn-sm btn-ghost"
                          onClick={() => handleOpenEdit(task)}
                          title="Chỉnh sửa nhiệm vụ này"
                        >
                          ✏️ Sửa
                        </button>
                        <button
                          className="btn-icon"
                          onClick={() => handleDelete(task)}
                          title="Xóa nhiệm vụ này"
                          style={{ color: 'var(--danger)' }}
                        >
                          🗑️
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* ============================================
          ENHANCED FULL PAGINATION BAR
          ============================================ */}
      <div className="pagination-wrapper">
        <div className="pagination-info">
          Hiển thị <strong>{(pagination.page - 1) * pageSize + 1}</strong> - <strong>{Math.min(pagination.page * pageSize, pagination.total)}</strong> trên tổng số <strong>{pagination.total}</strong> nhiệm vụ
          {viewMode === 'grouped' && ` (Gom thành ${groupedByUser.length} người dùng)`}
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem', flexWrap: 'wrap' }}>
          {/* Page size selector */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
            <span>Số dòng:</span>
            <select
              className="form-select"
              style={{ width: 'auto', padding: '0.2rem 0.45rem', fontSize: '0.78rem' }}
              value={pageSize}
              onChange={e => {
                setPageSize(parseInt(e.target.value));
              }}
            >
              <option value="10">10</option>
              <option value="15">15</option>
              <option value="25">25</option>
              <option value="50">50</option>
              <option value="100">100</option>
            </select>
          </div>

          {/* Navigation Buttons: First, Prev, Numbers, Next, Last */}
          <div className="pagination">
            {/* Về đầu trang */}
            <button
              className="page-btn"
              disabled={pagination.page <= 1}
              onClick={() => fetchTasks(1)}
              title="Về đầu trang"
            >
              « Đầu
            </button>

            {/* Trang trước */}
            <button
              className="page-btn"
              disabled={pagination.page <= 1}
              onClick={() => fetchTasks(pagination.page - 1)}
              title="Trang trước"
            >
              ‹
            </button>

            {/* Page number buttons */}
            {Array.from({ length: Math.min(pagination.pages || 1, 7) }, (_, i) => {
              // Sliding window for page numbers
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
                  onClick={() => fetchTasks(p)}
                >
                  {p}
                </button>
              );
            })}

            {/* Trang sau */}
            <button
              className="page-btn"
              disabled={pagination.page >= pagination.pages}
              onClick={() => fetchTasks(pagination.page + 1)}
              title="Trang tiếp theo"
            >
              ›
            </button>

            {/* Đến cuối trang */}
            <button
              className="page-btn"
              disabled={pagination.page >= pagination.pages}
              onClick={() => fetchTasks(pagination.pages)}
              title="Đến cuối trang"
            >
              Cuối »
            </button>
          </div>
        </div>
      </div>

      {/* Admin Edit Task Modal */}
      {editingTask && (
        <div
          className="modal-overlay"
          onClick={e => e.target === e.currentTarget && setEditingTask(null)}
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
          <div className="card animate-fadein" style={{ width: '100%', maxWidth: 'min(94vw, 520px)', padding: '1.5rem', background: 'var(--bg-card)' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1rem' }}>
              <h3 style={{ fontSize: '1.05rem' }}>✏️ Quản trị: Sửa Nhiệm vụ</h3>
              <button className="btn-icon" onClick={() => setEditingTask(null)}>✕</button>
            </div>

            <form onSubmit={handleSaveEdit}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.85rem' }}>
                <div className="form-group">
                  <label className="form-label">Tiêu đề nhiệm vụ *</label>
                  <input
                    type="text"
                    className="form-input"
                    value={editForm.title}
                    onChange={e => setEditForm({ ...editForm, title: e.target.value })}
                    required
                  />
                </div>

                <div className="form-group">
                  <label className="form-label">Mô tả</label>
                  <textarea
                    className="form-input"
                    rows={3}
                    value={editForm.description}
                    onChange={e => setEditForm({ ...editForm, description: e.target.value })}
                  />
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
                  <div className="form-group">
                    <label className="form-label">Trạng thái</label>
                    <select
                      className="form-select"
                      value={editForm.status}
                      onChange={e => setEditForm({ ...editForm, status: e.target.value })}
                    >
                      <option value="todo">📋 Cần làm</option>
                      <option value="in_progress">⚡ Đang làm</option>
                      <option value="done">✅ Hoàn thành</option>
                      <option value="cancelled">❌ Đã hủy</option>
                    </select>
                  </div>

                  <div className="form-group">
                    <label className="form-label">Mức ưu tiên</label>
                    <select
                      className="form-select"
                      value={editForm.priority}
                      onChange={e => setEditForm({ ...editForm, priority: e.target.value })}
                    >
                      <option value="low">Thấp</option>
                      <option value="medium">Trung bình</option>
                      <option value="high">Cao</option>
                      <option value="urgent">Khẩn cấp</option>
                    </select>
                  </div>
                </div>

                <div className="form-group">
                  <label className="form-label">Hạn hoàn thành</label>
                  <input
                    type="date"
                    className="form-input"
                    value={editForm.due_date}
                    onChange={e => setEditForm({ ...editForm, due_date: e.target.value })}
                  />
                </div>
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.5rem', marginTop: '1.25rem' }}>
                <button type="button" className="btn btn-ghost" onClick={() => setEditingTask(null)}>
                  Hủy
                </button>
                <button type="submit" className="btn btn-primary" disabled={saving}>
                  {saving ? 'Đang lưu...' : 'Lưu thay đổi'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </AdminLayout>
  );
}
