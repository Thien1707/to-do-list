import { useState, useEffect, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { useNavigate } from 'react-router-dom';
import { projectService } from '../services/projectService';
import toast from 'react-hot-toast';
import ModalOverlay from '../../components/ModalOverlay';
import {
  FolderKanbanIcon,
  PlusIcon,
  HomeIcon,
  XIcon,
} from '../../components/Icons';

const PROJECT_ICONS = ['📋', '🚀', '💼', '🎯', '💡', '⚡', '🛠️', '🎨', '📊', '🏆', '🔬', '🌟'];
const PROJECT_COLORS = [
  '#4f46e5', '#7c3aed', '#db2777', '#dc2626',
  '#d97706', '#059669', '#0284c7', '#0891b2',
];

function ProjectCard({ project, onClick }) {
  const total = project.taskCount || 0;
  const done = project.doneCount || 0;
  const progress = total > 0 ? Math.round((done / total) * 100) : 0;
  const members = project.ProjectMembers || [];

  return (
    <div
      className="project-card"
      onClick={() => onClick(project)}
      style={{ '--project-color': project.color }}
    >
      <div className="project-card-header">
        <div className="project-card-icon" style={{ background: `${project.color}22`, color: project.color }}>
          {project.icon}
        </div>
        <div className="project-card-meta">
          <h3>{project.name}</h3>
          {project.description && <p>{project.description}</p>}
        </div>
        <div className="project-status-badge" style={{ background: `${project.color}22`, color: project.color }}>
          {project.status === 'active' ? 'Active' : 'Archived'}
        </div>
      </div>

      <div className="project-card-progress">
        <div className="project-progress-bar">
          <div
            className="project-progress-fill"
            style={{ width: `${progress}%`, background: project.color }}
          />
        </div>
        <span className="project-progress-text">{progress}% hoàn thành</span>
      </div>

      <div className="project-card-footer">
        <div className="project-member-stack">
          {members.slice(0, 4).map((m, i) => (
            <div
              key={m.user?.id || i}
              className="member-avatar-sm"
              title={m.user?.name || m.user?.email}
              style={{ zIndex: 10 - i }}
            >
              {m.user?.avatar_url
                ? <img src={m.user.avatar_url} alt={m.user.name} />
                : (m.user?.name?.[0] || '?').toUpperCase()
              }
            </div>
          ))}
          {members.length > 4 && (
            <div className="member-avatar-sm member-avatar-more">+{members.length - 4}</div>
          )}
        </div>
        <div className="project-task-stats">
          <span>📝 {total} tasks</span>
          <span>✅ {done} done</span>
        </div>
      </div>
    </div>
  );
}

function CreateProjectModal({ onClose, onCreated }) {
  const [form, setForm] = useState({ name: '', description: '', color: '#4f46e5', icon: '📋' });
  const [saving, setSaving] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.name.trim()) return;
    setSaving(true);
    try {
      const { data } = await projectService.create(form);
      toast.success('Tạo project thành công!');
      onCreated(data.data.project);
      onClose();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Tạo project thất bại');
    } finally {
      setSaving(false);
    }
  };

  return createPortal(
    <ModalOverlay onClose={onClose} style={{ zIndex: 9999 }}>
      <div className="modal animate-fadein" style={{ maxWidth: 'min(94vw, 520px)' }}>
        <div className="modal-header">
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <FolderKanbanIcon size={20} />
            <h3 style={{ margin: 0 }}>Tạo Project mới</h3>
          </div>
          <button className="btn-icon" onClick={onClose} title="Đóng">
            <XIcon size={18} />
          </button>
        </div>
        <form onSubmit={handleSubmit}>
          <div className="modal-body" style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            <div className="form-group">
              <label className="form-label">Tên Project *</label>
              <input
                className="form-input"
                placeholder="Ví dụ: Website Redesign, App Mobile v2..."
                value={form.name}
                onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
                autoFocus
                required
              />
            </div>
            <div className="form-group">
              <label className="form-label">Mô tả</label>
              <textarea
                className="form-input"
                placeholder="Mục tiêu của project..."
                rows={3}
                value={form.description}
                onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
                style={{ resize: 'vertical' }}
              />
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
              <div className="form-group">
                <label className="form-label">Màu sắc</label>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.4rem' }}>
                  {PROJECT_COLORS.map(c => (
                    <button
                      key={c}
                      type="button"
                      onClick={() => setForm(f => ({ ...f, color: c }))}
                      style={{
                        width: 28, height: 28,
                        borderRadius: '50%',
                        background: c,
                        border: form.color === c ? '3px solid var(--text-primary)' : '2px solid transparent',
                        cursor: 'pointer',
                        transition: 'transform 0.15s',
                        transform: form.color === c ? 'scale(1.2)' : 'scale(1)',
                      }}
                    />
                  ))}
                </div>
              </div>
              <div className="form-group">
                <label className="form-label">Icon đại diện</label>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.3rem' }}>
                  {PROJECT_ICONS.map(ic => (
                    <button
                      key={ic}
                      type="button"
                      onClick={() => setForm(f => ({ ...f, icon: ic }))}
                      style={{
                        fontSize: '1.1rem', padding: '0.2rem 0.3rem',
                        background: form.icon === ic ? `${form.color}33` : 'var(--bg-elevated)',
                        border: `1px solid ${form.icon === ic ? form.color : 'var(--border)'}`,
                        borderRadius: 6, cursor: 'pointer',
                      }}
                    >
                      {ic}
                    </button>
                  ))}
                </div>
              </div>
            </div>
            {/* Preview */}
            <div style={{
              padding: '0.75rem 1rem',
              background: 'var(--bg-elevated)',
              borderRadius: 'var(--radius-sm)',
              border: '1px solid var(--border)',
              display: 'flex', alignItems: 'center', gap: '0.75rem',
            }}>
              <span style={{ fontSize: '1.5rem', background: `${form.color}22`, padding: '0.3rem', borderRadius: 8 }}>{form.icon}</span>
              <div>
                <div style={{ fontWeight: 700, color: form.color }}>{form.name || 'Tên Project'}</div>
                <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>{form.description || 'Mô tả project'}</div>
              </div>
            </div>
          </div>
          <div className="modal-footer">
            <button type="button" className="btn btn-ghost" onClick={onClose}>Hủy</button>
            <button type="submit" className="btn btn-primary" disabled={saving} style={{ display: 'inline-flex', alignItems: 'center', gap: '0.4rem' }}>
              <PlusIcon size={16} />
              <span>{saving ? 'Đang tạo...' : 'Tạo Project'}</span>
            </button>
          </div>
        </form>
      </div>
    </ModalOverlay>,
    document.body
  );
}

export default function ProjectsPage({ onSelectProject }) {
  const navigate = useNavigate();
  const [projects, setProjects] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [search, setSearch] = useState('');

  const loadProjects = useCallback(async () => {
    try {
      const { data } = await projectService.list();
      setProjects(data.data.projects);
    } catch {
      toast.error('Không thể tải danh sách project');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { loadProjects(); }, [loadProjects]);

  const filtered = projects.filter(p =>
    p.name.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="projects-page">
      {/* Header */}
      <div className="projects-header">
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', marginBottom: 4 }}>
            <h1 className="projects-title" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', margin: 0 }}>
              <FolderKanbanIcon size={24} style={{ color: 'var(--primary)' }} />
              <span>Projects (Dự án)</span>
            </h1>
          </div>
          <p className="projects-subtitle">Quản lý không gian làm việc và dự án nhóm của bạn</p>
        </div>
        <div style={{ display: 'flex', gap: '0.65rem', alignItems: 'center', flexWrap: 'wrap' }}>
          <button
            className="btn btn-secondary"
            onClick={() => navigate('/dashboard')}
            title="Quay về bảng Kanban nhiệm vụ cá nhân"
            style={{ display: 'inline-flex', alignItems: 'center', gap: '0.4rem' }}
          >
            <HomeIcon size={16} />
            <span>Về Bảng nhiệm vụ</span>
          </button>
          <input
            className="form-input"
            placeholder="Tìm project..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            style={{ width: 200 }}
          />
          <button
            className="btn btn-primary"
            onClick={() => setShowCreate(true)}
            style={{ display: 'inline-flex', alignItems: 'center', gap: '0.4rem' }}
          >
            <PlusIcon size={16} />
            <span>Tạo Project</span>
          </button>
        </div>
      </div>

      {/* Stats Row */}
      <div className="projects-stats-row">
        <div className="projects-stat-card">
          <div className="stat-number">{projects.length}</div>
          <div className="stat-label">Tổng Projects</div>
        </div>
        <div className="projects-stat-card">
          <div className="stat-number">{projects.filter(p => p.status === 'active').length}</div>
          <div className="stat-label">Đang hoạt động</div>
        </div>
        <div className="projects-stat-card">
          <div className="stat-number">{projects.reduce((s, p) => s + (p.taskCount || 0), 0)}</div>
          <div className="stat-label">Tổng Tasks</div>
        </div>
        <div className="projects-stat-card">
          <div className="stat-number">{projects.reduce((s, p) => s + (p.doneCount || 0), 0)}</div>
          <div className="stat-label">Tasks hoàn thành</div>
        </div>
      </div>

      {/* Grid */}
      {loading ? (
        <div className="projects-loading">
          {[1, 2, 3].map(i => <div key={i} className="project-card-skeleton" />)}
        </div>
      ) : filtered.length === 0 ? (
        <div className="projects-empty">
          <div className="empty-icon" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 1rem', width: 64, height: 64, borderRadius: 16, background: 'var(--primary-light)', color: 'var(--primary)' }}>
            <FolderKanbanIcon size={32} />
          </div>
          <h3>{search ? 'Không tìm thấy project nào' : 'Chưa có project nào'}</h3>
          <div style={{ background: 'var(--bg-elevated)', border: '1px solid var(--border)', borderRadius: 12, padding: '1rem 1.25rem', maxWidth: 540, margin: '0.75rem auto 1.5rem', textAlign: 'left' }}>
            <div style={{ fontWeight: 600, fontSize: '0.88rem', color: 'var(--primary)', marginBottom: 6, display: 'flex', alignItems: 'center', gap: 6 }}>
              <HomeIcon size={16} />
              <span>Bảng nhiệm vụ của bạn vẫn đang hoạt động bình thường!</span>
            </div>
            <p style={{ margin: 0, fontSize: '0.82rem', color: 'var(--text-secondary)', lineHeight: 1.55 }}>
              Tất cả các công việc cá nhân của bạn không bị mất — chúng nằm tại <strong>"Bảng nhiệm vụ"</strong>. Khu vực <strong>"Projects"</strong> này là nơi tạo và quản lý các dự án nhóm lớn khi bạn cần cộng tác cùng đồng đội.
            </p>
          </div>
          {!search && (
            <div style={{ display: 'flex', gap: '0.85rem', justifyContent: 'center', flexWrap: 'wrap' }}>
              <button
                className="btn btn-primary"
                onClick={() => setShowCreate(true)}
                style={{ display: 'inline-flex', alignItems: 'center', gap: '0.45rem', padding: '0.6rem 1.2rem' }}
              >
                <PlusIcon size={16} />
                <span>Tạo Project đầu tiên</span>
              </button>
              <button
                className="btn btn-secondary"
                onClick={() => navigate('/dashboard')}
                style={{ display: 'inline-flex', alignItems: 'center', gap: '0.45rem', padding: '0.6rem 1.2rem', borderColor: 'var(--primary)', color: 'var(--primary)', fontWeight: 600 }}
              >
                <HomeIcon size={16} />
                <span>Quay lại Bảng nhiệm vụ cá nhân</span>
              </button>
            </div>
          )}
        </div>
      ) : (
        <div className="projects-grid">
          {filtered.map(p => (
            <ProjectCard key={p.id} project={p} onClick={onSelectProject} />
          ))}
        </div>
      )}

      {showCreate && (
        <CreateProjectModal
          onClose={() => setShowCreate(false)}
          onCreated={newProject => {
            setProjects(ps => [newProject, ...ps]);
          }}
        />
      )}
    </div>
  );
}
