import { AuthProvider } from './context/AuthContext';
import UserRoutes from './UserRoutes';
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

export default function UserApp() {
  return (
    <AuthProvider>
      <UserRoutes />
      <Toaster position="top-right" toastOptions={toastOptions} containerStyle={{ zIndex: 20000 }} />
    </AuthProvider>
  );
}
