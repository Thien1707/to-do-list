import { useState, useEffect } from 'react';
import api from '../services/api';
import toast from 'react-hot-toast';

export default function TaskModal({ task, categories = [], onClose, onSave }) {
  const isEdit = !!task;
  const [form, setForm] = useState({
    title: task?.title || '',
    description: task?.description || '',
    priority: task?.priority || 'medium',
    status: task?.status || 'todo',
    due_date: task?.due_date ? task.due_date.split('T')[0] : '',
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

    setLoading(true);
    try {
      const payload = {
        title: form.title.trim(),
        description: form.description.trim() || null,
        priority: form.priority,
        status: form.status,
        due_date: form.due_date || null,
        category_id: form.category_id ? parseInt(form.category_id) : null,
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
    if (errors[k]) {
      setErrors(errs => ({ ...errs, [k]: '' }));
    }
  };

  return (
    <div className="modal-overlay" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="modal animate-fadein">
        <div className="modal-header">
          <h3>{isEdit ? '✏️ Chỉnh sửa nhiệm vụ' : '＋ Thêm nhiệm vụ mới'}</h3>
          <button className="btn-icon" onClick={onClose} title="Đóng">✕</button>
        </div>

        <form onSubmit={handleSubmit} noValidate>
          <div className="modal-body">
            <div className="form-group">
              <label className="form-label" htmlFor="task-title">Tiêu đề nhiệm vụ *</label>
              <input
                id="task-title"
                type="text"
                className={`form-input ${errors.title ? 'input-error' : ''}`}
                placeholder="Ví dụ: Hoàn thành báo cáo đồ án..."
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
                placeholder="Thêm ghi chú, yêu cầu hoặc chi tiết nhiệm vụ..."
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
                <label className="form-label">Mức ưu tiên</label>
                <select
                  id="task-priority"
                  className="form-select"
                  value={form.priority}
                  onChange={e => set('priority', e.target.value)}
                >
                  <option value="low">Thấp</option>
                  <option value="medium">Trung bình</option>
                  <option value="high">Cao</option>
                  <option value="urgent">Khẩn cấp</option>
                </select>
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
              <div className="form-group">
                <label className="form-label">Hạn hoàn thành</label>
                <input
                  id="task-due"
                  type="date"
                  className="form-input"
                  value={form.due_date}
                  onChange={e => set('due_date', e.target.value)}
                />
              </div>

              <div className="form-group">
                <label className="form-label">Danh mục</label>
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
          </div>

          <div className="modal-footer">
            <button type="button" className="btn btn-ghost" onClick={onClose}>
              Hủy
            </button>
            <button id="task-save-btn" type="submit" className="btn btn-primary" disabled={loading}>
              {loading ? 'Đang lưu...' : isEdit ? 'Lưu thay đổi' : 'Tạo nhiệm vụ'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
