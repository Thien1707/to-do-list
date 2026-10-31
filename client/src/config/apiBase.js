import axios from 'axios';

/**
 * Gốc backend không gồm /api (vd https://xxx.onrender.com).
 * Dev: để trống → request same-origin /api/... (Vite proxy hoặc Vercel rewrite).
 */
export function getBackendOrigin() {
  let root = (import.meta.env.VITE_API_BASE_URL || '').trim().replace(/\/$/, '');
  if (root.endsWith('/api')) root = root.slice(0, -4);
  return root;
}

/** Luôn trả path đầy đủ /api/... để tránh lỗi ghép URL của axios. */
export function toApiPath(url) {
  if (!url) return url;
  if (url.startsWith('/api/') || url === '/api') return url;
  if (url.startsWith('/')) return `/api${url}`;
  return `/api/${url}`;
}

export function getUploadsBaseURL() {
  const origin = getBackendOrigin();
  return origin ? `${origin}/uploads` : '/uploads';
}

export function createApiClient() {
  const origin = getBackendOrigin();
  const instance = axios.create({
    baseURL: origin || undefined,
    withCredentials: true,
  });

  instance.interceptors.request.use((config) => {
    if (config.url) config.url = toApiPath(config.url);
    return config;
  });

  return instance;
}

/** @deprecated dùng createApiClient — giữ export cho refresh token thủ công */
export function getApiBaseURL() {
  const origin = getBackendOrigin();
  return origin ? `${origin}/api` : '/api';
}
