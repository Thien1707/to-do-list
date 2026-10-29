import { useState, useEffect } from 'react';
import api from '../services/api';
import toast from 'react-hot-toast';
import AdminLayout from '../components/AdminLayout';
import ConfirmModal from '../components/ConfirmModal';

export default function SystemPage() {
  const [sysInfo, setSysInfo] = useState(null);
  const [loading, setLoading] = useState(true);
  const [cleaning, setCleaning] = useState(false);
  const [confirmModalConfig, setConfirmModalConfig] = useState(null);

  const fetchSystemInfo = async () => {
    try {
      const { data } = await api.get('/admin/system');
      setSysInfo(data.data);
    } catch {
      toast.error('Không thể lấy thông tin hệ thống');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSystemInfo();
  }, []);

  const handleCleanup = () => {
    setConfirmModalConfig({
      title: 'Dọn dẹp hệ thống',
      message: 'Bạn có chắc muốn dọn dẹp các nhiệm vụ đã hủy khỏi hệ thống?\nThao tác này sẽ xóa vĩnh viễn các tác vụ rác và tối ưu hóa dung lượng cơ sở dữ liệu.',
      confirmText: '🧹 Tiến hành dọn dẹp',
      variant: 'warning',
      icon: '🧹',
      onConfirm: async () => {
        setCleaning(true);
        try {
          const { data } = await api.post('/admin/cleanup');
          toast.success(data.message || 'Đã dọn dẹp hệ thống thành công');
          setConfirmModalConfig(null);
          fetchSystemInfo();
        } catch {
          toast.error('Dọn dẹp thất bại');
        } finally {
          setCleaning(false);
        }
      },
    });
  };

  const handleExportBackup = async () => {
    try {
      toast.loading('Đang chuẩn bị bản sao lưu...', { id: 'backup' });
      const [tasksRes, usersRes] = await Promise.all([
        api.get('/admin/tasks?limit=1000'),
        api.get('/admin/users?limit=1000'),
      ]);

      const backupData = {
        exportedAt: new Date().toISOString(),
        system: sysInfo,
        users: usersRes.data.data.users,
        tasks: tasksRes.data.data.tasks,
      };

      const blob = new Blob([JSON.stringify(backupData, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `taskflow_backup_${new Date().toISOString().split('T')[0]}.json`;
      a.click();
      URL.revokeObjectURL(url);
      toast.success('Đã tải xuống file sao lưu hệ thống (JSON)', { id: 'backup' });
    } catch {
      toast.error('Sao lưu thất bại', { id: 'backup' });
    }
  };

  const formatUptime = (sec) => {
    if (!sec) return '0s';
    const h = Math.floor(sec / 3600);
    const m = Math.floor((sec % 3600) / 60);
    const s = sec % 60;
    return `${h > 0 ? `${h}h ` : ''}${m}m ${s}s`;
  };

  return (
    <AdminLayout active="system">
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1.25rem', flexWrap: 'wrap', gap: '0.75rem' }}>
        <div>
          <h2>⚙️ Giám sát Hệ thống & Dữ liệu</h2>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.85rem' }}>
            Theo dõi tình trạng máy chủ, cơ sở dữ liệu MySQL và các công cụ bảo trì dữ liệu
          </p>
        </div>
        <div style={{ display: 'flex', gap: '0.5rem' }}>
          <button className="btn btn-secondary btn-sm" onClick={handleExportBackup}>
            💾 Sao lưu dữ liệu JSON
          </button>
          <button className="btn btn-primary btn-sm" onClick={fetchSystemInfo}>
            🔄 Làm mới
          </button>
        </div>
      </div>

      {loading ? (
        <div style={{ display: 'flex', justifyContent: 'center', padding: '3rem' }}>
          <div className="spinner" />
        </div>
      ) : (
        <div style={{ display: 'grid', gap: '1.25rem' }}>
          {/* Status grid */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '1rem' }}>
            <div className="card" style={{ padding: '1rem 1.25rem' }}>
              <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)', fontWeight: 600 }}>TRẠNG THÁI DATABASE</div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.45rem', marginTop: '0.4rem' }}>
                <span style={{ width: 10, height: 10, borderRadius: '50%', background: '#10b981' }} />
                <span style={{ fontSize: '1.2rem', fontWeight: 700, color: '#10b981' }}>{sysInfo?.dbStatus}</span>
              </div>
              <div style={{ fontSize: '0.78rem', color: 'var(--text-secondary)', marginTop: '0.2rem' }}>
                {sysInfo?.dbDialect} trên MySQL 3306
              </div>
            </div>

            <div className="card" style={{ padding: '1rem 1.25rem' }}>
              <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)', fontWeight: 600 }}>THỜI GIAN HOẠT ĐỘNG (UPTIME)</div>
              <div style={{ fontSize: '1.2rem', fontWeight: 700, color: 'var(--primary)', marginTop: '0.4rem' }}>
                {formatUptime(sysInfo?.uptimeSeconds)}
              </div>
              <div style={{ fontSize: '0.78rem', color: 'var(--text-secondary)', marginTop: '0.2rem' }}>
                Môi trường: Node.js {sysInfo?.nodeVersion} ({sysInfo?.platform})
              </div>
            </div>

            <div className="card" style={{ padding: '1rem 1.25rem' }}>
              <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)', fontWeight: 600 }}>BỘ NHỚ MÁY CHỦ (RAM HEAP)</div>
              <div style={{ fontSize: '1.2rem', fontWeight: 700, color: '#f59e0b', marginTop: '0.4rem' }}>
                {sysInfo?.memoryUsedMB} MB / {sysInfo?.memoryTotalMB} MB
              </div>
              <div style={{ fontSize: '0.78rem', color: 'var(--text-secondary)', marginTop: '0.2rem' }}>
                Hiệu suất phân bổ RAM ổn định
              </div>
            </div>
          </div>

          {/* Database Entities Count */}
          <div className="card" style={{ padding: '1.25rem' }}>
            <h4 style={{ marginBottom: '1rem' }}>📊 Phân bổ Dữ liệu MySQL (task_manager_db)</h4>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(170px, 1fr))', gap: '0.85rem' }}>
              {[
                { label: 'Tài khoản người dùng', val: sysInfo?.counts?.users, icon: '👥' },
                { label: 'Tổng số nhiệm vụ', val: sysInfo?.counts?.tasks, icon: '📋' },
                { label: 'Nhiệm vụ đã hoàn thành', val: sysInfo?.counts?.doneTasks, icon: '✅' },
                { label: 'Nhiệm vụ đã hủy', val: sysInfo?.counts?.cancelledTasks, icon: '❌' },
                { label: 'Danh mục phân loại', val: sysInfo?.counts?.categories, icon: '📁' },
              ].map(item => (
                <div
                  key={item.label}
                  style={{
                    background: 'var(--bg-elevated)',
                    border: '1px solid var(--border)',
                    borderRadius: 'var(--radius-sm)',
                    padding: '0.75rem 1rem',
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                    <span style={{ fontSize: '1.1rem' }}>{item.icon}</span>
                    <span style={{ fontSize: '0.78rem', color: 'var(--text-secondary)' }}>{item.label}</span>
                  </div>
                  <div style={{ fontSize: '1.35rem', fontWeight: 700, marginTop: '0.35rem', color: 'var(--text-primary)' }}>
                    {item.val || 0}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Maintenance Actions */}
          <div className="card" style={{ padding: '1.25rem' }}>
            <h4 style={{ marginBottom: '0.85rem' }}>🛠️ Công cụ Quản trị & Bảo trì Hệ thống</h4>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.85rem' }}>
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  padding: '0.85rem 1rem',
                  border: '1px solid var(--border)',
                  borderRadius: 'var(--radius-sm)',
                  background: 'var(--bg-elevated)',
                  flexWrap: 'wrap',
                  gap: '0.75rem',
                }}
              >
                <div>
                  <div style={{ fontWeight: 600, fontSize: '0.9rem' }}>🧹 Dọn dẹp nhiệm vụ đã hủy</div>
                  <div style={{ fontSize: '0.78rem', color: 'var(--text-secondary)', marginTop: '0.15rem' }}>
                    Xóa vĩnh viễn các nhiệm vụ ở trạng thái 'Đã hủy' để tiết kiệm dung lượng MySQL. Hiện có: <strong>{sysInfo?.counts?.cancelledTasks || 0}</strong> nhiệm vụ đã hủy.
                  </div>
                </div>
                <button
                  className="btn btn-danger btn-sm"
                  onClick={handleCleanup}
                  disabled={cleaning || sysInfo?.counts?.cancelledTasks === 0}
                >
                  {cleaning ? 'Đang dọn...' : 'Dọn dẹp ngay'}
                </button>
              </div>

              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  padding: '0.85rem 1rem',
                  border: '1px solid var(--border)',
                  borderRadius: 'var(--radius-sm)',
                  background: 'var(--bg-elevated)',
                  flexWrap: 'wrap',
                  gap: '0.75rem',
                }}
              >
                <div>
                  <div style={{ fontWeight: 600, fontSize: '0.9rem' }}>📖 Tài liệu Swagger API dành cho Kỹ thuật viên</div>
                  <div style={{ fontSize: '0.78rem', color: 'var(--text-secondary)', marginTop: '0.15rem' }}>
                    Trang OpenAPI/Swagger đặc tả các endpoint API (chỉ dùng khi phát triển ứng dụng di động hoặc tích hợp bên thứ ba).
                  </div>
                </div>
                <a
                  href="/api/docs"
                  target="_blank"
                  rel="noreferrer"
                  className="btn btn-secondary btn-sm"
                >
                  Mở Swagger API ↗
                </a>
              </div>
            </div>
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
