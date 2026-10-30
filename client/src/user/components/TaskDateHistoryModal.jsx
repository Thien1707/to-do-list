import { useState, useEffect } from 'react';
import api from '../services/api';
import toast from 'react-hot-toast';

const PRIORITY_LABELS = {
  low: { label: 'Thấp', color: '#10b981', bg: 'rgba(16, 185, 129, 0.12)' },
  medium: { label: 'Trung bình', color: '#3b82f6', bg: 'rgba(59, 130, 246, 0.12)' },
  high: { label: 'Cao', color: '#f59e0b', bg: 'rgba(245, 158, 11, 0.12)' },
  urgent: { label: 'Khẩn cấp', color: '#ef4444', bg: 'rgba(239, 68, 68, 0.12)' },
};

const STATUS_LABELS = {
  todo: { label: 'Cần làm', icon: '📋' },
  in_progress: { label: 'Đang làm', icon: '⚡' },
  done: { label: 'Hoàn thành', icon: '✅' },
  cancelled: { label: 'Đã hủy', icon: '❌' },
};

function formatDisplayDate(dateStr) {
  if (!dateStr) return '';
  const [y, m, d] = dateStr.split('-');
  return `${d}/${m}/${y}`;
}

export default function TaskDateHistoryModal({
  isOpen,
  onClose,
  initialDate,
  projectId = null,
  onViewTaskHistory,
  onEditTask,
}) {
  const [selectedDate, setSelectedDate] = useState(() => {
    if (initialDate) return initialDate;
    return new Date().toISOString().split('T')[0];
  });
  const [data, setData] = useState({ current_tasks: [], rescheduled_from_here: [] });
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') onClose();
    };
    if (isOpen) {
      window.addEventListener('keydown', handleKeyDown);
    }
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  useEffect(() => {
    if (!isOpen || !selectedDate) return;
    fetchDateHistory(selectedDate);
  }, [isOpen, selectedDate, projectId]);

  const fetchDateHistory = async (date) => {
    setLoading(true);
    try {
      const params = { date };
      if (projectId) params.project_id = projectId;
      const res = await api.get('/tasks/by-date', { params });
      setData(res.data.data || { current_tasks: [], rescheduled_from_here: [] });
    } catch {
      toast.error('Không thể tải lịch sử nhiệm vụ theo ngày');
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  const currentTasks = data.current_tasks || [];
  const rescheduledTasks = data.rescheduled_from_here || [];

  return (
    <div className="modal-overlay" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="modal animate-fadein" style={{ maxWidth: 'min(94vw, 840px)', maxHeight: '90vh', display: 'flex', flexDirection: 'column' }}>
        {/* Header */}
        <div className="modal-header" style={{ paddingBottom: '0.85rem' }}>
          <div>
            <h3 style={{ margin: 0, display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <span>📅</span>
              <span>Lịch sử Task theo ngày</span>
            </h3>
            <p style={{ margin: '0.25rem 0 0 0', fontSize: '0.8rem', color: 'var(--text-muted)' }}>
              Theo dõi công việc đã lên lịch cho ngày và truy vết các công việc đã được chuyển sang ngày khác
            </p>
          </div>
          <button className="btn-icon" onClick={onClose} title="Đóng">✕</button>
        </div>

        {/* Date Selector Bar */}
        <div
          style={{
            padding: '0.85rem 1.25rem',
            background: 'var(--bg-elevated)',
            borderBottom: '1px solid var(--border)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            flexWrap: 'wrap',
            gap: '0.75rem',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
            <span style={{ fontSize: '0.88rem', fontWeight: 600 }}>Chọn ngày:</span>
            <input
              type="date"
              className="form-input"
              value={selectedDate}
              onChange={e => setSelectedDate(e.target.value)}
              style={{ padding: '0.4rem 0.75rem', fontSize: '0.88rem', width: 'auto' }}
            />
            <button
              type="button"
              className="btn btn-ghost btn-sm"
              onClick={() => setSelectedDate(new Date().toISOString().split('T')[0])}
              style={{ fontSize: '0.78rem' }}
            >
              Hôm nay
            </button>
          </div>

          <div style={{ display: 'flex', gap: '0.75rem', fontSize: '0.82rem' }}>
            <span style={{ color: 'var(--text-secondary)' }}>
              Hiện tại: <strong style={{ color: 'var(--primary)' }}>{currentTasks.length}</strong> task
            </span>
            <span style={{ color: 'var(--text-muted)' }}>•</span>
            <span style={{ color: 'var(--text-secondary)' }}>
              Đã chuyển đi: <strong style={{ color: '#d97706' }}>{rescheduledTasks.length}</strong> task
            </span>
          </div>
        </div>

        {/* Modal Body */}
        <div className="modal-body" style={{ flex: 1, overflowY: 'auto', padding: '1.25rem', display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
          {loading ? (
            <div style={{ textAlign: 'center', padding: '3rem 1rem' }}>
              <div className="spinner" style={{ margin: '0 auto 1rem' }} />
              <p style={{ color: 'var(--text-muted)' }}>Đang tìm kiếm lịch sử nhiệm vụ ngày {formatDisplayDate(selectedDate)}...</p>
            </div>
          ) : (
            <>
              {/* SECTION 1: CURRENT TASKS ON THIS DATE */}
              <div>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.75rem' }}>
                  <h4 style={{ margin: 0, fontSize: '0.95rem', display: 'flex', alignItems: 'center', gap: '0.45rem' }}>
                    <span>📌</span>
                    <span>Công việc lên lịch cho ngày {formatDisplayDate(selectedDate)}</span>
                    <span className="badge" style={{ background: 'var(--bg-elevated)', border: '1px solid var(--border)' }}>
                      {currentTasks.length}
                    </span>
                  </h4>
                </div>

                {currentTasks.length === 0 ? (
                  <div
                    style={{
                      padding: '1.5rem',
                      textAlign: 'center',
                      background: 'var(--bg-elevated)',
                      border: '1px dashed var(--border)',
                      borderRadius: 'var(--radius)',
                      color: 'var(--text-muted)',
                      fontSize: '0.85rem',
                    }}
                  >
                    Chưa có nhiệm vụ nào được lên lịch cho ngày này.
                  </div>
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.65rem' }}>
                    {currentTasks.map(task => {
                      const prio = PRIORITY_LABELS[task.priority] || PRIORITY_LABELS.medium;
                      const stat = STATUS_LABELS[task.status] || STATUS_LABELS.todo;
                      const timeStr = task.start_time
                        ? `${task.start_time.slice(0, 5)}${task.end_time ? ` – ${task.end_time.slice(0, 5)}` : ''}`
                        : null;

                      return (
                        <div
                          key={task.id}
                          style={{
                            padding: '0.85rem 1rem',
                            background: 'var(--bg-elevated)',
                            border: '1px solid var(--border)',
                            borderRadius: 'var(--radius)',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'space-between',
                            gap: '0.75rem',
                            flexWrap: 'wrap',
                          }}
                        >
                          <div style={{ flex: 1, minWidth: '240px' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.35rem', flexWrap: 'wrap' }}>
                              <span style={{ fontWeight: 600, fontSize: '0.92rem', color: 'var(--text-primary)' }}>
                                {task.title}
                              </span>

                              {/* (Đã chỉnh sửa) badge requirement */}
                              {task.is_edited ? (
                                <span
                                  style={{
                                    fontSize: '0.72rem',
                                    padding: '0.12rem 0.45rem',
                                    borderRadius: '10px',
                                    background: 'rgba(245, 158, 11, 0.15)',
                                    color: '#d97706',
                                    border: '1px solid rgba(245, 158, 11, 0.3)',
                                    fontWeight: 600,
                                    cursor: 'pointer',
                                  }}
                                  onClick={() => onViewTaskHistory && onViewTaskHistory(task.id)}
                                  title="Bấm để xem lịch sử chỉnh sửa của task này"
                                >
                                  (Đã chỉnh sửa)
                                </span>
                              ) : null}
                            </div>

                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', flexWrap: 'wrap', fontSize: '0.78rem', color: 'var(--text-secondary)' }}>
                              {timeStr && (
                                <span style={{ display: 'inline-flex', alignItems: 'center', gap: '0.25rem', fontWeight: 500 }}>
                                  ⏰ {timeStr}
                                </span>
                              )}

                              <span
                                style={{
                                  display: 'inline-flex',
                                  alignItems: 'center',
                                  gap: '0.2rem',
                                  padding: '0.1rem 0.45rem',
                                  borderRadius: '4px',
                                  background: prio.bg,
                                  color: prio.color,
                                  fontWeight: 600,
                                }}
                              >
                                {prio.label}
                              </span>

                              {task.story_points !== null && task.story_points !== undefined && (
                                <span
                                  style={{
                                    display: 'inline-flex',
                                    alignItems: 'center',
                                    gap: '0.2rem',
                                    padding: '0.1rem 0.45rem',
                                    borderRadius: '4px',
                                    background: 'rgba(99, 102, 241, 0.1)',
                                    color: '#6366f1',
                                    fontWeight: 600,
                                  }}
                                >
                                  🎯 {task.story_points} SP
                                </span>
                              )}

                              <span style={{ display: 'inline-flex', alignItems: 'center', gap: '0.25rem' }}>
                                {stat.icon} {stat.label}
                              </span>

                              {task.lastEditor && (
                                <span style={{ color: 'var(--text-muted)' }}>
                                  • Sửa bởi: <em>{task.lastEditor.name}</em>
                                </span>
                              )}
                            </div>
                          </div>

                          <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                            {task.is_edited && (
                              <button
                                type="button"
                                className="btn btn-ghost btn-sm"
                                onClick={() => onViewTaskHistory && onViewTaskHistory(task.id)}
                                title="Xem so sánh Before/After của task này"
                                style={{ fontSize: '0.76rem', color: 'var(--primary)' }}
                              >
                                📜 Lịch sử
                              </button>
                            )}
                            <button
                              type="button"
                              className="btn btn-ghost btn-sm"
                              onClick={() => {
                                onClose();
                                if (onEditTask) onEditTask(task);
                              }}
                              title="Chỉnh sửa task này"
                              style={{ fontSize: '0.76rem' }}
                            >
                              ✏️ Chỉnh sửa
                            </button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>

              {/* SECTION 2: RESCHEDULED TASKS (Moved from this date to another date) */}
              <div>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.75rem' }}>
                  <h4 style={{ margin: 0, fontSize: '0.95rem', display: 'flex', alignItems: 'center', gap: '0.45rem' }}>
                    <span>🔄</span>
                    <span>Từng lên lịch cho ngày này nhưng đã chuyển sang ngày khác</span>
                    <span className="badge" style={{ background: 'rgba(245, 158, 11, 0.15)', color: '#d97706', border: '1px solid rgba(245, 158, 11, 0.3)' }}>
                      {rescheduledTasks.length}
                    </span>
                  </h4>
                </div>

                {rescheduledTasks.length === 0 ? (
                  <div
                    style={{
                      padding: '1.25rem',
                      textAlign: 'center',
                      background: 'var(--bg-elevated)',
                      border: '1px dashed var(--border)',
                      borderRadius: 'var(--radius)',
                      color: 'var(--text-muted)',
                      fontSize: '0.85rem',
                    }}
                  >
                    Không có công việc nào bị chuyển khỏi ngày này.
                  </div>
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.65rem' }}>
                    {rescheduledTasks.map(item => {
                      const task = item.task;
                      const stat = STATUS_LABELS[task.status] || STATUS_LABELS.todo;
                      const prio = PRIORITY_LABELS[task.priority] || PRIORITY_LABELS.medium;

                      return (
                        <div
                          key={`rescheduled-${task.id}-${item.rescheduled_at}`}
                          style={{
                            padding: '0.85rem 1rem',
                            background: 'rgba(245, 158, 11, 0.04)',
                            border: '1px solid rgba(245, 158, 11, 0.25)',
                            borderRadius: 'var(--radius)',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'space-between',
                            gap: '0.75rem',
                            flexWrap: 'wrap',
                          }}
                        >
                          <div style={{ flex: 1, minWidth: '240px' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.35rem', flexWrap: 'wrap' }}>
                              <span style={{ fontWeight: 600, fontSize: '0.92rem', color: 'var(--text-primary)' }}>
                                {task.title}
                              </span>
                              <span
                                style={{
                                  fontSize: '0.72rem',
                                  padding: '0.12rem 0.45rem',
                                  borderRadius: '10px',
                                  background: 'rgba(239, 68, 68, 0.1)',
                                  color: '#ef4444',
                                  fontWeight: 600,
                                }}
                              >
                                ↪️ Đã chuyển ngày
                              </span>
                            </div>

                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', flexWrap: 'wrap', fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
                              <span style={{ color: '#d97706', fontWeight: 600 }}>
                                Ngày mới: {task.due_date ? formatDisplayDate(task.due_date.slice(0, 10)) : 'Chưa đặt hạn'}
                              </span>

                              <span style={{ color: 'var(--text-muted)' }}>
                                • Chuyển bởi: <strong>{item.editor?.name || 'Thành viên'}</strong> ({new Date(item.rescheduled_at).toLocaleString('vi-VN')})
                              </span>

                              <span
                                style={{
                                  padding: '0.1rem 0.45rem',
                                  borderRadius: '4px',
                                  background: prio.bg,
                                  color: prio.color,
                                  fontWeight: 600,
                                }}
                              >
                                {prio.label}
                              </span>

                              <span style={{ display: 'inline-flex', alignItems: 'center', gap: '0.2rem' }}>
                                {stat.icon} {stat.label}
                              </span>
                            </div>
                          </div>

                          <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                            <button
                              type="button"
                              className="btn btn-primary btn-sm"
                              onClick={() => onViewTaskHistory && onViewTaskHistory(task.id)}
                              title="Xem so sánh Before/After của task này"
                              style={{ fontSize: '0.78rem' }}
                            >
                              📜 Xem lịch sử chi tiết
                            </button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </>
          )}
        </div>

        {/* Footer */}
        <div className="modal-footer" style={{ borderTop: '1px solid var(--border)', padding: '0.85rem 1.25rem', display: 'flex', justifyContent: 'flex-end' }}>
          <button type="button" className="btn btn-ghost" onClick={onClose}>
            Đóng
          </button>
        </div>
      </div>
    </div>
  );
}
