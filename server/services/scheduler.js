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
          attributes: ['id', 'name', 'email', 'is_active'],
        },
        {
          model: Category,
          attributes: ['name', 'color', 'icon'],
        },
      ],
      order: [['due_date', 'ASC']],
    });

    if (tasks.length === 0) {
      console.log('ℹ️ [Scheduler] Không có nhiệm vụ nào sắp hết hạn trong 2 ngày tới.');
      return { count: 0, usersNotified: 0 };
    }

    // Nhóm task theo từng User
    const tasksByUser = {};
    for (const t of tasks) {
      if (t.User && t.User.is_active && t.User.email) {
        const uid = t.User.id;
        if (!tasksByUser[uid]) {
          tasksByUser[uid] = {
            user: t.User,
            tasks: [],
          };
        }
        tasksByUser[uid].tasks.push(t);
      }
    }

    let usersNotified = 0;
    for (const group of Object.values(tasksByUser)) {
      console.log(`📩 [Scheduler] Gửi email nhắc nhở cho ${group.user.email} (${group.tasks.length} tasks)...`);
      const result = await sendDueTasksReminder(group.user.email, group.user.name, group.tasks);
      if (result.success) {
        usersNotified++;
      }
    }

    console.log(`✅ [Scheduler] Hoàn tất quét! Đã gửi thông báo đến ${usersNotified} người dùng.`);
    return { count: tasks.length, usersNotified };
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
