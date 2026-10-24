'use strict';
const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '.env'), override: true });

const mysql = require('mysql2/promise');
const app = require('./app');
const { sequelize } = require('./models');
const { User } = require('./models');

const PORT = process.env.PORT || 3000;

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
    await User.create({
      name: 'Administrator',
      email: 'admin@taskmanager.com',
      password_hash: 'Admin@123',
      role: 'admin',
      is_active: true,
    });
    console.log('✅ Tạo tài khoản admin mặc định: admin@taskmanager.com / Admin@123');
  }
};

const start = async () => {
  try {
    // 1. Tự động tạo database nếu chưa tồn tại
    await ensureDatabaseExists();

    // 2. Kết nối và đồng bộ bảng Sequelize
    await sequelize.authenticate();
    console.log('✅ Kết nối MySQL thành công');

    try {
      await sequelize.sync();
      
      // Đảm bảo các cột mới của bảng tasks tồn tại nếu bảng đã được tạo từ trước
      const qi = sequelize.getQueryInterface();
      const cols = await qi.describeTable('tasks');
      const { DataTypes } = require('sequelize');
      if (!cols.project_id) {
        await qi.addColumn('tasks', 'project_id', {
          type: DataTypes.INTEGER,
          allowNull: true,
          references: { model: 'projects', key: 'id' },
          onDelete: 'SET NULL',
        });
      }
      if (!cols.assignee_id) {
        await qi.addColumn('tasks', 'assignee_id', {
          type: DataTypes.INTEGER,
          allowNull: true,
          references: { model: 'users', key: 'id' },
          onDelete: 'SET NULL',
        });
      }
      if (!cols.sprint_id) {
        await qi.addColumn('tasks', 'sprint_id', {
          type: DataTypes.INTEGER,
          allowNull: true,
          references: { model: 'sprints', key: 'id' },
          onDelete: 'SET NULL',
        });
      }
      if (!cols.story_points) {
        await qi.addColumn('tasks', 'story_points', {
          type: DataTypes.INTEGER,
          allowNull: true,
          defaultValue: null,
        });
      }

      console.log('✅ Đồng bộ database và schema thành công');
    } catch (syncErr) {
      console.warn('⚠️ Ghi chú đồng bộ database:', syncErr.message);
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
    console.error('\n❌ Không thể khởi động server:', err.message);
    if (err.message.includes('Access denied')) {
      console.error('👉 GỢI Ý: Vui lòng điền đúng mật khẩu MySQL trong file backend/.env (biến DB_PASS=...)\n');
    }
    process.exit(1);
  }
};

start();
