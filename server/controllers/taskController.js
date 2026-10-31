'use strict';
const { Task, Category, User, Sprint, ActivityLog, ProjectMember, Project, TaskHistory, sequelize } = require('../models');
const { Op } = require('sequelize');

const TASK_INCLUDE = [
  { model: Category, attributes: ['id', 'name', 'color', 'icon'], required: false },
  { model: User, as: 'assignee', attributes: ['id', 'name', 'email', 'avatar_url'], required: false },
  { model: User, as: 'owner', attributes: ['id', 'name', 'email', 'avatar_url'] },
  { model: User, as: 'lastEditor', attributes: ['id', 'name', 'email', 'avatar_url'], required: false },
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
    const {
      status,
      priority,
      category_id,
      project_id,
      sprint_id,
      assignee_id,
      search,
      is_edited,
      due_date,
      date_from,
      date_to,
      sort = 'createdAt',
      order = 'DESC',
      page = 1,
      limit = 50,
    } = req.query;

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

    // Filter by edit history status
    if (is_edited === 'true' || is_edited === 'edited') {
      where.is_edited = true;
    } else if (is_edited === 'false' || is_edited === 'unedited') {
      where.is_edited = false;
    }

    // Filter by dates
    if (due_date) {
      where.due_date = due_date;
    } else if (date_from && date_to) {
      where.due_date = { [Op.between]: [date_from, date_to] };
    } else if (date_from) {
      where.due_date = { [Op.gte]: date_from };
    } else if (date_to) {
      where.due_date = { [Op.lte]: date_to };
    }

    // Keyword search across title and description
    if (search && search.trim()) {
      const q = `%${search.trim()}%`;
      where[Op.or] = [
        { title: { [Op.like]: q } },
        { description: { [Op.like]: q } },
      ];
    }

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
    console.error('❌ getTasks:', err.message, err.original?.sqlMessage || '');
    return res.status(500).json({ success: false, message: "Đã có lỗi xảy ra trên hệ thống. Vui lòng thử lại sau." });
  }
};

// POST /api/tasks
exports.createTask = async (req, res) => {
  try {
    const { title, description, priority, due_date, start_time, end_time, category_id, project_id, assignee_id, sprint_id, story_points } = req.body;

    // Validate project membership if project_id given
    if (project_id) {
      const member = await ProjectMember.findOne({ where: { project_id, user_id: req.user.id } });
      if (!member) return res.status(403).json({ success: false, message: 'Không có quyền tạo task trong project này' });
      if (member.role === 'viewer') return res.status(403).json({ success: false, message: 'Tài khoản của bạn chỉ có quyền xem (Viewer), không thể tạo nhiệm vụ' });
    }

    const task = await Task.create({
      user_id: req.user.id,
      title: title ? title.trim() : '',
      description: description || null,
      priority: priority || 'medium',
      due_date: due_date || null,
      start_time: start_time || null,
      end_time: end_time || null,
      category_id: category_id || null,
      project_id: project_id || null,
      assignee_id: assignee_id || null,
      sprint_id: sprint_id || null,
      story_points: story_points ? parseInt(story_points, 10) : null,
      is_edited: false,
      edit_count: 0,
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
    console.error("❌ Lỗi:", err.message);
    return res.status(500).json({ success: false, message: "Đã có lỗi xảy ra trên hệ thống. Vui lòng thử lại sau." });
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
      } else if (req.user.role !== 'admin') {
        return res.status(403).json({ success: false, message: 'Không có quyền truy cập' });
      }
    }

    return res.json({ success: true, data: { task } });
  } catch (err) {
    console.error("❌ Lỗi:", err.message);
    return res.status(500).json({ success: false, message: "Đã có lỗi xảy ra trên hệ thống. Vui lòng thử lại sau." });
  }
};

// PUT /api/tasks/:id
exports.updateTask = async (req, res) => {
  try {
    const task = await Task.findByPk(req.params.id);
    if (!task) return res.status(404).json({ success: false, message: 'Không tìm thấy nhiệm vụ' });

    // Check access
    if (task.project_id) {
      const project = await Project.findByPk(task.project_id);
      const isOwner = project && project.owner_id === req.user.id;
      const isAdmin = req.user.role === 'admin';
      if (!isOwner && !isAdmin) {
        const member = await ProjectMember.findOne({ where: { project_id: task.project_id, user_id: req.user.id } });
        if (!member || member.role === 'viewer') {
          return res.status(403).json({ success: false, message: 'Bạn chỉ có quyền xem (Viewer), không thể chỉnh sửa nhiệm vụ' });
        }
      }
    } else if (task.user_id !== req.user.id && req.user.role !== 'admin') {
      return res.status(403).json({ success: false, message: 'Không có quyền chỉnh sửa' });
    }

    const fieldDefinitions = [
      { key: 'title', label: 'Tên nhiệm vụ', format: v => (v != null ? String(v).trim() : '') },
      { key: 'description', label: 'Mô tả', format: v => (v != null ? String(v).trim() : '') },
      { key: 'status', label: 'Trạng thái', format: v => (v != null ? String(v) : 'todo') },
      { key: 'priority', label: 'Mức độ ưu tiên', format: v => (v != null ? String(v) : 'medium') },
      { key: 'due_date', label: 'Ngày thực hiện', format: v => (v ? String(v).slice(0, 10) : '') },
      { key: 'start_time', label: 'Giờ bắt đầu', format: v => (v ? String(v).slice(0, 5) : '') },
      { key: 'end_time', label: 'Giờ kết thúc', format: v => (v ? String(v).slice(0, 5) : '') },
      { key: 'story_points', label: 'Story Points', format: v => (v != null && v !== '' ? parseInt(v, 10) : null) },
      { key: 'category_id', label: 'Danh mục', format: v => (v ? parseInt(v, 10) : null) },
      { key: 'assignee_id', label: 'Người thực hiện', format: v => (v ? parseInt(v, 10) : null) },
      { key: 'sprint_id', label: 'Sprint', format: v => (v ? parseInt(v, 10) : null) },
    ];

    const changed_fields = [];
    const before_data = {};
    const after_data = {};
    const changedLabels = [];

    // Capture complete snapshot before
    for (const f of fieldDefinitions) {
      before_data[f.key] = task[f.key] != null ? task[f.key] : null;
    }

    // Check which fields are modified
    for (const f of fieldDefinitions) {
      if (req.body[f.key] !== undefined) {
        const oldVal = f.format(task[f.key]);
        const newVal = f.format(req.body[f.key]);
        if (oldVal !== newVal) {
          changed_fields.push(f.key);
          changedLabels.push(f.label);
        }
      }
    }

    // Prepare after_data
    for (const f of fieldDefinitions) {
      if (req.body[f.key] !== undefined) {
        if (req.body[f.key] == null || req.body[f.key] === '') {
          after_data[f.key] = null;
        } else if (['story_points', 'category_id', 'assignee_id', 'sprint_id'].includes(f.key)) {
          after_data[f.key] = parseInt(req.body[f.key], 10);
        } else if (f.key === 'due_date') {
          after_data[f.key] = String(req.body[f.key]).slice(0, 10);
        } else if (['start_time', 'end_time'].includes(f.key)) {
          after_data[f.key] = String(req.body[f.key]).slice(0, 5);
        } else {
          after_data[f.key] = req.body[f.key];
        }
      } else {
        after_data[f.key] = before_data[f.key];
      }
    }

    // If nothing changed, do not create duplicate or fake history
    if (changed_fields.length === 0) {
      const currentTask = await Task.findByPk(task.id, { include: TASK_INCLUDE });
      return res.json({ success: true, message: 'Dữ liệu không thay đổi', data: { task: currentTask } });
    }

    const nextVersion = (task.edit_count || 0) + 1;
    const summary = `Chỉnh sửa: ${changedLabels.join(', ')}`;

    // Save in transaction for data integrity
    await sequelize.transaction(async (t) => {
      await task.update({
        ...after_data,
        is_edited: true,
        edit_count: nextVersion,
        last_edited_at: new Date(),
        last_edited_by: req.user.id,
      }, { transaction: t });

      await TaskHistory.create({
        task_id: task.id,
        version: nextVersion,
        user_id: req.user.id,
        changed_fields,
        before_data,
        after_data,
        summary,
      }, { transaction: t });

      if (task.project_id) {
        for (const field of changed_fields) {
          await logActivity(task, req.user.id, 'updated', field, before_data[field], after_data[field]);
        }
      }
    });

    const updated = await Task.findByPk(task.id, { include: TASK_INCLUDE });
    return res.json({
      success: true,
      message: 'Cập nhật thành công',
      data: { task: updated, version: nextVersion, summary }
    });
  } catch (err) {
    console.error('❌ Lỗi updateTask:', err);
    console.error("❌ Lỗi:", err.message);
    return res.status(500).json({ success: false, message: "Đã có lỗi xảy ra trên hệ thống. Vui lòng thử lại sau." });
  }
};

// DELETE /api/tasks/:id
exports.deleteTask = async (req, res) => {
  try {
    const task = await Task.findByPk(req.params.id);
    if (!task) return res.status(404).json({ success: false, message: 'Không tìm thấy nhiệm vụ' });

    if (task.project_id) {
      const project = await Project.findByPk(task.project_id);
      const isOwner = project && project.owner_id === req.user.id;
      const isAdmin = req.user.role === 'admin';
      if (!isOwner && !isAdmin) {
        const member = await ProjectMember.findOne({ where: { project_id: task.project_id, user_id: req.user.id } });
        if (!member || member.role === 'viewer') {
          return res.status(403).json({ success: false, message: 'Bạn chỉ có quyền xem (Viewer), không thể xóa nhiệm vụ' });
        }
      }
    } else if (task.user_id !== req.user.id && req.user.role !== 'admin') {
      return res.status(403).json({ success: false, message: 'Không có quyền xóa nhiệm vụ' });
    }

    await task.destroy();
    return res.json({ success: true, message: 'Đã xóa nhiệm vụ' });
  } catch (err) {
    console.error("❌ Lỗi:", err.message);
    return res.status(500).json({ success: false, message: "Đã có lỗi xảy ra trên hệ thống. Vui lòng thử lại sau." });
  }
};

// PATCH /api/tasks/:id/status
exports.updateStatus = async (req, res) => {
  try {
    const task = await Task.findByPk(req.params.id);
    if (!task) return res.status(404).json({ success: false, message: 'Không tìm thấy nhiệm vụ' });

    // Check permission: Owner, Admin, or non-viewer Project Member
    if (task.project_id) {
      const project = await Project.findByPk(task.project_id);
      const isOwner = project && project.owner_id === req.user.id;
      const isAdmin = req.user.role === 'admin';
      if (!isOwner && !isAdmin) {
        const member = await ProjectMember.findOne({ where: { project_id: task.project_id, user_id: req.user.id } });
        if (!member || member.role === 'viewer') {
          return res.status(403).json({
            success: false,
            message: 'Tài khoản của bạn chỉ có quyền xem (Viewer), không thể thay đổi trạng thái nhiệm vụ',
          });
        }
      }
    } else if (task.user_id !== req.user.id && req.user.role !== 'admin') {
      return res.status(403).json({ success: false, message: 'Không có quyền thay đổi trạng thái' });
    }

    const oldStatus = task.status;
    const newStatus = req.body.status;
    if (oldStatus === newStatus) {
      return res.json({ success: true, message: 'Trạng thái không đổi', data: { task } });
    }

    const STATUS_MAP = {
      todo: 'To Do (Cần làm)',
      in_progress: 'In Progress (Đang làm)',
      done: 'Done (Hoàn thành)',
      cancelled: 'Cancelled (Đã hủy)',
    };

    const nextVersion = (task.edit_count || 0) + 1;
    const summary = `Đổi trạng thái: ${STATUS_MAP[oldStatus] || oldStatus} → ${STATUS_MAP[newStatus] || newStatus}`;

    // Snapshot full fields for before & after
    const fieldDefinitions = [
      'title', 'description', 'status', 'priority', 'due_date',
      'start_time', 'end_time', 'story_points', 'category_id', 'assignee_id', 'sprint_id',
    ];

    const before_data = {};
    const after_data = {};
    for (const k of fieldDefinitions) {
      before_data[k] = task[k] != null ? task[k] : null;
      after_data[k] = task[k] != null ? task[k] : null;
    }
    after_data.status = newStatus;

    await sequelize.transaction(async (t) => {
      await task.update({
        status: newStatus,
        is_edited: true,
        edit_count: nextVersion,
        last_edited_at: new Date(),
        last_edited_by: req.user.id,
        completed_at: newStatus === 'done' ? new Date() : (oldStatus === 'done' ? null : task.completed_at),
      }, { transaction: t });

      await TaskHistory.create({
        task_id: task.id,
        version: nextVersion,
        user_id: req.user.id,
        changed_fields: ['status'],
        before_data,
        after_data,
        summary,
      }, { transaction: t });

      await logActivity(task, req.user.id, 'status_changed', 'status', oldStatus, newStatus);
    });

    const updatedTask = await Task.findByPk(task.id, { include: TASK_INCLUDE });
    return res.json({ success: true, message: 'Cập nhật trạng thái thành công', data: { task: updatedTask, version: nextVersion, summary } });
  } catch (err) {
    console.error("❌ Lỗi:", err.message);
    return res.status(500).json({ success: false, message: "Đã có lỗi xảy ra trên hệ thống. Vui lòng thử lại sau." });
  }
};

// GET /api/tasks/stats
exports.getStats = async (req, res) => {
  try {
    const userId = req.user.id;
    const [total, todo, in_progress, done, overdue, completedTasks] = await Promise.all([
      Task.count({ where: { user_id: userId } }),
      Task.count({ where: { user_id: userId, status: 'todo' } }),
      Task.count({ where: { user_id: userId, status: 'in_progress' } }),
      Task.count({ where: { user_id: userId, status: 'done' } }),
      Task.count({
        where: {
          user_id: userId,
          status: { [Op.notIn]: ['done', 'cancelled'] },
          due_date: { [Op.lt]: new Date().toISOString().split('T')[0] },
        },
      }),
      Task.findAll({
        where: { user_id: userId, status: 'done' },
        attributes: ['updatedAt'],
        order: [['updatedAt', 'DESC']],
      }),
    ]);

    // Calculate account-specific streak based on completed tasks
    let streak = 0;
    if (completedTasks && completedTasks.length > 0) {
      const dates = new Set(
        completedTasks.map(t => new Date(t.updatedAt).toISOString().split('T')[0])
      );
      const today = new Date();
      const todayStr = today.toISOString().split('T')[0];
      const yesterday = new Date(today);
      yesterday.setDate(yesterday.getDate() - 1);
      const yesterdayStr = yesterday.toISOString().split('T')[0];

      let checkDate = dates.has(todayStr) ? today : (dates.has(yesterdayStr) ? yesterday : null);

      if (checkDate) {
        while (true) {
          const dateStr = checkDate.toISOString().split('T')[0];
          if (dates.has(dateStr)) {
            streak++;
            checkDate.setDate(checkDate.getDate() - 1);
          } else {
            break;
          }
        }
      }
    }

    return res.json({ success: true, data: { total, todo, in_progress, done, overdue, streak } });
  } catch (err) {
    console.error('❌ getStats:', err.message, err.original?.sqlMessage || '');
    return res.status(500).json({ success: false, message: "Đã có lỗi xảy ra trên hệ thống. Vui lòng thử lại sau." });
  }
};

// GET /api/tasks/categories
exports.getCategories = async (req, res) => {
  try {
    const categories = await Category.findAll({ where: { user_id: req.user.id }, order: [['name', 'ASC']] });
    return res.json({ success: true, data: { categories } });
  } catch (err) {
    console.error('❌ getCategories:', err.message, err.original?.sqlMessage || '');
    return res.status(500).json({ success: false, message: "Đã có lỗi xảy ra trên hệ thống. Vui lòng thử lại sau." });
  }
};

// POST /api/tasks/categories
exports.createCategory = async (req, res) => {
  try {
    const { name, color, icon } = req.body;
    const category = await Category.create({ user_id: req.user.id, name, color, icon });
    return res.status(201).json({ success: true, data: { category } });
  } catch (err) {
    console.error("❌ Lỗi:", err.message);
    return res.status(500).json({ success: false, message: "Đã có lỗi xảy ra trên hệ thống. Vui lòng thử lại sau." });
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
    console.error("❌ Lỗi:", err.message);
    return res.status(500).json({ success: false, message: "Đã có lỗi xảy ra trên hệ thống. Vui lòng thử lại sau." });
  }
};

// GET /api/tasks/:id/history - Retrieve all edit versions of a task
exports.getTaskHistory = async (req, res) => {
  try {
    const task = await Task.findByPk(req.params.id, {
      include: [
        { model: User, as: 'owner', attributes: ['id', 'name', 'email', 'avatar_url'] },
        { model: User, as: 'lastEditor', attributes: ['id', 'name', 'email', 'avatar_url'] },
      ],
    });
    if (!task) return res.status(404).json({ success: false, message: 'Không tìm thấy nhiệm vụ' });

    // Check access: owner OR project member
    if (task.user_id !== req.user.id) {
      if (task.project_id) {
        const member = await ProjectMember.findOne({ where: { project_id: task.project_id, user_id: req.user.id } });
        if (!member) return res.status(403).json({ success: false, message: 'Không có quyền truy cập' });
      } else if (req.user.role !== 'admin') {
        return res.status(403).json({ success: false, message: 'Không có quyền truy cập' });
      }
    }

    const histories = await TaskHistory.findAll({
      where: { task_id: task.id },
      include: [
        { model: User, as: 'editor', attributes: ['id', 'name', 'email', 'avatar_url'] },
      ],
      order: [['version', 'DESC']],
    });

    return res.json({
      success: true,
      data: {
        task: {
          id: task.id,
          title: task.title,
          description: task.description,
          due_date: task.due_date,
          start_time: task.start_time,
          end_time: task.end_time,
          priority: task.priority,
          story_points: task.story_points,
          status: task.status,
          createdAt: task.createdAt,
          updatedAt: task.updatedAt,
          is_edited: task.is_edited,
          edit_count: task.edit_count,
          last_edited_at: task.last_edited_at,
          owner: task.owner,
          lastEditor: task.lastEditor,
        },
        histories,
      },
    });
  } catch (err) {
    console.error('❌ Lỗi getTaskHistory:', err);
    console.error("❌ Lỗi:", err.message);
    return res.status(500).json({ success: false, message: "Đã có lỗi xảy ra trên hệ thống. Vui lòng thử lại sau." });
  }
};

// GET /api/tasks/by-date - Retrieve tasks for a specific date + trace moved/rescheduled tasks
exports.getTasksByDate = async (req, res) => {
  try {
    const { date, project_id } = req.query;
    if (!date) return res.status(400).json({ success: false, message: 'Vui lòng cung cấp tham số date (YYYY-MM-DD)' });

    const formattedDate = String(date).slice(0, 10);
    const where = { due_date: formattedDate };
    if (project_id) {
      const member = await ProjectMember.findOne({ where: { project_id, user_id: req.user.id } });
      if (!member) return res.status(403).json({ success: false, message: 'Không có quyền truy cập' });
      where.project_id = project_id;
    } else {
      where.user_id = req.user.id;
    }

    // 1. Current tasks scheduled on this date
    const currentTasks = await Task.findAll({
      where,
      include: TASK_INCLUDE,
      order: [['start_time', 'ASC'], ['createdAt', 'ASC']],
    });

    // 2. Rescheduled tasks: Tasks previously scheduled on this date in TaskHistory, but currently on a different date
    const whereBase = project_id ? { project_id } : { user_id: req.user.id };
    const allUserTasks = await Task.findAll({
      where: {
        ...whereBase,
        due_date: { [Op.or]: [{ [Op.ne]: formattedDate }, null] },
        is_edited: true,
      },
      include: TASK_INCLUDE,
    });

    const candidateIds = allUserTasks.map(t => t.id);
    let rescheduledTasks = [];

    if (candidateIds.length > 0) {
      const matchingHistories = await TaskHistory.findAll({
        where: {
          task_id: { [Op.in]: candidateIds },
        },
        include: [{ model: User, as: 'editor', attributes: ['id', 'name', 'avatar_url'] }],
        order: [['version', 'DESC']],
      });

      const matchedTaskMap = new Map();
      for (const h of matchingHistories) {
        const prevDate = h.before_data?.due_date ? String(h.before_data.due_date).slice(0, 10) : null;
        if (prevDate === formattedDate && !matchedTaskMap.has(h.task_id)) {
          const t = allUserTasks.find(item => item.id === h.task_id);
          if (t) {
            matchedTaskMap.set(h.task_id, {
              task: t,
              movedAt: h.createdAt,
              rescheduled_at: h.createdAt,
              movedBy: h.editor,
              editor: h.editor,
              movedToDate: t.due_date,
              version: h.version,
            });
          }
        }
      }
      rescheduledTasks = Array.from(matchedTaskMap.values());
    }

    return res.json({
      success: true,
      data: {
        date: formattedDate,
        currentTasks,
        current_tasks: currentTasks,
        rescheduledTasks,
        rescheduled_from_here: rescheduledTasks,
      },
    });
  } catch (err) {
    console.error('❌ Lỗi getTasksByDate:', err);
    console.error("❌ Lỗi:", err.message);
    return res.status(500).json({ success: false, message: "Đã có lỗi xảy ra trên hệ thống. Vui lòng thử lại sau." });
  }
};
