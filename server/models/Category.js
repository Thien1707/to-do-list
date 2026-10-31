'use strict';
const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const Category = sequelize.define('Category', {
  id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
  user_id: { type: DataTypes.INTEGER, allowNull: false },
  name: { type: DataTypes.STRING(80), allowNull: false },
  color: { type: DataTypes.STRING(7), defaultValue: '#6C63FF' },
  icon: { type: DataTypes.STRING(500), allowNull: true, defaultValue: '📁' },
}, { tableName: 'categories' });

module.exports = Category;
