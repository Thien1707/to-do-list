import { AdminAuthProvider } from './context/AdminAuthContext';
import AdminRoutes from './AdminRoutes';
import { Toaster } from 'react-hot-toast';
import './index.css';

const toastOptions = {
  style: {
    background: 'var(--bg-elevated)',
    color: 'var(--text-primary)',
    border: '1px solid var(--border)',
    borderRadius: '10px',
  },
  duration: 3000,
};

export default function AdminApp() {
  return (
    <AdminAuthProvider>
      <AdminRoutes />
      <Toaster position="top-right" toastOptions={toastOptions} containerStyle={{ zIndex: 20000 }} />
    </AdminAuthProvider>
  );
}
