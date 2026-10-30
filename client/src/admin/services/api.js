import axios from 'axios';

const api = axios.create({ baseURL: '/api', withCredentials: true });

api.interceptors.request.use((config) => {
  const token = localStorage.getItem('adminToken');
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

// Auto-refresh token on 401, handle 403 session expiration
api.interceptors.response.use(
  res => res,
  async (error) => {
    const original = error.config;
    const isAuthRequest =
      original?.url?.includes('/auth/admin-login') ||
      original?.url?.includes('/auth/admin-refresh') ||
      original?.url?.includes('/auth/refresh');

    if (error.response?.status === 401 && !original?._retry && !isAuthRequest) {
      original._retry = true;
      try {
        const { data } = await axios.post('/api/auth/admin-refresh', {}, { withCredentials: true });
        localStorage.setItem('adminToken', data.data.accessToken);
        if (data.data?.user) {
          localStorage.setItem('adminUser', JSON.stringify(data.data.user));
        }
        original.headers.Authorization = `Bearer ${data.data.accessToken}`;
        return api(original);
      } catch {
        localStorage.removeItem('adminToken');
        localStorage.removeItem('adminUser');
        window.location.href = '/admin/login';
      }
    }

    // If 403 Forbidden (e.g. non-admin token or demoted account), logout and return to admin login
    if (error.response?.status === 403 && !isAuthRequest) {
      localStorage.removeItem('adminToken');
      localStorage.removeItem('adminUser');
      window.location.href = '/admin/login';
    }

    return Promise.reject(error);
  }
);

export default api;
