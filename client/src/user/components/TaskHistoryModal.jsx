import { useState, useEffect } from 'react';
import api from '../services/api';
import toast from 'react-hot-toast';

const FIELD_LABELS = {
  title: 'Tên nhiệm vụ',
  description: 'Mô tả chi tiết',
  status: 'Trạng thái',
  priority: 'Mức độ ưu tiên',
  due_date: 'Ngày thực hiện',
  start_time: 'Giờ bắt đầu',
  end_time: 'Giờ kết thúc',
  story_points: 'Story Points',
  category_id: 'Danh mục',
  assignee_id: 'Người thực hiện',
  sprint_id: 'Sprint',
};

const STATUS_LABELS = {
  todo: '📋 To Do (Cần làm)',
  in_progress: '⚡ In Progress (Đang làm)',
  done: '✅ Done (Hoàn thành)',
  cancelled: '✕ Cancelled (Đã hủy)',
};

const PRIORITY_LABELS = {
  urgent: '🔴 Urgent (Khẩn cấp)',
  high: '🟠 High (Cao)',
  medium: '🔵 Medium (Trung bình)',
  low: '🟢 Low (Thấp)',
};

export default function TaskHistoryModal({ taskId, onClose }) {
  const [loading, setLoading] = useState(true);
  const [taskData, setTaskData] = useState(null);
  const [histories, setHistories] = useState([]);
  const [selectedVersion, setSelectedVersion] = useState(null);
  const [viewFilter, setViewFilter] = useState('changed'); // 'changed' | 'all'

  useEffect(() => {
    if (!taskId) return;
    fetchHistory();
  }, [taskId]);

  // Close on Escape key
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onClose]);

  const fetchHistory = async () => {
    setLoading(true);
    try {
      const { data } = await api.get(`/tasks/${taskId}/history`);
      setTaskData(data.data.task);
      const list = data.data.histories || [];
      setHistories(list);
      if (list.length > 0) {
        setSelectedVersion(list[0]); // Select newest version by default
      } else {
        setSelectedVersion({ isInitial: true });
      }
    } catch {
      toast.error('Không thể tải lịch sử chỉnh sửa nhiệm vụ');
    } finally {
      setLoading(false);
    }
  };

  const formatDisplayValue = (field, value) => {
    if (value === null || value === undefined || value === '') {
      return <span style={{ color: 'var(--text-muted)', fontStyle: 'italic' }}>[Trống / Chưa đặt]</span>;
    }
    if (field === 'status') {
      return STATUS_LABELS[value] || value;
    }
    if (field === 'priority') {
      return PRIORITY_LABELS[value] || value;
    }
    if (field === 'due_date') {
      try {
        const d = new Date(value);
        return d.toLocaleDateString('vi-VN', { weekday: 'short', year: 'numeric', month: '2-digit', day: '2-digit' });
      } catch {
        return value;
      }
    }
    if (field === 'story_points') {
      return `${value} SP`;
    }
    if (field === 'start_time' || field === 'end_time') {
      return `⏰ ${String(value).slice(0, 5)}`;
    }
    if (field === 'category_id') {
      if (taskData?.Category && String(taskData.Category.id) === String(value)) {
        return `${taskData.Category.icon || '📁'} ${taskData.Category.name}`;
      }
      return `📁 Danh mục #${value}`;
    }
    if (field === 'assignee_id') {
      if (taskData?.assignee && String(taskData.assignee.id) === String(value)) {
        return `👤 ${taskData.assignee.name}`;
      }
      return `👤 Thành viên #${value}`;
    }
    if (field === 'sprint_id') {
      return `🏃 Sprint #${value}`;
    }
    return String(value);
  };

  const getInitials = (user) => {
    if (!user?.name) return '?';
    return user.name.split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase();
  };

  // Build initial creation snapshot based on oldest history or current task
  const initialData = histories.length > 0
    ? (histories[histories.length - 1].before_data || taskData)
    : taskData;

  const currentChangedFields = selectedVersion?.changed_fields || [];
  const fieldsToDisplay = (viewFilter === 'changed' && currentChangedFields.length > 0 && !selectedVersion?.isInitial)
    ? currentChangedFields
    : Object.keys(FIELD_LABELS);

  return (
    <div className="modal-overlay animate-fadein" onClick={e => e.target === e.currentTarget && onClose()}>
      <div
        className="modal task-history-modal"
        style={{
          width: '96vw',
          maxWidth: '1080px',
          height: 'min(92vh, 880px)',
          maxHeight: '92vh',
          display: 'flex',
          flexDirection: 'column',
          padding: 0,
          overflow: 'hidden',
          borderRadius: '16px',
          boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.4)',
        }}
      >
        {/* Modal Header */}
        <div
          style={{
            padding: '1.1rem 1.6rem',
            background: 'var(--bg-card)',
            borderBottom: '1px solid var(--border)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: '1rem',
            flexShrink: 0,
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', flexWrap: 'wrap' }}>
            <span style={{ fontSize: '1.4rem' }}>📜</span>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', flexWrap: 'wrap' }}>
                <h3 style={{ margin: 0, fontSize: '1.15rem', fontWeight: 700 }}>
                  Lịch sử chỉnh sửa nhiệm vụ
                </h3>
                {taskData?.id && (
                  <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)', background: 'var(--bg-hover)', padding: '0.15rem 0.5rem', borderRadius: '6px' }}>
                    #{taskData.id}
                  </span>
                )}
                {taskData?.is_edited ? (
                  <span
                    style={{
                      fontSize: '0.75rem',
                      fontWeight: 600,
                      padding: '0.15rem 0.55rem',
                      borderRadius: '99px',
                      background: 'rgba(245, 158, 11, 0.15)',
                      color: '#f59e0b',
                      border: '1px solid rgba(245, 158, 11, 0.3)',
                    }}
                  >
                    ✏️ (Đã chỉnh sửa • {taskData.edit_count} lần)
                  </span>
                ) : (
                  <span
                    style={{
                      fontSize: '0.75rem',
                      fontWeight: 500,
                      padding: '0.15rem 0.55rem',
                      borderRadius: '99px',
                      background: 'rgba(16, 185, 129, 0.12)',
                      color: '#10b981',
                    }}
                  >
                    ✨ Nguyên bản (Chưa chỉnh sửa)
                  </span>
                )}
              </div>
              {taskData && (
                <div style={{ fontSize: '0.82rem', color: 'var(--text-secondary)', marginTop: '0.25rem' }}>
                  <strong>{taskData.title}</strong> • Tạo lúc: {new Date(taskData.createdAt).toLocaleString('vi-VN')} {taskData.owner && `bởi ${taskData.owner.name}`}
                </div>
              )}
            </div>
          </div>
          <button className="btn-icon" onClick={onClose} style={{ fontSize: '1.1rem' }} title="Đóng cửa sổ">✕</button>
        </div>

        {/* Modal Body */}
        <div style={{ flex: 1, minHeight: 0, overflow: 'hidden', display: 'flex' }}>
          {loading ? (
            <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '3rem', color: 'var(--text-muted)' }}>
              <div style={{ textAlign: 'center' }}>
                <div style={{ fontSize: '2rem', marginBottom: '0.5rem' }}>⏳</div>
                Đang tải dữ liệu lịch sử nhiệm vụ...
              </div>
            </div>
          ) : (
            <div style={{ flex: 1, display: 'flex', width: '100%', height: '100%', overflow: 'hidden' }}>
              {/* Left Column: Version History List / Timeline */}
              <div
                className="task-history-scroll"
                style={{
                  width: '320px',
                  borderRight: '1px solid var(--border)',
                  background: 'var(--bg-secondary)',
                  overflowY: 'auto',
                  display: 'flex',
                  flexDirection: 'column',
                  flexShrink: 0,
                }}
              >
                <div style={{ padding: '0.85rem 1.15rem', borderBottom: '1px solid var(--border)', background: 'var(--bg-card)' }}>
                  <span style={{ fontSize: '0.78rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                    Danh sách phiên bản ({histories.length})
                  </span>
                </div>
                <div style={{ padding: '0.65rem' }}>
                  {histories.map((h) => {
                    const isSelected = selectedVersion?.id === h.id && !selectedVersion?.isInitial;
                    const editDate = new Date(h.createdAt);

                    return (
                      <div
                        key={h.id}
                        onClick={() => setSelectedVersion(h)}
                        style={{
                          padding: '0.85rem',
                          borderRadius: '10px',
                          marginBottom: '0.5rem',
                          cursor: 'pointer',
                          background: isSelected ? 'var(--primary-light, rgba(59, 130, 246, 0.12))' : 'var(--bg-card)',
                          border: isSelected ? '1.5px solid var(--primary, #3b82f6)' : '1px solid var(--border)',
                          transition: 'all 0.15s ease',
                          display: 'flex',
                          flexDirection: 'column',
                          gap: '0.45rem',
                        }}
                      >
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                          <span
                            style={{
                              fontSize: '0.78rem',
                              fontWeight: 700,
                              color: isSelected ? 'var(--primary, #3b82f6)' : 'var(--text-primary)',
                              display: 'flex',
                              alignItems: 'center',
                              gap: '0.35rem',
                            }}
                          >
                            <span>Lần chỉnh sửa #{h.version}</span>
                            {h.version === taskData?.edit_count && (
                              <span style={{ fontSize: '0.65rem', background: '#10b981', color: '#fff', padding: '0.05rem 0.35rem', borderRadius: '4px' }}>
                                Mới nhất
                              </span>
                            )}
                          </span>
                          <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>
                            {editDate.toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' })}
                          </span>
                        </div>

                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                          <div
                            className="member-avatar-sm"
                            style={{ width: 22, height: 22, fontSize: '0.68rem', borderRadius: '50%' }}
                            title={h.editor?.name || 'Người dùng'}
                          >
                            {h.editor?.avatar_url ? (
                              <img src={h.editor.avatar_url} alt="" />
                            ) : (
                              getInitials(h.editor)
                            )}
                          </div>
                          <span style={{ fontSize: '0.78rem', color: 'var(--text-secondary)', fontWeight: 500, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                            {h.editor?.name || 'Ẩn danh'}
                          </span>
                        </div>

                        <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>
                          📅 {editDate.toLocaleDateString('vi-VN')}
                        </div>

                        {/* Changed Fields Badges */}
                        <div style={{ display: 'flex', gap: '0.25rem', flexWrap: 'wrap', marginTop: '0.2rem' }}>
                          {(h.changed_fields || []).slice(0, 3).map((f) => (
                            <span
                              key={f}
                              style={{
                                fontSize: '0.68rem',
                                padding: '0.1rem 0.4rem',
                                background: isSelected ? 'rgba(59, 130, 246, 0.2)' : 'var(--bg-hover)',
                                borderRadius: '4px',
                                color: isSelected ? 'var(--primary, #3b82f6)' : 'var(--text-secondary)',
                              }}
                            >
                              {FIELD_LABELS[f] || f}
                            </span>
                          ))}
                          {(h.changed_fields || []).length > 3 && (
                            <span style={{ fontSize: '0.68rem', color: 'var(--text-muted)', alignSelf: 'center' }}>
                              +{h.changed_fields.length - 3}
                            </span>
                          )}
                        </div>
                      </div>
                    );
                  })}

                  {/* Initial Creation Version (Ban đầu) */}
                  <div
                    onClick={() => setSelectedVersion({ isInitial: true })}
                    style={{
                      padding: '0.85rem',
                      borderRadius: '10px',
                      cursor: 'pointer',
                      background: selectedVersion?.isInitial ? 'var(--primary-light, rgba(59, 130, 246, 0.12))' : 'var(--bg-card)',
                      border: selectedVersion?.isInitial ? '1.5px solid var(--primary, #3b82f6)' : '1px solid var(--border)',
                      transition: 'all 0.15s ease',
                      display: 'flex',
                      flexDirection: 'column',
                      gap: '0.45rem',
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                      <span
                        style={{
                          fontSize: '0.78rem',
                          fontWeight: 700,
                          color: selectedVersion?.isInitial ? 'var(--primary, #3b82f6)' : 'var(--text-primary)',
                        }}
                      >
                        ✨ Khởi tạo ban đầu (#0)
                      </span>
                      <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>
                        {taskData && new Date(taskData.createdAt).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' })}
                      </span>
                    </div>
                    <div style={{ fontSize: '0.76rem', color: 'var(--text-secondary)' }}>
                      Tạo bởi: <strong>{taskData?.owner?.name || 'Người dùng'}</strong>
                    </div>
                    <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>
                      📅 {taskData && new Date(taskData.createdAt).toLocaleDateString('vi-VN')}
                    </div>
                  </div>
                </div>
              </div>

              {/* Right Column: Side-by-Side Before & After Comparison */}
              <div
                className="task-history-scroll"
                style={{
                  flex: 1,
                  display: 'flex',
                  flexDirection: 'column',
                  overflowY: 'auto',
                  background: 'var(--bg-card)',
                  padding: '1.25rem 1.6rem 3.5rem 1.6rem',
                }}
              >
                {selectedVersion?.isInitial ? (
                  <div>
                    {/* Initial Version Banner */}
                    <div
                      style={{
                        padding: '1rem 1.25rem',
                        background: 'rgba(16, 185, 129, 0.08)',
                        borderRadius: '12px',
                        border: '1px solid rgba(16, 185, 129, 0.25)',
                        marginBottom: '1.25rem',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        flexWrap: 'wrap',
                        gap: '0.75rem',
                      }}
                    >
                      <div>
                        <div style={{ fontSize: '0.92rem', fontWeight: 700, color: '#10b981' }}>
                          ✨ Phiên bản khởi tạo ban đầu: Nhiệm vụ được tạo thành công
                        </div>
                        <div style={{ fontSize: '0.78rem', color: 'var(--text-secondary)', marginTop: '0.2rem' }}>
                          Khởi tạo bởi: <strong>{taskData?.owner?.name || 'Người dùng'}</strong> ({taskData?.owner?.email})
                          {' • '}
                          Thời gian: <strong>{taskData && new Date(taskData.createdAt).toLocaleString('vi-VN')}</strong>
                        </div>
                      </div>
                      <span style={{ fontSize: '0.78rem', padding: '0.2rem 0.6rem', borderRadius: '6px', background: 'var(--bg-card)', border: '1px solid var(--border)' }}>
                        Trạng thái ban đầu
                      </span>
                    </div>

                    {/* Snapshot of Initial Fields */}
                    <div style={{ border: '1.5px solid var(--border)', borderRadius: '12px', overflow: 'hidden', background: 'var(--bg-card)' }}>
                      <div style={{ padding: '0.75rem 1rem', background: 'var(--bg-secondary)', borderBottom: '1px solid var(--border)', fontWeight: 700, fontSize: '0.85rem' }}>
                        📋 Thông tin nhiệm vụ tại thời điểm khởi tạo
                      </div>
                      <div style={{ padding: '0.85rem 1rem', display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '0.75rem' }}>
                        {Object.keys(FIELD_LABELS).map((field) => (
                          <div key={field} style={{ padding: '0.6rem 0.75rem', borderRadius: '8px', background: 'var(--bg-secondary)', border: '1px solid var(--border)' }}>
                            <div style={{ fontSize: '0.74rem', color: 'var(--text-muted)', fontWeight: 600, marginBottom: '0.2rem' }}>
                              {FIELD_LABELS[field]}
                            </div>
                            <div style={{ fontSize: '0.85rem', color: 'var(--text-primary)', wordBreak: 'break-word' }}>
                              {formatDisplayValue(field, initialData?.[field])}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                ) : selectedVersion ? (
                  <div>
                    {/* Version Banner Info */}
                    <div
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        flexWrap: 'wrap',
                        gap: '0.75rem',
                        padding: '0.85rem 1.25rem',
                        background: 'var(--bg-secondary)',
                        borderRadius: '12px',
                        border: '1px solid var(--border)',
                        marginBottom: '1rem',
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                        <div className="member-avatar-sm" style={{ width: 34, height: 34, borderRadius: '50%' }}>
                          {selectedVersion.editor?.avatar_url ? (
                            <img src={selectedVersion.editor.avatar_url} alt="" />
                          ) : (
                            getInitials(selectedVersion.editor)
                          )}
                        </div>
                        <div>
                          <div style={{ fontSize: '0.9rem', fontWeight: 700, color: 'var(--text-primary)' }}>
                            Phiên bản #{selectedVersion.version}: {selectedVersion.summary || 'Cập nhật thông tin'}
                          </div>
                          <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)', marginTop: '0.1rem' }}>
                            Người chỉnh sửa: <strong>{selectedVersion.editor?.name || 'Ẩn danh'}</strong> ({selectedVersion.editor?.email})
                            {' • '}
                            Thời gian: <strong>{new Date(selectedVersion.createdAt).toLocaleString('vi-VN')}</strong>
                          </div>
                        </div>
                      </div>

                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                        <span style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>
                          Đã thay đổi <strong style={{ color: '#d97706' }}>{selectedVersion.changed_fields?.length || 0}</strong> trường
                        </span>
                      </div>
                    </div>

                    {/* Filter Toggle Bar: View Changed Only vs View All */}
                    <div
                      style={{
                        marginBottom: '1rem',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        flexWrap: 'wrap',
                        gap: '0.75rem',
                        background: 'var(--bg-secondary)',
                        padding: '0.4rem 0.6rem',
                        borderRadius: '8px',
                        border: '1px solid var(--border)',
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                        <button
                          type="button"
                          onClick={() => setViewFilter('changed')}
                          style={{
                            padding: '0.35rem 0.75rem',
                            fontSize: '0.78rem',
                            fontWeight: 600,
                            borderRadius: '6px',
                            border: 'none',
                            cursor: 'pointer',
                            background: viewFilter === 'changed' ? 'var(--primary, #3b82f6)' : 'transparent',
                            color: viewFilter === 'changed' ? '#fff' : 'var(--text-secondary)',
                            transition: 'all 0.15s ease',
                          }}
                        >
                          ⚡ Chỉ xem trường thay đổi ({currentChangedFields.length})
                        </button>
                        <button
                          type="button"
                          onClick={() => setViewFilter('all')}
                          style={{
                            padding: '0.35rem 0.75rem',
                            fontSize: '0.78rem',
                            fontWeight: 600,
                            borderRadius: '6px',
                            border: 'none',
                            cursor: 'pointer',
                            background: viewFilter === 'all' ? 'var(--primary, #3b82f6)' : 'transparent',
                            color: viewFilter === 'all' ? '#fff' : 'var(--text-secondary)',
                            transition: 'all 0.15s ease',
                          }}
                        >
                          📋 Xem toàn bộ thông tin (11 trường)
                        </button>
                      </div>

                      <span style={{ fontSize: '0.74rem', color: 'var(--text-muted)' }}>
                        {viewFilter === 'changed' ? 'Đang lọc các trường có thay đổi' : 'Ô viền đỏ/xanh là trường có thay đổi'}
                      </span>
                    </div>

                    {/* Comparison Table Grid: Side by Side (or stacked on mobile) */}
                    <div
                      className="comparison-grid"
                      style={{
                        display: 'grid',
                        gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))',
                        gap: '1rem',
                      }}
                    >
                      {/* Left Box: Before (Trước chỉnh sửa) */}
                      <div
                        style={{
                          border: '1.5px solid var(--border)',
                          borderRadius: '12px',
                          overflow: 'hidden',
                          background: 'var(--bg-card)',
                        }}
                      >
                        <div
                          style={{
                            padding: '0.75rem 1rem',
                            background: 'rgba(239, 68, 68, 0.08)',
                            borderBottom: '1.5px solid rgba(239, 68, 68, 0.2)',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'space-between',
                          }}
                        >
                          <span style={{ fontWeight: 700, fontSize: '0.85rem', color: '#ef4444' }}>
                            ⏮️ Bảng bên trái – Before (Trước chỉnh sửa)
                          </span>
                        </div>

                        <div style={{ padding: '0.75rem 1rem', display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                          {fieldsToDisplay.map((field) => {
                            const isChanged = selectedVersion.changed_fields?.includes(field);
                            const val = selectedVersion.before_data?.[field];

                            return (
                              <div
                                key={field}
                                style={{
                                  padding: '0.6rem 0.75rem',
                                  borderRadius: '8px',
                                  background: isChanged ? 'rgba(239, 68, 68, 0.06)' : 'var(--bg-secondary)',
                                  border: isChanged ? '1.5px dashed rgba(239, 68, 68, 0.45)' : '1px solid var(--border)',
                                }}
                              >
                                <div style={{ fontSize: '0.74rem', color: isChanged ? '#ef4444' : 'var(--text-muted)', fontWeight: 600, marginBottom: '0.2rem' }}>
                                  {FIELD_LABELS[field]} {isChanged && <span style={{ fontSize: '0.68rem', color: '#ef4444', fontWeight: 700 }}>(đã thay đổi)</span>}
                                </div>
                                <div style={{ fontSize: '0.85rem', color: 'var(--text-primary)', wordBreak: 'break-word' }}>
                                  {formatDisplayValue(field, val)}
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      </div>

                      {/* Right Box: After (Sau chỉnh sửa) */}
                      <div
                        style={{
                          border: '1.5px solid var(--border)',
                          borderRadius: '12px',
                          overflow: 'hidden',
                          background: 'var(--bg-card)',
                        }}
                      >
                        <div
                          style={{
                            padding: '0.75rem 1rem',
                            background: 'rgba(16, 185, 129, 0.08)',
                            borderBottom: '1.5px solid rgba(16, 185, 129, 0.2)',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'space-between',
                          }}
                        >
                          <span style={{ fontWeight: 700, fontSize: '0.85rem', color: '#10b981' }}>
                            ⏭️ Bảng bên phải – After (Sau chỉnh sửa)
                          </span>
                        </div>

                        <div style={{ padding: '0.75rem 1rem', display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                          {fieldsToDisplay.map((field) => {
                            const isChanged = selectedVersion.changed_fields?.includes(field);
                            const val = selectedVersion.after_data?.[field];

                            return (
                              <div
                                key={field}
                                style={{
                                  padding: '0.6rem 0.75rem',
                                  borderRadius: '8px',
                                  background: isChanged ? 'rgba(16, 185, 129, 0.08)' : 'var(--bg-secondary)',
                                  border: isChanged ? '1.5px solid rgba(16, 185, 129, 0.5)' : '1px solid var(--border)',
                                }}
                              >
                                <div style={{ fontSize: '0.74rem', color: isChanged ? '#10b981' : 'var(--text-muted)', fontWeight: 600, marginBottom: '0.2rem' }}>
                                  {FIELD_LABELS[field]} {isChanged && <span style={{ fontSize: '0.68rem', color: '#10b981', fontWeight: 700 }}>★ Giá trị mới</span>}
                                </div>
                                <div style={{ fontSize: '0.85rem', color: 'var(--text-primary)', fontWeight: isChanged ? 600 : 400, wordBreak: 'break-word' }}>
                                  {formatDisplayValue(field, val)}
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div style={{ padding: '2rem', textAlign: 'center', color: 'var(--text-muted)' }}>
                    Chọn một phiên bản bên trái để xem bảng so sánh Before & After
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Modal Footer */}
        <div
          style={{
            padding: '0.85rem 1.5rem',
            background: 'var(--bg-secondary)',
            borderTop: '1px solid var(--border)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: '1rem',
            flexShrink: 0,
          }}
        >
          <span style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>
            💡 Dữ liệu lịch sử được ghi nhận tự động và bảo toàn vĩnh viễn trong hệ thống.
          </span>
          <button className="btn btn-ghost" onClick={onClose} style={{ fontSize: '0.85rem' }}>
            Đóng cửa sổ
          </button>
        </div>
      </div>
    </div>
  );
}
