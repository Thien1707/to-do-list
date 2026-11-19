'use strict';
const cron = require('node-cron');
const { Task, User, Category } = require('../models');
const { Op } = require('sequelize');
const { sendDueTasksReminder } = require('./emailService');

/**
 * Hàm quét và gửi thông báo cho tất cả người dùng có nhiệm vụ sắp hết hạn trong vòng 2 ngày (48 giờ)
 */
const runDueTaskNotificationJob = async () => {
  console.log('⏰ [Scheduler] Bắt đầu quét nhiệm vụ sắp hết hạn (trong vòng 2 ngày)...');
  try {
    const now = new Date();
    const twoDaysLater = new Date();
    twoDaysLater.setDate(now.getDate() + 2);
    twoDaysLater.setHours(23, 59, 59, 999);

    // Tìm tất cả task chưa hoàn thành và có due_date <= 2 ngày tới
    const tasks = await Task.findAll({
      where: {
        status: { [Op.notIn]: ['done', 'cancelled'] },
        due_date: {
          [Op.ne]: null,
          [Op.lte]: twoDaysLater,
        },
      },
      include: [
        {
          model: User,
          as: 'owner',
          attributes: ['id', 'name', 'email', 'is_active'],
        },
        {
          model: User,
          as: 'assignee',
          attributes: ['id', 'name', 'email', 'is_active'],
          required: false,
        },
        {
          model: Category,
          attributes: ['name', 'color', 'icon'],
          required: false,
        },
      ],
      order: [['due_date', 'ASC']],
    });

    if (tasks.length === 0) {
      console.log('ℹ️ [Scheduler] Không có nhiệm vụ nào sắp hết hạn trong 2 ngày tới.');
      return { count: 0, usersNotified: 0, message: 'Không có nhiệm vụ nào sắp hết hạn trong 2 ngày tới.' };
    }

    // Nhóm task theo từng User (cả người được giao và người tạo task)
    const tasksByUser = {};
    const addUserTask = (u, task) => {
      if (!u || !u.is_active || !u.email) return;
      if (!tasksByUser[u.id]) {
        tasksByUser[u.id] = {
          user: u,
          tasks: [],
        };
      }
      if (!tasksByUser[u.id].tasks.some((existing) => existing.id === task.id)) {
        tasksByUser[u.id].tasks.push(task);
      }
    };

    for (const t of tasks) {
      if (t.assignee) {
        addUserTask(t.assignee, t);
      }
      if (t.owner) {
        addUserTask(t.owner, t);
      }
    }

    let usersNotified = 0;
    const errors = [];
    for (const group of Object.values(tasksByUser)) {
      console.log(`📩 [Scheduler] Gửi email nhắc nhở cho ${group.user.email} (${group.tasks.length} tasks)...`);
      const result = await sendDueTasksReminder(group.user.email, group.user.name, group.tasks);
      if (result.success) {
        usersNotified++;
      } else {
        errors.push({ email: group.user.email, error: result.error || result.message });
      }
    }

    console.log(`✅ [Scheduler] Hoàn tất quét! Đã gửi thông báo đến ${usersNotified}/${Object.keys(tasksByUser).length} người dùng.`);
    return {
      count: tasks.length,
      usersNotified,
      totalUsers: Object.keys(tasksByUser).length,
      errors: errors.length > 0 ? errors : undefined,
    };
  } catch (err) {
    console.error('❌ [Scheduler] Lỗi khi chạy job nhắc nhở nhiệm vụ:', err.message);
    return { error: err.message };
  }
};

/**
 * Khởi động cron job định kỳ
 * Mặc định: Chạy lúc 08:00 sáng mỗi ngày ('0 8 * * *')
 */
const startScheduler = () => {
  // Lịch chạy 08:00 hàng ngày
  cron.schedule('0 8 * * *', async () => {
    console.log('⏰ [Cron] Kích hoạt tiến trình gửi email nhắc nhở hàng ngày lúc 08:00');
    await runDueTaskNotificationJob();
  });

  console.log('🚀 [Scheduler] Đã kích hoạt Cron Job: Tự động gửi email cảnh báo nhiệm vụ trước 2 ngày lúc 08:00 hàng ngày.');
};

module.exports = {
  startScheduler,
  runDueTaskNotificationJob,
};
