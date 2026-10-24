'use strict';
require('dotenv').config();
const jwt = require('jsonwebtoken');
const { User } = require('../models');

const generateTokens = (user) => {
  const payload = { id: user.id, role: user.role, email: user.email };
  const accessToken = jwt.sign(payload, process.env.JWT_SECRET, { expiresIn: process.env.JWT_EXPIRES_IN });
  const refreshToken = jwt.sign({ id: user.id }, process.env.JWT_REFRESH_SECRET, { expiresIn: process.env.JWT_REFRESH_EXPIRES_IN });
  return { accessToken, refreshToken };
};

// POST /api/auth/register
exports.register = async (req, res) => {
  try {
    const { name, email, password } = req.body;
    const existing = await User.findOne({ where: { email } });
    if (existing) return res.status(409).json({ success: false, message: 'Email đã tồn tại' });

    const user = await User.create({ name, email, password_hash: password, role: 'user' });
    const { accessToken, refreshToken } = generateTokens(user);
    res.cookie('refreshToken', refreshToken, { httpOnly: true, secure: false, maxAge: 7 * 24 * 60 * 60 * 1000 });
    return res.status(201).json({ success: true, message: 'Đăng ký thành công', data: { user: user.toSafeJSON(), accessToken } });
  } catch (err) {
    return res.status(500).json({ success: false, message: 'Lỗi server', error: err.message });
  }
};

// POST /api/auth/login
exports.login = async (req, res) => {
  try {
    const { email, password } = req.body;
    const user = await User.findOne({ where: { email } });
    if (!user) return res.status(401).json({ success: false, message: 'Email hoặc mật khẩu không đúng' });
    if (!user.is_active) return res.status(403).json({ success: false, message: 'Tài khoản đã bị vô hiệu hóa' });

    const valid = await user.comparePassword(password);
    if (!valid) return res.status(401).json({ success: false, message: 'Email hoặc mật khẩu không đúng' });

    const { accessToken, refreshToken } = generateTokens(user);
    res.cookie('refreshToken', refreshToken, { httpOnly: true, secure: false, maxAge: 7 * 24 * 60 * 60 * 1000 });
    return res.json({ success: true, message: 'Đăng nhập thành công', data: { user: user.toSafeJSON(), accessToken } });
  } catch (err) {
    return res.status(500).json({ success: false, message: 'Lỗi server', error: err.message });
  }
};

// POST /api/auth/admin-login
exports.adminLogin = async (req, res) => {
  try {
    const { email, password } = req.body;
    const user = await User.findOne({ where: { email, role: 'admin' } });
    if (!user) return res.status(401).json({ success: false, message: 'Tài khoản admin không tồn tại' });
    if (!user.is_active) return res.status(403).json({ success: false, message: 'Tài khoản đã bị vô hiệu hóa' });

    const valid = await user.comparePassword(password);
    if (!valid) return res.status(401).json({ success: false, message: 'Email hoặc mật khẩu không đúng' });

    const { accessToken, refreshToken } = generateTokens(user);
    res.cookie('refreshToken', refreshToken, { httpOnly: true, secure: false, maxAge: 7 * 24 * 60 * 60 * 1000 });
    return res.json({ success: true, message: 'Đăng nhập admin thành công', data: { user: user.toSafeJSON(), accessToken } });
  } catch (err) {
    return res.status(500).json({ success: false, message: 'Lỗi server', error: err.message });
  }
};

// POST /api/auth/refresh
exports.refresh = async (req, res) => {
  try {
    const token = req.cookies?.refreshToken;
    if (!token) return res.status(401).json({ success: false, message: 'Không có refresh token' });
    const decoded = jwt.verify(token, process.env.JWT_REFRESH_SECRET);
    const user = await User.findByPk(decoded.id);
    if (!user || !user.is_active) return res.status(401).json({ success: false, message: 'Token không hợp lệ' });
    const { accessToken, refreshToken } = generateTokens(user);
    res.cookie('refreshToken', refreshToken, { httpOnly: true, secure: false, maxAge: 7 * 24 * 60 * 60 * 1000 });
    return res.json({ success: true, data: { accessToken } });
  } catch (err) {
    return res.status(401).json({ success: false, message: 'Token hết hạn hoặc không hợp lệ' });
  }
};

// POST /api/auth/logout
exports.logout = (req, res) => {
  res.clearCookie('refreshToken');
  return res.json({ success: true, message: 'Đăng xuất thành công' });
};

// Google OAuth callback
exports.googleCallback = (req, res) => {
  const user = req.user;
  const { accessToken } = generateTokens(user);
  const frontendUrl = user.role === 'admin' ? process.env.ADMIN_FRONTEND_URL : process.env.USER_FRONTEND_URL;
  res.redirect(`${frontendUrl}/oauth-callback?token=${accessToken}&role=${user.role}`);
};

// POST /api/auth/google-firebase
exports.googleFirebaseLogin = async (req, res) => {
  try {
    const { email, name, avatar_url, google_id } = req.body;
    if (!email) {
      return res.status(400).json({ success: false, message: 'Email không được để trống' });
    }

    let user = await User.findOne({ where: { email } });
    if (user) {
      const updates = {};
      if (!user.google_id && google_id) updates.google_id = google_id;
      if (!user.avatar_url && avatar_url) updates.avatar_url = avatar_url;
      if (Object.keys(updates).length > 0) {
        await user.update(updates);
      }
    } else {
      user = await User.create({
        name: name || email.split('@')[0],
        email,
        google_id: google_id || null,
        avatar_url: avatar_url || null,
        password_hash: null,
        role: 'user',
        is_active: true,
      });
    }

    if (!user.is_active) {
      return res.status(403).json({ success: false, message: 'Tài khoản của bạn đã bị vô hiệu hóa' });
    }

    const { accessToken, refreshToken } = generateTokens(user);
    res.cookie('refreshToken', refreshToken, {
      httpOnly: true,
      secure: false,
      maxAge: 7 * 24 * 60 * 60 * 1000,
    });

    return res.json({
      success: true,
      message: 'Đăng nhập Google thành công',
      data: {
        user: user.toSafeJSON(),
        accessToken,
      },
    });
  } catch (err) {
    console.error('❌ Lỗi googleFirebaseLogin:', err);
    return res.status(500).json({ success: false, message: 'Lỗi server', error: err.message });
  }
};

