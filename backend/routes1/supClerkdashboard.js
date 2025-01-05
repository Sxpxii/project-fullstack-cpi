// routes/supClerkdashboard.js
const express = require('express');
const router = express.Router();
const { getSupClerkDashboardData,  
    getDetails,
    approveUpload, 
    getMaterialUsageData,
    getMaterialDetails,
    getDailyOverview, 
    getUserInfo,
    getDailyUploadDetails, 
    getDailyIssues,
    getAverageTimes
 } = require('../controllers1/supClerkDashController'); 
const { authenticateToken } = require('../controllers1/loginController1');

router.get('/', getSupClerkDashboardData);
router.get('/materialrequests/:upload_id', getMaterialDetails);
router.get('/details/:upload_id', getDetails);
router.get('/edit-details/:upload_id', authenticateToken, getMaterialUsageData);
router.post('/approve/:uploadId', authenticateToken, approveUpload);

// Route สำหรับดึงข้อมูลภาพรวมรายวัน
router.get('/daily-overview', getDailyOverview);
router.get('/daily-issues', getDailyIssues); 
router.get('/daily-details', getDailyUploadDetails);
router.get('/user', getUserInfo);
router.get('/average-times', getAverageTimes);

module.exports = router;
