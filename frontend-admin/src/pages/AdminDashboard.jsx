import { useState, useEffect } from 'react';
import api from '../services/api';
import toast from 'react-hot-toast';
import AdminLayout from '../components/AdminLayout';

export default function AdminDashboard() {
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get('/admin/stats')
      .then(res => setStats(res.data.data))
      .catch(() => toast.error('Không thể tải dữ liệu thống kê'))
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <AdminLayout active="dashboard">
        <div className="page-loader">
          <div className="spinner" />
          <p style={{ color: 'var(--text-secondary)' }}>Đang tổng hợp dữ liệu phân tích hệ thống...</p>
        </div>
      </AdminLayout>
    );
  }

  const statCards = [
    { cls: 's1', icon: '👥', value: stats?.totalUsers || 0, label: 'Tổng người dùng' },
    { cls: 's2', icon: '✅', value: stats?.doneTasks || 0, label: 'Nhiệm vụ đã hoàn thành' },
    { cls: 's3', icon: '📊', value: stats?.totalTasks || 0, label: 'Tổng nhiệm vụ toàn hệ thống' },
    { cls: 's4', icon: '🔴', value: stats?.overdueTasks || 0, label: 'Nhiệm vụ quá hạn' },
    { cls: 's5', icon: '🆕', value: stats?.newUsersToday || 0, label: 'Người dùng mới hôm nay' },
  ];

  // Priority math for Donut SVG
  const p = stats?.priorityBreakdown || { urgent: 0, high: 0, medium: 0, low: 0 };
  const totalTasksCount = stats?.totalTasks || 1;
  const radius = 52;
  const circumference = 2 * Math.PI * radius;
  const urgentOffset = (p.urgent / totalTasksCount) * circumference;
  const highOffset = (p.high / totalTasksCount) * circumference;
  const mediumOffset = (p.medium / totalTasksCount) * circumference;
  const lowOffset = (p.low / totalTasksCount) * circumference;

  // Max value in 7 days for bar chart scale
  const max7Day = Math.max(
    ...(stats?.activity7Days || []).map(d => Math.max(d.created, d.done)),
    5
  );

  return (
    <AdminLayout active="dashboard">
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1.25rem', flexWrap: 'wrap', gap: '0.75rem' }}>
        <div>
          <h2>📊 Bảng Phân Tích & Giám Sát Người Dùng</h2>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.85rem' }}>
            Theo dõi hành vi, nhu cầu thực tế và hiệu suất của người dùng để định hướng tính năng tương lai
          </p>
        </div>
        <div style={{ display: 'flex', gap: '0.5rem' }}>
          <a href="/tasks" className="btn btn-secondary btn-sm">
            📋 Quản trị nhiệm vụ
          </a>
          <a href="/system" className="btn btn-primary btn-sm">
            ⚙️ Giám sát hệ thống
          </a>
        </div>
      </div>

      {/* Top 5 Metric Cards */}
      <div className="stats-grid">
        {statCards.map(s => (
          <div key={s.cls} className={`stat-card ${s.cls}`}>
            <div className="stat-icon">{s.icon}</div>
            <div>
              <div className="stat-value">{s.value.toLocaleString()}</div>
              <div className="stat-label">{s.label}</div>
            </div>
          </div>
        ))}
      </div>

      {/* 2-Column Analytic Charts */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(360px, 1fr))', gap: '1.25rem', marginBottom: '1.25rem' }}>
        
        {/* CHART 1: 7-Day Activity & Growth Trend Bar Chart */}
        <div className="card" style={{ padding: '1.25rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1rem' }}>
            <div>
              <h4 style={{ fontSize: '0.95rem' }}>📈 Xu Hướng Hoạt Động (7 Ngày Qua)</h4>
              <p style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>
                So sánh số lượng nhiệm vụ được tạo mới và hoàn thành mỗi ngày
              </p>
            </div>
            <div style={{ display: 'flex', gap: '0.75rem', fontSize: '0.75rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
                <span style={{ width: 10, height: 10, borderRadius: 2, background: 'var(--primary)' }} />
                <span>Tạo mới</span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
                <span style={{ width: 10, height: 10, borderRadius: 2, background: '#10b981' }} />
                <span>Hoàn thành</span>
              </div>
            </div>
          </div>

          {/* Bar Chart Bars */}
          <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', height: 170, paddingTop: '1rem', borderBottom: '1px solid var(--border)' }}>
            {(stats?.activity7Days || []).map(day => {
              const hCreated = Math.round((day.created / max7Day) * 120);
              const hDone = Math.round((day.done / max7Day) * 120);

              return (
                <div key={day.date} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.35rem', flex: 1 }}>
                  <div style={{ display: 'flex', alignItems: 'flex-end', gap: '4px', height: 130 }}>
                    {/* Created Bar */}
                    <div
                      title={`Ngày ${day.date}: ${day.created} việc tạo mới`}
                      style={{
                        width: 14,
                        height: `${Math.max(hCreated, 4)}px`,
                        background: 'var(--primary)',
                        borderRadius: '3px 3px 0 0',
                        transition: 'height 0.4s ease',
                      }}
                    />
                    {/* Done Bar */}
                    <div
                      title={`Ngày ${day.date}: ${day.done} việc hoàn thành`}
                      style={{
                        width: 14,
                        height: `${Math.max(hDone, 4)}px`,
                        background: '#10b981',
                        borderRadius: '3px 3px 0 0',
                        transition: 'height 0.4s ease',
                      }}
                    />
                  </div>
                  <span style={{ fontSize: '0.72rem', color: 'var(--text-secondary)' }}>{day.date}</span>
                </div>
              );
            })}
          </div>

          <div style={{ fontSize: '0.76rem', color: 'var(--text-muted)', marginTop: '0.65rem', textAlign: 'center' }}>
            💡 Dữ liệu giúp nhận biết ngày trong tuần người dùng tập trung làm việc cao nhất
          </div>
        </div>

        {/* CHART 2: Priority Breakdown Donut Chart */}
        <div className="card" style={{ padding: '1.25rem' }}>
          <h4 style={{ fontSize: '0.95rem', marginBottom: '0.3rem' }}>🎯 Phân Bổ Mức Độ Ưu Tiên Của Người Dùng</h4>
          <p style={{ fontSize: '0.78rem', color: 'var(--text-muted)', marginBottom: '1rem' }}>
            Hiểu người dùng đang dùng app cho việc khẩn cấp hay thường ngày
          </p>

          <div style={{ display: 'flex', alignItems: 'center', gap: '1.5rem', flexWrap: 'wrap' }}>
            {/* Donut SVG */}
            <div style={{ position: 'relative', width: 130, height: 130, flexShrink: 0, margin: '0 auto' }}>
              <svg width="130" height="130" viewBox="0 0 130 130" style={{ transform: 'rotate(-90deg)' }}>
                <circle cx="65" cy="65" r={radius} stroke="var(--border)" strokeWidth="15" fill="transparent" />
                {stats?.totalTasks > 0 ? (
                  <>
                    <circle
                      cx="65" cy="65" r={radius}
                      stroke="#ef4444" strokeWidth="15" fill="transparent"
                      strokeDasharray={`${urgentOffset} ${circumference}`}
                      strokeDashoffset={0}
                    />
                    <circle
                      cx="65" cy="65" r={radius}
                      stroke="#f97316" strokeWidth="15" fill="transparent"
                      strokeDasharray={`${highOffset} ${circumference}`}
                      strokeDashoffset={-urgentOffset}
                    />
                    <circle
                      cx="65" cy="65" r={radius}
                      stroke="#eab308" strokeWidth="15" fill="transparent"
                      strokeDasharray={`${mediumOffset} ${circumference}`}
                      strokeDashoffset={-(urgentOffset + highOffset)}
                    />
                    <circle
                      cx="65" cy="65" r={radius}
                      stroke="#22c55e" strokeWidth="15" fill="transparent"
                      strokeDasharray={`${lowOffset} ${circumference}`}
                      strokeDashoffset={-(urgentOffset + highOffset + mediumOffset)}
                    />
                  </>
                ) : null}
              </svg>
              <div style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
                <span style={{ fontSize: '1.25rem', fontWeight: 800 }}>{stats?.totalTasks || 0}</span>
                <span style={{ fontSize: '0.65rem', color: 'var(--text-muted)', textTransform: 'uppercase' }}>Nhiệm vụ</span>
              </div>
            </div>

            {/* Legend & Count */}
            <div style={{ flex: 1, minWidth: 160, display: 'flex', flexDirection: 'column', gap: '0.45rem' }}>
              {[
                { label: 'Khẩn cấp', count: p.urgent, color: '#ef4444' },
                { label: 'Cao', count: p.high, color: '#f97316' },
                { label: 'Trung bình', count: p.medium, color: '#eab308' },
                { label: 'Thấp', count: p.low, color: '#22c55e' },
              ].map(item => {
                const pct = stats?.totalTasks ? Math.round((item.count / stats.totalTasks) * 100) : 0;
                return (
                  <div key={item.label} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: '0.82rem' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                      <span style={{ width: 8, height: 8, borderRadius: '50%', background: item.color }} />
                      <span style={{ color: 'var(--text-secondary)' }}>{item.label}</span>
                    </div>
                    <div style={{ fontWeight: 600 }}>
                      {item.count} <span style={{ color: 'var(--text-muted)', fontWeight: 400 }}>({pct}%)</span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>

      {/* Row 2: Top Categories & Authentication Insights & Top Users */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '1.25rem', marginBottom: '1.25rem' }}>
        
        {/* Top Categories */}
        <div className="card" style={{ padding: '1.25rem' }}>
          <h4 style={{ fontSize: '0.95rem', marginBottom: '0.3rem' }}>📁 Danh Mục Được Quan Tâm Nhất</h4>
          <p style={{ fontSize: '0.78rem', color: 'var(--text-muted)', marginBottom: '0.85rem' }}>
            Biết lĩnh vực người dùng tạo nhiều nhất để bổ sung mẫu nhiệm vụ sẵn
          </p>

          {(stats?.topCategories || []).length === 0 ? (
            <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Chưa có danh mục nào được tạo</p>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.65rem' }}>
              {stats.topCategories.map(cat => {
                const pct = stats.totalTasks ? Math.round((cat.count / stats.totalTasks) * 100) : 0;
                return (
                  <div key={cat.id}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.82rem', marginBottom: '0.2rem' }}>
                      <span style={{ fontWeight: 500, display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                        <span>{cat.icon || '📁'}</span>
                        <span>{cat.name}</span>
                      </span>
                      <span style={{ fontWeight: 600, color: 'var(--text-secondary)' }}>
                        {cat.count} task ({pct}%)
                      </span>
                    </div>
                    <div style={{ height: 6, background: 'var(--bg-elevated)', borderRadius: 99, overflow: 'hidden' }}>
                      <div style={{ width: `${pct}%`, height: '100%', background: cat.color || 'var(--primary)', borderRadius: 99 }} />
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* User Authentication & Retention */}
        <div className="card" style={{ padding: '1.25rem' }}>
          <h4 style={{ fontSize: '0.95rem', marginBottom: '0.3rem' }}>🔐 Phương Thức Đăng Nhập & Giữ Chân</h4>
          <p style={{ fontSize: '0.78rem', color: 'var(--text-muted)', marginBottom: '0.85rem' }}>
            Theo dõi xu hướng đăng nhập để tối ưu trải nghiệm người dùng
          </p>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.85rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0.65rem 0.85rem', background: 'var(--bg-elevated)', borderRadius: 'var(--radius-sm)' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <span style={{ fontSize: '1.2rem' }}>🔷</span>
                <div>
                  <div style={{ fontWeight: 600, fontSize: '0.85rem' }}>Đăng nhập qua Google OAuth</div>
                  <div style={{ fontSize: '0.74rem', color: 'var(--text-muted)' }}>Thuận tiện, 1 chạm không cần nhớ pass</div>
                </div>
              </div>
              <div style={{ fontSize: '1.15rem', fontWeight: 700, color: '#1d4ed8' }}>
                {stats?.authBreakdown?.google || 0}
              </div>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0.65rem 0.85rem', background: 'var(--bg-elevated)', borderRadius: 'var(--radius-sm)' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <span style={{ fontSize: '1.2rem' }}>🔑</span>
                <div>
                  <div style={{ fontWeight: 600, fontSize: '0.85rem' }}>Đăng nhập qua Email / Mật khẩu</div>
                  <div style={{ fontSize: '0.74rem', color: 'var(--text-muted)' }}>Tài khoản đăng ký truyền thống</div>
                </div>
              </div>
              <div style={{ fontSize: '1.15rem', fontWeight: 700, color: 'var(--text-primary)' }}>
                {stats?.authBreakdown?.email || 0}
              </div>
            </div>

            <div style={{ padding: '0.75rem', background: 'rgba(79, 70, 229, 0.06)', borderRadius: 'var(--radius-sm)', border: '1px solid rgba(79, 70, 229, 0.15)', fontSize: '0.78rem', color: 'var(--text-secondary)' }}>
              ⚡ <strong>Tỷ lệ hoàn thành nhiệm vụ:</strong> {stats?.completionRate || 0}% ({stats?.doneTasks || 0}/{stats?.totalTasks || 0} việc đã xong).
            </div>
          </div>
        </div>

        {/* Top Active Power Users */}
        <div className="card" style={{ padding: '1.25rem' }}>
          <h4 style={{ fontSize: '0.95rem', marginBottom: '0.3rem' }}>🏆 Người Dùng Hoạt Động Tích Cực Nhất</h4>
          <p style={{ fontSize: '0.78rem', color: 'var(--text-muted)', marginBottom: '0.85rem' }}>
            Nhóm Power Users tiềm năng cần chăm sóc và lắng nghe phản hồi
          </p>

          {(stats?.topUsers || []).length === 0 ? (
            <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Chưa có hoạt động người dùng</p>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.55rem' }}>
              {stats.topUsers.map((u, idx) => (
                <div
                  key={u.id}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    padding: '0.5rem 0.65rem',
                    background: 'var(--bg-elevated)',
                    borderRadius: 'var(--radius-sm)',
                    fontSize: '0.82rem',
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <span style={{ fontWeight: 700, color: idx === 0 ? '#f59e0b' : 'var(--text-muted)', width: 16 }}>
                      #{idx + 1}
                    </span>
                    <div>
                      <div style={{ fontWeight: 600 }}>{u.name}</div>
                      <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>{u.email}</div>
                    </div>
                  </div>
                  <div style={{ textAlign: 'right' }}>
                    <div style={{ fontWeight: 700, color: 'var(--primary)' }}>{u.totalTasks} task</div>
                    <div style={{ fontSize: '0.7rem', color: '#10b981' }}>{u.doneTasks} đã xong ({u.rate}%)</div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Row 3: Product Insights & Roadmap Recommendations */}
      <div className="card" style={{ padding: '1.25rem' }}>
        <h4 style={{ fontSize: '1rem', marginBottom: '0.4rem', color: 'var(--text-primary)' }}>
          💡 Gợi Ý Phát Triển Tính Năng Đáp Ứng Nhu Cầu Người Dùng (Product Insights)
        </h4>
        <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', marginBottom: '1rem' }}>
          Dựa trên hành vi sử dụng thực tế của người dùng, Admin có thể lên kế hoạch bổ sung các tính năng sau:
        </p>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: '0.85rem' }}>
          <div style={{ padding: '0.85rem', background: 'var(--bg-elevated)', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border)' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.45rem', fontWeight: 600, fontSize: '0.88rem' }}>
              <span>🔔</span>
              <span>Thông báo nhắc nhở hạn chót</span>
            </div>
            <p style={{ fontSize: '0.78rem', color: 'var(--text-secondary)', marginTop: '0.35rem' }}>
              Hiện có {stats?.overdueTasks || 0} nhiệm vụ bị quá hạn. Cần bổ sung thông báo qua <strong>Web Push / Email</strong> hoặc <strong>Bot Telegram</strong> để nhắc user trước ngày hết hạn 1 ngày.
            </p>
          </div>

          <div style={{ padding: '0.85rem', background: 'var(--bg-elevated)', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border)' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.45rem', fontWeight: 600, fontSize: '0.88rem' }}>
              <span>⏱️</span>
              <span>Đồng hồ tập trung Pomodoro</span>
            </div>
            <p style={{ fontSize: '0.78rem', color: 'var(--text-secondary)', marginTop: '0.35rem' }}>
              Nhiều người dùng chọn mức ưu tiên <em>Khẩn cấp / Cao</em>. Tính năng đồng hồ Pomodoro (25 phút tập trung) sẽ giúp user giải quyết việc nhanh hơn mà không trì hoãn.
            </p>
          </div>

          <div style={{ padding: '0.85rem', background: 'var(--bg-elevated)', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border)' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.45rem', fontWeight: 600, fontSize: '0.88rem' }}>
              <span>📑</span>
              <span>Mẫu danh mục nhiệm vụ sẵn (Templates)</span>
            </div>
            <p style={{ fontSize: '0.78rem', color: 'var(--text-secondary)', marginTop: '0.35rem' }}>
              Dựa vào top danh mục hot nhất, tạo sẵn các bộ Checklist mẫu (ví dụ: Checklist Ôn thi, Checklist Triển khai dự án, Checklist Mua sắm) giúp user tạo việc 1 chạm.
            </p>
          </div>
        </div>
      </div>
    </AdminLayout>
  );
}
