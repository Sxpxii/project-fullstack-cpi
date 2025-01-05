// routes/task.js
const express = require('express');
const router = express.Router();
const { getNotifications} = require('../controllers1/notificationController');
const { authenticateToken } = require('../controllers1/loginController1');

// เพิ่ม route สำหรับดึงแจ้งเตือน
router.get('/notifications', authenticateToken, getNotifications);

module.exports = router;
;