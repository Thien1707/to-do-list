import { lazy, Suspense } from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { useAdminAuth } from './context/AdminAuthContext';

const AdminLogin = lazy(() => import('./pages/AdminLogin'));
const AdminDashboard = lazy(() => import('./pages/AdminDashboard'));
const UsersPage = lazy(() => import('./pages/UsersPage'));
const TasksPage = lazy(() => import('./pages/TasksPage'));
const SystemPage = lazy(() => import('./pages/SystemPage'));

function PageFallback() {
  return (
    <div className="page-loader" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '60vh' }}>
      <div className="spinner" />
    </div>
  );
}

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
    <Suspense fallback={<PageFallback />}>
      <Routes>
        <Route index element={<Navigate to="/admin/dashboard" replace />} />
        <Route path="login" element={<PublicRoute><AdminLogin /></PublicRoute>} />
        <Route path="dashboard" element={<ProtectedRoute><AdminDashboard /></ProtectedRoute>} />
        <Route path="users" element={<ProtectedRoute><UsersPage /></ProtectedRoute>} />
        <Route path="tasks" element={<ProtectedRoute><TasksPage /></ProtectedRoute>} />
        <Route path="system" element={<ProtectedRoute><SystemPage /></ProtectedRoute>} />
        <Route path="*" element={<Navigate to="/admin/dashboard" replace />} />
      </Routes>
    </Suspense>
  );
}
