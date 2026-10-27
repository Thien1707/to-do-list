'use strict';
const { Project, ProjectMember, User, Task, Sprint, ActivityLog, Comment, Category } = require('../models');
const { Op } = require('sequelize');

// ─────────────────────────────────────────────────────────────
// Helper: check membership
// ─────────────────────────────────────────────────────────────
const getMember = (projectId, userId) =>
  ProjectMember.findOne({ where: { project_id: projectId, user_id: userId } });

// ─────────────────────────────────────────────────────────────
// GET /api/projects
// ─────────────────────────────────────────────────────────────
exports.listProjects = async (req, res) => {
  try {
    const userId = req.user.id;

    // Projects where user is owner OR member
    const memberships = await ProjectMember.findAll({ where: { user_id: userId }, attributes: ['project_id'] });
    const memberProjectIds = memberships.map(m => m.project_id);

    const projects = await Project.findAll({
      where: {
        status: 'active',
        [Op.or]: [
          { owner_id: userId },
          { id: { [Op.in]: memberProjectIds } },
        ],
      },
      include: [
        { model: User, as: 'owner', attributes: ['id', 'name', 'email', 'avatar_url'] },
        {
          model: ProjectMember,
          include: [{ model: User, as: 'user', attributes: ['id', 'name', 'email', 'avatar_url'] }],
        },
      ],
      order: [['createdAt', 'DESC']],
    });

    // Attach task counts
    const projectsWithStats = await Promise.all(
      projects.map(async p => {
        const [total, done] = await Promise.all([
          Task.count({ where: { project_id: p.id } }),
          Task.count({ where: { project_id: p.id, status: 'done' } }),
        ]);
        return { ...p.toJSON(), taskCount: total, doneCount: done };
      })
    );

    return res.json({ success: true, data: { projects: projectsWithStats } });
  } catch (err) {
    return res.status(500).json({ success: false, message: 'Lỗi server', error: err.message });
  }
};

// ─────────────────────────────────────────────────────────────
// POST /api/projects
// ─────────────────────────────────────────────────────────────
exports.createProject = async (req, res) => {
  try {
    const { name, description, color, icon } = req.body;
    if (!name?.trim()) return res.status(400).json({ success: false, message: 'Tên project là bắt buộc' });

    const project = await Project.create({
      name: name.trim(),
      description,
      color: color || '#4f46e5',
      icon: icon || '📋',
      owner_id: req.user.id,
    });

    // Auto-add owner as member with 'owner' role
    await ProjectMember.create({ project_id: project.id, user_id: req.user.id, role: 'owner' });

    await ActivityLog.create({
      entity_type: 'project',
      entity_id: project.id,
      project_id: project.id,
      user_id: req.user.id,
      action: 'created',
      new_value: name.trim(),
    });

    const full = await Project.findByPk(project.id, {
      include: [
        { model: User, as: 'owner', attributes: ['id', 'name', 'email', 'avatar_url'] },
        { model: ProjectMember, include: [{ model: User, as: 'user', attributes: ['id', 'name', 'email', 'avatar_url'] }] },
      ],
    });

    return res.status(201).json({ success: true, message: 'Tạo project thành công', data: { project: full } });
  } catch (err) {
    return res.status(500).json({ success: false, message: 'Lỗi server', error: err.message });
  }
};

// ─────────────────────────────────────────────────────────────
// GET /api/projects/:id
// ─────────────────────────────────────────────────────────────
exports.getProject = async (req, res) => {
  try {
    const member = await getMember(req.params.id, req.user.id);
    if (!member) return res.status(403).json({ success: false, message: 'Bạn không có quyền truy cập project này' });

    const project = await Project.findByPk(req.params.id, {
      include: [
        { model: User, as: 'owner', attributes: ['id', 'name', 'email', 'avatar_url'] },
        { model: ProjectMember, include: [{ model: User, as: 'user', attributes: ['id', 'name', 'email', 'avatar_url'] }] },
        { model: Sprint, where: { status: { [Op.ne]: 'completed' } }, required: false, order: [['createdAt', 'ASC']] },
      ],
    });

    if (!project) return res.status(404).json({ success: false, message: 'Không tìm thấy project' });
    return res.json({ success: true, data: { project, myRole: member.role } });
  } catch (err) {
    return res.status(500).json({ success: false, message: 'Lỗi server', error: err.message });
  }
};

// ─────────────────────────────────────────────────────────────
// PUT /api/projects/:id
// ─────────────────────────────────────────────────────────────
exports.updateProject = async (req, res) => {
  try {
    const member = await getMember(req.params.id, req.user.id);
    if (!member || member.role === 'viewer') return res.status(403).json({ success: false, message: 'Không có quyền' });

    const project = await Project.findByPk(req.params.id);
    if (!project) return res.status(404).json({ success: false, message: 'Không tìm thấy project' });

    const { name, description, color, icon, status } = req.body;
    await project.update({ name, description, color, icon, status });

    return res.json({ success: true, message: 'Cập nhật project thành công', data: { project } });
  } catch (err) {
    return res.status(500).json({ success: false, message: 'Lỗi server', error: err.message });
  }
};

// ─────────────────────────────────────────────────────────────
// DELETE /api/projects/:id
// ─────────────────────────────────────────────────────────────
exports.deleteProject = async (req, res) => {
  try {
    const project = await Project.findOne({ where: { id: req.params.id, owner_id: req.user.id } });
    if (!project) return res.status(403).json({ success: false, message: 'Chỉ owner mới có thể xóa project' });

    await project.destroy();
    return res.json({ success: true, message: 'Đã xóa project' });
  } catch (err) {
    return res.status(500).json({ success: false, message: 'Lỗi server', error: err.message });
  }
};

// ─────────────────────────────────────────────────────────────
// POST /api/projects/:id/members  — add member by exact email (Owner only)
// ─────────────────────────────────────────────────────────────
exports.addMember = async (req, res) => {
  try {
    const member = await getMember(req.params.id, req.user.id);
    // Security check: ONLY Project Owner or System Admin can add members
    if (!member || (member.role !== 'owner' && req.user.role !== 'admin')) {
      return res.status(403).json({ success: false, message: 'Chỉ Trưởng dự án (Owner) mới có quyền thêm thành viên' });
    }

    const { email, role = 'member' } = req.body;
    if (!email?.trim()) return res.status(400).json({ success: false, message: 'Vui lòng nhập chính xác email của người muốn thêm' });

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    const normalizedEmail = email.trim().toLowerCase();
    if (!emailRegex.test(normalizedEmail)) {
      return res.status(400).json({ success: false, message: 'Định dạng email không hợp lệ' });
    }

    const invitedUser = await User.findOne({ where: { email: normalizedEmail, is_active: true } });
    if (!invitedUser) {
      return res.status(404).json({ success: false, message: `Không tìm thấy tài khoản với email "${email.trim()}". Người này cần có tài khoản trong hệ thống trước.` });
    }

    const existing = await getMember(req.params.id, invitedUser.id);
    if (existing) {
      return res.status(409).json({ success: false, message: `Tài khoản ${invitedUser.email} đã là thành viên trong project này rồi` });
    }

    const newMember = await ProjectMember.create({
      project_id: req.params.id,
      user_id: invitedUser.id,
      role: role === 'viewer' ? 'viewer' : 'member',
    });

    await ActivityLog.create({
      entity_type: 'project',
      entity_id: req.params.id,
      project_id: req.params.id,
      user_id: req.user.id,
      action: 'member_added',
      new_value: `${invitedUser.name} (${invitedUser.email})`,
    });

    return res.status(201).json({
      success: true,
      message: `Đã kết nối thành công thành viên ${invitedUser.name} (${invitedUser.email}) vào project`,
      data: { member: newMember, user: invitedUser.toSafeJSON() },
    });
  } catch (err) {
    console.error('❌ Lỗi addMember:', err);
    return res.status(500).json({ success: false, message: 'Lỗi server', error: err.message });
  }
};

// ─────────────────────────────────────────────────────────────
// GET /api/projects/:id/lookup-user?email=... — find user by exact email to verify identity
// ─────────────────────────────────────────────────────────────
exports.lookupUser = async (req, res) => {
  try {
    const member = await getMember(req.params.id, req.user.id);
    if (!member || (member.role !== 'owner' && req.user.role !== 'admin')) {
      return res.status(403).json({ success: false, message: 'Chỉ Trưởng dự án (Owner) mới có quyền tra cứu thành viên' });
    }

    const { email } = req.query;
    if (!email?.trim()) {
      return res.status(400).json({ success: false, message: 'Vui lòng nhập email cần kiểm tra' });
    }

    const normalizedEmail = email.trim().toLowerCase();
    const user = await User.findOne({
      where: { email: normalizedEmail, is_active: true },
      attributes: ['id', 'name', 'email', 'avatar_url', 'role', 'createdAt'],
    });

    if (!user) {
      return res.status(404).json({
        success: false,
        message: `Không tìm thấy tài khoản với email "${email.trim()}". Hãy đảm bảo người này đã đăng ký tài khoản trong hệ thống.`,
      });
    }

    const existingMember = await getMember(req.params.id, user.id);

    return res.json({
      success: true,
      data: {
        user: user.toJSON(),
        isMember: !!existingMember,
        currentRole: existingMember ? existingMember.role : null,
      },
    });
  } catch (err) {
    console.error('❌ Lỗi lookupUser:', err);
    return res.status(500).json({ success: false, message: 'Lỗi server', error: err.message });
  }
};

// ─────────────────────────────────────────────────────────────
// PUT /api/projects/:id/members/:userId — update member role (Owner only)
// ─────────────────────────────────────────────────────────────
exports.updateMemberRole = async (req, res) => {
  try {
    const requester = await getMember(req.params.id, req.user.id);
    if (!requester || (requester.role !== 'owner' && req.user.role !== 'admin')) {
      return res.status(403).json({ success: false, message: 'Chỉ Trưởng dự án (Owner) mới có quyền đổi vai trò thành viên' });
    }

    const { role } = req.body;
    if (!['member', 'viewer'].includes(role)) {
      return res.status(400).json({ success: false, message: 'Vai trò không hợp lệ (chỉ chấp nhận member hoặc viewer)' });
    }

    const target = await ProjectMember.findOne({
      where: { project_id: req.params.id, user_id: req.params.userId },
      include: [{ model: User, as: 'user', attributes: ['id', 'name', 'email'] }],
    });
    if (!target) return res.status(404).json({ success: false, message: 'Thành viên không tồn tại trong project' });
    if (target.role === 'owner') return res.status(400).json({ success: false, message: 'Không thể thay đổi vai trò của Trưởng dự án (Owner)' });

    const oldRole = target.role;
    await target.update({ role });

    await ActivityLog.create({
      entity_type: 'project',
      entity_id: req.params.id,
      project_id: req.params.id,
      user_id: req.user.id,
      action: 'updated',
      field_name: 'vai trò',
      old_value: oldRole,
      new_value: role,
    });

    return res.json({
      success: true,
      message: `Đã đổi vai trò của ${target.user?.name || 'thành viên'} thành ${role === 'member' ? 'Member (Cộng tác viên)' : 'Viewer (Chỉ xem)'}`,
      data: { member: target },
    });
  } catch (err) {
    console.error('❌ Lỗi updateMemberRole:', err);
    return res.status(500).json({ success: false, message: 'Lỗi server', error: err.message });
  }
};

// ─────────────────────────────────────────────────────────────
// DELETE /api/projects/:id/members/:userId — Owner only
// ─────────────────────────────────────────────────────────────
exports.removeMember = async (req, res) => {
  try {
    const requester = await getMember(req.params.id, req.user.id);
    if (!requester || (requester.role !== 'owner' && req.user.role !== 'admin')) {
      return res.status(403).json({ success: false, message: 'Chỉ Trưởng dự án (Owner) mới có quyền xóa thành viên' });
    }

    const target = await ProjectMember.findOne({
      where: { project_id: req.params.id, user_id: req.params.userId },
      include: [{ model: User, as: 'user', attributes: ['id', 'name', 'email'] }],
    });
    if (!target) return res.status(404).json({ success: false, message: 'Thành viên không tồn tại trong project' });
    if (target.role === 'owner') return res.status(400).json({ success: false, message: 'Không thể xóa Trưởng dự án (Owner)' });

    const targetName = target.user?.name || `User #${target.user_id}`;
    await target.destroy();

    // Reset assignee for any tasks assigned to removed user
    await Task.update({ assignee_id: null }, {
      where: { project_id: req.params.id, assignee_id: req.params.userId },
    });

    await ActivityLog.create({
      entity_type: 'project',
      entity_id: req.params.id,
      project_id: req.params.id,
      user_id: req.user.id,
      action: 'updated',
      field_name: 'thành viên',
      old_value: targetName,
      new_value: 'Đã xóa khỏi project',
    });

    return res.json({ success: true, message: `Đã xóa ${targetName} khỏi project` });
  } catch (err) {
    console.error('❌ Lỗi removeMember:', err);
    return res.status(500).json({ success: false, message: 'Lỗi server', error: err.message });
  }
};

// ─────────────────────────────────────────────────────────────
// GET /api/projects/:id/tasks
// ─────────────────────────────────────────────────────────────
exports.getProjectTasks = async (req, res) => {
  try {
    const member = await getMember(req.params.id, req.user.id);
    if (!member) return res.status(403).json({ success: false, message: 'Không có quyền truy cập' });

    const { status, priority, assignee_id, sprint_id, search, sort = 'createdAt', order = 'DESC' } = req.query;
    const where = { project_id: req.params.id };
    if (status) where.status = status;
    if (priority) where.priority = priority;
    if (assignee_id) where.assignee_id = assignee_id;
    if (sprint_id !== undefined) {
      where.sprint_id = sprint_id === 'null' ? null : sprint_id;
    }
    if (search) where.title = { [Op.like]: `%${search}%` };

    const tasks = await Task.findAll({
      where,
      include: [
        { model: User, as: 'assignee', attributes: ['id', 'name', 'email', 'avatar_url'], required: false },
        { model: User, as: 'owner', attributes: ['id', 'name', 'email', 'avatar_url'] },
        { model: Category, attributes: ['id', 'name', 'color', 'icon'], required: false },
        { model: Sprint, attributes: ['id', 'name', 'status'], required: false },
      ],
      order: [[sort, order.toUpperCase()]],
    });

    return res.json({ success: true, data: { tasks } });
  } catch (err) {
    return res.status(500).json({ success: false, message: 'Lỗi server', error: err.message });
  }
};

// ─────────────────────────────────────────────────────────────
// GET /api/projects/:id/activity
// ─────────────────────────────────────────────────────────────
exports.getProjectActivity = async (req, res) => {
  try {
    const member = await getMember(req.params.id, req.user.id);
    if (!member) return res.status(403).json({ success: false, message: 'Không có quyền truy cập' });

    const logs = await ActivityLog.findAll({
      where: { project_id: req.params.id },
      include: [{ model: User, as: 'actor', attributes: ['id', 'name', 'email', 'avatar_url'] }],
      order: [['createdAt', 'DESC']],
      limit: 50,
    });

    return res.json({ success: true, data: { logs } });
  } catch (err) {
    return res.status(500).json({ success: false, message: 'Lỗi server', error: err.message });
  }
};

// ─────────────────────────────────────────────────────────────
// Sprint CRUD
// ─────────────────────────────────────────────────────────────
exports.createSprint = async (req, res) => {
  try {
    const member = await getMember(req.params.id, req.user.id);
    if (!member || member.role === 'viewer') return res.status(403).json({ success: false, message: 'Không có quyền' });

    const { name, goal, start_date, end_date } = req.body;
    if (!name?.trim()) return res.status(400).json({ success: false, message: 'Tên sprint là bắt buộc' });

    const sprint = await Sprint.create({
      project_id: req.params.id,
      name: name.trim(),
      goal: goal?.trim() || null,
      start_date: start_date ? start_date : null,
      end_date: end_date ? end_date : null,
    });

    return res.status(201).json({ success: true, message: 'Tạo sprint thành công', data: { sprint } });
  } catch (err) {
    console.error('❌ Lỗi createSprint:', err);
    return res.status(500).json({ success: false, message: 'Lỗi server', error: err.message });
  }
};

exports.listSprints = async (req, res) => {
  try {
    const member = await getMember(req.params.id, req.user.id);
    if (!member) return res.status(403).json({ success: false, message: 'Không có quyền' });

    const sprints = await Sprint.findAll({
      where: { project_id: req.params.id },
      order: [['createdAt', 'ASC']],
    });
    return res.json({ success: true, data: { sprints } });
  } catch (err) {
    return res.status(500).json({ success: false, message: 'Lỗi server', error: err.message });
  }
};

exports.updateSprint = async (req, res) => {
  try {
    const member = await getMember(req.params.id, req.user.id);
    if (!member || member.role === 'viewer') return res.status(403).json({ success: false, message: 'Không có quyền' });

    const sprint = await Sprint.findOne({ where: { id: req.params.sprintId, project_id: req.params.id } });
    if (!sprint) return res.status(404).json({ success: false, message: 'Không tìm thấy sprint' });

    const { name, goal, start_date, end_date, status } = req.body;

    // When completing a sprint, move unfinished tasks back to backlog
    if (status === 'completed' && sprint.status !== 'completed') {
      await Task.update({ sprint_id: null }, {
        where: { sprint_id: sprint.id, status: { [Op.notIn]: ['done', 'cancelled'] } },
      });
    }

    const updateData = {};
    if (name !== undefined) updateData.name = name.trim();
    if (goal !== undefined) updateData.goal = goal ? goal.trim() : null;
    if (start_date !== undefined) updateData.start_date = start_date ? start_date : null;
    if (end_date !== undefined) updateData.end_date = end_date ? end_date : null;
    if (status !== undefined) updateData.status = status;

    await sprint.update(updateData);
    return res.json({ success: true, message: 'Cập nhật sprint thành công', data: { sprint } });
  } catch (err) {
    console.error('❌ Lỗi updateSprint:', err);
    return res.status(500).json({ success: false, message: 'Lỗi server', error: err.message });
  }
};

// DELETE /api/projects/:id/sprints/:sprintId
exports.deleteSprint = async (req, res) => {
  try {
    const member = await getMember(req.params.id, req.user.id);
    if (!member || member.role === 'viewer') return res.status(403).json({ success: false, message: 'Không có quyền' });

    const sprint = await Sprint.findOne({ where: { id: req.params.sprintId, project_id: req.params.id } });
    if (!sprint) return res.status(404).json({ success: false, message: 'Không tìm thấy sprint' });

    // Move tasks in sprint back to backlog
    await Task.update({ sprint_id: null }, { where: { sprint_id: sprint.id } });
    await sprint.destroy();

    return res.json({ success: true, message: 'Đã xóa sprint thành công' });
  } catch (err) {
    console.error('❌ Lỗi deleteSprint:', err);
    return res.status(500).json({ success: false, message: 'Lỗi server', error: err.message });
  }
};
