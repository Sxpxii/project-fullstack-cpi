// routes/taskDashboard.js
const express = require('express');
const router = express.Router();
const taskDashboardController = require('../controllers/taskDashboardController');
const { authenticateToken } = require('../controllers/loginController');

// Define routes
router.get('/', authenticateToken, taskDashboardController.getTasks);
router.post('/accept/:id', authenticateToken, taskDashboardController.acceptTask);
router.get('/mytasks', authenticateToken, taskDashboardController.getMyTasks);
router.get('/detail/:id', taskDashboardController.getTaskDetail);

module.exports = router;
