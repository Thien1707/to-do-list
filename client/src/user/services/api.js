import axios from 'axios';
import { getApiBaseURL } from '../../config/apiBase';

const api = axios.create({
  baseURL: getApiBaseURL(),
  withCredentials: true,
});

// Attach token to every request
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('accessToken');
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

// Auto-refresh token on 401 (except for auth entry endpoints)
api.interceptors.response.use(
  (res) => res,
  async (error) => {
    const original = error.config;
    const isAuthRequest =
      original?.url?.includes('/auth/login') ||
      original?.url?.includes('/auth/register') ||
      original?.url?.includes('/auth/refresh');

    if (error.response?.status === 401 && !original?._retry && !isAuthRequest) {
      original._retry = true;
      try {
        const { data } = await axios.post(`${getApiBaseURL()}/auth/refresh`, {}, { withCredentials: true });
        localStorage.setItem('accessToken', data.data.accessToken);
        original.headers.Authorization = `Bearer ${data.data.accessToken}`;
        return api(original);
      } catch {
        localStorage.removeItem('accessToken');
        localStorage.removeItem('user');
        window.location.href = '/login';
      }
    }
    return Promise.reject(error);
  }
);

export default api;
