'use strict';
const express = require('express');
const router = express.Router();
const { requireAdmin } = require('../middleware/authMiddleware');
const adminCtrl = require('../controllers/adminController');

router.use(requireAdmin);

router.get('/stats', adminCtrl.getStats);
router.get('/system', adminCtrl.getSystemInfo);
router.post('/cleanup', adminCtrl.cleanupTasks);

// Quản lý người dùng
router.get('/users', adminCtrl.getUsers);
router.get('/users/:id', adminCtrl.getUser);
router.put('/users/:id', adminCtrl.updateUser);
router.put('/users/:id/reset-password', adminCtrl.resetUserPassword);
router.put('/users/:id/role', adminCtrl.changeUserRole);
router.delete('/users/:id', adminCtrl.deleteUser);

// Quản lý nhiệm vụ toàn hệ thống
router.get('/tasks', adminCtrl.getAllTasks);
router.put('/tasks/:id', adminCtrl.updateTask);
router.delete('/tasks/:id', adminCtrl.deleteTask);

module.exports = router;
