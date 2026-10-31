/**
 * Dev: dùng '/api' + proxy Vite → localhost:3000
 * Vercel (rewrite đúng URL Render): để trống VITE_API_BASE_URL → vẫn '/api'
 * Hoặc set VITE_API_BASE_URL=https://your-service.onrender.com (gọi thẳng BE, cần CLIENT_URL trên server)
 */
const raw = (import.meta.env.VITE_API_BASE_URL || '').trim().replace(/\/$/, '');

export function getApiBaseURL() {
  return raw ? `${raw}/api` : '/api';
}

export function getUploadsBaseURL() {
  return raw ? `${raw}/uploads` : '/uploads';
}
