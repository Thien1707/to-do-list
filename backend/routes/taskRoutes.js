'use strict';
const express = require('express');
const router = express.Router();
const { authenticate } = require('../middleware/authMiddleware');
const taskCtrl = require('../controllers/taskController');
const commentCtrl = require('../controllers/commentController');

router.use(authenticate);

router.get('/stats', taskCtrl.getStats);
router.get('/categories', taskCtrl.getCategories);
router.post('/categories', taskCtrl.createCategory);
router.delete('/categories/:id', taskCtrl.deleteCategory);

router.get('/', taskCtrl.getTasks);
router.post('/', taskCtrl.createTask);
router.get('/:id', taskCtrl.getTask);
router.put('/:id', taskCtrl.updateTask);
router.delete('/:id', taskCtrl.deleteTask);
router.patch('/:id/status', taskCtrl.updateStatus);

// Comments
router.get('/:id/comments', commentCtrl.getComments);
router.post('/:id/comments', commentCtrl.createComment);
router.put('/:id/comments/:commentId', commentCtrl.updateComment);
router.delete('/:id/comments/:commentId', commentCtrl.deleteComment);

// Activity
router.get('/:id/activity', commentCtrl.getTaskActivity);

module.exports = router;
