import { useState } from 'react';

export default function StatsModal({ stats, tasks = [], categories = [], streak = 1, onClose }) {
  const [activeTab, setActiveTab] = useState('overview'); // 'overview' | 'achievements'

  const total = stats.total || 0;
  const done = stats.done || 0;
  const inProgress = stats.in_progress || 0;
  const todo = stats.todo || 0;
  const overdue = stats.overdue || 0;

  const completionRate = total > 0 ? Math.round((done / total) * 100) : 0;

  // Calculate Priority breakdown
  const priorityCounts = {
    urgent: tasks.filter(t => t.priority === 'urgent').length,
    high: tasks.filter(t => t.priority === 'high').length,
    medium: tasks.filter(t => t.priority === 'medium').length,
    low: tasks.filter(t => t.priority === 'low').length,
  };

  // Category breakdown
  const categoryCounts = categories.map(cat => ({
    name: cat.name,
    icon: cat.icon,
    color: cat.color,
    count: tasks.filter(t => t.category_id === cat.id).length,
  }));
  const uncategorizedCount = tasks.filter(t => !t.category_id).length;
  if (uncategorizedCount > 0) {
    categoryCounts.push({ name: 'Không phân loại', icon: '📁', color: '#94a3b8', count: uncategorizedCount });
  }

  // Achievements
  const achievements = [
    { id: 1, title: 'Bước khởi đầu', desc: 'Tạo nhiệm vụ đầu tiên', icon: '🌱', unlocked: total >= 1 },
    { id: 2, title: 'Đập tan trì hoãn', desc: 'Hoàn thành ít nhất 1 nhiệm vụ', icon: '🎯', unlocked: done >= 1 },
    { id: 3, title: 'Chiến binh năng suất', desc: 'Hoàn thành 5 nhiệm vụ', icon: '⚡', unlocked: done >= 5, progress: `${Math.min(done, 5)}/5` },
    { id: 4, title: 'Bậc thầy hoàn thành', desc: 'Hoàn thành 10 nhiệm vụ', icon: '🏆', unlocked: done >= 10, progress: `${Math.min(done, 10)}/10` },
    { id: 5, title: 'Giữ lửa đam mê', desc: 'Đạt chuỗi streak 3 ngày liên tiếp', icon: '🔥', unlocked: streak >= 3, progress: `${Math.min(streak, 3)}/3 ngày` },
    { id: 6, title: 'Kỷ luật thép', desc: 'Không có nhiệm vụ nào bị quá hạn', icon: '🛡️', unlocked: total > 0 && overdue === 0 },
  ];

  const unlockedCount = achievements.filter(a => a.unlocked).length;

  // Donut chart math
  const radius = 54;
  const circumference = 2 * Math.PI * radius;
  const doneOffset = total > 0 ? (done / total) * circumference : 0;
  const progressOffset = total > 0 ? (inProgress / total) * circumference : 0;
  const todoOffset = total > 0 ? (todo / total) * circumference : 0;

  return (
    <div className="modal-overlay" onClick={e => e.target === e.currentTarget && onClose()} style={{ zIndex: 250 }}>
      <div className="modal animate-fadein" style={{ maxWidth: 'min(94vw, 640px)' }}>
        <div className="modal-header">
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
            <span style={{ fontSize: '1.3rem' }}>📊</span>
            <div>
              <h3 style={{ fontSize: '1.1rem' }}>Báo cáo Năng suất & Thành tựu</h3>
              <p style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>
                Theo dõi quá trình rèn luyện thói quen và hoàn thành mục tiêu
              </p>
            </div>
          </div>
          <button className="btn-icon" onClick={onClose} title="Đóng">✕</button>
        </div>

        {/* Tab switch */}
        <div style={{ display: 'flex', gap: '0.5rem', padding: '0.75rem 1.25rem 0', borderBottom: '1px solid var(--border)' }}>
          <button
            className={`btn btn-sm ${activeTab === 'overview' ? 'btn-primary' : 'btn-ghost'}`}
            onClick={() => setActiveTab('overview')}
          >
            📈 Biểu đồ thống kê
          </button>
          <button
            className={`btn btn-sm ${activeTab === 'achievements' ? 'btn-primary' : 'btn-ghost'}`}
            onClick={() => setActiveTab('achievements')}
          >
            🏆 Thành tựu ({unlockedCount}/{achievements.length})
          </button>
        </div>

        <div className="modal-body" style={{ maxHeight: '70vh', overflowY: 'auto' }}>
          {activeTab === 'overview' ? (
            <>
              {/* Productivity Score Highlight */}
              <div
                style={{
                  background: 'var(--bg-elevated)',
                  border: '1px solid var(--border)',
                  borderRadius: 'var(--radius)',
                  padding: '1rem 1.25rem',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  flexWrap: 'wrap',
                  gap: '1rem',
                }}
              >
                <div>
                  <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', fontWeight: 600, textTransform: 'uppercase' }}>
                    Chuỗi ngày rèn luyện
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginTop: '0.2rem' }}>
                    <span style={{ fontSize: '1.8rem' }}>🔥</span>
                    <div>
                      <div style={{ fontSize: '1.3rem', fontWeight: 700, color: '#f97316' }}>
                        {streak} ngày liên tiếp
                      </div>
                      <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
                        Hoàn thành nhiệm vụ mỗi ngày để duy trì ngọn lửa!
                      </div>
                    </div>
                  </div>
                </div>

                <div style={{ textAlign: 'right' }}>
                  <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', fontWeight: 600, textTransform: 'uppercase' }}>
                    Điểm hiệu suất
                  </div>
                  <div style={{ fontSize: '1.8rem', fontWeight: 800, color: 'var(--primary)' }}>
                    {completionRate}%
                  </div>
                  <div style={{ fontSize: '0.74rem', color: 'var(--text-secondary)' }}>
                    {completionRate >= 80 ? '🌟 Xuất sắc!' : completionRate >= 50 ? '⚡ Khá tốt!' : '💪 Cần cố gắng hơn'}
                  </div>
                </div>
              </div>

              {/* Status Donut Chart & Legend */}
              <div
                style={{
                  background: 'var(--bg-card)',
                  border: '1px solid var(--border)',
                  borderRadius: 'var(--radius)',
                  padding: '1.25rem',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '1.5rem',
                  flexWrap: 'wrap',
                }}
              >
                {/* SVG Donut */}
                <div style={{ position: 'relative', width: 140, height: 140, flexShrink: 0, margin: '0 auto' }}>
                  <svg width="140" height="140" viewBox="0 0 140 140" style={{ transform: 'rotate(-90deg)' }}>
                    {/* Background Circle */}
                    <circle cx="70" cy="70" r={radius} stroke="var(--border)" strokeWidth="16" fill="transparent" />

                    {total > 0 ? (
                      <>
                        {/* Done segment (Green) */}
                        <circle
                          cx="70" cy="70" r={radius}
                          stroke="#10b981"
                          strokeWidth="16"
                          fill="transparent"
                          strokeDasharray={`${doneOffset} ${circumference}`}
                          strokeDashoffset={0}
                        />
                        {/* In Progress segment (Blue) */}
                        <circle
                          cx="70" cy="70" r={radius}
                          stroke="#3b82f6"
                          strokeWidth="16"
                          fill="transparent"
                          strokeDasharray={`${progressOffset} ${circumference}`}
                          strokeDashoffset={-doneOffset}
                        />
                        {/* Todo segment (Slate) */}
                        <circle
                          cx="70" cy="70" r={radius}
                          stroke="#94a3b8"
                          strokeWidth="16"
                          fill="transparent"
                          strokeDasharray={`${todoOffset} ${circumference}`}
                          strokeDashoffset={-(doneOffset + progressOffset)}
                        />
                      </>
                    ) : null}
                  </svg>
                  <div
                    style={{
                      position: 'absolute', inset: 0,
                      display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
                    }}
                  >
                    <span style={{ fontSize: '1.3rem', fontWeight: 800 }}>{total}</span>
                    <span style={{ fontSize: '0.68rem', color: 'var(--text-muted)', textTransform: 'uppercase' }}>Nhiệm vụ</span>
                  </div>
                </div>

                {/* Legend & Breakdown */}
                <div style={{ flex: 1, minWidth: 200, display: 'flex', flexDirection: 'column', gap: '0.55rem' }}>
                  <h4 style={{ fontSize: '0.88rem', marginBottom: '0.2rem' }}>Phân bổ trạng thái</h4>
                  {[
                    { label: 'Hoàn thành', count: done, color: '#10b981', pct: total ? Math.round((done / total) * 100) : 0 },
                    { label: 'Đang làm', count: inProgress, color: '#3b82f6', pct: total ? Math.round((inProgress / total) * 100) : 0 },
                    { label: 'Cần làm', count: todo, color: '#94a3b8', pct: total ? Math.round((todo / total) * 100) : 0 },
                    { label: 'Quá hạn', count: overdue, color: '#ef4444', pct: total ? Math.round((overdue / total) * 100) : 0 },
                  ].map(item => (
                    <div key={item.label} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: '0.82rem' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.45rem' }}>
                        <span style={{ width: 10, height: 10, borderRadius: '50%', background: item.color }} />
                        <span style={{ color: 'var(--text-secondary)' }}>{item.label}</span>
                      </div>
                      <div style={{ fontWeight: 600 }}>
                        {item.count} <span style={{ color: 'var(--text-muted)', fontWeight: 400 }}>({item.pct}%)</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Priority Distribution Horizontal Bars */}
              <div className="card" style={{ padding: '1.15rem' }}>
                <h4 style={{ fontSize: '0.88rem', marginBottom: '0.75rem' }}>Mức độ ưu tiên</h4>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.6rem' }}>
                  {[
                    { label: 'Khẩn cấp', count: priorityCounts.urgent, color: '#ef4444' },
                    { label: 'Cao', count: priorityCounts.high, color: '#f97316' },
                    { label: 'Trung bình', count: priorityCounts.medium, color: '#eab308' },
                    { label: 'Thấp', count: priorityCounts.low, color: '#22c55e' },
                  ].map(p => {
                    const pct = total > 0 ? (p.count / total) * 100 : 0;
                    return (
                      <div key={p.label}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.78rem', marginBottom: '0.2rem' }}>
                          <span style={{ color: 'var(--text-secondary)' }}>{p.label}</span>
                          <span style={{ fontWeight: 600 }}>{p.count} nhiệm vụ</span>
                        </div>
                        <div style={{ height: 6, background: 'var(--bg-elevated)', borderRadius: 99, overflow: 'hidden' }}>
                          <div style={{ width: `${pct}%`, height: '100%', background: p.color, borderRadius: 99, transition: 'width 0.4s' }} />
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Category Breakdown */}
              {categoryCounts.length > 0 && (
                <div className="card" style={{ padding: '1.15rem' }}>
                  <h4 style={{ fontSize: '0.88rem', marginBottom: '0.75rem' }}>Phân bổ theo danh mục</h4>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem' }}>
                    {categoryCounts.map(c => (
                      <div
                        key={c.name}
                        style={{
                          background: 'var(--bg-elevated)',
                          border: '1px solid var(--border)',
                          borderRadius: 'var(--radius-sm)',
                          padding: '0.45rem 0.75rem',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '0.5rem',
                          fontSize: '0.82rem',
                        }}
                      >
                        <span>{c.icon}</span>
                        <span style={{ fontWeight: 500 }}>{c.name}</span>
                        <span className="badge" style={{ background: 'var(--bg-card)', border: '1px solid var(--border)' }}>
                          {c.count}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </>
          ) : (
            /* Achievements Tab */
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '0.75rem' }}>
              {achievements.map(ach => (
                <div
                  key={ach.id}
                  style={{
                    background: ach.unlocked ? 'var(--bg-card)' : 'var(--bg-elevated)',
                    border: `1px solid ${ach.unlocked ? 'var(--primary)' : 'var(--border)'}`,
                    borderRadius: 'var(--radius)',
                    padding: '0.9rem',
                    opacity: ach.unlocked ? 1 : 0.6,
                    display: 'flex',
                    alignItems: 'flex-start',
                    gap: '0.75rem',
                    boxShadow: ach.unlocked ? 'var(--shadow-sm)' : 'none',
                  }}
                >
                  <div
                    style={{
                      fontSize: '1.8rem',
                      width: 44, height: 44,
                      borderRadius: 'var(--radius-sm)',
                      background: ach.unlocked ? 'var(--primary-light)' : 'var(--border)',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      flexShrink: 0,
                    }}
                  >
                    {ach.icon}
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '0.5rem' }}>
                      <div style={{ fontWeight: 600, fontSize: '0.88rem', color: 'var(--text-primary)' }}>
                        {ach.title}
                      </div>
                      {ach.unlocked ? (
                        <span style={{ fontSize: '0.72rem', color: '#10b981', fontWeight: 700 }}>✓ MỞ KHÓA</span>
                      ) : (
                        <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>🔒 KHÓA</span>
                      )}
                    </div>
                    <div style={{ fontSize: '0.78rem', color: 'var(--text-secondary)', marginTop: '0.2rem' }}>
                      {ach.desc}
                    </div>
                    {ach.progress && !ach.unlocked && (
                      <div style={{ fontSize: '0.72rem', color: 'var(--primary)', marginTop: '0.35rem', fontWeight: 600 }}>
                        Tiến độ: {ach.progress}
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="modal-footer">
          <button className="btn btn-primary" onClick={onClose}>
            Đã hiểu
          </button>
        </div>
      </div>
    </div>
  );
}
