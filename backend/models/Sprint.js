'use strict';
const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const Sprint = sequelize.define('Sprint', {
  id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
  project_id: { type: DataTypes.INTEGER, allowNull: false },
  name: { type: DataTypes.STRING(120), allowNull: false },
  goal: { type: DataTypes.TEXT, allowNull: true },
  start_date: { type: DataTypes.DATEONLY, allowNull: true },
  end_date: { type: DataTypes.DATEONLY, allowNull: true },
  status: {
    type: DataTypes.ENUM('planning', 'active', 'completed'),
    defaultValue: 'planning',
    allowNull: false,
  },
}, {
  tableName: 'sprints',
});

module.exports = Sprint;
