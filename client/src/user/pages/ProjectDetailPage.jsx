import { useState, useEffect, useCallback, useRef, lazy, Suspense } from 'react';
import { projectService } from '../services/projectService';
import { commentService } from '../services/projectService';
import { useAuth } from '../context/AuthContext';
import api from '../services/api';

const BurndownChart = lazy(() => import('../components/BurndownChart'));
import toast from 'react-hot-toast';
import ConfirmModal from '../components/ConfirmModal';
import TaskHistoryModal from '../components/TaskHistoryModal';
import TaskDateHistoryModal from '../components/TaskDateHistoryModal';

const STATUS_COLUMNS = [
  { key: 'todo', label: 'To Do', color: '#64748b', icon: '📋' },
  { key: 'in_progress', label: 'In Progress', color: '#3b82f6', icon: '⚡' },
  { key: 'done', label: 'Done', color: '#10b981', icon: '✅' },
  { key: 'cancelled', label: 'Cancelled', color: '#ef4444', icon: '✕' },
];

const PRIORITY_CONFIG = {
  urgent: { label: 'Urgent', color: '#ef4444', bg: '#fef2f2' },
  high: { label: 'High', color: '#f97316', bg: '#fff7ed' },
  medium: { label: 'Medium', color: '#3b82f6', bg: '#eff6ff' },
  low: { label: 'Low', color: '#10b981', bg: '#f0fdf4' },
};

// ── Task Detail Modal ──────────────────────────────────────────
// ── Task Detail Modal (Fully Editable) ──────────────────────────
// ── Task Detail Modal (Editable & Role-Aware) ───────────────────
function TaskDetailModal({ task, onClose, onUpdate, onDelete, projectMembers, sprints = [], canEdit = true }) {
  const [comments, setComments] = useState([]);
  const [activity, setActivity] = useState([]);
  const [newComment, setNewComment] = useState('');
  const [activeTab, setActiveTab] = useState('comments');
  const [editingComment, setEditingComment] = useState(null);
  const [editContent, setEditContent] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [showHistoryModal, setShowHistoryModal] = useState(false);
  const commentRef = useRef(null);

  // Edit states for task fields
  const [isEditingTitle, setIsEditingTitle] = useState(false);
  const [titleDraft, setTitleDraft] = useState(task.title || '');
  const [isEditingDesc, setIsEditingDesc] = useState(false);
  const [descDraft, setDescDraft] = useState(task.description || '');
  const [savingField, setSavingField] = useState(false);

  // In-app confirm modal states (Replaces window.confirm)
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [commentToDelete, setCommentToDelete] = useState(null);

  useEffect(() => {
    setTitleDraft(task.title || '');
    setDescDraft(task.description || '');
    setIsEditingTitle(false);
    setIsEditingDesc(false);
    loadComments();
    loadActivity();
  }, [task.id]);

  const loadComments = async () => {
    try {
      const { data } = await commentService.list(task.id);
      setComments(data.data.comments);
    } catch {}
  };

  const loadActivity = async () => {
    try {
      const { data } = await commentService.getActivity(task.id);
      setActivity(data.data.logs);
    } catch {}
  };

  const handleUpdateTaskField = async (fields, successMsg = 'Đã cập nhật nhiệm vụ') => {
    if (!canEdit) {
      toast.error('Bạn chỉ có quyền xem (Viewer), không thể chỉnh sửa');
      return;
    }
    setSavingField(true);
    try {
      const { data } = await api.put(`/tasks/${task.id}`, fields);
      const updated = data.data.task;
      if (onUpdate) onUpdate(updated);
      toast.success(successMsg);
      loadActivity();
      return updated;
    } catch (err) {
      toast.error(err.response?.data?.message || 'Cập nhật thất bại');
      throw err;
    } finally {
      setSavingField(false);
    }
  };

  const handleSaveTitle = async () => {
    if (!canEdit) return;
    const trimmed = titleDraft.trim();
    if (!trimmed) {
      toast.error('Tiêu đề không được để trống');
      return;
    }
    if (trimmed === task.title) {
      setIsEditingTitle(false);
      return;
    }
    await handleUpdateTaskField({ title: trimmed }, 'Đã đổi tên nhiệm vụ');
    setIsEditingTitle(false);
  };

  const handleSaveDescription = async () => {
    if (!canEdit) return;
    const trimmed = descDraft.trim();
    if (trimmed === (task.description || '')) {
      setIsEditingDesc(false);
      return;
    }
    await handleUpdateTaskField({ description: trimmed || null }, 'Đã cập nhật mô tả');
    setIsEditingDesc(false);
  };

  const confirmDeleteTask = async () => {
    try {
      await api.delete(`/tasks/${task.id}`);
      toast.success('Đã xóa nhiệm vụ thành công');
      setShowDeleteModal(false);
      if (onDelete) onDelete(task.id);
      onClose();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Xóa nhiệm vụ thất bại');
    }
  };

  const handleSubmitComment = async (e) => {
    e.preventDefault();
    if (!newComment.trim()) return;
    setSubmitting(true);
    try {
      const { data } = await commentService.create(task.id, newComment.trim());
      setComments(cs => [...cs, data.data.comment]);
      setNewComment('');
      loadActivity();
    } catch {
      toast.error('Gửi comment thất bại');
    } finally {
      setSubmitting(false);
    }
  };

  const handleEditComment = async (c) => {
    if (!editContent.trim()) return;
    try {
      const { data } = await commentService.update(task.id, c.id, editContent.trim());
      setComments(cs => cs.map(x => x.id === c.id ? data.data.comment : x));
      setEditingComment(null);
    } catch {
      toast.error('Cập nhật comment thất bại');
    }
  };

  const confirmDeleteComment = async () => {
    if (!commentToDelete) return;
    try {
      await commentService.remove(task.id, commentToDelete.id);
      setComments(cs => cs.filter(x => x.id !== commentToDelete.id));
      toast.success('Đã xóa comment');
      setCommentToDelete(null);
    } catch {
      toast.error('Xóa comment thất bại');
    }
  };

  const prio = PRIORITY_CONFIG[task.priority] || PRIORITY_CONFIG.medium;
  const initials = (user) => user?.name?.split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase() || '?';

  const getActivityIcon = (action) => {
    const icons = {
      created: '✨', status_changed: '🔄', updated: '✏️',
      commented: '💬', member_added: '👤', assigned: '👤',
    };
    return icons[action] || '📝';
  };

  return (
    <div className="modal-overlay" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="task-detail-modal animate-fadein">
        {/* Header */}
        <div className="task-detail-header">
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', flex: 1, minWidth: 0 }}>
            <span style={{ fontSize: '1.4rem' }}>
              {STATUS_COLUMNS.find(s => s.key === task.status)?.icon}
            </span>
            <div style={{ flex: 1, minWidth: 0 }}>
              {canEdit && isEditingTitle ? (
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <input
                    type="text"
                    className="form-input"
                    value={titleDraft}
                    onChange={e => setTitleDraft(e.target.value)}
                    onKeyDown={e => {
                      if (e.key === 'Enter') handleSaveTitle();
                      if (e.key === 'Escape') { setTitleDraft(task.title); setIsEditingTitle(false); }
                    }}
                    autoFocus
                    style={{ fontSize: '1.05rem', fontWeight: 700, padding: '0.35rem 0.6rem' }}
                  />
                  <button
                    className="btn btn-primary"
                    style={{ padding: '0.35rem 0.75rem', fontSize: '0.8rem', whiteSpace: 'nowrap' }}
                    onClick={handleSaveTitle}
                    disabled={savingField}
                  >
                    Lưu
                  </button>
                  <button
                    className="btn btn-ghost"
                    style={{ padding: '0.35rem 0.75rem', fontSize: '0.8rem', whiteSpace: 'nowrap' }}
                    onClick={() => { setTitleDraft(task.title); setIsEditingTitle(false); }}
                  >
                    Hủy
                  </button>
                </div>
              ) : (
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap' }}>
                  <h2
                    style={{ margin: 0, fontSize: '1.1rem', fontWeight: 700, cursor: canEdit ? 'pointer' : 'default' }}
                    onClick={() => canEdit && setIsEditingTitle(true)}
                    title={canEdit ? 'Bấm để chỉnh sửa tên nhiệm vụ' : undefined}
                  >
                    {task.title}
                  </h2>
                  {canEdit && (
                    <button
                      className="btn-icon-xs"
                      onClick={() => setIsEditingTitle(true)}
                      title="Chỉnh sửa tên"
                      style={{ opacity: 0.7 }}
                    >
                      ✏️
                    </button>
                  )}
                  {!canEdit && (
                    <span className="project-role-badge viewer" style={{ fontSize: '0.68rem', padding: '0.1rem 0.45rem' }}>
                      👁️ Chỉ xem
                    </span>
                  )}
                  {task.is_edited && (
                    <span
                      onClick={() => setShowHistoryModal(true)}
                      style={{
                        fontSize: '0.72rem',
                        padding: '0.12rem 0.5rem',
                        borderRadius: '12px',
                        background: 'rgba(245, 158, 11, 0.15)',
                        color: '#d97706',
                        fontWeight: 600,
                        border: '1px solid rgba(245, 158, 11, 0.3)',
                        cursor: 'pointer',
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '0.2rem',
                      }}
                      title="Bấm để xem lịch sử chỉnh sửa chi tiết"
                    >
                      ✏️ (Đã chỉnh sửa • {task.edit_count || 1} lần)
                    </span>
                  )}
                  {task.Category && (
                    <span className="task-category-badge" style={{ '--cat-color': task.Category.color }}>
                      {task.Category.name}
                    </span>
                  )}
                </div>
              )}
            </div>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <button
              type="button"
              className="btn btn-ghost btn-sm"
              onClick={() => setShowHistoryModal(true)}
              style={{ fontSize: '0.78rem', color: 'var(--primary)', border: '1px solid var(--border)' }}
              title="Xem toàn bộ lịch sử chỉnh sửa của task này"
            >
              📜 Lịch sử {task.edit_count > 0 ? `(${task.edit_count})` : ''}
            </button>
            <button className="btn-icon" onClick={onClose} title="Đóng">✕</button>
          </div>
        </div>

        <div className="task-detail-body">
          {/* Left panel: details */}
          <div className="task-detail-left">
            {/* Description Section */}
            <div className="task-detail-section">
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
                <h4 style={{ margin: 0 }}>📝 Mô tả nhiệm vụ</h4>
                {canEdit && !isEditingDesc && (
                  <button
                    className="btn-link-sm"
                    onClick={() => { setDescDraft(task.description || ''); setIsEditingDesc(true); }}
                    style={{ fontSize: '0.78rem', color: 'var(--primary)', background: 'none', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '0.25rem' }}
                  >
                    ✏️ {task.description ? 'Chỉnh sửa' : '+ Thêm mô tả'}
                  </button>
                )}
              </div>

              {canEdit && isEditingDesc ? (
                <div className="task-desc-editor">
                  <textarea
                    className="form-input"
                    rows={4}
                    value={descDraft}
                    onChange={e => setDescDraft(e.target.value)}
                    placeholder="Nhập mô tả chi tiết công việc, yêu cầu kỹ thuật, tài liệu đính kèm..."
                    autoFocus
                    style={{ fontSize: '0.88rem', lineHeight: 1.6 }}
                  />
                  <div style={{ display: 'flex', gap: '0.5rem', marginTop: '0.5rem' }}>
                    <button
                      className="btn btn-primary"
                      style={{ padding: '0.35rem 0.85rem', fontSize: '0.82rem' }}
                      onClick={handleSaveDescription}
                      disabled={savingField}
                    >
                      💾 Lưu mô tả
                    </button>
                    <button
                      className="btn btn-ghost"
                      style={{ padding: '0.35rem 0.85rem', fontSize: '0.82rem' }}
                      onClick={() => setIsEditingDesc(false)}
                    >
                      Hủy
                    </button>
                  </div>
                </div>
              ) : (
                <div
                  className="task-desc-preview"
                  onClick={() => canEdit && (setDescDraft(task.description || ''), setIsEditingDesc(true))}
                  style={{
                    cursor: canEdit ? 'pointer' : 'default',
                    padding: '0.85rem 1rem',
                    borderRadius: 'var(--radius-sm)',
                    background: 'var(--bg-elevated)',
                    border: canEdit ? '1px dashed var(--border)' : '1px solid var(--border)',
                    minHeight: '60px',
                    color: task.description ? 'var(--text-secondary)' : 'var(--text-muted)',
                    fontStyle: task.description ? 'normal' : 'italic',
                    lineHeight: 1.6,
                    whiteSpace: 'pre-wrap',
                    fontSize: '0.88rem',
                  }}
                  title={canEdit ? 'Bấm để chỉnh sửa mô tả' : undefined}
                >
                  {task.description || (canEdit ? 'Chưa có mô tả chi tiết. Bấm vào đây để thêm mô tả cho nhiệm vụ...' : 'Chưa có mô tả chi tiết.')}
                </div>
              )}
            </div>

            {/* Tabs */}
            <div className="task-detail-tabs">
              <button
                className={`tab-btn ${activeTab === 'comments' ? 'active' : ''}`}
                onClick={() => setActiveTab('comments')}
              >
                💬 Comments ({comments.length})
              </button>
              <button
                className={`tab-btn ${activeTab === 'activity' ? 'active' : ''}`}
                onClick={() => setActiveTab('activity')}
              >
                📜 Activity
              </button>
            </div>

            {activeTab === 'comments' && (
              <div className="task-comments">
                {comments.map(c => (
                  <div key={c.id} className="comment-item">
                    <div className="comment-avatar">
                      {c.author?.avatar_url
                        ? <img src={c.author.avatar_url} alt={c.author.name} />
                        : initials(c.author)
                      }
                    </div>
                    <div className="comment-body">
                      <div className="comment-meta">
                        <strong>{c.author?.name || 'Unknown'}</strong>
                        <span className="comment-time">
                          {new Date(c.createdAt).toLocaleString('vi-VN')}
                        </span>
                        {canEdit && (
                          <div className="comment-actions">
                            <button
                              className="btn-icon-xs"
                              onClick={() => { setEditingComment(c.id); setEditContent(c.content); }}
                              title="Sửa"
                            >✏️</button>
                            <button className="btn-icon-xs" onClick={() => setCommentToDelete(c)} title="Xóa">🗑️</button>
                          </div>
                        )}
                      </div>
                      {editingComment === c.id ? (
                        <div>
                          <textarea
                            className="form-input"
                            value={editContent}
                            onChange={e => setEditContent(e.target.value)}
                            rows={3}
                            autoFocus
                          />
                          <div style={{ display: 'flex', gap: '0.5rem', marginTop: '0.5rem' }}>
                            <button className="btn btn-primary" style={{ padding: '0.3rem 0.8rem', fontSize: '0.8rem' }} onClick={() => handleEditComment(c)}>Lưu</button>
                            <button className="btn btn-ghost" style={{ padding: '0.3rem 0.8rem', fontSize: '0.8rem' }} onClick={() => setEditingComment(null)}>Hủy</button>
                          </div>
                        </div>
                      ) : (
                        <p className="comment-content">{c.content}</p>
                      )}
                    </div>
                  </div>
                ))}

                <form onSubmit={handleSubmitComment} className="comment-form">
                  <textarea
                    ref={commentRef}
                    className="form-input"
                    placeholder="Thêm comment..."
                    value={newComment}
                    onChange={e => setNewComment(e.target.value)}
                    rows={3}
                  />
                  <button
                    type="submit"
                    className="btn btn-primary"
                    disabled={submitting || !newComment.trim()}
                  >
                    {submitting ? '⏳' : '💬 Gửi'}
                  </button>
                </form>
              </div>
            )}

            {activeTab === 'activity' && (
              <div className="task-activity">
                {activity.length === 0 ? (
                  <p style={{ color: 'var(--text-muted)', textAlign: 'center', padding: '1rem' }}>Chưa có hoạt động nào</p>
                ) : (
                  activity.map(log => (
                    <div key={log.id} className="activity-item">
                      <div className="activity-icon">{getActivityIcon(log.action)}</div>
                      <div className="activity-content">
                        <strong>{log.actor?.name || 'System'}</strong>
                        {' '}
                        {log.action === 'status_changed' && (
                          <span>đổi trạng thái từ <em>{log.old_value}</em> → <em>{log.new_value}</em></span>
                        )}
                        {log.action === 'updated' && (
                          <span>cập nhật <em>{log.field_name}</em>: {log.old_value} → {log.new_value}</span>
                        )}
                        {log.action === 'created' && <span>tạo task này</span>}
                        {log.action === 'commented' && <span>đã comment</span>}
                        <div className="activity-time">{new Date(log.createdAt).toLocaleString('vi-VN')}</div>
                      </div>
                    </div>
                  ))
                )}
              </div>
            )}
          </div>

          {/* Right panel: properties */}
          <div className="task-detail-right">
            <div className="task-detail-props">
              {/* Trạng thái */}
              <div className="task-prop">
                <span className="task-prop-label">Trạng thái</span>
                <select
                  className="form-input"
                  value={task.status}
                  disabled={!canEdit}
                  onChange={e => handleUpdateTaskField({ status: e.target.value }, 'Đã cập nhật trạng thái')}
                  style={{ fontSize: '0.85rem' }}
                >
                  {STATUS_COLUMNS.map(s => (
                    <option key={s.key} value={s.key}>{s.icon} {s.label}</option>
                  ))}
                </select>
              </div>

              {/* Ưu tiên */}
              <div className="task-prop">
                <span className="task-prop-label">Độ ưu tiên</span>
                <select
                  className="form-input"
                  value={task.priority || 'medium'}
                  disabled={!canEdit}
                  onChange={e => handleUpdateTaskField({ priority: e.target.value }, 'Đã đổi mức ưu tiên')}
                  style={{ fontSize: '0.85rem' }}
                >
                  <option value="low">🟢 Low (Thấp)</option>
                  <option value="medium">🔵 Medium (Bình thường)</option>
                  <option value="high">🟠 High (Cao)</option>
                  <option value="urgent">🔴 Urgent (Khẩn cấp)</option>
                </select>
              </div>

              {/* Sprint */}
              <div className="task-prop">
                <span className="task-prop-label">Sprint</span>
                <select
                  className="form-input"
                  value={task.sprint_id || ''}
                  disabled={!canEdit}
                  onChange={e => {
                    const nextSprintId = e.target.value ? parseInt(e.target.value, 10) : null;
                    handleUpdateTaskField(
                      { sprint_id: nextSprintId },
                      nextSprintId ? 'Đã gán vào Sprint' : 'Đã đưa về Backlog'
                    );
                  }}
                  style={{ fontSize: '0.85rem' }}
                >
                  <option value="">📦 Backlog (Không sprint)</option>
                  {sprints.map(s => (
                    <option key={s.id} value={s.id}>
                      {s.status === 'active' ? '🟢' : s.status === 'completed' ? '🏁' : '📋'} {s.name}
                    </option>
                  ))}
                </select>
              </div>

              {/* Deadline */}
              <div className="task-prop">
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span className="task-prop-label" style={{ marginBottom: 0 }}>Hạn chót (Deadline)</span>
                  {canEdit && task.due_date && (
                    <button
                      type="button"
                      className="btn-link-sm"
                      onClick={() => handleUpdateTaskField({ due_date: null }, 'Đã xóa deadline')}
                      style={{ fontSize: '0.72rem', color: '#ef4444', background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}
                      title="Xóa hạn chót"
                    >
                      ✕ Xóa
                    </button>
                  )}
                </div>
                <input
                  type="date"
                  className="form-input"
                  value={task.due_date ? String(task.due_date).slice(0, 10) : ''}
                  disabled={!canEdit}
                  onChange={e => handleUpdateTaskField({ due_date: e.target.value || null }, 'Đã cập nhật deadline')}
                  style={{ fontSize: '0.85rem', marginTop: '0.35rem' }}
                />
              </div>

              {/* Story Points */}
              <div className="task-prop">
                <span className="task-prop-label">Story Points</span>
                <select
                  className="form-input"
                  value={task.story_points ?? ''}
                  disabled={!canEdit}
                  onChange={e => {
                    if (!canEdit) return;
                    const raw = e.target.value ? parseInt(e.target.value, 10) : null;
                    handleUpdateTaskField({ story_points: raw }, 'Đã cập nhật Story Points');
                  }}
                  style={{ fontSize: '0.85rem' }}
                >
                  <option value="">— Chưa ước tính —</option>
                  {[1, 2, 3, 5, 8, 13].map(sp => (
                    <option key={sp} value={sp}>🎯 {sp} SP</option>
                  ))}
                </select>
              </div>

              {/* Thời gian thực hiện (Giờ bắt đầu - Giờ kết thúc) */}
              <div className="task-prop">
                <span className="task-prop-label">Giờ thực hiện</span>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.4rem' }}>
                  <div>
                    <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>Bắt đầu</span>
                    <input
                      type="time"
                      className="form-input"
                      value={task.start_time ? String(task.start_time).slice(0, 5) : ''}
                      disabled={!canEdit}
                      onChange={e => handleUpdateTaskField({ start_time: e.target.value || null }, 'Đã cập nhật giờ bắt đầu')}
                      style={{ fontSize: '0.82rem' }}
                    />
                  </div>
                  <div>
                    <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>Kết thúc</span>
                    <input
                      type="time"
                      className="form-input"
                      value={task.end_time ? String(task.end_time).slice(0, 5) : ''}
                      disabled={!canEdit}
                      onChange={e => handleUpdateTaskField({ end_time: e.target.value || null }, 'Đã cập nhật giờ kết thúc')}
                      style={{ fontSize: '0.82rem' }}
                    />
                  </div>
                </div>
              </div>

              {/* Người thực hiện (Assignee) */}
              <div className="task-prop">
                <span className="task-prop-label">Người thực hiện</span>
                <select
                  className="form-input"
                  value={task.assignee_id || ''}
                  disabled={!canEdit}
                  onChange={e => {
                    const nextUserId = e.target.value ? parseInt(e.target.value, 10) : null;
                    handleUpdateTaskField({ assignee_id: nextUserId }, 'Đã phân công người thực hiện');
                  }}
                  style={{ fontSize: '0.85rem' }}
                >
                  <option value="">— Chưa gán —</option>
                  {projectMembers.map(m => (
                    <option key={m.user?.id} value={m.user?.id}>{m.user?.name}</option>
                  ))}
                </select>
              </div>

              {task.assignee && (
                <div className="task-prop">
                  <span className="task-prop-label">Đang giao cho</span>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <div className="member-avatar-sm">
                      {task.assignee.avatar_url
                        ? <img src={task.assignee.avatar_url} alt={task.assignee.name} />
                        : initials(task.assignee)
                      }
                    </div>
                    <span style={{ fontSize: '0.85rem' }}>{task.assignee.name}</span>
                  </div>
                </div>
              )}

              {/* Delete Task Action (Hidden for viewers) */}
              {canEdit && (
                <div style={{ marginTop: '1.25rem', paddingTop: '1rem', borderTop: '1px solid var(--border)' }}>
                  <button
                    type="button"
                    className="btn btn-ghost"
                    onClick={() => setShowDeleteModal(true)}
                    style={{
                      width: '100%',
                      color: '#ef4444',
                      justifyContent: 'center',
                      fontSize: '0.82rem',
                      border: '1px solid rgba(239, 68, 68, 0.25)',
                      background: 'rgba(239, 68, 68, 0.05)',
                    }}
                    title="Xóa vĩnh viễn nhiệm vụ này"
                  >
                    🗑️ Xóa nhiệm vụ này
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Delete Task Confirm Modal */}
        {showDeleteModal && (
          <ConfirmModal
            isOpen={showDeleteModal}
            title="Xác nhận xóa nhiệm vụ"
            message={`Bạn có chắc muốn xóa nhiệm vụ "${task.title}"?\nHành động này không thể hoàn tác.`}
            confirmText="🗑️ Xóa nhiệm vụ"
            cancelText="Hủy bỏ"
            variant="danger"
            icon="🗑️"
            onConfirm={confirmDeleteTask}
            onClose={() => setShowDeleteModal(false)}
          />
        )}

        {/* Delete Comment Confirm Modal */}
        {commentToDelete && (
          <ConfirmModal
            isOpen={!!commentToDelete}
            title="Xác nhận xóa bình luận"
            message="Bạn có chắc chắn muốn xóa bình luận này không?"
            confirmText="Xóa bình luận"
            cancelText="Hủy bỏ"
            variant="danger"
            icon="💬"
            onConfirm={confirmDeleteComment}
            onClose={() => setCommentToDelete(null)}
          />
        )}

        {/* Task Edit History Modal */}
        {showHistoryModal && (
          <TaskHistoryModal
            taskId={task.id}
            onClose={() => setShowHistoryModal(false)}
          />
        )}
      </div>
    </div>
  );
}

// ── Kanban Card ────────────────────────────────────────────────
function KanbanCard({ task, onDragStart, onClick, canEdit = true }) {
  const prio = PRIORITY_CONFIG[task.priority] || PRIORITY_CONFIG.medium;
  const isOverdue = task.due_date && new Date(task.due_date) < new Date() && task.status !== 'done';
  const initials = (user) => user?.name?.split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase() || '?';

  return (
    <div
      className="kanban-card"
      draggable={canEdit}
      onDragStart={canEdit ? (e => onDragStart(e, task)) : undefined}
      onClick={() => onClick(task)}
      style={{ cursor: canEdit ? 'grab' : 'pointer' }}
    >
      {task.Category && (
        <div className="kanban-card-tag" style={{ '--cat-color': task.Category.color }}>
          {task.Category.name}
        </div>
      )}
      <p className="kanban-card-title">{task.title}</p>
      <div className="kanban-card-footer">
        <div style={{ display: 'flex', gap: '0.35rem', alignItems: 'center', flexWrap: 'wrap' }}>
          <span className="priority-dot" style={{ '--p-color': prio.color }} title={prio.label} />
          {task.due_date && (
            <span className={`due-badge ${isOverdue ? 'overdue' : ''}`} style={{ display: 'inline-flex', alignItems: 'center', gap: '0.2rem' }}>
              📅 {new Date(task.due_date).toLocaleDateString('vi-VN', { month: 'short', day: 'numeric' })}
              {task.is_edited && (
                <span style={{ color: '#d97706', fontWeight: 700, fontSize: '0.68rem', marginLeft: '0.1rem' }} title="Đã chỉnh sửa">
                  (Đã chỉnh sửa)
                </span>
              )}
            </span>
          )}
          {!task.due_date && task.is_edited && (
            <span style={{ color: '#d97706', fontWeight: 600, fontSize: '0.68rem', background: 'rgba(245, 158, 11, 0.12)', padding: '0.1rem 0.35rem', borderRadius: '4px' }}>
              (Đã chỉnh sửa)
            </span>
          )}
          {task.start_time && (
            <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>
              ⏰ {task.start_time.slice(0, 5)}{task.end_time ? `-${task.end_time.slice(0, 5)}` : ''}
            </span>
          )}
          {task.story_points && (
            <span className="sp-badge-sm">{task.story_points} SP</span>
          )}
        </div>
        {task.assignee && (
          <div className="member-avatar-sm" title={task.assignee.name}>
            {task.assignee.avatar_url
              ? <img src={task.assignee.avatar_url} alt={task.assignee.name} />
              : initials(task.assignee)
            }
          </div>
        )}
      </div>
    </div>
  );
}

// ── Kanban Column ──────────────────────────────────────────────
function KanbanColumn({ col, tasks, onDragStart, onDrop, onCardClick, canEdit = true }) {
  const [isDragOver, setIsDragOver] = useState(false);

  return (
    <div
      className={`kanban-column ${isDragOver ? 'drag-over' : ''}`}
      onDragOver={e => {
        if (!canEdit) return;
        e.preventDefault();
        setIsDragOver(true);
      }}
      onDragLeave={() => setIsDragOver(false)}
      onDrop={e => {
        setIsDragOver(false);
        if (!canEdit) return;
        onDrop(e, col.key);
      }}
    >
      <div className="kanban-column-header">
        <div className="kanban-col-title">
          <span style={{ color: col.color }}>{col.icon}</span>
          <span>{col.label}</span>
        </div>
        <span className="kanban-count">{tasks.length}</span>
      </div>
      <div className="kanban-cards">
        {tasks.map(t => (
          <KanbanCard
            key={t.id}
            task={t}
            canEdit={canEdit}
            onDragStart={onDragStart}
            onClick={onCardClick}
          />
        ))}
        {tasks.length === 0 && (
          <div className="kanban-empty-col">
            <span style={{ fontSize: '1.5rem', opacity: 0.3 }}>{col.icon}</span>
            <span>Không có task</span>
          </div>
        )}
      </div>
    </div>
  );
}

// ── Board View ─────────────────────────────────────────────────
function BoardView({ project, tasks, setTasks, sprints = [], setSprints, projectMembers, onSync, onSwitchToBacklog, canEdit = true, isViewer = false }) {
  const [draggedTask, setDraggedTask] = useState(null);
  const [selectedTask, setSelectedTask] = useState(null);
  const [sprintFilter, setSprintFilter] = useState('active'); // 'active' | 'all' | 'backlog' | sprintId
  const [syncing, setSyncing] = useState(false);

  const activeSprint = sprints.find(s => s.status === 'active');

  // Filter tasks based on current sprint view
  const currentSprint = sprintFilter === 'active'
    ? activeSprint
    : sprintFilter === 'all' || sprintFilter === 'backlog'
      ? null
      : sprints.find(s => String(s.id) === String(sprintFilter));

  const filteredTasks = tasks.filter(task => {
    if (sprintFilter === 'active') {
      return activeSprint ? task.sprint_id === activeSprint.id : true;
    }
    if (sprintFilter === 'all') return true;
    if (sprintFilter === 'backlog') return !task.sprint_id;
    return task.sprint_id === parseInt(sprintFilter, 10);
  });

  const handleDragStart = (e, task) => {
    if (!canEdit) return;
    setDraggedTask(task);
    e.dataTransfer.effectAllowed = 'move';
  };

  const handleDrop = async (e, newStatus) => {
    e.preventDefault();
    if (!canEdit) {
      toast.error('Bạn chỉ có quyền xem (Viewer), không thể di chuyển nhiệm vụ.');
      return;
    }
    if (!draggedTask || draggedTask.status === newStatus) return;

    const oldStatus = draggedTask.status;
    setTasks(ts => ts.map(t => t.id === draggedTask.id ? { ...t, status: newStatus } : t));

    try {
      await api.patch(`/tasks/${draggedTask.id}/status`, { status: newStatus });
      toast.success(`Task "${draggedTask.title.slice(0, 30)}" → ${STATUS_COLUMNS.find(c => c.key === newStatus)?.label}`);
    } catch {
      setTasks(ts => ts.map(t => t.id === draggedTask.id ? { ...t, status: oldStatus } : t));
      toast.error('Cập nhật thất bại');
    }
    setDraggedTask(null);
  };

  const handleManualSync = async () => {
    if (!onSync) return;
    setSyncing(true);
    try {
      await onSync();
      toast.success('🔄 Dữ liệu Board đã được đồng bộ mới nhất');
    } catch {
      toast.error('Đồng bộ dữ liệu thất bại');
    } finally {
      setSyncing(false);
    }
  };

  const handleDeleteTask = (taskId) => {
    setTasks(ts => ts.filter(t => t.id !== taskId));
    setSelectedTask(null);
  };

  const grouped = STATUS_COLUMNS.reduce((acc, col) => {
    acc[col.key] = filteredTasks.filter(t => t.status === col.key);
    return acc;
  }, {});

  // Progress metrics for currently viewed sprint
  const sprintTasks = currentSprint ? tasks.filter(t => t.sprint_id === currentSprint.id) : [];
  const doneSprintTasks = sprintTasks.filter(t => t.status === 'done');
  const sprintProgress = sprintTasks.length > 0 ? Math.round((doneSprintTasks.length / sprintTasks.length) * 100) : 0;
  const sprintTotalSp = sprintTasks.reduce((sum, t) => sum + (t.story_points || 0), 0);
  const sprintDoneSp = doneSprintTasks.reduce((sum, t) => sum + (t.story_points || 0), 0);

  return (
    <div className="board-view-wrapper" style={{ display: 'flex', flexDirection: 'column', height: '100%', gap: '0.75rem' }}>
      {/* Viewer Notice Banner */}
      {isViewer && (
        <div className="viewer-notice-banner" style={{
          display: 'flex',
          alignItems: 'center',
          gap: '0.65rem',
          padding: '0.65rem 1.15rem',
          background: 'rgba(59, 130, 246, 0.08)',
          border: '1px solid rgba(59, 130, 246, 0.25)',
          borderRadius: 'var(--radius)',
          fontSize: '0.84rem',
          color: 'var(--text-secondary)'
        }}>
          <span style={{ fontSize: '1.15rem' }}>👁️</span>
          <span><strong>Vai trò Người xem (Viewer):</strong> Bạn chỉ có quyền theo dõi bảng nhiệm vụ, không thể kéo thả di chuyển task sang Done hay chỉnh sửa nội dung.</span>
        </div>
      )}

      {/* Board Top Toolbar */}
      <div className="board-toolbar" style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        flexWrap: 'wrap',
        gap: '0.75rem',
        padding: '0.6rem 1rem',
        background: 'var(--bg-card)',
        borderRadius: 'var(--radius)',
        border: '1px solid var(--border)'
      }}>
        {/* Sprint View Filter Pills */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap' }}>
          <span style={{ fontSize: '0.78rem', fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase' }}>
            Hiển thị:
          </span>
          {activeSprint && (
            <button
              className={`btn ${sprintFilter === 'active' ? 'btn-primary' : 'btn-ghost'}`}
              style={{ padding: '0.3rem 0.75rem', fontSize: '0.8rem', display: 'flex', alignItems: 'center', gap: '0.35rem' }}
              onClick={() => setSprintFilter('active')}
            >
              <span style={{ width: 8, height: 8, borderRadius: '50%', background: '#10b981', display: 'inline-block' }} />
              Sprint hiện tại: {activeSprint.name}
            </button>
          )}
          <button
            className={`btn ${sprintFilter === 'all' ? 'btn-primary' : 'btn-ghost'}`}
            style={{ padding: '0.3rem 0.75rem', fontSize: '0.8rem' }}
            onClick={() => setSprintFilter('all')}
          >
            📋 Tất cả ({tasks.length})
          </button>
          <button
            className={`btn ${sprintFilter === 'backlog' ? 'btn-primary' : 'btn-ghost'}`}
            style={{ padding: '0.3rem 0.75rem', fontSize: '0.8rem' }}
            onClick={() => setSprintFilter('backlog')}
          >
            📦 Chỉ Backlog ({tasks.filter(t => !t.sprint_id).length})
          </button>

          {sprints.length > 0 && (
            <select
              className="form-input"
              value={['active', 'all', 'backlog'].includes(sprintFilter) ? '' : sprintFilter}
              onChange={e => { if (e.target.value) setSprintFilter(e.target.value); }}
              style={{ fontSize: '0.8rem', padding: '0.3rem 0.6rem', width: 'auto' }}
            >
              <option value="" disabled>— Chọn Sprint khác —</option>
              {sprints.map(s => (
                <option key={s.id} value={s.id}>
                  {s.status === 'active' ? '🟢' : s.status === 'completed' ? '🏁' : '📋'} {s.name} ({tasks.filter(t => t.sprint_id === s.id).length} tasks)
                </option>
              ))}
            </select>
          )}
        </div>

        {/* Action Controls */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <button
            className="btn btn-ghost"
            style={{ padding: '0.3rem 0.75rem', fontSize: '0.8rem', display: 'flex', alignItems: 'center', gap: '0.35rem' }}
            onClick={handleManualSync}
            disabled={syncing}
            title="Đồng bộ dữ liệu tasks và sprints từ server"
          >
            <span style={{ display: 'inline-block', transform: syncing ? 'rotate(360deg)' : 'none', transition: 'transform 0.5s linear' }}>🔄</span>
            {syncing ? 'Đang đồng bộ...' : 'Đồng bộ'}
          </button>
          {onSwitchToBacklog && (
            <button
              className="btn btn-ghost"
              style={{ padding: '0.3rem 0.75rem', fontSize: '0.8rem' }}
              onClick={onSwitchToBacklog}
            >
              📦 Quản lý Backlog
            </button>
          )}
        </div>
      </div>

      {/* Active / Current Sprint Banner */}
      {currentSprint && (
        <div className="board-sprint-banner" style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          flexWrap: 'wrap',
          gap: '1rem',
          padding: '0.85rem 1.25rem',
          background: 'linear-gradient(135deg, rgba(59, 130, 246, 0.08) 0%, rgba(16, 185, 129, 0.08) 100%)',
          borderRadius: 'var(--radius)',
          border: '1px solid rgba(59, 130, 246, 0.25)',
        }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
              <span style={{ fontSize: '1.1rem' }}>🏃</span>
              <strong style={{ fontSize: '0.95rem' }}>{currentSprint.name}</strong>
              <span className={`sprint-status-badge sprint-${currentSprint.status}`}>
                {currentSprint.status === 'active' ? '🟢 Đang diễn ra' : currentSprint.status === 'completed' ? '🏁 Đã xong' : '📋 Kế hoạch'}
              </span>
            </div>
            {currentSprint.goal && (
              <p style={{ margin: '0.2rem 0 0', fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
                🎯 Mục tiêu: {currentSprint.goal}
              </p>
            )}
            {(currentSprint.start_date || currentSprint.end_date) && (
              <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', display: 'block', marginTop: '0.2rem' }}>
                📅 {currentSprint.start_date ? new Date(currentSprint.start_date).toLocaleDateString('vi-VN') : '...'} → {currentSprint.end_date ? new Date(currentSprint.end_date).toLocaleDateString('vi-VN') : '...'}
              </span>
            )}
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '1.25rem', minWidth: '220px' }}>
            <div style={{ flex: 1 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.75rem', marginBottom: '0.3rem', color: 'var(--text-muted)' }}>
                <span>Tiến độ: {sprintProgress}%</span>
                <span>{doneSprintTasks.length}/{sprintTasks.length} tasks ({sprintDoneSp}/{sprintTotalSp} SP)</span>
              </div>
              <div style={{ height: 6, background: 'var(--border)', borderRadius: 99, overflow: 'hidden' }}>
                <div style={{
                  height: '100%',
                  width: `${sprintProgress}%`,
                  background: 'linear-gradient(90deg, #3b82f6, #10b981)',
                  borderRadius: 99,
                  transition: 'width 0.3s ease'
                }} />
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Kanban Board Grid */}
      <div className="kanban-board" style={{ flex: 1 }}>
        {STATUS_COLUMNS.map(col => (
          <KanbanColumn
            key={col.key}
            col={col}
            tasks={grouped[col.key] || []}
            canEdit={canEdit}
            onDragStart={handleDragStart}
            onDrop={handleDrop}
            onCardClick={task => setSelectedTask(task)}
          />
        ))}
        {selectedTask && (
          <TaskDetailModal
            task={selectedTask}
            projectMembers={projectMembers}
            sprints={sprints}
            canEdit={canEdit}
            onClose={() => setSelectedTask(null)}
            onUpdate={updated => {
              setTasks(ts => ts.map(t => t.id === updated.id ? { ...t, ...updated } : t));
              setSelectedTask(s => s ? { ...s, ...updated } : null);
            }}
            onDelete={handleDeleteTask}
          />
        )}
      </div>
    </div>
  );
}

// ── Backlog View (Flexible Sprint Management & Confirmation Sync) ──
function BacklogView({ project, tasks, setTasks, sprints, setSprints, projectMembers, onSprintCreated, onSync, onSwitchToBoard, canEdit = true, isViewer = false }) {
  const [showSprintModal, setShowSprintModal] = useState(false);
  const [sprintForm, setSprintForm] = useState({ name: '', goal: '', start_date: '', end_date: '' });
  const [editingSprint, setEditingSprint] = useState(null);
  const [selectedTask, setSelectedTask] = useState(null);
  const [syncing, setSyncing] = useState(false);
  const [sprintConfirmAction, setSprintConfirmAction] = useState(null);

  const backlog = tasks.filter(t => !t.sprint_id);
  const backlogSp = backlog.reduce((sum, t) => sum + (t.story_points || 0), 0);

  const sprintTasks = sprints.map(s => ({
    sprint: s,
    tasks: tasks.filter(t => t.sprint_id === s.id),
  }));

  const handleManualSync = async () => {
    if (!onSync) return;
    setSyncing(true);
    try {
      await onSync();
      toast.success('🔄 Đã đồng bộ dữ liệu Backlog & Sprints');
    } catch {
      toast.error('Đồng bộ thất bại');
    } finally {
      setSyncing(false);
    }
  };

  const handleCreateSprint = async (e) => {
    e.preventDefault();
    if (!canEdit) {
      toast.error('Bạn chỉ có quyền xem (Viewer), không thể tạo Sprint mới.');
      return;
    }
    try {
      const payload = {
        name: sprintForm.name.trim(),
        goal: sprintForm.goal?.trim() || null,
        start_date: sprintForm.start_date || null,
        end_date: sprintForm.end_date || null,
      };
      const { data } = await projectService.createSprint(project.id, payload);
      toast.success(`🎉 Đã tạo Sprint "${data.data.sprint.name}"!`);
      if (onSprintCreated) onSprintCreated(data.data.sprint);
      setShowSprintModal(false);
      setSprintForm({ name: '', goal: '', start_date: '', end_date: '' });
      if (onSync) onSync();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Tạo sprint thất bại');
    }
  };

  const handleUpdateSprint = async (e) => {
    e.preventDefault();
    if (!editingSprint) return;
    if (!canEdit) {
      toast.error('Bạn chỉ có quyền xem (Viewer), không thể chỉnh sửa Sprint.');
      return;
    }
    try {
      const payload = {
        name: editingSprint.name.trim(),
        goal: editingSprint.goal?.trim() || null,
        start_date: editingSprint.start_date || null,
        end_date: editingSprint.end_date || null,
        status: editingSprint.status,
      };
      const { data } = await projectService.updateSprint(project.id, editingSprint.id, payload);
      setSprints(ss => ss.map(s => s.id === editingSprint.id ? data.data.sprint : s));
      toast.success(`Đã cập nhật Sprint "${data.data.sprint.name}"`);
      setEditingSprint(null);
      if (onSync) onSync();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Cập nhật sprint thất bại');
    }
  };

  // Accept / Start Sprint: Prompts confirmation, marks active, syncs to board
  const handleStartSprint = (sprint) => {
    const sTasks = tasks.filter(t => t.sprint_id === sprint.id);
    const spTotal = sTasks.reduce((sum, t) => sum + (t.story_points || 0), 0);
    setSprintConfirmAction({
      type: 'start',
      sprint,
      title: `Bắt đầu Sprint "${sprint.name}"`,
      message: `Bạn có chắc muốn kích hoạt Sprint "${sprint.name}"?\n• Số nhiệm vụ: ${sTasks.length}\n• Tổng Story Points: ${spTotal} SP\nSprint sẽ chuyển sang trạng thái "Đang diễn ra" và đồng bộ lên Board.`,
      confirmText: 'Bắt đầu Sprint',
      variant: 'primary',
      icon: '🚀',
    });
  };

  // Complete Sprint: Prompts confirmation, moves unfinished to backlog, marks completed
  const handleCompleteSprint = (sprint) => {
    const sTasks = tasks.filter(t => t.sprint_id === sprint.id);
    const doneTasks = sTasks.filter(t => t.status === 'done');
    const unfinishedTasks = sTasks.filter(t => t.status !== 'done' && t.status !== 'cancelled');
    setSprintConfirmAction({
      type: 'complete',
      sprint,
      title: `Hoàn thành Sprint "${sprint.name}"`,
      message: `Bạn có chắc muốn kết thúc Sprint này?\n• Đã hoàn thành: ${doneTasks.length}/${sTasks.length} nhiệm vụ\n• Còn lại: ${unfinishedTasks.length} nhiệm vụ chưa xong sẽ tự động chuyển về Backlog.`,
      confirmText: 'Hoàn thành & Đồng bộ',
      variant: 'success',
      icon: '🏁',
    });
  };

  // Delete Sprint
  const handleDeleteSprint = (sprint) => {
    setSprintConfirmAction({
      type: 'delete',
      sprint,
      title: `Xác nhận xóa Sprint "${sprint.name}"`,
      message: `Bạn có chắc muốn xóa Sprint "${sprint.name}" không?\nTất cả nhiệm vụ trong sprint này sẽ được tự động hoàn trả về Backlog.`,
      confirmText: 'Xóa Sprint',
      variant: 'danger',
      icon: '🗑️',
    });
  };

  const handleExecuteSprintConfirm = async () => {
    if (!sprintConfirmAction) return;
    const { type, sprint } = sprintConfirmAction;
    try {
      if (type === 'start') {
        const { data } = await projectService.updateSprint(project.id, sprint.id, { status: 'active' });
        setSprints(ss => ss.map(s => s.id === sprint.id ? data.data.sprint : s));
        toast.success(`🚀 Đã kích hoạt Sprint "${sprint.name}"!`);
        if (onSync) onSync();
      } else if (type === 'complete') {
        const { data } = await projectService.updateSprint(project.id, sprint.id, { status: 'completed' });
        setSprints(ss => ss.map(s => s.id === sprint.id ? data.data.sprint : s));
        toast.success(`🏁 Đã hoàn thành Sprint "${sprint.name}"! Dữ liệu đã đồng bộ.`);
        if (onSync) onSync();
      } else if (type === 'delete') {
        await projectService.removeSprint(project.id, sprint.id);
        setSprints(ss => ss.filter(s => s.id !== sprint.id));
        toast.success(`Đã xóa Sprint "${sprint.name}" và chuyển các tasks về Backlog.`);
        if (onSync) onSync();
      }
    } catch (err) {
      toast.error(err.response?.data?.message || 'Thao tác thất bại');
    } finally {
      setSprintConfirmAction(null);
    }
  };

  const handleMoveToSprint = async (taskId, sprintId) => {
    if (!canEdit) {
      toast.error('Bạn chỉ có quyền xem (Viewer), không thể di chuyển nhiệm vụ.');
      return;
    }
    try {
      await api.put(`/tasks/${taskId}`, { sprint_id: sprintId || null });
      setTasks(ts => ts.map(t => t.id === taskId ? { ...t, sprint_id: sprintId } : t));
      toast.success(sprintId ? 'Đã thêm vào sprint' : 'Đã chuyển về Backlog');
    } catch {
      toast.error('Cập nhật thất bại');
    }
  };

  const handleDeleteTask = (taskId) => {
    setTasks(ts => ts.filter(t => t.id !== taskId));
    setSelectedTask(null);
  };

  const renderTaskRow = (task) => (
    <div key={task.id} className="backlog-task-row" onClick={() => setSelectedTask(task)}>
      <div className="backlog-task-left">
        <span className="priority-dot" style={{ '--p-color': PRIORITY_CONFIG[task.priority]?.color }} />
        <span className="backlog-task-title">{task.title}</span>
        {task.Category && (
          <span className="task-category-badge" style={{ '--cat-color': task.Category.color }}>{task.Category.name}</span>
        )}
        <span style={{ fontSize: '0.75rem', opacity: 0.6, marginLeft: '0.25rem' }}>
          {STATUS_COLUMNS.find(s => s.key === task.status)?.icon}
        </span>
      </div>
      <div className="backlog-task-right">
        {task.story_points && <span className="sp-badge-sm">{task.story_points} SP</span>}
        {task.assignee && (
          <div className="member-avatar-sm" title={task.assignee.name}>
            {task.assignee.avatar_url ? <img src={task.assignee.avatar_url} alt="" /> : task.assignee.name?.[0]}
          </div>
        )}
        <select
          className="sprint-move-select form-input"
          value={task.sprint_id || ''}
          disabled={!canEdit}
          onChange={e => { e.stopPropagation(); handleMoveToSprint(task.id, e.target.value ? parseInt(e.target.value, 10) : null); }}
          onClick={e => e.stopPropagation()}
          style={{ fontSize: '0.75rem', padding: '0.2rem 0.4rem', height: 'auto', cursor: canEdit ? 'pointer' : 'not-allowed', opacity: canEdit ? 1 : 0.65 }}
        >
          <option value="">📦 Backlog</option>
          {sprints.map(s => (
            <option key={s.id} value={s.id}>
              {s.status === 'active' ? '🟢' : s.status === 'completed' ? '🏁' : '📋'} {s.name}
            </option>
          ))}
        </select>
      </div>
    </div>
  );

  return (
    <div className="backlog-view" style={{ display: 'flex', flexDirection: 'column', gap: '1rem', padding: '1rem 1.25rem', height: '100%', overflowY: 'auto' }}>
      {/* Viewer Notice Banner */}
      {isViewer && (
        <div className="viewer-notice-banner" style={{
          display: 'flex',
          alignItems: 'center',
          gap: '0.65rem',
          padding: '0.65rem 1.15rem',
          background: 'rgba(59, 130, 246, 0.08)',
          border: '1px solid rgba(59, 130, 246, 0.25)',
          borderRadius: 'var(--radius)',
          fontSize: '0.84rem',
          color: 'var(--text-secondary)'
        }}>
          <span style={{ fontSize: '1.15rem' }}>👁️</span>
          <span><strong>Vai trò Người xem (Viewer):</strong> Bạn chỉ có quyền theo dõi danh sách Backlog & Sprint, không thể tạo mới, chỉnh sửa sprint hay di chuyển nhiệm vụ.</span>
        </div>
      )}

      {/* Top Backlog Toolbar */}
      <div className="backlog-toolbar" style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        flexWrap: 'wrap',
        gap: '0.75rem',
        padding: '0.75rem 1.25rem',
        background: 'var(--bg-card)',
        borderRadius: 'var(--radius)',
        border: '1px solid var(--border)'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          {canEdit && (
            <button className="btn btn-primary" onClick={() => setShowSprintModal(true)} style={{ fontSize: '0.85rem' }}>
              ➕ Tạo Sprint mới
            </button>
          )}
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <button
            className="btn btn-ghost"
            onClick={handleManualSync}
            disabled={syncing}
            style={{ fontSize: '0.82rem', display: 'flex', alignItems: 'center', gap: '0.35rem' }}
            title="Đồng bộ lại danh sách Sprint và Backlog"
          >
            <span style={{ display: 'inline-block', transform: syncing ? 'rotate(360deg)' : 'none', transition: 'transform 0.5s linear' }}>🔄</span>
            {syncing ? 'Đang đồng bộ...' : 'Đồng bộ dữ liệu'}
          </button>
          {onSwitchToBoard && (
            <button
              className="btn btn-ghost"
              onClick={onSwitchToBoard}
              style={{ fontSize: '0.82rem', display: 'flex', alignItems: 'center', gap: '0.35rem' }}
            >
              🗂️ Xem trên Board
            </button>
          )}
        </div>
      </div>

      {/* Sprints List */}
      {sprintTasks.map(({ sprint, tasks: stasks }) => {
        const totalSp = stasks.reduce((sum, t) => sum + (t.story_points || 0), 0);
        const doneCount = stasks.filter(t => t.status === 'done').length;

        return (
          <div key={sprint.id} className="backlog-sprint-section">
            <div className="backlog-sprint-header">
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', flexWrap: 'wrap' }}>
                  <h3 style={{ margin: 0, fontSize: '1rem', fontWeight: 700 }}>🏃 {sprint.name}</h3>
                  <span className={`sprint-status-badge sprint-${sprint.status}`}>
                    {sprint.status === 'active' ? '🟢 Đang diễn ra' : sprint.status === 'completed' ? '🏁 Đã hoàn thành' : '📋 Kế hoạch'}
                  </span>
                  <span className="sprint-task-count" style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>
                    {stasks.length} tasks • {totalSp} SP {doneCount > 0 && `(${doneCount} xong)`}
                  </span>
                </div>

                {sprint.goal && <p className="sprint-goal" style={{ marginTop: '0.3rem', marginBottom: 0 }}>🎯 {sprint.goal}</p>}

                <div className="sprint-meta">
                  {(sprint.start_date || sprint.end_date) && (
                    <span>
                      📅 {sprint.start_date ? new Date(sprint.start_date).toLocaleDateString('vi-VN') : 'Chưa đặt'} → {sprint.end_date ? new Date(sprint.end_date).toLocaleDateString('vi-VN') : 'Chưa đặt'}
                    </span>
                  )}
                </div>
              </div>

              {/* Sprint Action Buttons */}
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap' }}>
                {/* Accept / Start Sprint Button */}
                {sprint.status === 'planning' && canEdit && (
                  <button
                    className="btn btn-primary"
                    style={{
                      padding: '0.35rem 0.85rem',
                      fontSize: '0.8rem',
                      background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
                      borderColor: '#059669',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '0.35rem',
                      fontWeight: 600,
                    }}
                    onClick={() => handleStartSprint(sprint)}
                    title="Xác nhận phạm vi sprint và kích hoạt đồng bộ lên Board"
                  >
                    🚀 Bắt đầu / Xác nhận Sprint
                  </button>
                )}

                {/* Complete Sprint Button */}
                {sprint.status === 'active' && (
                  <>
                    {canEdit && (
                      <button
                        className="btn"
                        style={{
                          padding: '0.35rem 0.85rem',
                          fontSize: '0.8rem',
                          background: 'linear-gradient(135deg, #3b82f6 0%, #1d4ed8 100%)',
                          color: '#fff',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '0.35rem',
                          fontWeight: 600,
                        }}
                        onClick={() => handleCompleteSprint(sprint)}
                        title="Hoàn tất sprint này, tasks chưa xong sẽ quay lại Backlog"
                      >
                        🏁 Hoàn thành Sprint
                      </button>
                    )}
                    {onSwitchToBoard && (
                      <button
                        className="btn btn-ghost"
                        style={{ padding: '0.35rem 0.75rem', fontSize: '0.8rem' }}
                        onClick={onSwitchToBoard}
                      >
                        🗂️ Mở trên Board
                      </button>
                    )}
                  </>
                )}

                {/* Edit & Delete Sprint */}
                {canEdit && (
                  <>
                    <button
                      className="btn btn-ghost"
                      style={{ padding: '0.35rem 0.6rem', fontSize: '0.8rem' }}
                      onClick={() => setEditingSprint(sprint)}
                      title="Chỉnh sửa thông tin Sprint"
                    >
                      ✏️ Sửa
                    </button>

                    <button
                      className="btn btn-ghost"
                      style={{ padding: '0.35rem 0.6rem', fontSize: '0.8rem', color: '#ef4444' }}
                      onClick={() => handleDeleteSprint(sprint)}
                      title="Xóa Sprint này (tasks sẽ trở về Backlog)"
                    >
                      🗑️
                    </button>
                  </>
                )}
              </div>
            </div>

            <div className="backlog-task-list">
              {stasks.map(renderTaskRow)}
              {stasks.length === 0 && (
                <div className="backlog-empty-sprint">
                  Kéo hoặc chọn tasks từ Backlog bên dưới để thêm vào Sprint này 📦
                </div>
              )}
            </div>
          </div>
        );
      })}

      {/* Backlog Section */}
      <div className="backlog-sprint-section">
        <div className="backlog-sprint-header">
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
            <h3 style={{ margin: 0, fontSize: '1rem', fontWeight: 700 }}>📦 Backlog</h3>
            <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
              ({backlog.length} tasks • {backlogSp} SP)
            </span>
          </div>
        </div>
        <div className="backlog-task-list">
          {backlog.map(renderTaskRow)}
          {backlog.length === 0 && (
            <div className="backlog-empty-sprint">
              Tất cả nhiệm vụ đã được phân bổ vào các Sprints 🎉
            </div>
          )}
        </div>
      </div>

      {/* Create Sprint Modal */}
      {showSprintModal && (
        <div className="modal-overlay" onClick={e => e.target === e.currentTarget && setShowSprintModal(false)}>
          <div className="modal animate-fadein" style={{ maxWidth: 'min(94vw, 480px)' }}>
            <div className="modal-header">
              <h3>🏃 Tạo Sprint mới</h3>
              <button className="btn-icon" onClick={() => setShowSprintModal(false)}>✕</button>
            </div>
            <form onSubmit={handleCreateSprint}>
              <div className="modal-body" style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                <div className="form-group">
                  <label className="form-label">Tên Sprint *</label>
                  <input
                    className="form-input"
                    placeholder="Sprint 1, Sprint MVP..."
                    value={sprintForm.name}
                    onChange={e => setSprintForm(f => ({ ...f, name: e.target.value }))}
                    required
                    autoFocus
                  />
                </div>
                <div className="form-group">
                  <label className="form-label">Mục tiêu Sprint (Goal)</label>
                  <input
                    className="form-input"
                    placeholder="Mục tiêu cốt lõi cần đạt được trong đợt này..."
                    value={sprintForm.goal}
                    onChange={e => setSprintForm(f => ({ ...f, goal: e.target.value }))}
                  />
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
                  <div className="form-group">
                    <label className="form-label">Ngày bắt đầu</label>
                    <input
                      type="date"
                      className="form-input"
                      value={sprintForm.start_date}
                      onChange={e => setSprintForm(f => ({ ...f, start_date: e.target.value }))}
                    />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Ngày kết thúc</label>
                    <input
                      type="date"
                      className="form-input"
                      value={sprintForm.end_date}
                      onChange={e => setSprintForm(f => ({ ...f, end_date: e.target.value }))}
                    />
                  </div>
                </div>
              </div>
              <div className="modal-footer">
                <button type="button" className="btn btn-ghost" onClick={() => setShowSprintModal(false)}>Hủy</button>
                <button type="submit" className="btn btn-primary">🏃 Tạo Sprint</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Edit Sprint Modal */}
      {editingSprint && (
        <div className="modal-overlay" onClick={e => e.target === e.currentTarget && setEditingSprint(null)}>
          <div className="modal animate-fadein" style={{ maxWidth: 'min(94vw, 480px)' }}>
            <div className="modal-header">
              <h3>✏️ Chỉnh sửa Sprint</h3>
              <button className="btn-icon" onClick={() => setEditingSprint(null)}>✕</button>
            </div>
            <form onSubmit={handleUpdateSprint}>
              <div className="modal-body" style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                <div className="form-group">
                  <label className="form-label">Tên Sprint *</label>
                  <input
                    className="form-input"
                    value={editingSprint.name || ''}
                    onChange={e => setEditingSprint(s => ({ ...s, name: e.target.value }))}
                    required
                    autoFocus
                  />
                </div>
                <div className="form-group">
                  <label className="form-label">Mục tiêu Sprint</label>
                  <input
                    className="form-input"
                    value={editingSprint.goal || ''}
                    onChange={e => setEditingSprint(s => ({ ...s, goal: e.target.value }))}
                  />
                </div>
                <div className="form-group">
                  <label className="form-label">Trạng thái Sprint</label>
                  <select
                    className="form-input"
                    value={editingSprint.status || 'planning'}
                    onChange={e => setEditingSprint(s => ({ ...s, status: e.target.value }))}
                  >
                    <option value="planning">📋 Kế hoạch (Planning)</option>
                    <option value="active">🟢 Đang diễn ra (Active)</option>
                    <option value="completed">🏁 Đã hoàn thành (Completed)</option>
                  </select>
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
                  <div className="form-group">
                    <label className="form-label">Ngày bắt đầu</label>
                    <input
                      type="date"
                      className="form-input"
                      value={editingSprint.start_date ? String(editingSprint.start_date).slice(0, 10) : ''}
                      onChange={e => setEditingSprint(s => ({ ...s, start_date: e.target.value }))}
                    />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Ngày kết thúc</label>
                    <input
                      type="date"
                      className="form-input"
                      value={editingSprint.end_date ? String(editingSprint.end_date).slice(0, 10) : ''}
                      onChange={e => setEditingSprint(s => ({ ...s, end_date: e.target.value }))}
                    />
                  </div>
                </div>
              </div>
              <div className="modal-footer">
                <button type="button" className="btn btn-ghost" onClick={() => setEditingSprint(null)}>Hủy</button>
                <button type="submit" className="btn btn-primary">💾 Lưu thay đổi</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Sprint Action Confirm Modal */}
      {sprintConfirmAction && (
        <ConfirmModal
          isOpen={!!sprintConfirmAction}
          title={sprintConfirmAction.title}
          message={sprintConfirmAction.message}
          confirmText={sprintConfirmAction.confirmText}
          cancelText="Hủy bỏ"
          variant={sprintConfirmAction.variant}
          icon={sprintConfirmAction.icon}
          onConfirm={handleExecuteSprintConfirm}
          onClose={() => setSprintConfirmAction(null)}
        />
      )}

      {selectedTask && (
        <TaskDetailModal
          task={selectedTask}
          projectMembers={projectMembers}
          sprints={sprints}
          canEdit={canEdit}
          onClose={() => setSelectedTask(null)}
          onUpdate={updated => {
            setTasks(ts => ts.map(t => t.id === updated.id ? { ...t, ...updated } : t));
            setSelectedTask(s => s ? { ...s, ...updated } : null);
          }}
          onDelete={handleDeleteTask}
        />
      )}
    </div>
  );
}

// ── Members Panel ──────────────────────────────────────────────
function MembersPanel({ project, projectMembers, onMemberAdded }) {
  const { user: currentUser } = useAuth();
  const [email, setEmail] = useState('');
  const [role, setRole] = useState('member');
  const [adding, setAdding] = useState(false);
  const [lookupLoading, setLookupLoading] = useState(false);
  const [lookupResult, setLookupResult] = useState(null);
  const [lookupError, setLookupError] = useState('');
  const [updatingMemberId, setUpdatingMemberId] = useState(null);
  const [memberToDelete, setMemberToDelete] = useState(null);
  const [deleting, setDeleting] = useState(false);

  // Security: Only Project Owner or System Admin can add/remove members and update roles
  const isOwnerOrAdmin = project?.owner_id === currentUser?.id || currentUser?.role === 'admin';

  // 1. Tra cứu danh tính bằng email qua kính lúp
  const handleLookup = async (e) => {
    if (e) e.preventDefault();
    const targetEmail = (email || '').trim().toLowerCase();
    if (!targetEmail) {
      toast.error('Vui lòng nhập email hoặc Gmail cần tra cứu');
      return;
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(targetEmail)) {
      toast.error('Email không đúng định dạng (ví dụ: user@gmail.com)');
      return;
    }

    setLookupLoading(true);
    setLookupError('');
    setLookupResult(null);

    try {
      const { data } = await projectService.lookupUser(project.id, targetEmail);
      if (data.success && data.data?.user) {
        setLookupResult({
          ...data.data.user,
          isMember: data.data.isMember,
          currentRole: data.data.currentRole,
        });
      } else {
        setLookupError('Không tìm thấy thông tin tài khoản với email này.');
      }
    } catch (err) {
      const msg = err.response?.data?.message || 'Không tìm thấy tài khoản với email này. Hãy chắc chắn người này đã đăng ký tài khoản.';
      setLookupError(msg);
      toast.error(msg);
    } finally {
      setLookupLoading(false);
    }
  };

  // 2. Thêm thành viên sau khi đã xác thực danh tính
  const handleAddMember = async () => {
    if (!lookupResult) return;
    setAdding(true);
    try {
      const { data } = await projectService.addMember(project.id, { email: lookupResult.email, role });
      toast.success(data.message || 'Đã thêm thành viên thành công!');
      setEmail('');
      setLookupResult(null);
      setLookupError('');
      onMemberAdded();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Thêm thành viên thất bại');
    } finally {
      setAdding(false);
    }
  };

  // 3. Trưởng nhóm đổi vai trò của thành viên đã có trong nhóm
  const handleRoleChange = async (memberUserId, memberName, newRole) => {
    setUpdatingMemberId(memberUserId);
    try {
      const { data } = await projectService.updateMemberRole(project.id, memberUserId, newRole);
      toast.success(data.message || `Đã đổi vai trò của ${memberName} thành ${newRole === 'member' ? 'Member' : 'Viewer'}`);
      onMemberAdded();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Không thể cập nhật vai trò');
    } finally {
      setUpdatingMemberId(null);
    }
  };

  // 4. Xóa thành viên với giao diện Modal xác nhận hiện đại
  const handleConfirmDelete = async () => {
    if (!memberToDelete) return;
    setDeleting(true);
    try {
      await projectService.removeMember(project.id, memberToDelete.user_id);
      toast.success(`Đã xóa ${memberToDelete.user?.name} khỏi dự án`);
      setMemberToDelete(null);
      onMemberAdded();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Xóa thành viên thất bại');
    } finally {
      setDeleting(false);
    }
  };

  const initials = (u) => u?.name?.split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase() || '?';
  const ROLE_LABELS = { owner: '👑 Owner', member: '🔧 Member', viewer: '👁️ Viewer' };

  return (
    <div className="members-panel">
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1.25rem', flexWrap: 'wrap', gap: '0.5rem' }}>
        <div>
          <h3 style={{ margin: 0, fontWeight: 700 }}>👥 Quản lý thành viên ({projectMembers.length})</h3>
          <p style={{ margin: '0.2rem 0 0', fontSize: '0.82rem', color: 'var(--text-secondary)' }}>
            Trưởng nhóm nhập email để tra cứu danh tính chính xác trước khi thêm, và có thể điều chỉnh vai trò thành viên bất cứ lúc nào.
          </p>
        </div>
      </div>

      {/* Tra cứu danh tính bằng Email / Kính lúp (Chỉ hiển thị cho Owner hoặc Admin) */}
      {isOwnerOrAdmin ? (
        <div style={{ marginBottom: '1.5rem' }}>
          <form onSubmit={handleLookup} style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
            <div style={{ position: 'relative', flex: 1 }}>
              <span style={{ position: 'absolute', left: '0.75rem', top: '50%', transform: 'translateY(-50%)', opacity: 0.6, pointerEvents: 'none' }}>
                ✉️
              </span>
              <input
                className="form-input"
                type="email"
                placeholder="Nhập chính xác Gmail/Email thành viên..."
                value={email}
                onChange={e => {
                  setEmail(e.target.value);
                  if (lookupResult || lookupError) {
                    setLookupResult(null);
                    setLookupError('');
                  }
                }}
                autoComplete="off"
                style={{ width: '100%', paddingLeft: '2.4rem' }}
              />
            </div>
            <button
              type="submit"
              className="btn btn-primary"
              disabled={lookupLoading || !email.trim()}
              style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', whiteSpace: 'nowrap' }}
              title="Tìm kiếm và kiểm tra danh tính người dùng"
            >
              {lookupLoading ? (
                <>⏳ Đang tìm...</>
              ) : (
                <>
                  <span>🔍</span>
                  <span>Tìm kiếm</span>
                </>
              )}
            </button>
          </form>

          {/* Thông báo lỗi nếu không tìm thấy */}
          {lookupError && (
            <div style={{
              marginTop: '0.75rem',
              padding: '0.75rem 1rem',
              borderRadius: 'var(--radius)',
              background: '#fef2f2',
              border: '1px solid #fecaca',
              color: '#b91c1c',
              fontSize: '0.82rem',
              display: 'flex',
              alignItems: 'center',
              gap: '0.5rem',
              animation: 'fadeIn 0.2s ease',
            }}>
              <span>❌</span>
              <span>{lookupError}</span>
            </div>
          )}

          {/* THẺ HIỆN DANH TÍNH GMAIL ĐÚNG NGƯỜI */}
          {lookupResult && (
            <div className="user-identity-card" style={{ marginTop: '0.85rem' }}>
              <div className="user-identity-header">
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.45rem', fontSize: '0.82rem', fontWeight: 700, color: 'var(--primary)' }}>
                  <span>🔎</span>
                  <span>Kết quả tra cứu danh tính:</span>
                </div>
                <button
                  type="button"
                  className="btn-icon"
                  style={{ fontSize: '0.8rem', padding: '0.2rem 0.4rem' }}
                  onClick={() => { setLookupResult(null); setEmail(''); }}
                  title="Đóng kết quả"
                >
                  ✕
                </button>
              </div>

              <div className="user-identity-main">
                <div className="member-avatar-lg" style={{ width: 48, height: 48, fontSize: '1rem' }}>
                  {lookupResult.avatar_url
                    ? <img src={lookupResult.avatar_url} alt={lookupResult.name} />
                    : initials(lookupResult)
                  }
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap' }}>
                    <span style={{ fontWeight: 700, fontSize: '0.95rem', color: 'var(--text-primary)' }}>
                      {lookupResult.name}
                    </span>
                    <span style={{
                      fontSize: '0.68rem',
                      fontWeight: 600,
                      background: '#dcfce7',
                      color: '#15803d',
                      padding: '0.15rem 0.45rem',
                      borderRadius: 99,
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '0.25rem'
                    }}>
                      ✓ Tài khoản hợp lệ
                    </span>
                  </div>
                  <div style={{ fontSize: '0.82rem', color: 'var(--text-secondary)', marginTop: '0.15rem' }}>
                    {lookupResult.email}
                  </div>
                </div>
              </div>

              {/* Kiểm tra nếu đã có sẵn trong nhóm */}
              {lookupResult.isMember ? (
                <div style={{
                  padding: '0.65rem 0.85rem',
                  background: '#fef3c7',
                  border: '1px solid #fde68a',
                  borderRadius: 'var(--radius-sm)',
                  fontSize: '0.82rem',
                  color: '#92400e',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.5rem'
                }}>
                  <span>⚠️</span>
                  <span>Tài khoản này <strong>đã là thành viên</strong> trong nhóm (Vai trò: {ROLE_LABELS[lookupResult.currentRole] || lookupResult.currentRole}). Bạn có thể điều chỉnh vai trò ở danh sách bên dưới.</span>
                </div>
              ) : (
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', flexWrap: 'wrap', paddingTop: '0.25rem', borderTop: '1px dashed var(--border)' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <label style={{ fontSize: '0.82rem', fontWeight: 600, color: 'var(--text-secondary)' }}>
                      Vai trò:
                    </label>
                    <select
                      className="form-input"
                      value={role}
                      onChange={e => setRole(e.target.value)}
                      style={{ padding: '0.35rem 0.65rem', fontSize: '0.82rem', width: 'auto' }}
                    >
                      <option value="member">🔧 Member (Thành viên - Có quyền sửa việc)</option>
                      <option value="viewer">👁️ Viewer (Chỉ xem)</option>
                    </select>
                  </div>

                  <div style={{ display: 'flex', gap: '0.5rem', marginLeft: 'auto' }}>
                    <button
                      type="button"
                      className="btn btn-ghost"
                      onClick={() => setLookupResult(null)}
                      style={{ fontSize: '0.82rem', padding: '0.4rem 0.8rem' }}
                    >
                      Hủy
                    </button>
                    <button
                      type="button"
                      className="btn btn-primary"
                      onClick={handleAddMember}
                      disabled={adding}
                      style={{ fontSize: '0.82rem', padding: '0.4rem 0.9rem', fontWeight: 600 }}
                    >
                      {adding ? '⏳ Đang thêm...' : '➕ Xác nhận thêm vào nhóm'}
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      ) : (
        <div style={{
          marginBottom: '1.25rem',
          padding: '0.75rem 1rem',
          background: 'var(--bg-elevated)',
          borderRadius: 'var(--radius)',
          border: '1px solid var(--border)',
          fontSize: '0.82rem',
          color: 'var(--text-secondary)',
          display: 'flex',
          alignItems: 'center',
          gap: '0.5rem',
        }}>
          <span>🔒</span>
          <span>Chỉ <strong>Trưởng dự án (Owner)</strong> mới có quyền thêm, chỉnh sửa vai trò hoặc xóa thành viên.</span>
        </div>
      )}

      {/* Danh sách thành viên */}
      <div className="member-list">
        {projectMembers.map(m => (
          <div key={m.id} className="member-row" style={{ display: 'flex', alignItems: 'center', gap: '0.85rem' }}>
            <div className="member-avatar-lg">
              {m.user?.avatar_url
                ? <img src={m.user.avatar_url} alt={m.user?.name} />
                : initials(m.user)
              }
            </div>
            <div className="member-info">
              <div className="member-name" style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                <span>{m.user?.name}</span>
                {m.user_id === currentUser?.id && (
                  <span style={{ fontSize: '0.7rem', color: 'var(--primary)', fontWeight: 600, background: 'var(--primary-light)', padding: '0.1rem 0.4rem', borderRadius: 4 }}>
                    (Bạn)
                  </span>
                )}
              </div>
              <div className="member-email">{m.user?.email}</div>
            </div>

            {/* Trưởng nhóm có thể chỉnh lại vai trò người khác ngay tại đây */}
            {isOwnerOrAdmin && m.role !== 'owner' ? (
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                <select
                  className="member-role-select"
                  value={m.role}
                  disabled={updatingMemberId === m.user_id}
                  onChange={(e) => handleRoleChange(m.user_id, m.user?.name, e.target.value)}
                  title="Thay đổi vai trò của thành viên này"
                >
                  <option value="member">🔧 Member</option>
                  <option value="viewer">👁️ Viewer</option>
                </select>
                {updatingMemberId === m.user_id && (
                  <span style={{ fontSize: '0.75rem' }} className="animate-spin">🔄</span>
                )}
              </div>
            ) : (
              <span className="member-role-badge">
                {ROLE_LABELS[m.role] || m.role}
              </span>
            )}

            {/* Nút xóa thành viên (Chỉ dành cho Owner/Admin và không xóa chính Owner) */}
            {isOwnerOrAdmin && m.role !== 'owner' && (
              <button
                type="button"
                className="btn-icon"
                onClick={() => setMemberToDelete(m)}
                title={`Xóa ${m.user?.name} khỏi project`}
                style={{ color: 'var(--danger)', marginLeft: '0.25rem' }}
              >
                🗑️
              </button>
            )}
          </div>
        ))}
      </div>

      {/* Security & Collaboration Note */}
      <div style={{
        marginTop: '1.5rem',
        padding: '1rem 1.15rem',
        background: 'rgba(79, 70, 229, 0.05)',
        borderRadius: 'var(--radius)',
        border: '1px solid rgba(79, 70, 229, 0.15)',
        fontSize: '0.82rem',
        color: 'var(--text-secondary)',
      }}>
        <div style={{ fontWeight: 600, color: 'var(--primary)', display: 'flex', alignItems: 'center', gap: '0.45rem', marginBottom: '0.4rem' }}>
          <span>🛡️</span>
          <span>Bảo mật & Quyền riêng tư dự án:</span>
        </div>
        <ul style={{ margin: 0, paddingLeft: '1.25rem', lineHeight: 1.6 }}>
          <li>Hệ thống <strong>không gợi ý danh sách tài khoản</strong> để tránh rò rỉ danh tính hoặc người lạ tạo nhóm bậy bạ.</li>
          <li>Khi điền đúng Gmail, bấm nút <strong>🔍 Tìm kiếm</strong> để xem danh tính (tên, avatar, email xác thực) xem có đúng người cần mời không.</li>
          <li>Trưởng nhóm có toàn quyền <strong>chỉnh lại vai trò (Member / Viewer)</strong> của bất kỳ thành viên nào trực tiếp trên danh sách.</li>
        </ul>
      </div>

      {/* MODAL GIAO DIỆN XÓA THÀNH VIÊN HIỆN ĐẠI (THAY THẾ WINDOW.CONFIRM) */}
      {memberToDelete && (
        <div
          className="modal-overlay"
          onClick={e => e.target === e.currentTarget && !deleting && setMemberToDelete(null)}
          style={{ zIndex: 300 }}
        >
          <div className="modal animate-fadein" style={{ maxWidth: 440 }}>
            <div className="modal-header" style={{ borderBottom: '1px solid var(--border)' }}>
              <h3 style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: 'var(--danger)', fontSize: '1.05rem', margin: 0 }}>
                <span>⚠️</span>
                <span>Xác nhận xóa thành viên</span>
              </h3>
              <button
                type="button"
                className="btn-icon"
                disabled={deleting}
                onClick={() => setMemberToDelete(null)}
              >
                ✕
              </button>
            </div>

            <div className="modal-body" style={{ padding: '1.25rem' }}>
              <p style={{ margin: '0 0 1rem', fontSize: '0.88rem', color: 'var(--text-secondary)', lineHeight: 1.5 }}>
                Bạn có chắc chắn muốn xóa thành viên sau khỏi dự án <strong>"{project?.name}"</strong> không?
              </p>

              <div style={{
                display: 'flex',
                alignItems: 'center',
                gap: '0.85rem',
                padding: '0.85rem',
                background: 'var(--bg-elevated)',
                borderRadius: 'var(--radius)',
                border: '1px solid var(--border)',
                marginBottom: '1rem',
              }}>
                <div className="member-avatar-lg">
                  {memberToDelete.user?.avatar_url
                    ? <img src={memberToDelete.user.avatar_url} alt={memberToDelete.user?.name} />
                    : initials(memberToDelete.user)
                  }
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontWeight: 700, fontSize: '0.9rem', color: 'var(--text-primary)' }}>
                    {memberToDelete.user?.name}
                  </div>
                  <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                    {memberToDelete.user?.email}
                  </div>
                </div>
                <span className="member-role-badge" style={{ fontSize: '0.72rem' }}>
                  {ROLE_LABELS[memberToDelete.role] || memberToDelete.role}
                </span>
              </div>

              <div style={{
                padding: '0.65rem 0.85rem',
                background: 'rgba(239, 68, 68, 0.08)',
                border: '1px solid rgba(239, 68, 68, 0.2)',
                borderRadius: 'var(--radius-sm)',
                fontSize: '0.8rem',
                color: '#ef4444',
                lineHeight: 1.4,
              }}>
                ⚠️ Người này sẽ không còn quyền truy cập vào bảng công việc, nhiệm vụ hay sprint của dự án.
              </div>
            </div>

            <div className="modal-footer" style={{ borderTop: '1px solid var(--border)', display: 'flex', justifyContent: 'flex-end', gap: '0.75rem', padding: '0.85rem 1.25rem' }}>
              <button
                type="button"
                className="btn btn-ghost"
                disabled={deleting}
                onClick={() => setMemberToDelete(null)}
              >
                Hủy bỏ
              </button>
              <button
                type="button"
                className="btn"
                disabled={deleting}
                onClick={handleConfirmDelete}
                style={{ background: '#ef4444', color: '#fff', fontWeight: 600 }}
              >
                {deleting ? '⏳ Đang xóa...' : '🗑️ Xác nhận xóa thành viên'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ── Activity Feed Helpers ──────────────────────────────────────
const STATUS_LABELS = {
  todo: 'Cần làm',
  in_progress: 'Đang làm',
  done: 'Hoàn thành',
  cancelled: 'Đã hủy',
};

function formatRelativeTime(dateStr) {
  if (!dateStr) return '';
  const date = new Date(dateStr);
  const now = new Date();
  const diffSec = Math.floor((now - date) / 1000);
  if (diffSec < 45) return 'Vừa xong';
  if (diffSec < 3600) return `${Math.floor(diffSec / 60)} phút trước`;
  if (diffSec < 86400) return `${Math.floor(diffSec / 3600)} giờ trước`;
  if (diffSec < 86400 * 7) return `${Math.floor(diffSec / 86400)} ngày trước`;
  return date.toLocaleDateString('vi-VN');
}

function formatDateGroup(dateStr) {
  if (!dateStr) return 'Trước đây';
  const d = new Date(dateStr);
  const today = new Date();
  const yesterday = new Date(today);
  yesterday.setDate(yesterday.getDate() - 1);

  if (d.toDateString() === today.toDateString()) {
    return 'Hôm nay (' + d.toLocaleDateString('vi-VN') + ')';
  }
  if (d.toDateString() === yesterday.toDateString()) {
    return 'Hôm qua (' + d.toLocaleDateString('vi-VN') + ')';
  }
  return d.toLocaleDateString('vi-VN', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });
}

// ── Activity Feed Panel ────────────────────────────────────────
function ActivityFeedPanel({ projectId }) {
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('all');
  const [search, setSearch] = useState('');

  const loadLogs = async () => {
    setLoading(true);
    try {
      const { data } = await projectService.getActivity(projectId);
      setLogs(data.data.logs || []);
    } catch {
      toast.error('Không thể tải nhật ký hoạt động');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadLogs();
  }, [projectId]);

  // Statistics
  const statusCount = logs.filter(l => l.action === 'status_changed').length;
  const memberCount = logs.filter(l => l.action === 'member_added' || l.field_name === 'thành viên' || l.field_name === 'vai trò').length;
  const taskCount = logs.filter(l => l.action === 'created' || (l.action === 'updated' && l.field_name !== 'thành viên' && l.field_name !== 'vai trò')).length;
  const commentCount = logs.filter(l => l.action === 'commented').length;

  // Filtered logs
  const filteredLogs = logs.filter(log => {
    if (filter === 'status' && log.action !== 'status_changed') return false;
    if (filter === 'members' && !(log.action === 'member_added' || log.field_name === 'thành viên' || log.field_name === 'vai trò')) return false;
    if (filter === 'tasks' && !(log.action === 'created' || (log.action === 'updated' && log.field_name !== 'thành viên' && log.field_name !== 'vai trò'))) return false;
    if (filter === 'comments' && log.action !== 'commented') return false;

    if (search.trim()) {
      const q = search.trim().toLowerCase();
      const actorName = log.actor?.name?.toLowerCase() || '';
      const actorEmail = log.actor?.email?.toLowerCase() || '';
      const taskTitle = log.meta?.task_title?.toLowerCase() || '';
      const newVal = String(log.new_value || '').toLowerCase();
      const oldVal = String(log.old_value || '').toLowerCase();
      const field = String(log.field_name || '').toLowerCase();
      if (!actorName.includes(q) && !actorEmail.includes(q) && !taskTitle.includes(q) && !newVal.includes(q) && !oldVal.includes(q) && !field.includes(q)) {
        return false;
      }
    }
    return true;
  });

  // Group by date
  const groupedLogs = filteredLogs.reduce((acc, log) => {
    const dateKey = formatDateGroup(log.createdAt);
    if (!acc[dateKey]) acc[dateKey] = [];
    acc[dateKey].push(log);
    return acc;
  }, {});

  const getActionMeta = (action, field_name) => {
    if (action === 'status_changed') {
      return { icon: '🔄', color: '#3b82f6', bg: '#eff6ff', label: 'Đổi trạng thái' };
    }
    if (action === 'member_added' || field_name === 'thành viên' || field_name === 'vai trò') {
      return { icon: '👥', color: '#10b981', bg: '#ecfdf5', label: 'Thành viên' };
    }
    if (action === 'created') {
      return { icon: '✨', color: '#8b5cf6', bg: '#f5f3ff', label: 'Tạo mới' };
    }
    if (action === 'commented') {
      return { icon: '💬', color: '#0284c7', bg: '#f0f9ff', label: 'Bình luận' };
    }
    return { icon: '✏️', color: '#f59e0b', bg: '#fffbeb', label: 'Cập nhật' };
  };

  const initials = (u) => u?.name?.split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase() || '?';

  return (
    <div className="activity-feed">
      {/* Header */}
      <div className="activity-header">
        <div>
          <h2 className="activity-title">
            <span>📜</span>
            <span>Nhật ký hoạt động dự án</span>
          </h2>
          <p className="activity-subtitle">
            Toàn bộ lịch sử thao tác, thay đổi trạng thái nhiệm vụ và quản lý thành viên được ghi lại minh bạch theo thời gian thực.
          </p>
        </div>
        <button
          type="button"
          className="btn btn-ghost"
          onClick={loadLogs}
          disabled={loading}
          style={{ display: 'inline-flex', alignItems: 'center', gap: '0.4rem', fontSize: '0.82rem' }}
          title="Tải lại nhật ký"
        >
          <span className={loading ? 'animate-spin' : ''}>🔄</span>
          <span>Làm mới</span>
        </button>
      </div>

      {/* Stats Bar */}
      <div className="activity-stats-grid">
        <div className="activity-stat-chip">
          <div className="activity-stat-icon" style={{ background: '#e0e7ff', color: '#4338ca' }}>
            📜
          </div>
          <div className="activity-stat-content">
            <span className="activity-stat-val">{logs.length}</span>
            <span className="activity-stat-label">Tổng hoạt động</span>
          </div>
        </div>

        <div className="activity-stat-chip">
          <div className="activity-stat-icon" style={{ background: '#eff6ff', color: '#2563eb' }}>
            🔄
          </div>
          <div className="activity-stat-content">
            <span className="activity-stat-val">{statusCount}</span>
            <span className="activity-stat-label">Lượt đổi trạng thái</span>
          </div>
        </div>

        <div className="activity-stat-chip">
          <div className="activity-stat-icon" style={{ background: '#ecfdf5', color: '#059669' }}>
            👥
          </div>
          <div className="activity-stat-content">
            <span className="activity-stat-val">{memberCount}</span>
            <span className="activity-stat-label">Sự kiện thành viên</span>
          </div>
        </div>

        <div className="activity-stat-chip">
          <div className="activity-stat-icon" style={{ background: '#f5f3ff', color: '#7c3aed' }}>
            ✨
          </div>
          <div className="activity-stat-content">
            <span className="activity-stat-val">{taskCount}</span>
            <span className="activity-stat-label">Tác vụ & Sửa đổi</span>
          </div>
        </div>
      </div>

      {/* Controls: Filter Tabs & Search */}
      <div className="activity-controls-bar">
        <div className="activity-filters-group">
          <button
            type="button"
            className={`activity-filter-btn ${filter === 'all' ? 'active' : ''}`}
            onClick={() => setFilter('all')}
          >
            <span>Tất cả</span>
            <span className="activity-filter-count">{logs.length}</span>
          </button>
          <button
            type="button"
            className={`activity-filter-btn ${filter === 'status' ? 'active' : ''}`}
            onClick={() => setFilter('status')}
          >
            <span>🔄 Trạng thái</span>
            <span className="activity-filter-count">{statusCount}</span>
          </button>
          <button
            type="button"
            className={`activity-filter-btn ${filter === 'members' ? 'active' : ''}`}
            onClick={() => setFilter('members')}
          >
            <span>👥 Thành viên</span>
            <span className="activity-filter-count">{memberCount}</span>
          </button>
          <button
            type="button"
            className={`activity-filter-btn ${filter === 'tasks' ? 'active' : ''}`}
            onClick={() => setFilter('tasks')}
          >
            <span>✨ Tác vụ</span>
            <span className="activity-filter-count">{taskCount}</span>
          </button>
          <button
            type="button"
            className={`activity-filter-btn ${filter === 'comments' ? 'active' : ''}`}
            onClick={() => setFilter('comments')}
          >
            <span>💬 Bình luận</span>
            <span className="activity-filter-count">{commentCount}</span>
          </button>
        </div>

        <div className="activity-search-box">
          <span className="activity-search-icon">🔍</span>
          <input
            type="text"
            placeholder="Tìm theo tên người, task, email..."
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
        </div>
      </div>

      {/* Timeline View */}
      {loading ? (
        <div style={{ textAlign: 'center', padding: '3rem', color: 'var(--text-muted)' }}>
          <div className="spinner" style={{ margin: '0 auto 1rem' }} />
          Đang tải nhật ký hoạt động...
        </div>
      ) : filteredLogs.length === 0 ? (
        <div style={{
          background: 'var(--bg-card)',
          border: '1px dashed var(--border)',
          borderRadius: 'var(--radius)',
          padding: '3rem 2rem',
          textAlign: 'center',
          color: 'var(--text-muted)'
        }}>
          <div style={{ fontSize: '2.5rem', marginBottom: '0.75rem', opacity: 0.6 }}>📭</div>
          <h4 style={{ margin: '0 0 0.35rem', color: 'var(--text-primary)', fontSize: '1rem' }}>
            {search ? 'Không tìm thấy kết quả nào' : 'Chưa có hoạt động nào phù hợp'}
          </h4>
          <p style={{ margin: 0, fontSize: '0.82rem' }}>
            {search ? `Không có hoạt động nào khớp với từ khóa "${search}". Hãy thử tìm kiếm khác.` : 'Các thao tác trong dự án sẽ tự động xuất hiện tại đây.'}
          </p>
        </div>
      ) : (
        <div className="activity-timeline">
          {Object.entries(groupedLogs).map(([dateLabel, items]) => (
            <div key={dateLabel} style={{ display: 'contents' }}>
              <div className="activity-date-divider">
                <span className="activity-date-badge">
                  <span>📅</span>
                  <span>{dateLabel}</span>
                </span>
              </div>

              {items.map(log => {
                const meta = getActionMeta(log.action, log.field_name);
                const taskTitle = log.meta?.task_title;

                return (
                  <div key={log.id} className="activity-timeline-item">
                    {/* Node bullet with icon on the vertical line */}
                    <div
                      className="activity-node-bullet"
                      style={{ color: meta.color, borderColor: meta.color }}
                      title={meta.label}
                    >
                      {meta.icon}
                    </div>

                    {/* Elevated Card */}
                    <div className="activity-card">
                      <div className="activity-card-header">
                        <div className="activity-actor-meta">
                          <div className="member-avatar-sm" style={{ width: 28, height: 28, fontSize: '0.7rem' }}>
                            {log.actor?.avatar_url
                              ? <img src={log.actor.avatar_url} alt={log.actor?.name} />
                              : initials(log.actor)
                            }
                          </div>
                          <span className="activity-actor-name">
                            {log.actor?.name || 'Hệ thống'}
                          </span>
                          {log.actor?.email && (
                            <span className="activity-actor-role">
                              {log.actor.email}
                            </span>
                          )}
                          <span
                            style={{
                              fontSize: '0.7rem',
                              fontWeight: 700,
                              color: meta.color,
                              background: meta.bg,
                              padding: '0.1rem 0.45rem',
                              borderRadius: 4,
                            }}
                          >
                            {meta.label}
                          </span>
                        </div>

                        <div className="activity-time-wrapper">
                          <span className="activity-time-relative">
                            {formatRelativeTime(log.createdAt)}
                          </span>
                          <span>•</span>
                          <span>{new Date(log.createdAt).toLocaleTimeString('vi-VN')}</span>
                        </div>
                      </div>

                      <div className="activity-card-body">
                        {/* 1. Status Changed */}
                        {log.action === 'status_changed' && (
                          <div>
                            <div>
                              đã thay đổi trạng thái của nhiệm vụ{' '}
                              <span className="activity-task-tag">
                                {taskTitle ? `"${taskTitle}"` : `Task #${log.entity_id}`}
                              </span>
                            </div>
                            <div className="activity-status-flow">
                              <span className={`status-pill status-${log.old_value}`}>
                                {STATUS_LABELS[log.old_value] || log.old_value || 'Chưa có'}
                              </span>
                              <span className="flow-arrow">➔</span>
                              <span className={`status-pill status-${log.new_value}`}>
                                {STATUS_LABELS[log.new_value] || log.new_value}
                              </span>
                            </div>
                          </div>
                        )}

                        {/* 2. Member Added */}
                        {log.action === 'member_added' && (
                          <div>
                            <span>đã kết nối thành viên mới vào dự án:</span>
                            <div style={{ marginTop: '0.35rem' }}>
                              <span className="activity-member-highlight">
                                👤 {log.new_value}
                              </span>
                            </div>
                          </div>
                        )}

                        {/* 3. Created */}
                        {log.action === 'created' && (
                          <div>
                            <span>đã tạo một {log.entity_type === 'task' ? 'nhiệm vụ' : log.entity_type} mới:</span>
                            <div style={{ marginTop: '0.35rem' }}>
                              <span className="activity-task-tag">
                                ✨ {log.new_value}
                              </span>
                            </div>
                          </div>
                        )}

                        {/* 4. Updated */}
                        {log.action === 'updated' && (
                          <div>
                            <span>
                              đã cập nhật <strong>{log.field_name || 'thông tin'}</strong>
                              {taskTitle && <> trên nhiệm vụ <span className="activity-task-tag">"{taskTitle}"</span></>}
                              :
                            </span>
                            <div style={{ marginTop: '0.35rem', display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap' }}>
                              {log.old_value && (
                                <span style={{ textDecoration: 'line-through', color: 'var(--text-muted)', fontSize: '0.82rem' }}>
                                  {log.old_value}
                                </span>
                              )}
                              {log.old_value && <span className="flow-arrow">➔</span>}
                              <strong style={{ color: 'var(--text-primary)' }}>
                                {log.new_value}
                              </strong>
                            </div>
                          </div>
                        )}

                        {/* 5. Commented */}
                        {log.action === 'commented' && (
                          <div>
                            <span>
                              đã để lại một bình luận
                              {taskTitle && <> trên nhiệm vụ <span className="activity-task-tag">"{taskTitle}"</span></>}
                              :
                            </span>
                            <div className="activity-comment-box">
                              "{log.new_value}"
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ── Create Task Modal for Project (With Quick Sprint Creation) ──
function CreateTaskModal({ project, projectMembers, sprints, onSprintCreated, onClose, onCreated }) {
  const [form, setForm] = useState({
    title: '', description: '', priority: 'medium',
    due_date: '', start_time: '', end_time: '', story_points: '', assignee_id: '', sprint_id: '',
  });
  const [saving, setSaving] = useState(false);
  const [showQuickSprint, setShowQuickSprint] = useState(false);
  const [quickSprintName, setQuickSprintName] = useState('');
  const [quickCreating, setQuickCreating] = useState(false);

  const handleQuickCreateSprint = async () => {
    if (!quickSprintName.trim()) {
      toast.error('Vui lòng nhập tên Sprint');
      return;
    }
    setQuickCreating(true);
    try {
      const { data } = await projectService.createSprint(project.id, { name: quickSprintName.trim() });
      const newSprint = data.data.sprint;
      toast.success(`Đã tạo sprint "${newSprint.name}"`);
      if (onSprintCreated) onSprintCreated(newSprint);
      setForm(f => ({ ...f, sprint_id: String(newSprint.id) }));
      setQuickSprintName('');
      setShowQuickSprint(false);
    } catch (err) {
      toast.error(err.response?.data?.message || 'Tạo sprint thất bại');
    } finally {
      setQuickCreating(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.title.trim()) return;
    setSaving(true);
    try {
      const payload = {
        title: form.title.trim(),
        description: form.description?.trim() || null,
        priority: form.priority,
        due_date: form.due_date ? form.due_date : null,
        start_time: form.start_time || null,
        end_time: form.end_time || null,
        project_id: project.id,
        story_points: form.story_points ? parseInt(form.story_points, 10) : null,
        assignee_id: form.assignee_id ? parseInt(form.assignee_id, 10) : null,
        sprint_id: form.sprint_id ? parseInt(form.sprint_id, 10) : null,
      };
      const { data } = await api.post('/tasks', payload);
      toast.success('Tạo task thành công!');
      onCreated(data.data.task);
      onClose();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Tạo task thất bại');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="modal-overlay" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="modal animate-fadein" style={{ maxWidth: 'min(94vw, 560px)' }}>
        <div className="modal-header">
          <h3 style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', margin: 0 }}>
            <span>➕</span>
            <span>Tạo Task mới</span>
          </h3>
          <button className="btn-icon" onClick={onClose}>✕</button>
        </div>
        <form onSubmit={handleSubmit}>
          <div className="modal-body" style={{ display: 'flex', flexDirection: 'column', gap: '0.85rem' }}>
            <div className="form-group">
              <label className="form-label">Tiêu đề *</label>
              <input
                className="form-input"
                placeholder="Tên nhiệm vụ cần thực hiện..."
                value={form.title}
                onChange={e => setForm(f => ({ ...f, title: e.target.value }))}
                required
                autoFocus
              />
            </div>
            <div className="form-group">
              <label className="form-label">Mô tả chi tiết</label>
              <textarea
                className="form-input"
                rows={3}
                placeholder="Yêu cầu kỹ thuật, tiêu chí hoàn thành, tài liệu đính kèm..."
                value={form.description}
                onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
              />
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.85rem' }}>
              <div className="form-group">
                <label className="form-label">Độ ưu tiên</label>
                <select className="form-input" value={form.priority} onChange={e => setForm(f => ({ ...f, priority: e.target.value }))}>
                  <option value="low">🟢 Low (Thấp)</option>
                  <option value="medium">🔵 Medium (Bình thường)</option>
                  <option value="high">🟠 High (Cao)</option>
                  <option value="urgent">🔴 Urgent (Khẩn cấp)</option>
                </select>
              </div>

              <div className="form-group">
                <label className="form-label">Story Points</label>
                <input
                  type="number"
                  className="form-input"
                  placeholder="0"
                  min={0}
                  max={100}
                  value={form.story_points}
                  onChange={e => setForm(f => ({ ...f, story_points: e.target.value }))}
                />
              </div>

              <div className="form-group">
                <label className="form-label">Người thực hiện</label>
                <select className="form-input" value={form.assignee_id} onChange={e => setForm(f => ({ ...f, assignee_id: e.target.value }))}>
                  <option value="">— Chưa gán —</option>
                  {projectMembers.map(m => (
                    <option key={m.user?.id} value={m.user?.id}>{m.user?.name}</option>
                  ))}
                </select>
              </div>

              <div className="form-group">
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <label className="form-label" style={{ marginBottom: 0 }}>Sprint</label>
                  <button
                    type="button"
                    onClick={() => setShowQuickSprint(v => !v)}
                    style={{ fontSize: '0.74rem', color: 'var(--primary)', background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}
                  >
                    {showQuickSprint ? '✕ Đóng' : '➕ Tạo Sprint'}
                  </button>
                </div>
                <select
                  className="form-input"
                  value={form.sprint_id}
                  onChange={e => setForm(f => ({ ...f, sprint_id: e.target.value }))}
                  style={{ marginTop: '0.35rem' }}
                >
                  <option value="">📦 Backlog (Mặc định)</option>
                  {sprints.map(s => (
                    <option key={s.id} value={s.id}>
                      {s.status === 'active' ? '🟢 [Đang chạy] ' : s.status === 'completed' ? '🏁 [Đã xong] ' : '📋 [Kế hoạch] '}
                      {s.name}
                    </option>
                  ))}
                </select>
              </div>

              {/* Inline Quick Sprint Creator */}
              {showQuickSprint && (
                <div style={{
                  gridColumn: 'span 2',
                  padding: '0.75rem',
                  background: 'var(--bg-elevated)',
                  borderRadius: 'var(--radius-sm)',
                  border: '1px dashed var(--primary)',
                }}>
                  <div style={{ fontSize: '0.78rem', fontWeight: 600, marginBottom: '0.4rem', color: 'var(--primary)' }}>
                    🏃 Tạo Sprint nhanh và gán ngay vào task:
                  </div>
                  <div style={{ display: 'flex', gap: '0.5rem' }}>
                    <input
                      className="form-input"
                      placeholder="Tên Sprint (VD: Sprint 1, Sprint MVP)..."
                      value={quickSprintName}
                      onChange={e => setQuickSprintName(e.target.value)}
                      onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); handleQuickCreateSprint(); } }}
                      style={{ fontSize: '0.82rem' }}
                      autoFocus
                    />
                    <button
                      type="button"
                      className="btn btn-primary"
                      onClick={handleQuickCreateSprint}
                      disabled={quickCreating}
                      style={{ fontSize: '0.8rem', padding: '0.35rem 0.85rem', whiteSpace: 'nowrap' }}
                    >
                      {quickCreating ? '⏳...' : 'Tạo & Chọn'}
                    </button>
                  </div>
                </div>
              )}

              <div className="form-group" style={{ gridColumn: 'span 2' }}>
                <label className="form-label">Ngày thực hiện (Hạn chót)</label>
                <input
                  type="date"
                  className="form-input"
                  value={form.due_date}
                  onChange={e => setForm(f => ({ ...f, due_date: e.target.value }))}
                />
              </div>

              <div className="form-group">
                <label className="form-label">Giờ bắt đầu</label>
                <input
                  type="time"
                  className="form-input"
                  value={form.start_time}
                  onChange={e => setForm(f => ({ ...f, start_time: e.target.value }))}
                />
              </div>

              <div className="form-group">
                <label className="form-label">Giờ kết thúc</label>
                <input
                  type="time"
                  className="form-input"
                  value={form.end_time}
                  onChange={e => setForm(f => ({ ...f, end_time: e.target.value }))}
                />
              </div>
            </div>
          </div>
          <div className="modal-footer">
            <button type="button" className="btn btn-ghost" onClick={onClose}>Hủy</button>
            <button type="submit" className="btn btn-primary" disabled={saving}>
              {saving ? '⏳ Đang tạo...' : '➕ Tạo Task'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ── Main: Project Detail Page ──────────────────────────────────
export default function ProjectDetailPage({ project: initialProject, onBack }) {
  const { user: currentUser } = useAuth();
  const [project, setProject] = useState(initialProject);
  const [tasks, setTasks] = useState([]);
  const [sprints, setSprints] = useState([]);
  const [activeView, setActiveView] = useState('board');
  const [loading, setLoading] = useState(true);
  const [showCreateTask, setShowCreateTask] = useState(false);
  const [detailTask, setDetailTask] = useState(null);
  const [showDateHistoryModal, setShowDateHistoryModal] = useState(false);
  const [historyTaskId, setHistoryTaskId] = useState(null);

  const projectMembers = project?.ProjectMembers || [];

  // Determine user role and permissions
  const isOwner = project?.owner_id === currentUser?.id || currentUser?.role === 'admin';
  const memberRecord = projectMembers.find(m => m.user_id === currentUser?.id || m.user?.id === currentUser?.id);
  const userRole = isOwner ? 'owner' : (memberRecord?.role || 'viewer');
  const canEdit = isOwner || userRole === 'member';
  const isViewer = !canEdit;

  const loadData = useCallback(async () => {
    if (!project?.id) return;
    setLoading(true);
    try {
      const [tasksRes, projectRes, sprintsRes] = await Promise.all([
        projectService.getTasks(project.id),
        projectService.get(project.id),
        projectService.listSprints(project.id),
      ]);
      setTasks(tasksRes.data.data.tasks);
      setProject(projectRes.data.data.project);
      setSprints(sprintsRes.data.data.sprints);
    } catch {
      toast.error('Không thể tải dữ liệu project');
    } finally {
      setLoading(false);
    }
  }, [project?.id]);

  useEffect(() => { loadData(); }, [loadData]);

  const handleDeleteTask = (taskId) => {
    setTasks(ts => ts.filter(t => t.id !== taskId));
    setDetailTask(null);
  };

  const VIEWS = [
    { key: 'board', label: '🗂️ Board' },
    { key: 'backlog', label: '📦 Backlog' },
    { key: 'burndown', label: '📉 Burndown' },
    { key: 'members', label: '👥 Thành viên' },
    { key: 'activity', label: '📜 Nhật ký hoạt động' },
  ];

  if (!project) return null;

  return (
    <div className="project-detail-page">
      {/* Breadcrumb header */}
      <div className="project-detail-header">
        <div className="project-breadcrumb">
          <button className="breadcrumb-back" onClick={onBack}>
            ← Projects
          </button>
          <span className="breadcrumb-sep">/</span>
          <span className="project-breadcrumb-name" style={{ color: project.color }}>
            {project.icon} {project.name}
          </span>
          <span className={`project-role-badge ${userRole}`}>
            {isOwner ? '👑 Trưởng dự án (Toàn quyền)' : userRole === 'member' ? '⚡ Thành viên (Có quyền sửa)' : '👁️ Người xem (Chỉ xem)'}
          </span>
        </div>

        <div className="project-header-actions">
          <div className="view-tabs">
            {VIEWS.map(v => (
              <button
                key={v.key}
                className={`view-tab ${activeView === v.key ? 'active' : ''}`}
                onClick={() => setActiveView(v.key)}
                style={{ '--tab-color': project.color }}
              >
                {v.label}
              </button>
            ))}
          </div>

          <button
            className="btn btn-ghost btn-sm"
            onClick={() => setShowDateHistoryModal(true)}
            title="Xem lịch sử và công việc theo ngày của dự án"
          >
            📅 Lịch sử theo ngày
          </button>

          {canEdit && (activeView === 'board' || activeView === 'backlog') && (
            <button className="btn btn-primary" onClick={() => setShowCreateTask(true)}>
              ➕ Task
            </button>
          )}
        </div>
      </div>

      {/* Content */}
      <div className="project-detail-content">
        {loading ? (
          <div style={{ textAlign: 'center', padding: '3rem', color: 'var(--text-muted)' }}>
            <div style={{ fontSize: '2rem', marginBottom: '0.5rem' }}>⏳</div>
            Đang tải dữ liệu project...
          </div>
        ) : (
          <>
            {activeView === 'board' && (
              <BoardView
                project={project}
                tasks={tasks}
                setTasks={setTasks}
                sprints={sprints}
                setSprints={setSprints}
                projectMembers={projectMembers}
                onSync={loadData}
                onSwitchToBacklog={() => setActiveView('backlog')}
                canEdit={canEdit}
                isViewer={isViewer}
              />
            )}
            {activeView === 'backlog' && (
              <BacklogView
                project={project}
                tasks={tasks}
                setTasks={setTasks}
                sprints={sprints}
                setSprints={setSprints}
                projectMembers={projectMembers}
                onSprintCreated={sprint => setSprints(ss => [...ss, sprint])}
                onSync={loadData}
                onSwitchToBoard={() => setActiveView('board')}
                canEdit={canEdit}
                isViewer={isViewer}
              />
            )}
            {activeView === 'burndown' && (
              <Suspense fallback={<div className="page-loader"><div className="spinner" /></div>}>
                <BurndownChart
                  project={project}
                  tasks={tasks}
                  sprints={sprints}
                  onSelectTask={t => setDetailTask(t)}
                />
              </Suspense>
            )}
            {activeView === 'members' && (
              <MembersPanel
                project={project}
                projectMembers={projectMembers}
                onMemberAdded={loadData}
              />
            )}
            {activeView === 'activity' && (
              <ActivityFeedPanel projectId={project.id} />
            )}
          </>
        )}
      </div>

      {showCreateTask && (
        <CreateTaskModal
          project={project}
          projectMembers={projectMembers}
          sprints={sprints}
          onSprintCreated={sprint => setSprints(ss => [...ss, sprint])}
          onClose={() => setShowCreateTask(false)}
          onCreated={task => setTasks(ts => [task, ...ts])}
        />
      )}

      {detailTask && (
        <TaskDetailModal
          task={detailTask}
          projectMembers={projectMembers}
          sprints={sprints}
          canEdit={canEdit}
          onClose={() => setDetailTask(null)}
          onUpdate={updated => {
            setTasks(ts => ts.map(t => t.id === updated.id ? { ...t, ...updated } : t));
            setDetailTask(s => s ? { ...s, ...updated } : null);
          }}
          onDelete={handleDeleteTask}
        />
      )}

      {/* Task Edit History Modal */}
      {historyTaskId && (
        <TaskHistoryModal
          taskId={historyTaskId}
          onClose={() => setHistoryTaskId(null)}
        />
      )}

      {/* Task Date History Modal */}
      {showDateHistoryModal && (
        <TaskDateHistoryModal
          isOpen={showDateHistoryModal}
          onClose={() => setShowDateHistoryModal(false)}
          projectId={project.id}
          onViewTaskHistory={id => setHistoryTaskId(id)}
          onEditTask={task => setDetailTask(task)}
        />
      )}
    </div>
  );
}
