'use strict';
const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const Project = sequelize.define('Project', {
  id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
  name: { type: DataTypes.STRING(150), allowNull: false },
  description: { type: DataTypes.TEXT, allowNull: true },
  color: { type: DataTypes.STRING(20), defaultValue: '#4f46e5' },
  icon: { type: DataTypes.STRING(10), defaultValue: '📋' },
  owner_id: { type: DataTypes.INTEGER, allowNull: false },
  status: {
    type: DataTypes.ENUM('active', 'archived'),
    defaultValue: 'active',
    allowNull: false,
  },
}, {
  tableName: 'projects',
});

module.exports = Project;
