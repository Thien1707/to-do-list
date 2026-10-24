'use strict';
const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');
const bcrypt = require('bcryptjs');

const User = sequelize.define('User', {
  id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
  name: { type: DataTypes.STRING(100), allowNull: false },
  email: { type: DataTypes.STRING(150), allowNull: false, unique: true, validate: { isEmail: true } },
  password_hash: { type: DataTypes.STRING(255), allowNull: true },
  role: { type: DataTypes.ENUM('user', 'admin'), defaultValue: 'user', allowNull: false },
  google_id: { type: DataTypes.STRING(100), allowNull: true, unique: true },
  avatar_url: { type: DataTypes.TEXT, allowNull: true },
  is_active: { type: DataTypes.BOOLEAN, defaultValue: true },
}, {
  tableName: 'users',
  hooks: {
    beforeCreate: async (user) => {
      if (user.password_hash) {
        user.password_hash = await bcrypt.hash(user.password_hash, 12);
      }
    },
    beforeUpdate: async (user) => {
      if (user.changed('password_hash') && user.password_hash) {
        user.password_hash = await bcrypt.hash(user.password_hash, 12);
      }
    },
  },
});

User.prototype.comparePassword = async function (password) {
  if (!this.password_hash) return false;
  return bcrypt.compare(password, this.password_hash);
};

User.prototype.toSafeJSON = function () {
  const { password_hash, google_id, ...safe } = this.toJSON();
  return safe;
};

module.exports = User;
