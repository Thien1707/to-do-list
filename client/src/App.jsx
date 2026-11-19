import { lazy, Suspense } from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';

const UserApp = lazy(() => import('./user/UserApp'));
const AdminApp = lazy(() => import('./admin/AdminApp'));

function AppFallback() {
  return (
    <main id="main-content" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '100vh', background: 'var(--bg, #f8fafc)' }}>
      <div style={{ width: 36, height: 36, border: '3px solid rgba(99, 102, 241, 0.2)', borderTopColor: '#4f46e5', borderRadius: '50%', animation: 'spin 0.6s linear infinite' }} />
    </main>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <Suspense fallback={<AppFallback />}>
        <Routes>
          <Route path="/admin/*" element={<AdminApp />} />
          <Route path="/*" element={<UserApp />} />
        </Routes>
      </Suspense>
    </BrowserRouter>
  );
}
