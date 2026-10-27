'use strict';
const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const Task = sequelize.define('Task', {
  id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
  user_id: { type: DataTypes.INTEGER, allowNull: false },
  project_id: { type: DataTypes.INTEGER, allowNull: true },
  category_id: { type: DataTypes.INTEGER, allowNull: true },
  assignee_id: { type: DataTypes.INTEGER, allowNull: true },
  sprint_id: { type: DataTypes.INTEGER, allowNull: true },
  title: { type: DataTypes.STRING(255), allowNull: false },
  description: { type: DataTypes.TEXT, allowNull: true },
  status: {
    type: DataTypes.ENUM('todo', 'in_progress', 'done', 'cancelled'),
    defaultValue: 'todo',
    allowNull: false,
  },
  priority: {
    type: DataTypes.ENUM('low', 'medium', 'high', 'urgent'),
    defaultValue: 'medium',
    allowNull: false,
  },
  story_points: { type: DataTypes.INTEGER, allowNull: true, defaultValue: null },
  due_date: { type: DataTypes.DATEONLY, allowNull: true },
  start_time: { type: DataTypes.STRING(10), allowNull: true, defaultValue: null },
  end_time: { type: DataTypes.STRING(10), allowNull: true, defaultValue: null },
  is_edited: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: false },
  edit_count: { type: DataTypes.INTEGER, allowNull: false, defaultValue: 0 },
  last_edited_at: { type: DataTypes.DATE, allowNull: true, defaultValue: null },
  last_edited_by: { type: DataTypes.INTEGER, allowNull: true, defaultValue: null },
  completed_at: { type: DataTypes.DATE, allowNull: true },
}, {
  tableName: 'tasks',
  hooks: {
    beforeUpdate: (task) => {
      if (task.changed('status') && task.status === 'done' && !task.completed_at) {
        task.completed_at = new Date();
      }
      if (task.changed('status') && task.status !== 'done') {
        task.completed_at = null;
      }
    },
  },
});

module.exports = Task;
