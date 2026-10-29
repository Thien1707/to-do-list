'use strict';
const sequelize = require('../config/database');
const User = require('./User');
const Task = require('./Task');
const Category = require('./Category');
const Project = require('./Project');
const ProjectMember = require('./ProjectMember');
const Comment = require('./Comment');
const ActivityLog = require('./ActivityLog');
const Sprint = require('./Sprint');
const TaskHistory = require('./TaskHistory');

// ── User ↔ Task ──────────────────────────────────────────────
User.hasMany(Task, { foreignKey: 'user_id', onDelete: 'CASCADE' });
Task.belongsTo(User, { foreignKey: 'user_id', as: 'owner' });

// assignee
User.hasMany(Task, { foreignKey: 'assignee_id', as: 'assignedTasks' });
Task.belongsTo(User, { foreignKey: 'assignee_id', as: 'assignee' });

// ── User ↔ Category ──────────────────────────────────────────
User.hasMany(Category, { foreignKey: 'user_id', onDelete: 'CASCADE' });
Category.belongsTo(User, { foreignKey: 'user_id' });

Category.hasMany(Task, { foreignKey: 'category_id', onDelete: 'SET NULL' });
Task.belongsTo(Category, { foreignKey: 'category_id' });

// ── Project ──────────────────────────────────────────────────
User.hasMany(Project, { foreignKey: 'owner_id', onDelete: 'CASCADE' });
Project.belongsTo(User, { foreignKey: 'owner_id', as: 'owner' });

// Project ↔ Members (many-to-many via ProjectMember)
Project.hasMany(ProjectMember, { foreignKey: 'project_id', onDelete: 'CASCADE' });
ProjectMember.belongsTo(Project, { foreignKey: 'project_id' });
User.hasMany(ProjectMember, { foreignKey: 'user_id', onDelete: 'CASCADE' });
ProjectMember.belongsTo(User, { foreignKey: 'user_id', as: 'user' });

// Project ↔ Tasks
Project.hasMany(Task, { foreignKey: 'project_id', onDelete: 'SET NULL' });
Task.belongsTo(Project, { foreignKey: 'project_id' });

// ── Sprint ────────────────────────────────────────────────────
Project.hasMany(Sprint, { foreignKey: 'project_id', onDelete: 'CASCADE' });
Sprint.belongsTo(Project, { foreignKey: 'project_id' });

Sprint.hasMany(Task, { foreignKey: 'sprint_id', onDelete: 'SET NULL' });
Task.belongsTo(Sprint, { foreignKey: 'sprint_id' });

// ── Comments ──────────────────────────────────────────────────
Task.hasMany(Comment, { foreignKey: 'task_id', onDelete: 'CASCADE' });
Comment.belongsTo(Task, { foreignKey: 'task_id' });
User.hasMany(Comment, { foreignKey: 'user_id', onDelete: 'CASCADE' });
Comment.belongsTo(User, { foreignKey: 'user_id', as: 'author' });

// ── ActivityLog ───────────────────────────────────────────────
User.hasMany(ActivityLog, { foreignKey: 'user_id', onDelete: 'SET NULL' });
ActivityLog.belongsTo(User, { foreignKey: 'user_id', as: 'actor' });

// ── TaskHistory (Edit History) ────────────────────────────────
Task.hasMany(TaskHistory, { foreignKey: 'task_id', as: 'histories', onDelete: 'CASCADE' });
TaskHistory.belongsTo(Task, { foreignKey: 'task_id', as: 'task' });
User.hasMany(TaskHistory, { foreignKey: 'user_id', as: 'taskEdits' });
TaskHistory.belongsTo(User, { foreignKey: 'user_id', as: 'editor' });
User.hasMany(Task, { foreignKey: 'last_edited_by', as: 'lastEditedTasks' });
Task.belongsTo(User, { foreignKey: 'last_edited_by', as: 'lastEditor' });

module.exports = {
  sequelize,
  User,
  Task,
  Category,
  Project,
  ProjectMember,
  Comment,
  ActivityLog,
  Sprint,
  TaskHistory,
};
