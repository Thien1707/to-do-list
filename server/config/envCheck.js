'use strict';

/** Render và hầu hết PaaS set biến này; không phụ thuộc NODE_ENV do user hay quên cấu hình. */
function isCloudRuntime() {
  return (
    process.env.NODE_ENV === 'production' ||
    process.env.RENDER === 'true' ||
    Boolean(process.env.RENDER_SERVICE_ID)
  );
}

/** Log lỗi DB/JWT rõ ràng (Sequelize đôi khi để message rỗng trên cloud). */
function formatError(err) {
  if (!err) return 'Unknown error';
  const base =
    err.message ||
    err.original?.message ||
    err.parent?.message ||
    err.code ||
    err.name ||
    String(err);
  if (err.name === 'SequelizeConnectionRefusedError' || base.includes('ECONNREFUSED')) {
    return `${base} — không kết nối được MySQL tại DB_HOST=${process.env.DB_HOST || '(mặc định localhost)'}`;
  }
  return base;
}

function assertProductionEnv() {
  if (!isCloudRuntime()) return;

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
    console.error('\n❌ Thiếu biến môi trường bắt buộc trên Render/cloud:');
    console.error(`   ${missing.join(', ')}`);
    console.error('\n👉 Render → Web Service → Environment → thêm biến (MySQL host bên ngoài + JWT).');
    console.error('   Gợi ý: NODE_ENV=production, DB_SSL=true nếu MySQL cloud yêu cầu SSL.');
    console.error('   Xem mẫu: server/.env.example\n');
    process.exit(1);
  }

  const host = (process.env.DB_HOST || '').toLowerCase();
  if (!host || host === 'localhost' || host === '127.0.0.1') {
    console.error('\n❌ DB_HOST không hợp lệ trên Render (đang localhost / trống).');
    console.error('👉 Render không có MySQL local — dùng host từ Aiven / PlanetScale / Railway / …\n');
    process.exit(1);
  }
}

module.exports = { assertProductionEnv, formatError, isCloudRuntime };
