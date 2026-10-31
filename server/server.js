'use strict';
const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '.env'), override: true });

const mysql = require('mysql2/promise');
const { assertProductionEnv, formatError, isCloudRuntime } = require('./config/envCheck');
const { getDbConnectionSummary } = require('./config/dbConfig');
const { ensureSchema } = require('./config/ensureSchema');

assertProductionEnv();

const app = require('./app');
const { sequelize } = require('./models');
const { User } = require('./models');

const PORT = process.env.PORT || 3000;
const isProd = isCloudRuntime();

const ensureDatabaseExists = async () => {
  const connection = await mysql.createConnection({
    host: process.env.DB_HOST || 'localhost',
    port: parseInt(process.env.DB_PORT) || 3306,
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASS || '',
  });
  const dbName = process.env.DB_NAME || 'task_manager_db';
  await connection.query(
    `CREATE DATABASE IF NOT EXISTS \`${dbName}\` CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;`
  );
  await connection.end();
};

const seedAdmin = async () => {
  const admin = await User.findOne({ where: { role: 'admin' } });
  if (!admin) {
    const adminEmail = process.env.ADMIN_DEFAULT_EMAIL || 'admin@taskmanager.com';
    const adminPass = process.env.ADMIN_DEFAULT_PASSWORD || 'Admin@123';
    await User.create({
      name: 'Administrator',
      email: adminEmail,
      password_hash: adminPass,
      role: 'admin',
      is_active: true,
    });
    console.log(`✅ Khởi tạo tài khoản admin mặc định: ${adminEmail}`);
  }
};

const start = async () => {
  try {
    // 1. Tạo database chỉ khi dev local (Render/cloud: tạo DB sẵn trên dashboard nhà cung cấp MySQL)
    if (!isProd) {
      try {
        await ensureDatabaseExists();
      } catch (dbErr) {
        console.warn('⚠️ Ghi chú khởi tạo database (bỏ qua nếu DB đã tạo sẵn):', formatError(dbErr));
      }
    }

    // 2. Kết nối và đồng bộ bảng Sequelize
    const dbInfo = getDbConnectionSummary();
    console.log(
      `🔌 Đang kết nối MySQL: ${dbInfo.host}:${dbInfo.port}/${dbInfo.name} (SSL=${dbInfo.ssl})`
    );
    await sequelize.authenticate();
    console.log('✅ Kết nối MySQL thành công');

    try {
      await ensureSchema(sequelize);
      console.log('✅ Đồng bộ database và schema thành công');
    } catch (syncErr) {
      console.error('❌ Lỗi đồng bộ schema:', formatError(syncErr));
      throw syncErr;
    }

    // 3. Khởi tạo tài khoản admin mặc định nếu chưa có
    await seedAdmin();

    const server = app.listen(PORT, () => {
      console.log(`\n🚀 Server đang chạy tại http://localhost:${PORT}`);
      console.log(`📖 API Docs: http://localhost:${PORT}/api/docs`);
      console.log(`❤️  Health: http://localhost:${PORT}/api/health\n`);
      
      // 4. Khởi động cron job gửi email tự động
      const { startScheduler } = require('./services/scheduler');
      startScheduler();
    });

    server.on('error', (err) => {
      console.error('❌ Lỗi cổng server:', err.message);
      if (err.code === 'EADDRINUSE') {
        console.error(`👉 Cổng ${PORT} đang bị tiến trình khác chiếm dụng. Vui lòng tắt tiến trình cũ.`);
      }
    });
  } catch (err) {
    const msg = formatError(err);
    console.error('\n❌ Không thể khởi động server:', msg);
    if (msg.includes('Access denied')) {
      console.error('👉 Kiểm tra DB_USER / DB_PASS trên Render Environment.\n');
    } else if (msg.includes('ECONNREFUSED') || msg.includes('ETIMEDOUT') || msg.includes('ENOTFOUND')) {
      console.error('👉 Không kết nối được MySQL: kiểm tra DB_HOST, DB_PORT, firewall và DB_SSL=true (nếu host yêu cầu SSL).\n');
    }
    process.exit(1);
  }
};

start();
