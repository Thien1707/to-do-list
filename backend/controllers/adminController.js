'use strict';
const { User, Task, Category } = require('../models');
const { Op } = require('sequelize');
const sequelize = require('../config/database');

// GET /api/admin/stats (Deep Analytics for Admin)
exports.getStats = async (req, res) => {
  try {
    const todayStart = new Date(new Date().setHours(0, 0, 0, 0));

    // Basic Counts
    const [
      totalUsers,
      totalTasks,
      doneTasks,
      inProgressTasks,
      todoTasks,
      cancelledTasks,
      overdueTasks,
      newUsersToday,
      googleUsers,
      emailUsers,
    ] = await Promise.all([
      User.count({ where: { role: 'user' } }),
      Task.count(),
      Task.count({ where: { status: 'done' } }),
      Task.count({ where: { status: 'in_progress' } }),
      Task.count({ where: { status: 'todo' } }),
      Task.count({ where: { status: 'cancelled' } }),
      Task.count({ where: { status: { [Op.notIn]: ['done', 'cancelled'] }, due_date: { [Op.lt]: new Date() } } }),
      User.count({ where: { role: 'user', createdAt: { [Op.gte]: todayStart } } }),
      User.count({ where: { google_id: { [Op.ne]: null } } }),
      User.count({ where: { google_id: null } }),
    ]);

    // Priority Breakdown
    const [urgentCount, highCount, mediumCount, lowCount] = await Promise.all([
      Task.count({ where: { priority: 'urgent' } }),
      Task.count({ where: { priority: 'high' } }),
      Task.count({ where: { priority: 'medium' } }),
      Task.count({ where: { priority: 'low' } }),
    ]);

    // Top Categories
    const categories = await Category.findAll({
      attributes: ['id', 'name', 'color', 'icon'],
      include: [{ model: Task, attributes: ['id'] }],
      limit: 6,
    });
    const topCategories = categories
      .map(c => ({
        id: c.id,
        name: c.name,
        color: c.color,
        icon: c.icon,
        count: c.Tasks ? c.Tasks.length : 0,
      }))
      .sort((a, b) => b.count - a.count);

    // 7 Days Activity Trend
    const activity7Days = [];
    for (let i = 6; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      const startOfDay = new Date(d.getFullYear(), d.getMonth(), d.getDate(), 0, 0, 0);
      const endOfDay = new Date(d.getFullYear(), d.getMonth(), d.getDate(), 23, 59, 59, 999);

      const dayLabel = `${d.getDate()}/${d.getMonth() + 1}`;
      const [created, done] = await Promise.all([
        Task.count({ where: { createdAt: { [Op.between]: [startOfDay, endOfDay] } } }),
        Task.count({ where: { status: 'done', updatedAt: { [Op.between]: [startOfDay, endOfDay] } } }),
      ]);
      activity7Days.push({ date: dayLabel, created, done });
    }

    // Top Active Users
    const activeUsersList = await User.findAll({
      where: { role: 'user' },
      attributes: ['id', 'name', 'email', 'avatar_url'],
      include: [{ model: Task, attributes: ['id', 'status'] }],
      limit: 5,
    });

    const topUsers = activeUsersList
      .map(u => {
        const userTasks = u.Tasks || [];
        const userDone = userTasks.filter(t => t.status === 'done').length;
        return {
          id: u.id,
          name: u.name,
          email: u.email,
          avatar_url: u.avatar_url,
          totalTasks: userTasks.length,
          doneTasks: userDone,
          rate: userTasks.length ? Math.round((userDone / userTasks.length) * 100) : 0,
        };
      })
      .sort((a, b) => b.totalTasks - a.totalTasks);

    const completionRate = totalTasks ? Math.round((doneTasks / totalTasks) * 100) : 0;

    return res.json({
      success: true,
      data: {
        totalUsers,
        totalTasks,
        doneTasks,
        overdueTasks,
        newUsersToday,
        completionRate,
        statusBreakdown: {
          todo: todoTasks,
          in_progress: inProgressTasks,
          done: doneTasks,
          cancelled: cancelledTasks,
        },
        priorityBreakdown: {
          urgent: urgentCount,
          high: highCount,
          medium: mediumCount,
          low: lowCount,
        },
        authBreakdown: {
          google: googleUsers,
          email: emailUsers,
        },
        topCategories,
        activity7Days,
        topUsers,
      },
    });
  } catch (err) {
    return res.status(500).json({ success: false, message: 'Lỗi server', error: err.message });
  }
};

// GET /api/admin/users
exports.getUsers = async (req, res) => {
  try {
    const { search, is_active, page = 1, limit = 20 } = req.query;
    const where = { role: 'user' };
    if (search) where[Op.or] = [{ name: { [Op.like]: `%${search}%` } }, { email: { [Op.like]: `%${search}%` } }];
    if (is_active !== undefined) where.is_active = is_active === 'true';

    const { count, rows } = await User.findAndCountAll({
      where,
      attributes: { exclude: ['password_hash', 'google_id'] },
      order: [['createdAt', 'DESC']],
      limit: parseInt(limit),
      offset: (parseInt(page) - 1) * parseInt(limit),
    });
    return res.json({ success: true, data: { users: rows, pagination: { total: count, page: parseInt(page), pages: Math.ceil(count / parseInt(limit)) } } });
  } catch (err) {
    return res.status(500).json({ success: false, message: 'Lỗi server', error: err.message });
  }
};

// GET /api/admin/users/:id
exports.getUser = async (req, res) => {
  try {
    const user = await User.findByPk(req.params.id, {
      attributes: { exclude: ['password_hash', 'google_id'] },
      include: [{ model: Task, attributes: ['id', 'title', 'status', 'priority', 'createdAt'] }],
    });
    if (!user) return res.status(404).json({ success: false, message: 'Không tìm thấy người dùng' });
    return res.json({ success: true, data: { user } });
  } catch (err) {
    return res.status(500).json({ success: false, message: 'Lỗi server', error: err.message });
  }
};

// PUT /api/admin/users/:id  (toggle active, change name)
exports.updateUser = async (req, res) => {
  try {
    const user = await User.findByPk(req.params.id);
    if (!user) return res.status(404).json({ success: false, message: 'Không tìm thấy người dùng' });
    const { name, is_active } = req.body;
    await user.update({ name, is_active });
    return res.json({ success: true, message: 'Cập nhật người dùng thành công', data: { user: user.toSafeJSON() } });
  } catch (err) {
    return res.status(500).json({ success: false, message: 'Lỗi server', error: err.message });
  }
};

// DELETE /api/admin/users/:id
exports.deleteUser = async (req, res) => {
  try {
    const user = await User.findByPk(req.params.id);
    if (!user) return res.status(404).json({ success: false, message: 'Không tìm thấy người dùng' });
    await user.destroy();
    return res.json({ success: true, message: 'Đã xóa người dùng' });
  } catch (err) {
    return res.status(500).json({ success: false, message: 'Lỗi server', error: err.message });
  }
};

// GET /api/admin/tasks
exports.getAllTasks = async (req, res) => {
  try {
    const { status, priority, user_id, search, page = 1, limit = 20 } = req.query;
    const where = {};
    if (status) where.status = status;
    if (priority) where.priority = priority;
    if (user_id) where.user_id = user_id;
    if (search && search.trim()) {
      where[Op.or] = [
        { title: { [Op.like]: `%${search.trim()}%` } },
        { description: { [Op.like]: `%${search.trim()}%` } },
      ];
    }

    const { count, rows } = await Task.findAndCountAll({
      where,
      include: [{ model: User, attributes: ['id', 'name', 'email', 'avatar_url'] }],
      order: [['createdAt', 'DESC']],
      limit: parseInt(limit),
      offset: (parseInt(page) - 1) * parseInt(limit),
    });
    return res.json({ success: true, data: { tasks: rows, pagination: { total: count, page: parseInt(page), pages: Math.ceil(count / parseInt(limit)) } } });
  } catch (err) {
    return res.status(500).json({ success: false, message: 'Lỗi server', error: err.message });
  }
};

// PUT /api/admin/tasks/:id (Admin edit task)
exports.updateTask = async (req, res) => {
  try {
    const task = await Task.findByPk(req.params.id);
    if (!task) return res.status(404).json({ success: false, message: 'Không tìm thấy nhiệm vụ' });

    const { title, description, status, priority, due_date } = req.body;
    const updateData = {};
    if (title !== undefined) updateData.title = title.trim();
    if (description !== undefined) updateData.description = description ? description.trim() : null;
    if (status !== undefined) updateData.status = status;
    if (priority !== undefined) updateData.priority = priority;
    if (due_date !== undefined) updateData.due_date = due_date || null;

    await task.update(updateData);
    return res.json({ success: true, message: 'Cập nhật nhiệm vụ thành công', data: { task } });
  } catch (err) {
    return res.status(500).json({ success: false, message: 'Lỗi server', error: err.message });
  }
};

// DELETE /api/admin/tasks/:id (Admin delete task)
exports.deleteTask = async (req, res) => {
  try {
    const task = await Task.findByPk(req.params.id);
    if (!task) return res.status(404).json({ success: false, message: 'Không tìm thấy nhiệm vụ' });
    await task.destroy();
    return res.json({ success: true, message: 'Đã xóa nhiệm vụ thành công' });
  } catch (err) {
    return res.status(500).json({ success: false, message: 'Lỗi server', error: err.message });
  }
};

// PUT /api/admin/users/:id/reset-password
exports.resetUserPassword = async (req, res) => {
  try {
    const user = await User.findByPk(req.params.id);
    if (!user) return res.status(404).json({ success: false, message: 'Không tìm thấy người dùng' });

    const { new_password } = req.body;
    if (!new_password || new_password.length < 6) {
      return res.status(400).json({ success: false, message: 'Mật khẩu mới phải có ít nhất 6 ký tự' });
    }

    user.password_hash = new_password; // Model hook will hash password automatically
    await user.save();

    return res.json({ success: true, message: `Đã đặt lại mật khẩu cho người dùng ${user.name}` });
  } catch (err) {
    return res.status(500).json({ success: false, message: 'Lỗi server', error: err.message });
  }
};

// PUT /api/admin/users/:id/role
exports.changeUserRole = async (req, res) => {
  try {
    const user = await User.findByPk(req.params.id);
    if (!user) return res.status(404).json({ success: false, message: 'Không tìm thấy người dùng' });

    const { role } = req.body;
    if (!['admin', 'user'].includes(role)) {
      return res.status(400).json({ success: false, message: 'Vai trò không hợp lệ' });
    }

    await user.update({ role });
    return res.json({ success: true, message: `Đã đổi vai trò thành ${role === 'admin' ? 'Quản trị viên' : 'Người dùng'}` });
  } catch (err) {
    return res.status(500).json({ success: false, message: 'Lỗi server', error: err.message });
  }
};

// GET /api/admin/system (Thống kê và trạng thái hệ thống)
exports.getSystemInfo = async (req, res) => {
  try {
    const [userCount, taskCount, categoryCount, doneTasks, cancelledTasks] = await Promise.all([
      User.count(),
      Task.count(),
      Category.count(),
      Task.count({ where: { status: 'done' } }),
      Task.count({ where: { status: 'cancelled' } }),
    ]);

    const memUsage = process.memoryUsage();
    const systemInfo = {
      dbStatus: 'CONNECTED',
      dbDialect: 'MySQL 8.x',
      nodeVersion: process.version,
      platform: process.platform,
      uptimeSeconds: Math.round(process.uptime()),
      memoryUsedMB: Math.round(memUsage.heapUsed / 1024 / 1024),
      memoryTotalMB: Math.round(memUsage.heapTotal / 1024 / 1024),
      counts: {
        users: userCount,
        tasks: taskCount,
        categories: categoryCount,
        doneTasks,
        cancelledTasks,
      },
    };

    return res.json({ success: true, data: systemInfo });
  } catch (err) {
    return res.status(500).json({ success: false, message: 'Lỗi server', error: err.message });
  }
};

// POST /api/admin/cleanup (Dọn dẹp các task đã hủy để giải phóng database)
exports.cleanupTasks = async (req, res) => {
  try {
    const deletedCount = await Task.destroy({
      where: { status: 'cancelled' },
    });
    return res.json({ success: true, message: `Đã dọn dẹp ${deletedCount} nhiệm vụ đã hủy thành công` });
  } catch (err) {
    return res.status(500).json({ success: false, message: 'Lỗi server', error: err.message });
  }
};
