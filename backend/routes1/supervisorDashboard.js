const express = require('express');
const router = express.Router();
const { getDailyOverview, getUserInfo, getInventoryStock, getDailyUploadDetails, getDailyIssues } = require('../controllers1/supervisorDashboardController');

// Route สำหรับดึงข้อมูลภาพรวมรายวัน
router.get('/daily-overview', getDailyOverview);
router.get('/inventory-stock', getInventoryStock);
router.get('/daily-issues', getDailyIssues); 
router.get('/daily-details', getDailyUploadDetails);
router.get('/user', getUserInfo);

module.exports = router;
