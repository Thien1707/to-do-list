import { Routes, Route, Navigate } from 'react-router-dom';
import { useAdminAuth } from './context/AdminAuthContext';
import AdminLogin from './pages/AdminLogin';
import AdminDashboard from './pages/AdminDashboard';
import UsersPage from './pages/UsersPage';
import TasksPage from './pages/TasksPage';
import SystemPage from './pages/SystemPage';

function ProtectedRoute({ children }) {
  const { admin } = useAdminAuth();
  if (!admin) return <Navigate to="/admin/login" replace />;
  return children;
}

function PublicRoute({ children }) {
  const { admin } = useAdminAuth();
  if (admin) return <Navigate to="/admin/dashboard" replace />;
  return children;
}

export default function AdminRoutes() {
  return (
    <Routes>
      <Route index element={<Navigate to="/admin/dashboard" replace />} />
      <Route path="login" element={<PublicRoute><AdminLogin /></PublicRoute>} />
      <Route path="dashboard" element={<ProtectedRoute><AdminDashboard /></ProtectedRoute>} />
      <Route path="users" element={<ProtectedRoute><UsersPage /></ProtectedRoute>} />
      <Route path="tasks" element={<ProtectedRoute><TasksPage /></ProtectedRoute>} />
      <Route path="system" element={<ProtectedRoute><SystemPage /></ProtectedRoute>} />
      <Route path="*" element={<Navigate to="/admin/dashboard" replace />} />
    </Routes>
  );
}
