import { createContext, useContext, useState } from 'react';
import api from '../services/api';

const AdminAuthContext = createContext(null);

export const AdminAuthProvider = ({ children }) => {
  const [admin, setAdmin] = useState(() => {
    try {
      let u = JSON.parse(localStorage.getItem('adminUser'));
      if (!u) {
        // Tự động nhận diện phiên đăng nhập từ tài khoản có role admin
        const normalUser = JSON.parse(localStorage.getItem('user'));
        const normalToken = localStorage.getItem('accessToken');
        if (normalUser && normalUser.role === 'admin' && normalToken) {
          localStorage.setItem('adminUser', JSON.stringify(normalUser));
          localStorage.setItem('adminToken', normalToken);
          u = normalUser;
        }
      }
      if (u && u.role !== 'admin') {
        localStorage.removeItem('adminUser');
        localStorage.removeItem('adminToken');
        return null;
      }
      return u;
    } catch {
      return null;
    }
  });

  const login = async (email, password) => {
    const { data } = await api.post('/auth/admin-login', { email, password });
    localStorage.setItem('adminToken', data.data.accessToken);
    localStorage.setItem('adminUser', JSON.stringify(data.data.user));
    setAdmin(data.data.user);
    return data;
  };

  const logout = async () => {
    try { await api.post('/auth/logout'); } catch {}
    localStorage.removeItem('adminToken');
    localStorage.removeItem('adminUser');
    setAdmin(null);
  };

  const updateAdmin = (updatedUser) => {
    localStorage.setItem('adminUser', JSON.stringify(updatedUser));
    setAdmin(updatedUser);
  };

  return (
    <AdminAuthContext.Provider value={{ admin, login, logout, setAdmin, updateAdmin }}>
      {children}
    </AdminAuthContext.Provider>
  );
};

export const useAdminAuth = () => useContext(AdminAuthContext);
