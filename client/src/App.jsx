import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import { AuthProvider } from './user/context/AuthContext';
import { AdminAuthProvider } from './admin/context/AdminAuthContext';
import UserRoutes from './user/UserRoutes';
import AdminRoutes from './admin/AdminRoutes';

const toastOptions = {
  style: {
    background: 'var(--bg-elevated)',
    color: 'var(--text-primary)',
    border: '1px solid var(--border)',
    borderRadius: '10px',
  },
  duration: 3000,
};

function UserApp() {
  return (
    <AuthProvider>
      <UserRoutes />
      <Toaster position="top-right" toastOptions={toastOptions} />
    </AuthProvider>
  );
}

function AdminApp() {
  return (
    <AdminAuthProvider>
      <AdminRoutes />
      <Toaster position="top-right" toastOptions={toastOptions} />
    </AdminAuthProvider>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/admin/*" element={<AdminApp />} />
        <Route path="/*" element={<UserApp />} />
      </Routes>
    </BrowserRouter>
  );
}
