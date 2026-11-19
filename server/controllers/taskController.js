'use strict';
const { Task, Category, User, Sprint, ActivityLog, ProjectMember, Project, TaskHistory, sequelize } = require('../models');
const { Op, QueryTypes } = require('sequelize');

const TASK_INCLUDE = [
  { model: Category, attributes: ['id', 'name', 'color', 'icon'], required: false },
  { model: User, as: 'assignee', attributes: ['id', 'name', 'email', 'avatar_url'], required: false },
  { model: User, as: 'owner', attributes: ['id', 'name', 'email', 'avatar_url'] },
  { model: User, as: 'lastEditor', attributes: ['id', 'name', 'email', 'avatar_url'], required: false },
  { model: Sprint, attributes: ['id', 'name', 'status'], required: false },
];

const DEFAULT_TZ_OFFSET_MINUTES = -420; // Asia/Ho_Chi_Minh (UTC+7)

function normalizeTzOffset(rawOffset) {
  const parsed = parseInt(rawOffset, 10);
  if (Number.isNaN(parsed) || parsed < -840 || parsed > 840) {
    return DEFAULT_TZ_OFFSET_MINUTES;
  }
  return parsed;
}

function toLocalDateStr(dateInput, tzOffsetMinutes = DEFAULT_TZ_OFFSET_MINUTES) {
  const ts = dateInput instanceof Date ? dateInput.getTime() : new Date(dateInput).getTime();
  if (Number.isNaN(ts)) return null;
  return new Date(ts - tzOffsetMinutes * 60000).toISOString().slice(0, 10);
}

function shiftDateStr(dateStr, deltaDays) {
  const [y, m, d] = dateStr.split('-').map(Number);
  return new Date(Date.UTC(y, m - 1, d + deltaDays)).toISOString().slice(0, 10);
}

/**
 * World-standard streak algorithm (Todoist / Duolingo / GitHub style):
 * - Uses genuine completion timestamps (`completed_at`, fallback `updatedAt` for legacy rows).
 * - Evaluates calendar days in the user's local timezone.
 * - Preserves yesterday's streak during today's 24h grace window until local midnight.
 */
function computeStreakMetrics(completionTimestamps, tzOffsetMinutes = DEFAULT_TZ_OFFSET_MINUTES, now = new Date()) {
  const todayStr = toLocalDateStr(now, tzOffsetMinutes);
  const yesterdayStr = shiftDateStr(todayStr, -1);

  const dateCounts = new Map();
  for (const ts of completionTimestamps || []) {
    const dayStr = toLocalDateStr(ts, tzOffsetMinutes);
    if (dayStr && dayStr <= todayStr) {
      dateCounts.set(dayStr, (dateCounts.get(dayStr) || 0) + 1);
    }
  }

  const todayCompleted = dateCounts.get(todayStr) || 0;
  const streakActiveToday = todayCompleted > 0;

  let streak = 0;
  let cursor = streakActiveToday ? todayStr : dateCounts.has(yesterdayStr) ? yesterdayStr : null;
  while (cursor && dateCounts.has(cursor)) {
    streak += 1;
    cursor = shiftDateStr(cursor, -1);
  }

  const sortedDays = Array.from(dateCounts.keys()).sort();
  let bestStreak = 0;
  let run = 0;
  let prevDay = null;
  for (const day of sortedDays) {
    run = prevDay && shiftDateStr(prevDay, 1) === day ? run + 1 : 1;
    if (run > bestStreak) bestStreak = run;
    prevDay = day;
  }

  return {
    streak,
    best_streak: bestStreak,
    today_completed: todayCompleted,
    streak_active_today: streakActiveToday,
  };
}

async function fetchUserTaskStats(userId, rawTzOffset) {
  const tzOffsetMinutes = normalizeTzOffset(rawTzOffset);
  const todayStr = toLocalDateStr(new Date(), tzOffsetMinutes);
  const [agg] = await sequelize.query(
    `SELECT
      COUNT(*) AS total,
      SUM(CASE WHEN status = 'todo' THEN 1 ELSE 0 END) AS todo,
      SUM(CASE WHEN status = 'in_progress' THEN 1 ELSE 0 END) AS in_progress,
      SUM(CASE WHEN status = 'done' THEN 1 ELSE 0 END) AS done,
      SUM(CASE WHEN status NOT IN ('done','cancelled') AND due_date IS NOT NULL AND due_date < :today THEN 1 ELSE 0 END) AS overdue
    FROM tasks WHERE user_id = :userId`,
    { replacements: { userId, today: todayStr }, type: QueryTypes.SELECT }
  );

  const since = new Date();
  since.setDate(since.getDate() - 365);
  const doneRows = await sequelize.query(
    `SELECT COALESCE(completed_at, updatedAt) AS completed_ts
     FROM tasks
     WHERE (user_id = :userId OR assignee_id = :userId)
       AND status = 'done'
       AND COALESCE(completed_at, updatedAt) >= :since`,
    { replacements: { userId, since }, type: QueryTypes.SELECT }
  );

  const streakMetrics = computeStreakMetrics(
    doneRows.map((r) => r.completed_ts),
    tzOffsetMinutes
  );

  return {
    total: Number(agg?.total) || 0,
    todo: Number(agg?.todo) || 0,
    in_progress: Number(agg?.in_progress) || 0,
    done: Number(agg?.done) || 0,
    overdue: Number(agg?.overdue) || 0,
    ...streakMetrics,
  };
}

/**
 * Match tasks scheduled for `dateStr` (`due_date`) OR created within that local calendar day (`createdAt`).
 */
function buildDateOrCreatedCondition(dateStr, createdFrom, createdTo) {
  const startBound = createdFrom ? new Date(createdFrom) : new Date(`${dateStr}T00:00:00`);
  const endBound = createdTo ? new Date(createdTo) : new Date(`${dateStr}T23:59:59.999`);
  if (!Number.isNaN(startBound.getTime()) && !Number.isNaN(endBound.getTime())) {
    return {
      [Op.or]: [
        { due_date: dateStr },
        { createdAt: { [Op.between]: [startBound, endBound] } },
      ],
    };
  }
  return { due_date: dateStr };
}

async function buildTaskWhereForUser(req) {
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
    filter_date,
    created_from,
    created_to,
    date_from,
    date_to,
    story_points,
  } = req.query;

  const where = {};
  if (project_id) {
    const member = await ProjectMember.findOne({ where: { project_id, user_id: req.user.id } });
    if (!member) return { error: { status: 403, message: 'Không có quyền truy cập project' } };
    where.project_id = project_id;
  } else {
    where.user_id = req.user.id;
  }

  if (status) where.status = status;
  if (priority) where.priority = priority;
  if (category_id) where.category_id = category_id;
  if (sprint_id !== undefined) where.sprint_id = sprint_id === 'null' ? null : sprint_id;
  if (assignee_id) where.assignee_id = assignee_id;
  if (story_points) where.story_points = story_points;

  if (is_edited === 'true' || is_edited === 'edited') {
    where.is_edited = true;
  } else if (is_edited === 'false' || is_edited === 'unedited') {
    where.is_edited = false;
  }

  const andConditions = [];

  if (filter_date) {
    andConditions.push(buildDateOrCreatedCondition(filter_date, created_from, created_to));
  } else if (due_date) {
    where.due_date = due_date;
  } else if (date_from && date_to) {
    where.due_date = { [Op.between]: [date_from, date_to] };
  } else if (date_from) {
    where.due_date = { [Op.gte]: date_from };
  } else if (date_to) {
    where.due_date = { [Op.lte]: date_to };
  }

  if (search && search.trim()) {
    const q = `%${search.trim()}%`;
    andConditions.push({
      [Op.or]: [{ title: { [Op.like]: q } }, { description: { [Op.like]: q } }],
    });
  }

  if (andConditions.length > 0) {
    where[Op.and] = andConditions;
  }

  return { where };
}

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

// GET /api/tasks/dashboard — một request thay cho tasks + stats + categories
exports.getDashboard = async (req, res) => {
  try {
    const { sort = 'createdAt', order = 'DESC', page = 1, limit = 100 } = req.query;
    const built = await buildTaskWhereForUser(req);
    if (built.error) {
      return res.status(built.error.status).json({ success: false, message: built.error.message });
    }
    const { where } = built;
    const limitNum = Math.min(Math.max(parseInt(limit, 10) || 50, 1), 200);
    const pageNum = Math.max(parseInt(page, 10) || 1, 1);
    const offset = (pageNum - 1) * limitNum;
    const sortCol = ['createdAt', 'updatedAt', 'due_date', 'priority', 'title'].includes(sort) ? sort : 'createdAt';
    const sortDir = String(order).toUpperCase() === 'ASC' ? 'ASC' : 'DESC';

    const [count, rows, stats, categories] = await Promise.all([
      Task.count({ where }),
      Task.findAll({
        where,
        include: TASK_INCLUDE,
        order: [[sortCol, sortDir]],
        limit: limitNum,
        offset,
      }),
      fetchUserTaskStats(req.user.id, req.query.tz_offset),
      Category.findAll({ where: { user_id: req.user.id }, order: [['name', 'ASC']] }),
    ]);

    return res.json({
      success: true,
      data: {
        tasks: rows,
        stats,
        categories,
        pagination: {
          total: count,
          page: pageNum,
          limit: limitNum,
          pages: Math.ceil(count / limitNum) || 1,
        },
      },
    });
  } catch (err) {
    console.error('❌ getDashboard:', err.message, err.original?.sqlMessage || '');
    return res.status(500).json({ success: false, message: 'Đã có lỗi xảy ra trên hệ thống. Vui lòng thử lại sau.' });
  }
};

// GET /api/tasks
exports.getTasks = async (req, res) => {
  try {
    const { sort = 'createdAt', order = 'DESC', page = 1, limit = 50 } = req.query;
    const built = await buildTaskWhereForUser(req);
    if (built.error) {
      return res.status(built.error.status).json({ success: false, message: built.error.message });
    }
    const { where } = built;
    const limitNum = Math.min(Math.max(parseInt(limit, 10) || 50, 1), 200);
    const pageNum = Math.max(parseInt(page, 10) || 1, 1);
    const offset = (pageNum - 1) * limitNum;
    const sortCol = ['createdAt', 'updatedAt', 'due_date', 'priority', 'title'].includes(sort) ? sort : 'createdAt';
    const sortDir = String(order).toUpperCase() === 'ASC' ? 'ASC' : 'DESC';

    const [count, rows] = await Promise.all([
      Task.count({ where }),
      Task.findAll({
        where,
        include: TASK_INCLUDE,
        order: [[sortCol, sortDir]],
        limit: limitNum,
        offset,
      }),
    ]);

    return res.json({
      success: true,
      data: {
        tasks: rows,
        pagination: {
          total: count,
          page: pageNum,
          limit: limitNum,
          pages: Math.ceil(count / limitNum) || 1,
        },
      },
    });
  } catch (err) {
    console.error('❌ getTasks:', err.message, err.original?.sqlMessage || '');
    return res.status(500).json({ success: false, message: 'Đã có lỗi xảy ra trên hệ thống. Vui lòng thử lại sau.' });
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
    const stats = await fetchUserTaskStats(req.user.id, req.query.tz_offset);
    return res.json({ success: true, data: stats });
  } catch (err) {
    console.error('❌ getStats:', err.message, err.original?.sqlMessage || '');
    return res.status(500).json({ success: false, message: 'Đã có lỗi xảy ra trên hệ thống. Vui lòng thử lại sau.' });
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
    const { date, project_id, created_from, created_to } = req.query;
    if (!date) return res.status(400).json({ success: false, message: 'Vui lòng cung cấp tham số date (YYYY-MM-DD)' });

    const formattedDate = String(date).slice(0, 10);
    const where = { ...buildDateOrCreatedCondition(formattedDate, created_from, created_to) };
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
      limit: 120,
      order: [['updatedAt', 'DESC']],
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
