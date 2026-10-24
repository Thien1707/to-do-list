'use strict';
const express = require('express');
const router = express.Router();
const passport = require('passport');
const { body, validationResult } = require('express-validator');
const authCtrl = require('../controllers/authController');

const handleValidation = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ success: false, message: errors.array()[0].msg, errors: errors.array() });
  }
  next();
};

const validateRegister = [
  body('name').trim().notEmpty().withMessage('Họ và tên không được để trống'),
  body('email').isEmail().withMessage('Email không hợp lệ'),
  body('password').isLength({ min: 6 }).withMessage('Mật khẩu tối thiểu 6 ký tự'),
  handleValidation,
];

const validateLogin = [
  body('email').isEmail().withMessage('Email không hợp lệ'),
  body('password').notEmpty().withMessage('Mật khẩu không được để trống'),
  handleValidation,
];

/**
 * @swagger
 * /api/auth/register:
 *   post:
 *     summary: Đăng ký tài khoản mới
 *     tags: [Auth]
 */
router.post('/register', validateRegister, authCtrl.register);

/**
 * @swagger
 * /api/auth/login:
 *   post:
 *     summary: Đăng nhập người dùng
 *     tags: [Auth]
 */
router.post('/login', validateLogin, authCtrl.login);

/**
 * @swagger
 * /api/auth/admin-login:
 *   post:
 *     summary: Đăng nhập admin
 *     tags: [Auth]
 */
router.post('/admin-login', validateLogin, authCtrl.adminLogin);

/**
 * @swagger
 * /api/auth/refresh:
 *   post:
 *     summary: Làm mới access token
 *     tags: [Auth]
 */
router.post('/refresh', authCtrl.refresh);

/**
 * @swagger
 * /api/auth/logout:
 *   post:
 *     summary: Đăng xuất
 *     tags: [Auth]
 */
router.post('/logout', authCtrl.logout);

// Google OAuth
router.get('/google', passport.authenticate('google', { scope: ['profile', 'email'], session: false }));
router.get(
  '/google/callback',
  passport.authenticate('google', {
    session: false,
    failureRedirect: `${process.env.USER_FRONTEND_URL}/login?error=oauth_failed`,
  }),
  authCtrl.googleCallback
);

// Google Login via Firebase
router.post('/google-firebase', authCtrl.googleFirebaseLogin);

module.exports = router;

