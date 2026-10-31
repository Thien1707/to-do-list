'use strict';
const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '../.env'), override: true });
const { Sequelize } = require('sequelize');
const { getSequelizeOptions } = require('./dbConfig');

const sequelize = new Sequelize(
  process.env.DB_NAME || 'task_manager_db',
  process.env.DB_USER || 'root',
  process.env.DB_PASS || '',
  getSequelizeOptions()
);

module.exports = sequelize;
