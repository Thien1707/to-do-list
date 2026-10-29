import { useState, useEffect } from 'react';
import api from '../services/api';
import toast from 'react-hot-toast';

const STORY_POINTS_OPTIONS = [1, 2, 3, 5, 8, 13];

export default function TaskModal({ task, categories = [], onClose, onSave, onViewHistory }) {
  const isEdit = !!task;
  const [form, setForm] = useState({
    title: task?.title || '',
    description: task?.description || '',
    priority: task?.priority || 'medium',
    status: task?.status || 'todo',
    due_date: task?.due_date ? task.due_date.split('T')[0] : '',
    start_time: task?.start_time ? String(task.start_time).slice(0, 5) : '',
    end_time: task?.end_time ? String(task.end_time).slice(0, 5) : '',
    story_points: task?.story_points !== undefined && task?.story_points !== null ? task.story_points : '',
    category_id: task?.category_id || '',
  });
  const [errors, setErrors] = useState({});
  const [loading, setLoading] = useState(false);

  // Close on Escape key press
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onClose]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.title.trim()) {
      setErrors({ title: 'Vui lòng nhập tiêu đề nhiệm vụ' });
      return;
    }

    if (form.start_time && form.end_time && form.start_time > form.end_time) {
      setErrors({ time: 'Giờ bắt đầu không được lớn hơn giờ kết thúc' });
      return;
    }

    setLoading(true);
    try {
      const payload = {
        title: form.title.trim(),
        description: form.description.trim() || null,
        priority: form.priority,
        status: form.status,
        due_date: form.due_date || null,
        start_time: form.start_time || null,
        end_time: form.end_time || null,
        story_points: form.story_points !== '' ? parseInt(form.story_points, 10) : null,
        category_id: form.category_id ? parseInt(form.category_id, 10) : null,
      };

      if (isEdit) {
        await api.put(`/tasks/${task.id}`, payload);
        toast.success('Đã cập nhật nhiệm vụ ✅');
      } else {
        await api.post('/tasks', payload);
        toast.success('Đã tạo nhiệm vụ mới 🎉');
      }
      onSave();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Có lỗi xảy ra, vui lòng thử lại');
    } finally {
      setLoading(false);
    }
  };

  const set = (k, v) => {
    setForm(f => ({ ...f, [k]: v }));
    if (errors[k] || (errors.time && (k === 'start_time' || k === 'end_time'))) {
      setErrors(errs => ({ ...errs, [k]: '', time: '' }));
    }
  };

  return (
    <div className="modal-overlay" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="modal animate-fadein" style={{ maxWidth: 'min(94vw, 580px)' }}>
        <div className="modal-header">
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', flexWrap: 'wrap' }}>
            <h3 style={{ margin: 0 }}>{isEdit ? '✏️ Chỉnh sửa nhiệm vụ' : '＋ Thêm nhiệm vụ mới'}</h3>
            {isEdit && task.is_edited && (
              <span
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '0.25rem',
                  fontSize: '0.72rem',
                  padding: '0.15rem 0.5rem',
                  borderRadius: '12px',
                  background: 'rgba(245, 158, 11, 0.15)',
                  color: '#d97706',
                  fontWeight: 600,
                  border: '1px solid rgba(245, 158, 11, 0.3)',
                }}
              >
                ✏️ (Đã chỉnh sửa)
              </span>
            )}
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            {isEdit && onViewHistory && (
              <button
                type="button"
                className="btn btn-ghost btn-sm"
                onClick={() => onViewHistory(task.id)}
                title="Xem lịch sử chỉnh sửa chi tiết"
                style={{
                  fontSize: '0.76rem',
                  padding: '0.25rem 0.6rem',
                  color: 'var(--primary)',
                  border: '1px solid var(--border)',
                }}
              >
                📜 Lịch sử {task.edit_count > 0 ? `(${task.edit_count})` : ''}
              </button>
            )}
            <button className="btn-icon" onClick={onClose} title="Đóng">✕</button>
          </div>
        </div>

        <form onSubmit={handleSubmit} noValidate>
          <div className="modal-body" style={{ display: 'flex', flexDirection: 'column', gap: '0.85rem' }}>
            <div className="form-group">
              <label className="form-label" htmlFor="task-title">Tiêu đề nhiệm vụ *</label>
              <input
                id="task-title"
                type="text"
                className={`form-input ${errors.title ? 'input-error' : ''}`}
                placeholder="Ví dụ: Họp quan trọng với cấp trên..."
                value={form.title}
                onChange={e => set('title', e.target.value)}
                autoFocus
              />
              {errors.title && <div className="field-error-text">⚠️ {errors.title}</div>}
            </div>

            <div className="form-group">
              <label className="form-label">Mô tả chi tiết</label>
              <textarea
                id="task-desc"
                className="form-textarea"
                placeholder="Thêm ghi chú, yêu cầu, kế hoạch hoặc chi tiết nhiệm vụ..."
                value={form.description}
                onChange={e => set('description', e.target.value)}
                rows={3}
              />
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
              <div className="form-group">
                <label className="form-label">Trạng thái</label>
                <select
                  id="task-status"
                  className="form-select"
                  value={form.status}
                  onChange={e => set('status', e.target.value)}
                >
                  <option value="todo">📋 Cần làm</option>
                  <option value="in_progress">⚡ Đang làm</option>
                  <option value="done">✅ Hoàn thành</option>
                  <option value="cancelled">❌ Đã hủy</option>
                </select>
              </div>

              <div className="form-group">
                <label className="form-label">Mức ưu tiên (Priority)</label>
                <select
                  id="task-priority"
                  className="form-select"
                  value={form.priority}
                  onChange={e => set('priority', e.target.value)}
                >
                  <option value="low">🟢 Low (Thấp)</option>
                  <option value="medium">🔵 Medium (Trung bình)</option>
                  <option value="high">🟠 High (Cao)</option>
                  <option value="urgent">🔴 Urgent (Khẩn cấp)</option>
                </select>
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
              <div className="form-group">
                <label className="form-label">Ngày thực hiện (Date)</label>
                <input
                  id="task-due"
                  type="date"
                  className="form-input"
                  value={form.due_date}
                  onChange={e => set('due_date', e.target.value)}
                />
              </div>

              <div className="form-group">
                <label className="form-label">Story Point</label>
                <select
                  id="task-story-points"
                  className="form-select"
                  value={form.story_points}
                  onChange={e => set('story_points', e.target.value)}
                >
                  <option value="">— Chưa ước tính —</option>
                  {STORY_POINTS_OPTIONS.map(sp => (
                    <option key={sp} value={sp}>🎯 {sp} SP</option>
                  ))}
                </select>
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
              <div className="form-group">
                <label className="form-label">Giờ bắt đầu (Start Time)</label>
                <input
                  id="task-start-time"
                  type="time"
                  className={`form-input ${errors.time ? 'input-error' : ''}`}
                  value={form.start_time}
                  onChange={e => set('start_time', e.target.value)}
                />
              </div>

              <div className="form-group">
                <label className="form-label">Giờ kết thúc (End Time)</label>
                <input
                  id="task-end-time"
                  type="time"
                  className={`form-input ${errors.time ? 'input-error' : ''}`}
                  value={form.end_time}
                  onChange={e => set('end_time', e.target.value)}
                />
              </div>
            </div>
            {errors.time && <div className="field-error-text" style={{ marginTop: '-0.4rem' }}>⚠️ {errors.time}</div>}

            <div className="form-group">
              <label className="form-label">Danh mục (Category)</label>
              <select
                id="task-category"
                className="form-select"
                value={form.category_id}
                onChange={e => set('category_id', e.target.value)}
              >
                <option value="">— Không phân loại —</option>
                {categories.map(c => (
                  <option key={c.id} value={c.id}>
                    {c.icon || '📁'} {c.name}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="modal-footer" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div>
              {isEdit && onViewHistory && (
                <button
                  type="button"
                  className="btn btn-ghost"
                  onClick={() => onViewHistory(task.id)}
                  style={{ fontSize: '0.82rem', color: 'var(--primary)', padding: '0.45rem 0.75rem' }}
                >
                  📜 Xem lịch sử thay đổi
                </button>
              )}
            </div>
            <div style={{ display: 'flex', gap: '0.5rem' }}>
              <button type="button" className="btn btn-ghost" onClick={onClose}>
                Hủy
              </button>
              <button id="task-save-btn" type="submit" className="btn btn-primary" disabled={loading}>
                {loading ? 'Đang lưu...' : isEdit ? 'Lưu thay đổi' : 'Tạo nhiệm vụ'}
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
}

