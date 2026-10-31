'use strict';

const { isCloudRuntime } = require('./envCheck');

function useDbSsl() {
  const flag = String(process.env.DB_SSL ?? '').trim().toLowerCase();
  if (flag === 'true' || flag === '1' || flag === 'yes') return true;
  if (flag === 'false' || flag === '0' || flag === 'no') return false;
  // Cloud MySQL (Aiven, PlanetScale, Railway public, …) thường bắt buộc SSL
  return isCloudRuntime();
}

function getDbConnectionSummary() {
  const host = process.env.DB_HOST || 'localhost';
  const port = parseInt(process.env.DB_PORT, 10) || 3306;
  const name = process.env.DB_NAME || 'task_manager_db';
  return { host, port, name, ssl: useDbSsl() };
}

function getSequelizeOptions() {
  const ssl = useDbSsl();
  return {
    host: process.env.DB_HOST || 'localhost',
    port: parseInt(process.env.DB_PORT, 10) || 3306,
    dialect: 'mysql',
    logging: false,
    dialectOptions: ssl
      ? {
          ssl: {
            require: true,
            rejectUnauthorized: false,
          },
          connectTimeout: 60000,
        }
      : {
          connectTimeout: 60000,
        },
    pool: {
      max: 10,
      min: 0,
      acquire: 30000,
      idle: 10000,
    },
    define: {
      timestamps: true,
      underscored: false,
    },
  };
}

module.exports = { getSequelizeOptions, getDbConnectionSummary, useDbSsl };
