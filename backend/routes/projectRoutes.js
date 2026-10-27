'use strict';
const express = require('express');
const router = express.Router();
const { authenticate } = require('../middleware/authMiddleware');
const projectCtrl = require('../controllers/projectController');

router.use(authenticate);

// Projects
router.get('/', projectCtrl.listProjects);
router.post('/', projectCtrl.createProject);
router.get('/:id', projectCtrl.getProject);
router.put('/:id', projectCtrl.updateProject);
router.delete('/:id', projectCtrl.deleteProject);

// Members
router.get('/:id/lookup-user', projectCtrl.lookupUser);
router.post('/:id/members', projectCtrl.addMember);
router.put('/:id/members/:userId', projectCtrl.updateMemberRole);
router.delete('/:id/members/:userId', projectCtrl.removeMember);

// Tasks within project
router.get('/:id/tasks', projectCtrl.getProjectTasks);

// Activity Feed
router.get('/:id/activity', projectCtrl.getProjectActivity);

// Sprints
router.get('/:id/sprints', projectCtrl.listSprints);
router.post('/:id/sprints', projectCtrl.createSprint);
router.put('/:id/sprints/:sprintId', projectCtrl.updateSprint);
router.delete('/:id/sprints/:sprintId', projectCtrl.deleteSprint);

module.exports = router;
