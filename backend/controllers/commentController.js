'use strict';
const { Comment, Task, User, ActivityLog, ProjectMember } = require('../models');

// Helper: check if user can access a task (owner OR project member)
const canAccessTask = async (taskId, userId) => {
  const task = await Task.findByPk(taskId);
  if (!task) return null;
  if (task.user_id === userId) return task;
  if (task.project_id) {
    const member = await ProjectMember.findOne({ where: { project_id: task.project_id, user_id: userId } });
    if (member) return task;
  }
  return null;
};

// GET /api/tasks/:id/comments
exports.getComments = async (req, res) => {
  try {
    const task = await canAccessTask(req.params.id, req.user.id);
    if (!task) return res.status(403).json({ success: false, message: 'Không có quyền truy cập' });

    const comments = await Comment.findAll({
      where: { task_id: req.params.id },
      include: [{ model: User, as: 'author', attributes: ['id', 'name', 'email', 'avatar_url'] }],
      order: [['createdAt', 'ASC']],
    });

    return res.json({ success: true, data: { comments } });
  } catch (err) {
    console.error("❌ Lỗi:", err.message);
    return res.status(500).json({ success: false, message: "Đã có lỗi xảy ra trên hệ thống. Vui lòng thử lại sau." });
  }
};

// POST /api/tasks/:id/comments
exports.createComment = async (req, res) => {
  try {
    const task = await canAccessTask(req.params.id, req.user.id);
    if (!task) return res.status(403).json({ success: false, message: 'Không có quyền truy cập' });

    const { content } = req.body;
    if (!content?.trim()) return res.status(400).json({ success: false, message: 'Nội dung comment không được trống' });

    const comment = await Comment.create({ task_id: req.params.id, user_id: req.user.id, content: content.trim() });

    // Log activity
    if (task.project_id) {
      await ActivityLog.create({
        entity_type: 'comment',
        entity_id: comment.id,
        project_id: task.project_id,
        user_id: req.user.id,
        action: 'commented',
        new_value: content.trim().slice(0, 200),
        meta: { task_id: task.id, task_title: task.title },
      });
    }

    const full = await Comment.findByPk(comment.id, {
      include: [{ model: User, as: 'author', attributes: ['id', 'name', 'email', 'avatar_url'] }],
    });

    return res.status(201).json({ success: true, message: 'Đã thêm comment', data: { comment: full } });
  } catch (err) {
    console.error("❌ Lỗi:", err.message);
    return res.status(500).json({ success: false, message: "Đã có lỗi xảy ra trên hệ thống. Vui lòng thử lại sau." });
  }
};

// PUT /api/tasks/:taskId/comments/:commentId
exports.updateComment = async (req, res) => {
  try {
    const comment = await Comment.findOne({ where: { id: req.params.commentId, user_id: req.user.id } });
    if (!comment) return res.status(403).json({ success: false, message: 'Không tìm thấy hoặc không có quyền sửa comment này' });

    const { content } = req.body;
    if (!content?.trim()) return res.status(400).json({ success: false, message: 'Nội dung không được trống' });

    await comment.update({ content: content.trim() });
    const full = await Comment.findByPk(comment.id, {
      include: [{ model: User, as: 'author', attributes: ['id', 'name', 'email', 'avatar_url'] }],
    });

    return res.json({ success: true, message: 'Đã cập nhật comment', data: { comment: full } });
  } catch (err) {
    console.error("❌ Lỗi:", err.message);
    return res.status(500).json({ success: false, message: "Đã có lỗi xảy ra trên hệ thống. Vui lòng thử lại sau." });
  }
};

// DELETE /api/tasks/:taskId/comments/:commentId
exports.deleteComment = async (req, res) => {
  try {
    const comment = await Comment.findByPk(req.params.commentId);
    if (!comment) return res.status(404).json({ success: false, message: 'Không tìm thấy comment' });

    // Allow owner of comment or project owner to delete
    if (comment.user_id !== req.user.id && req.user.role !== 'admin') {
      return res.status(403).json({ success: false, message: 'Không có quyền xóa comment này' });
    }

    await comment.destroy();
    return res.json({ success: true, message: 'Đã xóa comment' });
  } catch (err) {
    console.error("❌ Lỗi:", err.message);
    return res.status(500).json({ success: false, message: "Đã có lỗi xảy ra trên hệ thống. Vui lòng thử lại sau." });
  }
};

// GET /api/tasks/:id/activity
exports.getTaskActivity = async (req, res) => {
  try {
    const task = await canAccessTask(req.params.id, req.user.id);
    if (!task) return res.status(403).json({ success: false, message: 'Không có quyền truy cập' });

    const logs = await ActivityLog.findAll({
      where: { entity_type: 'task', entity_id: req.params.id },
      include: [{ model: User, as: 'actor', attributes: ['id', 'name', 'email', 'avatar_url'] }],
      order: [['createdAt', 'DESC']],
      limit: 50,
    });

    return res.json({ success: true, data: { logs } });
  } catch (err) {
    console.error("❌ Lỗi:", err.message);
    return res.status(500).json({ success: false, message: "Đã có lỗi xảy ra trên hệ thống. Vui lòng thử lại sau." });
  }
};
