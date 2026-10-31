import axios from 'axios';
import { createApiClient, getBackendOrigin, toApiPath } from '../../config/apiBase';

const api = createApiClient();

api.interceptors.request.use((config) => {
  const token = localStorage.getItem('adminToken');
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

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
        const origin = getBackendOrigin();
        const refreshURL = origin
          ? `${origin}${toApiPath('/auth/admin-refresh')}`
          : toApiPath('/auth/admin-refresh');
        const { data } = await axios.post(refreshURL, {}, { withCredentials: true });
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

    if (error.response?.status === 403 && !isAuthRequest) {
      localStorage.removeItem('adminToken');
      localStorage.removeItem('adminUser');
      window.location.href = '/admin/login';
    }

    return Promise.reject(error);
  }
);

export default api;
