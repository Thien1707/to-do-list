import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import Sidebar from '../components/Sidebar';
import api from '../services/api';
import ProjectsPage from './ProjectsPage';
import ProjectDetailPage from './ProjectDetailPage';

export default function ProjectsLayout() {
  const { user } = useAuth();
  const [categories, setCategories] = useState([]);
  const [selectedProject, setSelectedProject] = useState(null);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const navigate = useNavigate();

  const loadCategories = useCallback(async () => {
    try {
      const { data } = await api.get('/tasks/categories');
      setCategories(data.data.categories);
    } catch {}
  }, []);

  useEffect(() => { loadCategories(); }, [loadCategories]);

  return (
    <div className="app-layout">
      <Sidebar
        categories={categories}
        user={user}
        activeFilter=""
        activeCategory=""
        onFilterChange={() => navigate('/dashboard')}
        onCategoryChange={() => navigate('/dashboard')}
        onRefresh={loadCategories}
        onOpenStats={() => navigate('/dashboard')}
        streak={1}
        isOpen={sidebarOpen}
        onClose={() => setSidebarOpen(false)}
      />

      <div className="main-content">
        {selectedProject ? (
          <ProjectDetailPage
            project={selectedProject}
            onBack={() => setSelectedProject(null)}
          />
        ) : (
          <ProjectsPage onSelectProject={setSelectedProject} />
        )}
      </div>
    </div>
  );
}
