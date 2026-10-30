'use strict';

/** Log lỗi DB/JWT rõ ràng (Sequelize đôi khi để message rỗng trên cloud). */
function formatError(err) {
  if (!err) return 'Unknown error';
  return (
    err.message ||
    err.original?.message ||
    err.parent?.message ||
    err.code ||
    String(err)
  );
}

function assertProductionEnv() {
  if (process.env.NODE_ENV !== 'production') return;

  const required = [
    'DB_HOST',
    'DB_USER',
    'DB_PASS',
    'DB_NAME',
    'JWT_SECRET',
    'JWT_REFRESH_SECRET',
  ];
  const missing = required.filter((key) => !String(process.env[key] ?? '').trim());

  if (missing.length > 0) {
    console.error('\n❌ Thiếu biến môi trường bắt buộc trên production (Render):');
    console.error(`   ${missing.join(', ')}`);
    console.error('\n👉 Render Dashboard → Web Service → Environment → Add Environment Variable');
    console.error('   Tham khảo: server/.env.example (MySQL + JWT + CLIENT_URL)\n');
    process.exit(1);
  }

  if ((process.env.DB_HOST || '').includes('localhost')) {
    console.warn('⚠️ DB_HOST đang là localhost trên production — Render không có MySQL local.');
  }
}

module.exports = { assertProductionEnv, formatError };
