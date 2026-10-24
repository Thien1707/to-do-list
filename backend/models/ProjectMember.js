'use strict';
const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const ProjectMember = sequelize.define('ProjectMember', {
  id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
  project_id: { type: DataTypes.INTEGER, allowNull: false },
  user_id: { type: DataTypes.INTEGER, allowNull: false },
  role: {
    type: DataTypes.ENUM('owner', 'member', 'viewer'),
    defaultValue: 'member',
    allowNull: false,
  },
  joined_at: { type: DataTypes.DATE, defaultValue: DataTypes.NOW },
}, {
  tableName: 'project_members',
  indexes: [{ unique: true, fields: ['project_id', 'user_id'] }],
});

module.exports = ProjectMember;
