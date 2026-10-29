'use strict';
const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const TaskHistory = sequelize.define('TaskHistory', {
  id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
  task_id: { type: DataTypes.INTEGER, allowNull: false },
  version: { type: DataTypes.INTEGER, allowNull: false, defaultValue: 1 },
  user_id: { type: DataTypes.INTEGER, allowNull: true },
  changed_fields: { type: DataTypes.JSON, allowNull: false },
  before_data: { type: DataTypes.JSON, allowNull: false },
  after_data: { type: DataTypes.JSON, allowNull: false },
  summary: { type: DataTypes.STRING(255), allowNull: true },
}, {
  tableName: 'task_histories',
  updatedAt: false,
});

module.exports = TaskHistory;
