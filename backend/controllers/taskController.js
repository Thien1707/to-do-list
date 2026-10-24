'use strict';
const { Task, Category, User, Sprint, ActivityLog, ProjectMember } = require('../models');
const { Op } = require('sequelize');

const TASK_INCLUDE = [
  { model: Category, attributes: ['id', 'name', 'color', 'icon'], required: false },
  { model: User, as: 'assignee', attributes: ['id', 'name', 'email', 'avatar_url'], required: false },
  { model: User, as: 'owner', attributes: ['id', 'name', 'email', 'avatar_url'] },
  { model: Sprint, attributes: ['id', 'name', 'status'], required: false },
];

const logActivity = async (task, userId, action, field, oldVal, newVal) => {
  if (!task.project_id) return;
  await ActivityLog.create({
    entity_type: 'task',
    entity_id: task.id,
    project_id: task.project_id,
    user_id: userId,
    action,
    field_name: field,
    old_value: oldVal != null ? String(oldVal) : null,
    new_value: newVal != null ? String(newVal) : null,
    meta: { task_title: task.title },
  });
};

// GET /api/tasks
exports.getTasks = async (req, res) => {
  try {
    const { status, priority, category_id, project_id, sprint_id, assignee_id, search, sort = 'createdAt', order = 'DESC', page = 1, limit = 50 } = req.query;

    const where = {};
    // If project_id is given, check membership first
    if (project_id) {
      const member = await ProjectMember.findOne({ where: { project_id, user_id: req.user.id } });
      if (!member) return res.status(403).json({ success: false, message: 'Không có quyền truy cập project' });
      where.project_id = project_id;
    } else {
      where.user_id = req.user.id;
    }

    if (status) where.status = status;
    if (priority) where.priority = priority;
    if (category_id) where.category_id = category_id;
    if (sprint_id !== undefined) where.sprint_id = sprint_id === 'null' ? null : sprint_id;
    if (assignee_id) where.assignee_id = assignee_id;
    if (search) where.title = { [Op.like]: `%${search}%` };

    const offset = (parseInt(page) - 1) * parseInt(limit);
    const { count, rows } = await Task.findAndCountAll({
      where,
      include: TASK_INCLUDE,
      order: [[sort, order.toUpperCase()]],
      limit: parseInt(limit),
      offset,
    });

    return res.json({
      success: true,
      data: {
        tasks: rows,
        pagination: { total: count, page: parseInt(page), limit: parseInt(limit), pages: Math.ceil(count / parseInt(limit)) },
      },
    });
  } catch (err) {
    return res.status(500).json({ success: false, message: 'Lỗi server', error: err.message });
  }
};

// POST /api/tasks
exports.createTask = async (req, res) => {
  try {
    const { title, description, priority, due_date, category_id, project_id, assignee_id, sprint_id, story_points } = req.body;

    // Validate project membership if project_id given
    if (project_id) {
      const member = await ProjectMember.findOne({ where: { project_id, user_id: req.user.id } });
      if (!member) return res.status(403).json({ success: false, message: 'Không có quyền tạo task trong project này' });
    }

    const task = await Task.create({
      user_id: req.user.id,
      title: title ? title.trim() : '',
      description: description || null,
      priority: priority || 'medium',
      due_date: due_date || null,
      category_id: category_id || null,
      project_id: project_id || null,
      assignee_id: assignee_id || null,
      sprint_id: sprint_id || null,
      story_points: story_points ? parseInt(story_points) : null,
    });

    if (project_id) {
      await ActivityLog.create({
        entity_type: 'task',
        entity_id: task.id,
        project_id: task.project_id,
        user_id: req.user.id,
        action: 'created',
        new_value: title,
      });
    }

    const taskWithAll = await Task.findByPk(task.id, { include: TASK_INCLUDE });
    return res.status(201).json({ success: true, message: 'Tạo nhiệm vụ thành công', data: { task: taskWithAll } });
  } catch (err) {
    console.error('❌ Lỗi createTask:', err);
    return res.status(500).json({ success: false, message: 'Lỗi server', error: err.message });
  }
};

// GET /api/tasks/:id
exports.getTask = async (req, res) => {
  try {
    const task = await Task.findByPk(req.params.id, { include: TASK_INCLUDE });
    if (!task) return res.status(404).json({ success: false, message: 'Không tìm thấy nhiệm vụ' });

    // Check access: owner OR project member
    if (task.user_id !== req.user.id) {
      if (task.project_id) {
        const member = await ProjectMember.findOne({ where: { project_id: task.project_id, user_id: req.user.id } });
        if (!member) return res.status(403).json({ success: false, message: 'Không có quyền truy cập' });
      } else {
        return res.status(403).json({ success: false, message: 'Không có quyền truy cập' });
      }
    }

    return res.json({ success: true, data: { task } });
  } catch (err) {
    return res.status(500).json({ success: false, message: 'Lỗi server', error: err.message });
  }
};

// PUT /api/tasks/:id
exports.updateTask = async (req, res) => {
  try {
    const task = await Task.findByPk(req.params.id);
    if (!task) return res.status(404).json({ success: false, message: 'Không tìm thấy nhiệm vụ' });

    // Check access
    if (task.user_id !== req.user.id && task.project_id) {
      const member = await ProjectMember.findOne({ where: { project_id: task.project_id, user_id: req.user.id } });
      if (!member || member.role === 'viewer') return res.status(403).json({ success: false, message: 'Không có quyền' });
    } else if (task.user_id !== req.user.id) {
      return res.status(403).json({ success: false, message: 'Không có quyền' });
    }

    const { title, description, status, priority, due_date, category_id, assignee_id, sprint_id, story_points } = req.body;

    // Log changes
    const changes = { status, priority, assignee_id, sprint_id };
    for (const [field, newVal] of Object.entries(changes)) {
      if (newVal !== undefined && String(task[field]) !== String(newVal)) {
        await logActivity(task, req.user.id, 'updated', field, task[field], newVal);
      }
    }

    await task.update({
      title: title !== undefined ? title : task.title,
      description: description !== undefined ? (description || null) : task.description,
      status: status || task.status,
      priority: priority || task.priority,
      due_date: due_date !== undefined ? (due_date || null) : task.due_date,
      category_id: category_id !== undefined ? (category_id || null) : task.category_id,
      assignee_id: assignee_id !== undefined ? (assignee_id || null) : task.assignee_id,
      sprint_id: sprint_id !== undefined ? (sprint_id || null) : task.sprint_id,
      story_points: story_points !== undefined ? (story_points ? parseInt(story_points) : null) : task.story_points,
    });
    const updated = await Task.findByPk(task.id, { include: TASK_INCLUDE });
    return res.json({ success: true, message: 'Cập nhật thành công', data: { task: updated } });
  } catch (err) {
    console.error('❌ Lỗi updateTask:', err);
    return res.status(500).json({ success: false, message: 'Lỗi server', error: err.message });
  }
};

// DELETE /api/tasks/:id
exports.deleteTask = async (req, res) => {
  try {
    const task = await Task.findByPk(req.params.id);
    if (!task) return res.status(404).json({ success: false, message: 'Không tìm thấy nhiệm vụ' });

    if (task.user_id !== req.user.id && task.project_id) {
      const member = await ProjectMember.findOne({ where: { project_id: task.project_id, user_id: req.user.id } });
      if (!member || member.role === 'viewer') return res.status(403).json({ success: false, message: 'Không có quyền' });
    } else if (task.user_id !== req.user.id) {
      return res.status(403).json({ success: false, message: 'Không có quyền' });
    }

    await task.destroy();
    return res.json({ success: true, message: 'Đã xóa nhiệm vụ' });
  } catch (err) {
    return res.status(500).json({ success: false, message: 'Lỗi server', error: err.message });
  }
};

// PATCH /api/tasks/:id/status
exports.updateStatus = async (req, res) => {
  try {
    const task = await Task.findByPk(req.params.id);
    if (!task) return res.status(404).json({ success: false, message: 'Không tìm thấy nhiệm vụ' });

    const oldStatus = task.status;
    await task.update({ status: req.body.status });

    await logActivity(task, req.user.id, 'status_changed', 'status', oldStatus, req.body.status);

    return res.json({ success: true, message: 'Cập nhật trạng thái thành công', data: { task } });
  } catch (err) {
    return res.status(500).json({ success: false, message: 'Lỗi server', error: err.message });
  }
};

// GET /api/tasks/stats
exports.getStats = async (req, res) => {
  try {
    const userId = req.user.id;
    const [total, todo, in_progress, done, overdue] = await Promise.all([
      Task.count({ where: { user_id: userId } }),
      Task.count({ where: { user_id: userId, status: 'todo' } }),
      Task.count({ where: { user_id: userId, status: 'in_progress' } }),
      Task.count({ where: { user_id: userId, status: 'done' } }),
      Task.count({ where: { user_id: userId, status: { [Op.notIn]: ['done', 'cancelled'] }, due_date: { [Op.lt]: new Date() } } }),
    ]);
    return res.json({ success: true, data: { total, todo, in_progress, done, overdue } });
  } catch (err) {
    return res.status(500).json({ success: false, message: 'Lỗi server', error: err.message });
  }
};

// GET /api/tasks/categories
exports.getCategories = async (req, res) => {
  try {
    const categories = await Category.findAll({ where: { user_id: req.user.id }, order: [['name', 'ASC']] });
    return res.json({ success: true, data: { categories } });
  } catch (err) {
    return res.status(500).json({ success: false, message: 'Lỗi server', error: err.message });
  }
};

// POST /api/tasks/categories
exports.createCategory = async (req, res) => {
  try {
    const { name, color, icon } = req.body;
    const category = await Category.create({ user_id: req.user.id, name, color, icon });
    return res.status(201).json({ success: true, data: { category } });
  } catch (err) {
    return res.status(500).json({ success: false, message: 'Lỗi server', error: err.message });
  }
};

// DELETE /api/tasks/categories/:id
exports.deleteCategory = async (req, res) => {
  try {
    const cat = await Category.findOne({ where: { id: req.params.id, user_id: req.user.id } });
    if (!cat) return res.status(404).json({ success: false, message: 'Không tìm thấy danh mục' });
    await cat.destroy();
    return res.json({ success: true, message: 'Đã xóa danh mục' });
  } catch (err) {
    return res.status(500).json({ success: false, message: 'Lỗi server', error: err.message });
  }
};
