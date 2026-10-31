'use strict';

function parseExtraOrigins() {
  const raw = process.env.CORS_EXTRA_ORIGINS || '';
  return raw
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean);
}

function collectStaticOrigins() {
  const clientOrigin =
    process.env.CLIENT_URL ||
    process.env.USER_FRONTEND_URL ||
    'http://localhost:5173';
  return [
    clientOrigin,
    process.env.ADMIN_FRONTEND_URL,
    process.env.USER_FRONTEND_URL,
    ...parseExtraOrigins(),
  ].filter(Boolean);
}

function isVercelOrigin(origin) {
  try {
    const { hostname, protocol } = new URL(origin);
    if (protocol !== 'https:') return false;
    if (!hostname.endsWith('.vercel.app')) return false;
    const allowAll = process.env.ALLOW_VERCEL_ORIGINS !== 'false';
    if (allowAll) return true;
    const slug = (process.env.VERCEL_PROJECT_SLUG || 'to-do-list').toLowerCase();
    return hostname.includes(slug);
  } catch {
    return false;
  }
}

function isOriginAllowed(origin) {
  if (!origin) return true;
  const allowed = collectStaticOrigins();
  if (allowed.includes(origin)) return true;
  if (isVercelOrigin(origin)) return true;
  return false;
}

module.exports = { isOriginAllowed, collectStaticOrigins };
