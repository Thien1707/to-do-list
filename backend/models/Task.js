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
