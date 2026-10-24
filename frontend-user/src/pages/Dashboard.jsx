import { useState, useEffect, useCallback, useMemo } from 'react';
import { useAuth } from '../context/AuthContext';
import api from '../services/api';
import toast from 'react-hot-toast';
import confetti from 'canvas-confetti';
import Sidebar from '../components/Sidebar';
import TaskModal from '../components/TaskModal';
import StatsModal from '../components/StatsModal';

const PRIORITY_LABELS = {
  low: 'Thấp',
  medium: 'Trung bình',
  high: 'Cao',
  urgent: 'Khẩn cấp',
};

const STATUS_COLS = [
  { key: 'todo', label: 'Cần làm', emoji: '📋' },
  { key: 'in_progress', label: 'Đang làm', emoji: '⚡' },
  { key: 'done', label: 'Hoàn thành', emoji: '✅' },
];

const MOTIVATIONAL_QUOTES = [
  '⚡ Kỷ luật là chiếc cầu nối giữa mục tiêu và thành tựu!',
  '🎯 Tập trung hoàn thành từng việc nhỏ, thành công lớn sẽ tự đến.',
  '🌱 Hôm nay tốt hơn hôm qua 1% là bạn đã chiến thắng chính mình.',
  '🚀 Bắt đầu luôn là bước khó khăn nhất, nhưng bạn đã sẵn sàng!',
  '☕ Uống một ngụm nước, hít một hơi sâu và giải quyết việc tiếp theo nhé!',
];

function formatDueDate(dueDate, status) {
  if (!dueDate) return null;
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const parts = dueDate.split('T')[0].split('-');
  const due = new Date(parseInt(parts[0]), parseInt(parts[1]) - 1, parseInt(parts[2]));
  const diffDays = Math.round((due - today) / (1000 * 60 * 60 * 24));

  const isCompleted = status === 'done' || status === 'cancelled';
  let cls = 'ok';
  let label = `${parts[2]}/${parts[1]}/${parts[0]}`;

  if (!isCompleted) {
    if (diffDays < 0) {
      cls = 'overdue';
      label = `Quá hạn (${Math.abs(diffDays)} ngày)`;
    } else if (diffDays === 0) {
      cls = 'soon';
      label = 'Hôm nay';
    } else if (diffDays === 1) {
      cls = 'soon';
      label = 'Ngày mai';
    }
  }

  return { cls, label };
}

function TaskCard({ task, onEdit, onDelete, onStatusChange, isDragging, onDragStart, onDragEnd }) {
  const dueInfo = formatDueDate(task.due_date, task.status);
  const isDone = task.status === 'done';

  const handleCheckboxClick = (e) => {
    e.stopPropagation();
    const nextStatus = isDone ? 'todo' : 'done';
    onStatusChange(task.id, nextStatus);
  };

  const renderCategoryIcon = (icon) => {
    if (!icon) return '📁';
    if (typeof icon === 'string' && icon.startsWith('data:image')) {
      return <img src={icon} alt="" style={{ width: 14, height: 14, borderRadius: 3, objectFit: 'cover' }} />;
    }
    return <span>{icon}</span>;
  };

  return (
    <div
      className={`task-card ${isDragging ? 'dragging' : ''} ${isDone ? 'completed-card' : ''}`}
      onClick={() => onEdit(task)}
      draggable
      onDragStart={(e) => onDragStart(e, task.id)}
      onDragEnd={onDragEnd}
    >
      <div className="task-card-actions" onClick={e => e.stopPropagation()}>
        <button className="btn-icon" title="Chỉnh sửa" onClick={() => onEdit(task)}>✏️</button>
        <button className="btn-icon" title="Xóa" onClick={() => onDelete(task.id)}>🗑️</button>
      </div>

      <div style={{ display: 'flex', alignItems: 'flex-start', gap: '0.6rem' }}>
        {/* Quick Checkbox */}
        <button
          className={`task-checkbox ${isDone ? 'checked' : ''}`}
          onClick={handleCheckboxClick}
          title={isDone ? 'Đánh dấu chưa hoàn thành' : 'Đánh dấu hoàn thành'}
        >
          {isDone ? '✓' : ''}
        </button>

        <div style={{ flex: 1, minWidth: 0 }}>
          <div
            className="task-card-title"
            style={{
              textDecoration: isDone ? 'line-through' : 'none',
              opacity: isDone ? 0.75 : 1,
            }}
          >
            {task.title}
          </div>

          {task.description && (
            <div
              className="task-card-desc"
              style={{
                textDecoration: isDone ? 'line-through' : 'none',
                opacity: isDone ? 0.6 : 1,
              }}
            >
              {task.description}
            </div>
          )}
        </div>
      </div>

      <div className="task-card-meta" style={{ paddingLeft: '1.75rem' }}>
        <span className={`priority-dot ${task.priority}`} />
        <span className={`badge badge-${task.priority}`}>{PRIORITY_LABELS[task.priority]}</span>

        {task.Category && (
          <span
            className="category-tag"
            style={{
              background: 'var(--bg-elevated)',
              color: 'var(--text-secondary)',
              border: '1px solid var(--border)',
            }}
          >
            {renderCategoryIcon(task.Category.icon)}
            <span>{task.Category.name}</span>
          </span>
        )}

        {dueInfo && (
          <span className={`due-date ${dueInfo.cls}`}>
            📅 {dueInfo.label}
          </span>
        )}
      </div>

      {/* Quick Move Status Pills */}
      <div className="task-status-actions" onClick={e => e.stopPropagation()} style={{ paddingLeft: '1.75rem' }}>
        {STATUS_COLS.filter(s => s.key !== task.status).map(s => (
          <button
            key={s.key}
            className="status-pill-btn"
            onClick={() => onStatusChange(task.id, s.key)}
            title={`Chuyển sang ${s.label}`}
          >
            {s.emoji} Chuyển {s.label}
          </button>
        ))}
      </div>
    </div>
  );
}

export default function Dashboard() {
  const { user } = useAuth();
  const [tasks, setTasks] = useState([]);
  const [stats, setStats] = useState({ total: 0, todo: 0, in_progress: 0, done: 0, overdue: 0 });
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [showStatsModal, setShowStatsModal] = useState(false);
  const [editTask, setEditTask] = useState(null);
  const [filterStatus, setFilterStatus] = useState('');
  const [filterPriority, setFilterPriority] = useState('');
  const [filterCategory, setFilterCategory] = useState('');
  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [sortBy, setSortBy] = useState('newest'); // 'newest' | 'due_date' | 'priority' | 'alphabet'
  const [sidebarOpen, setSidebarOpen] = useState(false);

  // Drag and Drop state
  const [draggingTaskId, setDraggingTaskId] = useState(null);
  const [dragOverCol, setDragOverCol] = useState(null);

  // Quick Inline Add state
  const [quickAddCol, setQuickAddCol] = useState(null);
  const [quickAddTitle, setQuickAddTitle] = useState('');
  const [quickAddLoading, setQuickAddLoading] = useState(false);

  // Streak calculation (persisted in localStorage)
  const [streak, setStreak] = useState(() => {
    const saved = localStorage.getItem('user_streak');
    return saved ? parseInt(saved, 10) : 1;
  });

  // Daily quote selection
  const dailyQuote = useMemo(() => {
    const day = new Date().getDate();
    return MOTIVATIONAL_QUOTES[day % MOTIVATIONAL_QUOTES.length];
  }, []);

  // Debounce search
  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedSearch(search);
    }, 300);
    return () => clearTimeout(handler);
  }, [search]);

  const fetchAll = useCallback(async () => {
    try {
      const params = { limit: 100 };
      if (filterStatus) params.status = filterStatus;
      if (filterPriority) params.priority = filterPriority;
      if (filterCategory) params.category_id = filterCategory;
      if (debouncedSearch.trim()) params.search = debouncedSearch.trim();

      const [tasksRes, statsRes, catsRes] = await Promise.all([
        api.get('/tasks', { params }),
        api.get('/tasks/stats'),
        api.get('/tasks/categories'),
      ]);

      setTasks(tasksRes.data.data.tasks);
      setStats(statsRes.data.data);
      setCategories(catsRes.data.data.categories);
    } catch {
      toast.error('Không thể tải dữ liệu nhiệm vụ');
    } finally {
      setLoading(false);
    }
  }, [filterStatus, filterPriority, filterCategory, debouncedSearch]);

  useEffect(() => {
    fetchAll();
  }, [fetchAll]);

  // Celebrate with confetti
  const triggerCelebration = () => {
    confetti({
      particleCount: 80,
      spread: 70,
      origin: { y: 0.6 },
      colors: ['#4f46e5', '#10b981', '#f59e0b', '#3b82f6', '#ec4899'],
    });
  };

  const handleDelete = async (id) => {
    if (!confirm('Bạn có chắc muốn xóa nhiệm vụ này?')) return;
    try {
      await api.delete(`/tasks/${id}`);
      toast.success('Đã xóa nhiệm vụ');
      fetchAll();
    } catch {
      toast.error('Xóa thất bại');
    }
  };

  const handleStatusChange = async (id, status) => {
    try {
      await api.patch(`/tasks/${id}/status`, { status });
      if (status === 'done') {
        triggerCelebration();
        toast.success('Xuất sắc! Đã hoàn thành nhiệm vụ 🎉');

        // Increment streak if not updated today
        const lastDate = localStorage.getItem('last_completed_date');
        const todayStr = new Date().toISOString().split('T')[0];
        if (lastDate !== todayStr) {
          const newStreak = streak + 1;
          setStreak(newStreak);
          localStorage.setItem('user_streak', String(newStreak));
          localStorage.setItem('last_completed_date', todayStr);
        }
      } else {
        toast.success('Đã cập nhật trạng thái');
      }
      fetchAll();
    } catch {
      toast.error('Cập nhật thất bại');
    }
  };

  // Global listener to ensure dragging state is ALWAYS cleaned up
  useEffect(() => {
    const clearDragState = () => {
      setDraggingTaskId(null);
      setDragOverCol(null);
    };
    window.addEventListener('dragend', clearDragState);
    window.addEventListener('drop', clearDragState);
    window.addEventListener('mouseup', clearDragState);
    return () => {
      window.removeEventListener('dragend', clearDragState);
      window.removeEventListener('drop', clearDragState);
      window.removeEventListener('mouseup', clearDragState);
    };
  }, []);

  // Drag and drop handlers
  const handleDragStart = (e, taskId) => {
    e.dataTransfer.setData('text/plain', String(taskId));
    setDraggingTaskId(taskId);
  };

  const handleDragEnd = () => {
    setDraggingTaskId(null);
    setDragOverCol(null);
  };

  const handleDragOver = (e, colKey) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    if (dragOverCol !== colKey) {
      setDragOverCol(colKey);
    }
  };

  const handleDrop = async (e, targetStatus) => {
    e.preventDefault();
    setDragOverCol(null);
    setDraggingTaskId(null); // Always clean up dragging state immediately

    const taskIdStr = e.dataTransfer.getData('text/plain');
    const taskId = parseInt(taskIdStr, 10);
    if (!taskId) return;

    const task = tasks.find(t => t.id === taskId);
    if (!task || task.status === targetStatus) return;

    // Optimistic UI update
    setTasks(prev => prev.map(t => (t.id === taskId ? { ...t, status: targetStatus } : t)));
    await handleStatusChange(taskId, targetStatus);
  };

  // Quick inline add
  const handleQuickAdd = async (e, status) => {
    e.preventDefault();
    if (!quickAddTitle.trim()) {
      setQuickAddCol(null);
      return;
    }

    setQuickAddLoading(true);
    try {
      await api.post('/tasks', {
        title: quickAddTitle.trim(),
        status,
        priority: 'medium',
        category_id: filterCategory ? parseInt(filterCategory) : null,
      });
      toast.success('Đã thêm nhanh nhiệm vụ ⚡');
      setQuickAddTitle('');
      setQuickAddCol(null);
      fetchAll();
    } catch {
      toast.error('Thêm nhanh thất bại');
    } finally {
      setQuickAddLoading(false);
    }
  };

  const handleEdit = (task) => {
    setEditTask(task);
    setShowModal(true);
  };

  const handleAddNew = () => {
    setEditTask(null);
    setShowModal(true);
  };

  const handleModalClose = () => {
    setShowModal(false);
    setEditTask(null);
  };

  const handleModalSave = () => {
    handleModalClose();
    fetchAll();
  };

  // Sort tasks
  const sortedTasks = useMemo(() => {
    const list = [...tasks];
    if (sortBy === 'due_date') {
      return list.sort((a, b) => {
        if (!a.due_date) return 1;
        if (!b.due_date) return -1;
        return new Date(a.due_date) - new Date(b.due_date);
      });
    }
    if (sortBy === 'priority') {
      const order = { urgent: 4, high: 3, medium: 2, low: 1 };
      return list.sort((a, b) => (order[b.priority] || 0) - (order[a.priority] || 0));
    }
    if (sortBy === 'alphabet') {
      return list.sort((a, b) => a.title.localeCompare(b.title));
    }
    // newest default
    return list.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
  }, [tasks, sortBy]);

  const activeCategoryObj = categories.find(c => c.id === filterCategory);
  const tasksByStatus = (status) => sortedTasks.filter(t => t.status === status);
  const completionPct = stats.total > 0 ? Math.round((stats.done / stats.total) * 100) : 0;

  if (loading) {
    return (
      <div className="page-loader">
        <div className="spinner" />
        <p style={{ color: 'var(--text-secondary)' }}>Đang tải bảng nhiệm vụ...</p>
      </div>
    );
  }

  return (
    <div className="app-layout">
      <Sidebar
        categories={categories}
        user={user}
        activeFilter={filterStatus}
        activeCategory={filterCategory}
        onFilterChange={setFilterStatus}
        onCategoryChange={setFilterCategory}
        onRefresh={fetchAll}
        onOpenStats={() => setShowStatsModal(true)}
        streak={streak}
        isOpen={sidebarOpen}
        onClose={() => setSidebarOpen(false)}
      />

      <div className="main-content">
        {/* Header */}
        <header className="header">
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            <button
              className="mobile-menu-btn"
              onClick={() => setSidebarOpen(true)}
              title="Mở menu"
            >
              ☰
            </button>
            <div>
              <h2 className="header-title">Bảng nhiệm vụ</h2>
              <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                Xin chào, {user?.name || user?.email} 👋
              </p>
            </div>
          </div>

          <div className="header-actions">
            {/* Streak Counter Badge in Header */}
            <div
              className="streak-badge-header"
              onClick={() => setShowStatsModal(true)}
              title="Chuỗi ngày liên tục hoàn thành nhiệm vụ"
            >
              <span>🔥</span>
              <span style={{ fontWeight: 700, fontSize: '0.84rem' }}>{streak} ngày</span>
            </div>

            {/* Statistics Button */}
            <button
              className="btn btn-ghost btn-sm"
              onClick={() => setShowStatsModal(true)}
              title="Xem thống kê & thành tựu"
            >
              📊 Thống kê
            </button>

            <button id="add-task-btn" className="btn btn-primary" onClick={handleAddNew}>
              ＋ Thêm nhiệm vụ
            </button>
          </div>
        </header>

        <div className="page-container">
          {/* Daily Motivation Banner */}
          <div
            style={{
              background: 'var(--bg-elevated)',
              border: '1px solid var(--border)',
              borderRadius: 'var(--radius)',
              padding: '0.65rem 1rem',
              marginBottom: '1rem',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              fontSize: '0.84rem',
              color: 'var(--text-secondary)',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <span>💡</span>
              <span style={{ fontWeight: 500 }}>{dailyQuote}</span>
            </div>
            <span style={{ fontSize: '0.74rem', color: 'var(--text-muted)' }}>
              Kéo thả thẻ nhiệm vụ qua các cột để đổi trạng thái! 🖐️
            </span>
          </div>

          {/* System Statistics Cards */}
          <div className="stats-grid">
            {[
              { cls: 'total', icon: '📊', value: stats.total, label: 'Tổng nhiệm vụ', filter: '' },
              { cls: 'todo', icon: '📋', value: stats.todo, label: 'Cần làm', filter: 'todo' },
              { cls: 'progress', icon: '⚡', value: stats.in_progress, label: 'Đang làm', filter: 'in_progress' },
              { cls: 'done', icon: '✅', value: stats.done, label: 'Hoàn thành', filter: 'done' },
              { cls: 'overdue', icon: '🔴', value: stats.overdue, label: 'Quá hạn', filter: '' },
            ].map(s => (
              <div
                key={s.cls}
                className={`stat-card ${s.cls}`}
                onClick={() => {
                  if (s.filter) {
                    setFilterCategory('');
                    setFilterStatus(s.filter);
                  } else {
                    setFilterStatus('');
                  }
                }}
              >
                <div className="stat-icon">{s.icon}</div>
                <div>
                  <div className="stat-value">{s.value}</div>
                  <div className="stat-label">{s.label}</div>
                </div>
              </div>
            ))}
          </div>

          {/* Progress bar */}
          {stats.total > 0 && (
            <div className="card" style={{ marginBottom: '1.25rem', padding: '0.85rem 1.25rem' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.45rem' }}>
                <span style={{ fontWeight: 600, fontSize: '0.82rem', color: 'var(--text-secondary)' }}>
                  Tiến độ hoàn thành
                </span>
                <span style={{ fontWeight: 700, fontSize: '0.88rem', color: 'var(--primary)' }}>
                  {completionPct}% ({stats.done}/{stats.total})
                </span>
              </div>
              <div className="progress-bar">
                <div className="progress-fill" style={{ width: `${completionPct}%` }} />
              </div>
            </div>
          )}

          {/* Filters, Search & Sort */}
          <div className="filter-bar">
            <div className="search-input-wrapper">
              <span className="search-icon">🔍</span>
              <input
                id="search-tasks"
                type="text"
                className="form-input"
                placeholder="Tìm kiếm nhiệm vụ..."
                value={search}
                onChange={e => setSearch(e.target.value)}
              />
            </div>

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

            <select
              className="form-select"
              style={{ width: 'auto' }}
              value={sortBy}
              onChange={e => setSortBy(e.target.value)}
            >
              <option value="newest">🕒 Mới nhất</option>
              <option value="due_date">📅 Hạn chót gần nhất</option>
              <option value="priority">🔥 Ưu tiên cao nhất</option>
              <option value="alphabet">🔤 Tên (A-Z)</option>
            </select>

            {activeCategoryObj && (
              <span
                className="badge"
                style={{
                  background: 'var(--primary-light)',
                  color: 'var(--primary-text)',
                  fontSize: '0.78rem',
                  padding: '0.35rem 0.65rem',
                }}
              >
                {activeCategoryObj.icon} Danh mục: {activeCategoryObj.name}
                <button
                  onClick={() => setFilterCategory('')}
                  style={{ background: 'none', border: 'none', cursor: 'pointer', marginLeft: 4, fontWeight: 'bold' }}
                >
                  ✕
                </button>
              </span>
            )}

            {(filterStatus || filterPriority || filterCategory || search) && (
              <button
                className="btn btn-ghost btn-sm"
                onClick={() => {
                  setFilterStatus('');
                  setFilterPriority('');
                  setFilterCategory('');
                  setSearch('');
                }}
              >
                ✕ Xóa bộ lọc
              </button>
            )}
          </div>

          {/* Kanban Board with Drag and Drop */}
          {filterStatus ? (
            <div style={{ display: 'grid', gap: '0.65rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
                <h3 style={{ fontSize: '0.95rem', color: 'var(--text-secondary)' }}>
                  Đang lọc: {STATUS_COLS.find(s => s.key === filterStatus)?.label} ({tasks.length})
                </h3>
              </div>
              {sortedTasks.length === 0 ? (
                <div className="empty-state">
                  <div className="empty-state-icon">🎯</div>
                  <h3>Không có nhiệm vụ nào</h3>
                  <p>Không có nhiệm vụ nào phù hợp với bộ lọc hiện tại</p>
                  <button className="btn btn-primary btn-sm" onClick={handleAddNew}>＋ Tạo nhiệm vụ mới</button>
                </div>
              ) : (
                sortedTasks.map(task => (
                  <TaskCard
                    key={task.id}
                    task={task}
                    onEdit={handleEdit}
                    onDelete={handleDelete}
                    onStatusChange={handleStatusChange}
                    isDragging={draggingTaskId === task.id}
                    onDragStart={handleDragStart}
                    onDragEnd={handleDragEnd}
                  />
                ))
              )}
            </div>
          ) : (
            <div className="kanban-board">
              {STATUS_COLS.map(col => {
                const colTasks = tasksByStatus(col.key);
                const isDragOver = dragOverCol === col.key;

                return (
                  <div
                    key={col.key}
                    className={`kanban-col ${isDragOver ? 'drag-over' : ''}`}
                    onDragOver={(e) => handleDragOver(e, col.key)}
                    onDragLeave={(e) => {
                      if (e.currentTarget.contains(e.relatedTarget)) return;
                      setDragOverCol(null);
                    }}
                    onDrop={(e) => handleDrop(e, col.key)}
                  >
                    <div className="kanban-col-header">
                      <div className="kanban-col-title">
                        <span>{col.emoji}</span>
                        <span>{col.label}</span>
                      </div>
                      <span className="kanban-count">{colTasks.length}</span>
                    </div>

                    <div className="kanban-tasks">
                      {colTasks.length === 0 ? (
                        <div
                          className="empty-state"
                          style={{
                            padding: '1.5rem 0.5rem',
                            border: '1px dashed var(--border)',
                            borderRadius: 'var(--radius-sm)',
                          }}
                        >
                          <div className="empty-state-icon" style={{ fontSize: '1.4rem' }}>📭</div>
                          <p style={{ fontSize: '0.76rem' }}>Kéo nhiệm vụ thả vào đây</p>
                        </div>
                      ) : (
                        colTasks.map(task => (
                          <TaskCard
                            key={task.id}
                            task={task}
                            onEdit={handleEdit}
                            onDelete={handleDelete}
                            onStatusChange={handleStatusChange}
                            isDragging={draggingTaskId === task.id}
                            onDragStart={handleDragStart}
                            onDragEnd={handleDragEnd}
                          />
                        ))
                      )}
                    </div>

                    {/* Quick Inline Add input */}
                    <div style={{ marginTop: '0.75rem' }}>
                      {quickAddCol === col.key ? (
                        <form onSubmit={(e) => handleQuickAdd(e, col.key)}>
                          <input
                            type="text"
                            className="form-input"
                            style={{ fontSize: '0.82rem', padding: '0.45rem 0.65rem' }}
                            placeholder="Gõ tiêu đề và nhấn Enter..."
                            value={quickAddTitle}
                            onChange={e => setQuickAddTitle(e.target.value)}
                            autoFocus
                            disabled={quickAddLoading}
                          />
                          <div style={{ display: 'flex', gap: '0.35rem', marginTop: '0.35rem' }}>
                            <button
                              type="submit"
                              className="btn btn-primary btn-sm"
                              style={{ flex: 1, fontSize: '0.75rem' }}
                              disabled={quickAddLoading}
                            >
                              {quickAddLoading ? 'Đang thêm...' : 'Thêm'}
                            </button>
                            <button
                              type="button"
                              className="btn btn-ghost btn-sm"
                              onClick={() => {
                                setQuickAddCol(null);
                                setQuickAddTitle('');
                              }}
                            >
                              Hủy
                            </button>
                          </div>
                        </form>
                      ) : (
                        <button
                          className="quick-add-btn"
                          onClick={() => {
                            setQuickAddCol(col.key);
                            setQuickAddTitle('');
                          }}
                        >
                          ＋ Thêm nhanh...
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* Task Edit/Create Modal */}
      {showModal && (
        <TaskModal
          task={editTask}
          categories={categories}
          onClose={handleModalClose}
          onSave={handleModalSave}
        />
      )}

      {/* Analytics & Achievements Modal */}
      {showStatsModal && (
        <StatsModal
          stats={stats}
          tasks={tasks}
          categories={categories}
          streak={streak}
          onClose={() => setShowStatsModal(false)}
        />
      )}
    </div>
  );
}
