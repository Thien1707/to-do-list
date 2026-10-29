'use strict';
require('dotenv').config();
const fs = require('fs');
const path = require('path');
const multer = require('multer');
const { Op } = require('sequelize');
const jwt = require('jsonwebtoken');
const { User, Task, Project, ProjectMember } = require('../models');

// Configure Multer storage for avatars with strict security rules
const ALLOWED_AVATAR_EXTS = ['.jpg', '.jpeg', '.png', '.webp', '.gif'];
const ALLOWED_AVATAR_MIMES = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];

const avatarStorage = multer.diskStorage({
  destination: (req, file, cb) => {
    const uploadDir = path.join(__dirname, '../uploads/avatars');
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    const rawExt = path.extname(file.originalname).toLowerCase();
    const safeExt = ALLOWED_AVATAR_EXTS.includes(rawExt) ? rawExt : '.png';
    const uniqueSuffix = `${req.user ? req.user.id : 'anon'}-${Date.now()}-${Math.round(Math.random() * 1e4)}`;
    cb(null, `avatar-${uniqueSuffix}${safeExt}`);
  },
});

exports.avatarUpload = multer({
  storage: avatarStorage,
  limits: { fileSize: 3 * 1024 * 1024 }, // 3MB limit
  fileFilter: (req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase();
    const mime = (file.mimetype || '').toLowerCase();
    if (ALLOWED_AVATAR_EXTS.includes(ext) && ALLOWED_AVATAR_MIMES.includes(mime)) {
      cb(null, true);
    } else {
      cb(new Error('Chỉ chấp nhận file hình ảnh hợp lệ (JPG, PNG, WEBP, GIF), tối đa 3MB'));
    }
  },
});

// Helper to remove old avatar if stored locally
const removeLocalAvatar = (avatarUrl) => {
  if (!avatarUrl || !avatarUrl.startsWith('/uploads/avatars/')) return;
  try {
    const filename = path.basename(avatarUrl);
    const fullPath = path.join(__dirname, '../uploads/avatars', filename);
    if (fs.existsSync(fullPath)) {
      fs.unlinkSync(fullPath);
    }
  } catch (err) {
    console.error('Lỗi khi xóa avatar cũ:', err.message);
  }
};

const isProd = process.env.NODE_ENV === 'production';
const getCookieOptions = () => ({
  httpOnly: true,
  secure: isProd,
  sameSite: isProd ? 'strict' : 'lax',
  maxAge: 7 * 24 * 60 * 60 * 1000,
});

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
    res.cookie('refreshToken', refreshToken, getCookieOptions());
    return res.status(201).json({ success: true, message: 'Đăng ký thành công', data: { user: user.toSafeJSON(), accessToken } });
  } catch (err) {
    console.error('❌ Lỗi register:', err.message);
    return res.status(500).json({ success: false, message: 'Đã có lỗi xảy ra trên hệ thống. Vui lòng thử lại sau.' });
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
    res.cookie('refreshToken', refreshToken, getCookieOptions());
    return res.json({ success: true, message: 'Đăng nhập thành công', data: { user: user.toSafeJSON(), accessToken } });
  } catch (err) {
    console.error('❌ Lỗi login:', err.message);
    return res.status(500).json({ success: false, message: 'Đã có lỗi xảy ra trên hệ thống. Vui lòng thử lại sau.' });
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
    res.cookie('adminRefreshToken', refreshToken, getCookieOptions());
    res.cookie('refreshToken', refreshToken, getCookieOptions());
    return res.json({ success: true, message: 'Đăng nhập admin thành công', data: { user: user.toSafeJSON(), accessToken } });
  } catch (err) {
    console.error('❌ Lỗi adminLogin:', err.message);
    return res.status(500).json({ success: false, message: 'Đã có lỗi xảy ra trên hệ thống. Vui lòng thử lại sau.' });
  }
};

// POST /api/auth/admin-refresh
exports.adminRefresh = async (req, res) => {
  try {
    const token = req.cookies?.adminRefreshToken || req.cookies?.refreshToken;
    if (!token) return res.status(401).json({ success: false, message: 'Không có refresh token' });
    const decoded = jwt.verify(token, process.env.JWT_REFRESH_SECRET);
    const user = await User.findByPk(decoded.id);
    if (!user || !user.is_active || user.role !== 'admin') {
      return res.status(403).json({ success: false, message: 'Tài khoản không có quyền Admin' });
    }
    const { accessToken, refreshToken } = generateTokens(user);
    res.cookie('adminRefreshToken', refreshToken, getCookieOptions());
    return res.json({ success: true, data: { accessToken, user: user.toSafeJSON() } });
  } catch (err) {
    return res.status(401).json({ success: false, message: 'Token hết hạn hoặc không hợp lệ' });
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
    res.cookie('refreshToken', refreshToken, getCookieOptions());
    return res.json({ success: true, data: { accessToken } });
  } catch (err) {
    return res.status(401).json({ success: false, message: 'Token hết hạn hoặc không hợp lệ' });
  }
};

// POST /api/auth/logout
exports.logout = (req, res) => {
  res.clearCookie('refreshToken', getCookieOptions());
  res.clearCookie('adminRefreshToken', getCookieOptions());
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
    const { email, name, avatar_url, google_id, idToken } = req.body;
    if (!email) {
      return res.status(400).json({ success: false, message: 'Email không được để trống' });
    }

    let verifiedEmail = email.trim().toLowerCase();
    let verifiedGoogleId = google_id;

    // Cryptographic verification with Google OAuth TokenInfo API if idToken provided
    if (idToken) {
      try {
        const resp = await fetch(`https://oauth2.googleapis.com/tokeninfo?id_token=${idToken}`);
        if (resp.ok) {
          const googlePayload = await resp.json();
          if (googlePayload.email) {
            verifiedEmail = googlePayload.email.toLowerCase();
            verifiedGoogleId = googlePayload.sub || verifiedGoogleId;
          }
        }
      } catch (verifyErr) {
        console.warn('⚠️ Google Token verification warning:', verifyErr.message);
      }
    }

    let user = await User.findOne({ where: { email: verifiedEmail } });

    // Security check: Block unauthorized Admin takeover via Google OAuth
    if (user && user.role === 'admin' && !user.google_id) {
      return res.status(403).json({
        success: false,
        message: 'Tài khoản Quản trị viên (Admin) không được phép đăng nhập qua cổng này vì lý do bảo mật',
      });
    }

    if (user) {
      const updates = {};
      if (!user.google_id && verifiedGoogleId) updates.google_id = verifiedGoogleId;
      if (!user.avatar_url && avatar_url) updates.avatar_url = avatar_url;
      if (Object.keys(updates).length > 0) {
        await user.update(updates);
      }
    } else {
      user = await User.create({
        name: name || verifiedEmail.split('@')[0],
        email: verifiedEmail,
        google_id: verifiedGoogleId || null,
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
    res.cookie('refreshToken', refreshToken, getCookieOptions());

    return res.json({
      success: true,
      message: 'Đăng nhập Google thành công',
      data: {
        user: user.toSafeJSON(),
        accessToken,
      },
    });
  } catch (err) {
    console.error('❌ Lỗi googleFirebaseLogin:', err.message);
    return res.status(500).json({ success: false, message: 'Đã có lỗi xảy ra trên hệ thống. Vui lòng thử lại sau.' });
  }
};

// GET /api/auth/me
exports.getMe = async (req, res) => {
  try {
    const user = await User.findByPk(req.user.id);
    if (!user) return res.status(404).json({ success: false, message: 'Người dùng không tồn tại' });

    let stats = {};
    if (user.role === 'admin') {
      const [totalUsers, totalTasks, totalProjects, doneTasks] = await Promise.all([
        User.count({ where: { role: 'user' } }),
        Task.count(),
        Project.count(),
        Task.count({ where: { status: 'done' } }),
      ]);
      stats = { totalUsers, totalTasks, totalProjects, doneTasks };
    } else {
      const [totalTasks, completedTasks, inProgressTasks, todoTasks, overdueTasks, totalProjects] = await Promise.all([
        Task.count({ where: { user_id: user.id } }),
        Task.count({ where: { user_id: user.id, status: 'done' } }),
        Task.count({ where: { user_id: user.id, status: 'in_progress' } }),
        Task.count({ where: { user_id: user.id, status: 'todo' } }),
        Task.count({
          where: {
            user_id: user.id,
            status: { [Op.notIn]: ['done', 'cancelled'] },
            due_date: { [Op.lt]: new Date() },
          },
        }),
        ProjectMember.count({ where: { user_id: user.id } }),
      ]);
      const completionRate = totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0;
      stats = { totalTasks, completedTasks, inProgressTasks, todoTasks, overdueTasks, totalProjects, completionRate };
    }

    const userData = user.toSafeJSON();
    return res.json({
      success: true,
      data: {
        user: { ...userData, stats },
      },
    });
  } catch (err) {
    console.error("❌ Lỗi:", err.message);
    return res.status(500).json({ success: false, message: "Đã có lỗi xảy ra trên hệ thống. Vui lòng thử lại sau." });
  }
};

// PUT /api/auth/profile
exports.updateProfile = async (req, res) => {
  try {
    const user = await User.findByPk(req.user.id);
    if (!user) return res.status(404).json({ success: false, message: 'Người dùng không tồn tại' });

    const { name, phone, bio, job_title, department, theme_preference, notification_settings, avatar_url } = req.body;
    const updates = {};
    if (name !== undefined && name.trim()) updates.name = name.trim();
    if (phone !== undefined) updates.phone = phone ? phone.trim() : null;
    if (bio !== undefined) updates.bio = bio ? bio.trim() : null;
    if (job_title !== undefined) updates.job_title = job_title ? job_title.trim() : null;
    if (department !== undefined) updates.department = department ? department.trim() : null;
    if (theme_preference !== undefined) updates.theme_preference = theme_preference;
    if (notification_settings !== undefined) updates.notification_settings = notification_settings;
    if (avatar_url !== undefined) {
      if (avatar_url !== user.avatar_url && user.avatar_url) {
        removeLocalAvatar(user.avatar_url);
      }
      updates.avatar_url = avatar_url;
    }

    await user.update(updates);
    const updated = await User.findByPk(user.id);
    return res.json({
      success: true,
      message: 'Cập nhật thông tin tài khoản thành công',
      data: { user: updated.toSafeJSON() },
    });
  } catch (err) {
    console.error("❌ Lỗi:", err.message);
    return res.status(500).json({ success: false, message: "Đã có lỗi xảy ra trên hệ thống. Vui lòng thử lại sau." });
  }
};

// POST /api/auth/avatar (Upload avatar file or URL)
exports.uploadAvatar = async (req, res) => {
  try {
    const user = await User.findByPk(req.user.id);
    if (!user) return res.status(404).json({ success: false, message: 'Người dùng không tồn tại' });

    let newAvatarUrl = null;
    if (req.file) {
      // Local file uploaded
      newAvatarUrl = `/uploads/avatars/${req.file.filename}`;
    } else if (req.body.avatar_url) {
      newAvatarUrl = req.body.avatar_url;
    } else {
      return res.status(400).json({ success: false, message: 'Vui lòng chọn hình ảnh để tải lên' });
    }

    if (user.avatar_url && user.avatar_url !== newAvatarUrl) {
      removeLocalAvatar(user.avatar_url);
    }

    await user.update({ avatar_url: newAvatarUrl });
    return res.json({
      success: true,
      message: 'Cập nhật ảnh đại diện thành công',
      data: { avatar_url: newAvatarUrl, user: user.toSafeJSON() },
    });
  } catch (err) {
    console.error("❌ Lỗi:", err.message);
    return res.status(500).json({ success: false, message: "Đã có lỗi xảy ra trên hệ thống. Vui lòng thử lại sau." });
  }
};

// DELETE /api/auth/avatar
exports.deleteAvatar = async (req, res) => {
  try {
    const user = await User.findByPk(req.user.id);
    if (!user) return res.status(404).json({ success: false, message: 'Người dùng không tồn tại' });

    if (user.avatar_url) {
      removeLocalAvatar(user.avatar_url);
      await user.update({ avatar_url: null });
    }

    return res.json({
      success: true,
      message: 'Đã xóa ảnh đại diện',
      data: { user: user.toSafeJSON() },
    });
  } catch (err) {
    console.error("❌ Lỗi:", err.message);
    return res.status(500).json({ success: false, message: "Đã có lỗi xảy ra trên hệ thống. Vui lòng thử lại sau." });
  }
};

// POST /api/auth/change-password
exports.changePassword = async (req, res) => {
  try {
    const { currentPassword, newPassword, confirmPassword } = req.body;
    if (!newPassword || newPassword.length < 6) {
      return res.status(400).json({ success: false, message: 'Mật khẩu mới phải có tối thiểu 6 ký tự' });
    }
    if (newPassword !== confirmPassword) {
      return res.status(400).json({ success: false, message: 'Mật khẩu xác nhận không khớp' });
    }

    const user = await User.findByPk(req.user.id);
    if (!user) return res.status(404).json({ success: false, message: 'Người dùng không tồn tại' });

    // If user already has a password, verify currentPassword
    if (user.password_hash) {
      if (!currentPassword) {
        return res.status(400).json({ success: false, message: 'Vui lòng nhập mật khẩu hiện tại' });
      }
      const valid = await user.comparePassword(currentPassword);
      if (!valid) {
        return res.status(400).json({ success: false, message: 'Mật khẩu hiện tại không chính xác' });
      }
    }

    // Update password (User beforeUpdate hook hashes it automatically)
    user.password_hash = newPassword;
    await user.save();

    return res.json({
      success: true,
      message: user.password_hash ? 'Đổi mật khẩu thành công' : 'Thiết lập mật khẩu thành công',
    });
  } catch (err) {
    console.error("❌ Lỗi:", err.message);
    return res.status(500).json({ success: false, message: "Đã có lỗi xảy ra trên hệ thống. Vui lòng thử lại sau." });
  }
};

// GET /api/auth/sessions
exports.getSessions = async (req, res) => {
  try {
    const userAgent = req.headers['user-agent'] || 'Unknown Browser';
    const ip = req.ip || req.connection?.remoteAddress || '127.0.0.1';

    let browser = 'Trình duyệt Web';
    if (userAgent.includes('Chrome') && !userAgent.includes('Edg')) browser = 'Google Chrome';
    else if (userAgent.includes('Safari') && !userAgent.includes('Chrome')) browser = 'Apple Safari';
    else if (userAgent.includes('Firefox')) browser = 'Mozilla Firefox';
    else if (userAgent.includes('Edg')) browser = 'Microsoft Edge';

    let os = 'Máy tính';
    if (userAgent.includes('Windows')) os = 'Windows PC';
    else if (userAgent.includes('Macintosh')) os = 'macOS';
    else if (userAgent.includes('Android')) os = 'Android Device';
    else if (userAgent.includes('iPhone') || userAgent.includes('iPad')) os = 'iOS Device';
    else if (userAgent.includes('Linux')) os = 'Linux';

    const session = {
      isCurrent: true,
      browser,
      os,
      ip: ip.replace('::ffff:', ''),
      lastActive: new Date().toISOString(),
      role: req.user.role,
    };

    return res.json({ success: true, data: { sessions: [session] } });
  } catch (err) {
    console.error("❌ Lỗi:", err.message);
    return res.status(500).json({ success: false, message: "Đã có lỗi xảy ra trên hệ thống. Vui lòng thử lại sau." });
  }
};

