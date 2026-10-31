'use strict';
const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '.env'), override: true });

const mysql = require('mysql2/promise');
const { assertProductionEnv, formatError, isCloudRuntime } = require('./config/envCheck');
const { getDbConnectionSummary } = require('./config/dbConfig');

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
      if (!cols.start_time) {
        await qi.addColumn('tasks', 'start_time', {
          type: DataTypes.STRING(10),
          allowNull: true,
          defaultValue: null,
        });
      }
      if (!cols.end_time) {
        await qi.addColumn('tasks', 'end_time', {
          type: DataTypes.STRING(10),
          allowNull: true,
          defaultValue: null,
        });
      }
      if (!cols.is_edited) {
        await qi.addColumn('tasks', 'is_edited', {
          type: DataTypes.BOOLEAN,
          allowNull: false,
          defaultValue: false,
        });
      }
      if (!cols.edit_count) {
        await qi.addColumn('tasks', 'edit_count', {
          type: DataTypes.INTEGER,
          allowNull: false,
          defaultValue: 0,
        });
      }
      if (!cols.last_edited_at) {
        await qi.addColumn('tasks', 'last_edited_at', {
          type: DataTypes.DATE,
          allowNull: true,
          defaultValue: null,
        });
      }
      if (!cols.last_edited_by) {
        await qi.addColumn('tasks', 'last_edited_by', {
          type: DataTypes.INTEGER,
          allowNull: true,
          references: { model: 'users', key: 'id' },
          onDelete: 'SET NULL',
        });
      }

      // Đảm bảo các cột mới của bảng users tồn tại
      const userCols = await qi.describeTable('users');
      if (!userCols.phone) {
        await qi.addColumn('users', 'phone', { type: DataTypes.STRING(20), allowNull: true });
      }
      if (!userCols.bio) {
        await qi.addColumn('users', 'bio', { type: DataTypes.TEXT, allowNull: true });
      }
      if (!userCols.job_title) {
        await qi.addColumn('users', 'job_title', { type: DataTypes.STRING(100), allowNull: true });
      }
      if (!userCols.department) {
        await qi.addColumn('users', 'department', { type: DataTypes.STRING(100), allowNull: true });
      }
      if (!userCols.theme_preference) {
        await qi.addColumn('users', 'theme_preference', { type: DataTypes.STRING(20), defaultValue: 'light' });
      }
      if (!userCols.notification_settings) {
        await qi.addColumn('users', 'notification_settings', { type: DataTypes.JSON, allowNull: true });
      }
      if (userCols.avatar_url && userCols.avatar_url.type !== 'LONGTEXT') {
        try {
          await qi.changeColumn('users', 'avatar_url', { type: DataTypes.TEXT('long'), allowNull: true });
        } catch (_) {}
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
