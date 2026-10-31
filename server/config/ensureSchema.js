'use strict';

const { DataTypes } = require('sequelize');

async function tableExists(qi, tableName) {
  try {
    await qi.describeTable(tableName);
    return true;
  } catch {
    return false;
  }
}

/** Đồng bộ bảng + bổ sung cột thiếu (Aiven/DB cũ thường thiếu cột so với model). */
async function ensureSchema(sequelize) {
  await sequelize.sync();

  const qi = sequelize.getQueryInterface();

  if (!(await tableExists(qi, 'categories'))) {
    await sequelize.models.Category.sync();
  }
  if (!(await tableExists(qi, 'tasks'))) {
    await sequelize.models.Task.sync();
  }

  if (await tableExists(qi, 'categories')) {
    const catCols = await qi.describeTable('categories');
    if (!catCols.icon) {
      // MySQL không cho DEFAULT trên TEXT — dùng VARCHAR hoặc không default
      await qi.addColumn('categories', 'icon', {
        type: DataTypes.STRING(500),
        allowNull: true,
      });
    }
  }

  if (await tableExists(qi, 'tasks')) {
    const cols = await qi.describeTable('tasks');
    const add = async (name, spec) => {
      if (!cols[name]) await qi.addColumn('tasks', name, spec);
    };
    await add('project_id', {
      type: DataTypes.INTEGER,
      allowNull: true,
      references: { model: 'projects', key: 'id' },
      onDelete: 'SET NULL',
    });
    await add('assignee_id', {
      type: DataTypes.INTEGER,
      allowNull: true,
      references: { model: 'users', key: 'id' },
      onDelete: 'SET NULL',
    });
    await add('sprint_id', {
      type: DataTypes.INTEGER,
      allowNull: true,
      references: { model: 'sprints', key: 'id' },
      onDelete: 'SET NULL',
    });
    await add('story_points', { type: DataTypes.INTEGER, allowNull: true, defaultValue: null });
    await add('start_time', { type: DataTypes.STRING(10), allowNull: true, defaultValue: null });
    await add('end_time', { type: DataTypes.STRING(10), allowNull: true, defaultValue: null });
    await add('is_edited', { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: false });
    await add('edit_count', { type: DataTypes.INTEGER, allowNull: false, defaultValue: 0 });
    await add('last_edited_at', { type: DataTypes.DATE, allowNull: true, defaultValue: null });
    await add('last_edited_by', {
      type: DataTypes.INTEGER,
      allowNull: true,
      references: { model: 'users', key: 'id' },
      onDelete: 'SET NULL',
    });
  }

  if (await tableExists(qi, 'users')) {
    const userCols = await qi.describeTable('users');
    const addUser = async (name, spec) => {
      if (!userCols[name]) await qi.addColumn('users', name, spec);
    };
    await addUser('phone', { type: DataTypes.STRING(20), allowNull: true });
    await addUser('bio', { type: DataTypes.TEXT, allowNull: true });
    await addUser('job_title', { type: DataTypes.STRING(100), allowNull: true });
    await addUser('department', { type: DataTypes.STRING(100), allowNull: true });
    await addUser('theme_preference', { type: DataTypes.STRING(20), defaultValue: 'light' });
    await addUser('notification_settings', { type: DataTypes.JSON, allowNull: true });
    if (userCols.avatar_url && userCols.avatar_url.type !== 'LONGTEXT') {
      try {
        await qi.changeColumn('users', 'avatar_url', { type: DataTypes.TEXT('long'), allowNull: true });
      } catch (_) {}
    }
  }
}

module.exports = { ensureSchema };
