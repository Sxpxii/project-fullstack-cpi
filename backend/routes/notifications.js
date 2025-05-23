// routes/task.js
const express = require('express');
const router = express.Router();
const { getNotifications} = require('../controllers/notificationController');
const { authenticateToken } = require('../controllers/loginController');

// เพิ่ม route สำหรับดึงแจ้งเตือน
router.get('/notifications', authenticateToken, getNotifications);

module.exports = router;
;