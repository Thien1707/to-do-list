'use strict';
const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const ActivityLog = sequelize.define('ActivityLog', {
  id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
  entity_type: {
    type: DataTypes.ENUM('task', 'project', 'comment'),
    allowNull: false,
  },
  entity_id: { type: DataTypes.INTEGER, allowNull: false },
  project_id: { type: DataTypes.INTEGER, allowNull: true },
  user_id: { type: DataTypes.INTEGER, allowNull: true },
  action: { type: DataTypes.STRING(80), allowNull: false },
  field_name: { type: DataTypes.STRING(60), allowNull: true },
  old_value: { type: DataTypes.TEXT, allowNull: true },
  new_value: { type: DataTypes.TEXT, allowNull: true },
  meta: { type: DataTypes.JSON, allowNull: true },
}, {
  tableName: 'activity_logs',
  updatedAt: false,
});

module.exports = ActivityLog;
