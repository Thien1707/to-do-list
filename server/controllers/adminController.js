'use strict';
const { User, Task, Category } = require('../models');
const { Op, QueryTypes } = require('sequelize');
const sequelize = require('../config/database');

// GET /api/admin/stats (Deep Analytics for Admin)
exports.getStats = async (req, res) => {
  try {
    const todayStart = new Date(new Date().setHours(0, 0, 0, 0));
    const todayStr = new Date().toISOString().split('T')[0];
    const weekStart = new Date();
    weekStart.setDate(weekStart.getDate() - 6);
    weekStart.setHours(0, 0, 0, 0);

    const [taskAgg, userAgg, createdRows, doneRows, topCatRows, topUserRows] = await Promise.all([
      sequelize.query(
        `SELECT
          COUNT(*) AS totalTasks,
          SUM(CASE WHEN status = 'done' THEN 1 ELSE 0 END) AS doneTasks,
          SUM(CASE WHEN status = 'in_progress' THEN 1 ELSE 0 END) AS inProgressTasks,
          SUM(CASE WHEN status = 'todo' THEN 1 ELSE 0 END) AS todoTasks,
          SUM(CASE WHEN status = 'cancelled' THEN 1 ELSE 0 END) AS cancelledTasks,
          SUM(CASE WHEN status NOT IN ('done','cancelled') AND due_date IS NOT NULL AND due_date < :today THEN 1 ELSE 0 END) AS overdueTasks,
          SUM(CASE WHEN priority = 'urgent' THEN 1 ELSE 0 END) AS urgentCount,
          SUM(CASE WHEN priority = 'high' THEN 1 ELSE 0 END) AS highCount,
          SUM(CASE WHEN priority = 'medium' THEN 1 ELSE 0 END) AS mediumCount,
          SUM(CASE WHEN priority = 'low' THEN 1 ELSE 0 END) AS lowCount
        FROM tasks`,
        { replacements: { today: todayStr }, type: QueryTypes.SELECT }
      ),
      sequelize.query(
        `SELECT
          SUM(CASE WHEN role = 'user' THEN 1 ELSE 0 END) AS totalUsers,
          SUM(CASE WHEN role = 'user' AND createdAt >= :todayStart THEN 1 ELSE 0 END) AS newUsersToday,
          SUM(CASE WHEN google_id IS NOT NULL THEN 1 ELSE 0 END) AS googleUsers,
          SUM(CASE WHEN google_id IS NULL THEN 1 ELSE 0 END) AS emailUsers
        FROM users`,
        { replacements: { todayStart }, type: QueryTypes.SELECT }
      ),
      sequelize.query(
        `SELECT DATE(createdAt) AS d, COUNT(*) AS c FROM tasks WHERE createdAt >= :since GROUP BY DATE(createdAt)`,
        { replacements: { since: weekStart }, type: QueryTypes.SELECT }
      ),
      sequelize.query(
        `SELECT DATE(updatedAt) AS d, COUNT(*) AS c FROM tasks WHERE status = 'done' AND updatedAt >= :since GROUP BY DATE(updatedAt)`,
        { replacements: { since: weekStart }, type: QueryTypes.SELECT }
      ),
      sequelize.query(
        `SELECT c.id, c.name, c.color, c.icon, COUNT(t.id) AS count
         FROM categories c
         LEFT JOIN tasks t ON t.category_id = c.id
         GROUP BY c.id, c.name, c.color, c.icon
         ORDER BY count DESC
         LIMIT 6`,
        { type: QueryTypes.SELECT }
      ),
      sequelize.query(
        `SELECT u.id, u.name, u.email, u.avatar_url,
                COUNT(t.id) AS totalTasks,
                SUM(CASE WHEN t.status = 'done' THEN 1 ELSE 0 END) AS doneTasks
         FROM users u
         LEFT JOIN tasks t ON t.user_id = u.id
         WHERE u.role = 'user'
         GROUP BY u.id, u.name, u.email, u.avatar_url
         ORDER BY totalTasks DESC
         LIMIT 5`,
        { type: QueryTypes.SELECT }
      ),
    ]);

    const t = taskAgg[0] || {};
    const u = userAgg[0] || {};
    const totalUsers = Number(u.totalUsers) || 0;
    const totalTasks = Number(t.totalTasks) || 0;
    const doneTasks = Number(t.doneTasks) || 0;
    const inProgressTasks = Number(t.inProgressTasks) || 0;
    const todoTasks = Number(t.todoTasks) || 0;
    const cancelledTasks = Number(t.cancelledTasks) || 0;
    const overdueTasks = Number(t.overdueTasks) || 0;
    const newUsersToday = Number(u.newUsersToday) || 0;
    const googleUsers = Number(u.googleUsers) || 0;
    const emailUsers = Number(u.emailUsers) || 0;
    const urgentCount = Number(t.urgentCount) || 0;
    const highCount = Number(t.highCount) || 0;
    const mediumCount = Number(t.mediumCount) || 0;
    const lowCount = Number(t.lowCount) || 0;

    const topCategories = topCatRows.map((c) => ({
      id: c.id,
      name: c.name,
      color: c.color,
      icon: c.icon,
      count: Number(c.count) || 0,
    }));

    const createdMap = new Map(
      createdRows.map((r) => [String(r.d).slice(0, 10), Number(r.c) || 0])
    );
    const doneMap = new Map(doneRows.map((r) => [String(r.d).slice(0, 10), Number(r.c) || 0]));
    const activity7Days = [];
    for (let i = 6; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      const key = d.toISOString().split('T')[0];
      const dayLabel = `${d.getDate()}/${d.getMonth() + 1}`;
      activity7Days.push({
        date: dayLabel,
        created: createdMap.get(key) || 0,
        done: doneMap.get(key) || 0,
      });
    }

    const topUsers = topUserRows.map((row) => {
      const total = Number(row.totalTasks) || 0;
      const done = Number(row.doneTasks) || 0;
      return {
        id: row.id,
        name: row.name,
        email: row.email,
        avatar_url: row.avatar_url,
        totalTasks: total,
        doneTasks: done,
        rate: total ? Math.round((done / total) * 100) : 0,
      };
    });

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
    console.error("❌ Lỗi:", err.message);
    return res.status(500).json({ success: false, message: "Đã có lỗi xảy ra trên hệ thống. Vui lòng thử lại sau." });
  }
};

// GET /api/admin/users
exports.getUsers = async (req, res) => {
  try {
    const { search, is_active, page = 1, limit = 20 } = req.query;
    const where = { role: 'user' };
    if (search) where[Op.or] = [{ name: { [Op.like]: `%${search}%` } }, { email: { [Op.like]: `%${search}%` } }];
    if (is_active !== undefined) where.is_active = is_active === 'true';

    const limitNum = Math.min(Math.max(parseInt(limit, 10) || 20, 1), 100);
    const pageNum = Math.max(parseInt(page, 10) || 1, 1);
    const offset = (pageNum - 1) * limitNum;
    const [count, rows] = await Promise.all([
      User.count({ where }),
      User.findAll({
        where,
        attributes: { exclude: ['password_hash', 'google_id'] },
        order: [['createdAt', 'DESC']],
        limit: limitNum,
        offset,
      }),
    ]);
    return res.json({
      success: true,
      data: { users: rows, pagination: { total: count, page: pageNum, pages: Math.ceil(count / limitNum) || 1 } },
    });
  } catch (err) {
    console.error("❌ Lỗi:", err.message);
    return res.status(500).json({ success: false, message: "Đã có lỗi xảy ra trên hệ thống. Vui lòng thử lại sau." });
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
    console.error("❌ Lỗi:", err.message);
    return res.status(500).json({ success: false, message: "Đã có lỗi xảy ra trên hệ thống. Vui lòng thử lại sau." });
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
    console.error("❌ Lỗi:", err.message);
    return res.status(500).json({ success: false, message: "Đã có lỗi xảy ra trên hệ thống. Vui lòng thử lại sau." });
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
    console.error("❌ Lỗi:", err.message);
    return res.status(500).json({ success: false, message: "Đã có lỗi xảy ra trên hệ thống. Vui lòng thử lại sau." });
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

    const limitNum = Math.min(Math.max(parseInt(limit, 10) || 20, 1), 100);
    const pageNum = Math.max(parseInt(page, 10) || 1, 1);
    const offset = (pageNum - 1) * limitNum;
    const include = [
      { model: User, as: 'owner', attributes: ['id', 'name', 'email', 'avatar_url'] },
      { model: User, as: 'assignee', attributes: ['id', 'name', 'email', 'avatar_url'], required: false },
    ];
    const [count, rows] = await Promise.all([
      Task.count({ where }),
      Task.findAll({ where, include, order: [['createdAt', 'DESC']], limit: limitNum, offset }),
    ]);

    const tasks = rows.map(t => {
      const plain = t.toJSON();
      plain.User = plain.owner || null;
      return plain;
    });

    return res.json({
      success: true,
      data: { tasks, pagination: { total: count, page: pageNum, pages: Math.ceil(count / limitNum) || 1 } },
    });
  } catch (err) {
    console.error("❌ Lỗi:", err.message);
    return res.status(500).json({ success: false, message: "Đã có lỗi xảy ra trên hệ thống. Vui lòng thử lại sau." });
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
    console.error("❌ Lỗi:", err.message);
    return res.status(500).json({ success: false, message: "Đã có lỗi xảy ra trên hệ thống. Vui lòng thử lại sau." });
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
    console.error("❌ Lỗi:", err.message);
    return res.status(500).json({ success: false, message: "Đã có lỗi xảy ra trên hệ thống. Vui lòng thử lại sau." });
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
    console.error("❌ Lỗi:", err.message);
    return res.status(500).json({ success: false, message: "Đã có lỗi xảy ra trên hệ thống. Vui lòng thử lại sau." });
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
    console.error("❌ Lỗi:", err.message);
    return res.status(500).json({ success: false, message: "Đã có lỗi xảy ra trên hệ thống. Vui lòng thử lại sau." });
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
    console.error("❌ Lỗi:", err.message);
    return res.status(500).json({ success: false, message: "Đã có lỗi xảy ra trên hệ thống. Vui lòng thử lại sau." });
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
    console.error("❌ Lỗi:", err.message);
    return res.status(500).json({ success: false, message: "Đã có lỗi xảy ra trên hệ thống. Vui lòng thử lại sau." });
  }
};
