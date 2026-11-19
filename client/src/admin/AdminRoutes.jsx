import { lazy, Suspense } from 'react';
import { Routes, Route, Navigate, Outlet } from 'react-router-dom';
import { useAdminAuth } from './context/AdminAuthContext';
import AdminLayout from './components/AdminLayout';

const AdminLogin = lazy(() => import('./pages/AdminLogin'));
const AdminDashboard = lazy(() => import('./pages/AdminDashboard'));
const UsersPage = lazy(() => import('./pages/UsersPage'));
const TasksPage = lazy(() => import('./pages/TasksPage'));
const SystemPage = lazy(() => import('./pages/SystemPage'));

function PageFallback() {
  return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '50vh', width: '100%' }}>
      <div className="spinner" />
    </div>
  );
}

function ProtectedRoute({ children }) {
  const { admin } = useAdminAuth();
  if (!admin) return <Navigate to="/admin/login" replace />;
  return children || <Outlet />;
}

function PublicRoute({ children }) {
  const { admin } = useAdminAuth();
  if (admin) return <Navigate to="/admin/dashboard" replace />;
  return children || <Outlet />;
}

export default function AdminRoutes() {
  return (
    <Routes>
      <Route
        path="login"
        element={
          <PublicRoute>
            <Suspense fallback={<PageFallback />}>
              <AdminLogin />
            </Suspense>
          </PublicRoute>
        }
      />

      {/* Persistent Shell Layout: Sidebar & Header stay permanently mounted without reloading */}
      <Route
        element={
          <ProtectedRoute>
            <AdminLayout />
          </ProtectedRoute>
        }
      >
        <Route index element={<Navigate to="dashboard" replace />} />
        <Route
          path="dashboard"
          element={
            <Suspense fallback={<PageFallback />}>
              <AdminDashboard />
            </Suspense>
          }
        />
        <Route
          path="users"
          element={
            <Suspense fallback={<PageFallback />}>
              <UsersPage />
            </Suspense>
          }
        />
        <Route
          path="tasks"
          element={
            <Suspense fallback={<PageFallback />}>
              <TasksPage />
            </Suspense>
          }
        />
        <Route
          path="system"
          element={
            <Suspense fallback={<PageFallback />}>
              <SystemPage />
            </Suspense>
          }
        />
      </Route>

      <Route path="*" element={<Navigate to="/admin/dashboard" replace />} />
    </Routes>
  );
}
