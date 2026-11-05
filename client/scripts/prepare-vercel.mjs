import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const clientRoot = path.join(__dirname, '..');
const vercelPath = path.join(clientRoot, 'vercel.json');

let origin = (process.env.RENDER_API_ORIGIN || process.env.VITE_API_BASE_URL || '')
  .trim()
  .replace(/\/$/, '')
  .replace(/\/api$/, '');

if (!origin) {
  origin = 'https://to-do-list-rx1c.onrender.com';
}

const cfg = JSON.parse(fs.readFileSync(vercelPath, 'utf8'));

cfg.rewrites = (cfg.rewrites || []).map((rule) => {
  if (rule.source === '/api/:path*') {
    return { ...rule, destination: `${origin}/api/:path*` };
  }
  if (rule.source === '/uploads/:path*') {
    return { ...rule, destination: `${origin}/uploads/:path*` };
  }
  return rule;
});

if (!cfg.headers) cfg.headers = [];
const coopHeader = {
  source: '/(.*)',
  headers: [
    { key: 'Cross-Origin-Opener-Policy', value: 'same-origin-allow-popups' },
  ],
};
const hasCoop = cfg.headers.some((h) => h.headers?.some((x) => x.key === 'Cross-Origin-Opener-Policy'));
if (!hasCoop) cfg.headers.push(coopHeader);

fs.writeFileSync(vercelPath, `${JSON.stringify(cfg, null, 2)}\n`);
console.log(`[prepare-vercel] Proxy /api → ${origin}`);

try {
  const res = await fetch(`${origin}/api/health`, { signal: AbortSignal.timeout(20000) });
  if (res.ok) {
    console.log('[prepare-vercel] Backend health OK');
  } else {
    console.warn(`[prepare-vercel] Cảnh báo: ${origin}/api/health trả ${res.status}. Set RENDER_API_ORIGIN trên Vercel đúng URL Render.`);
  }
} catch (err) {
  console.warn(`[prepare-vercel] Không gọi được backend (${origin}): ${err.message}`);
}
