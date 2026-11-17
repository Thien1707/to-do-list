import { createContext, useContext, useState, useEffect } from 'react';
import api from '../services/api';

const AdminAuthContext = createContext(null);

export const AdminAuthProvider = ({ children }) => {
  const [admin, setAdmin] = useState(() => {
    try {
      let u = JSON.parse(localStorage.getItem('adminUser'));
      const normalUser = JSON.parse(localStorage.getItem('user'));

      if (normalUser && normalUser.role === 'admin') {
        if (!u) {
          u = normalUser;
        } else if (normalUser.avatar_url && !u.avatar_url) {
          u = { ...u, avatar_url: normalUser.avatar_url };
        }
        localStorage.setItem('adminUser', JSON.stringify(u));
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

  // Tự động đồng bộ thông tin mới nhất (kèm avatar) từ server và user context
  useEffect(() => {
    const token = localStorage.getItem('adminToken') || localStorage.getItem('accessToken');
    if (!token) return;

    try {
      const normalUser = JSON.parse(localStorage.getItem('user'));
      if (normalUser?.avatar_url) {
        setAdmin((prev) => {
          if (!prev || prev.avatar_url !== normalUser.avatar_url) {
            const merged = { ...(prev || {}), ...normalUser };
            localStorage.setItem('adminUser', JSON.stringify(merged));
            return merged;
          }
          return prev;
        });
      }
    } catch {}

    api.get('/auth/me')
      .then(({ data }) => {
        const dbUser = data?.data?.user;
        if (dbUser && dbUser.role === 'admin') {
          setAdmin(dbUser);
          localStorage.setItem('adminUser', JSON.stringify(dbUser));
          localStorage.setItem('user', JSON.stringify(dbUser));
        }
      })
      .catch(() => {});
  }, []);

  const login = async (email, password) => {
    const { data } = await api.post('/auth/admin-login', { email, password });
    localStorage.setItem('adminToken', data.data.accessToken);
    localStorage.setItem('adminUser', JSON.stringify(data.data.user));
    localStorage.setItem('user', JSON.stringify(data.data.user));
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
    localStorage.setItem('user', JSON.stringify(updatedUser));
    setAdmin(updatedUser);
  };

  return (
    <AdminAuthContext.Provider value={{ admin, login, logout, setAdmin, updateAdmin }}>
      {children}
    </AdminAuthContext.Provider>
  );
};

export const useAdminAuth = () => useContext(AdminAuthContext);
