const express = require('express');
const router = express.Router();
const { getDailyOverview, getUserInfo } = require('../controllers1/supervisorDashboardController');

// Route สำหรับดึงข้อมูลภาพรวมรายวัน
router.get('/daily-overview', getDailyOverview);
router.get('/user', getUserInfo);

module.exports = router;
