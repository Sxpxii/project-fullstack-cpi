// routes/supClerkdashboard.js
const express = require('express');
const router = express.Router();
const { getDailyOverview, 
    getUserInfo,
    getDailyUploadDetails, 
    getDailyIssues,
    getAverageTimes,
    getWorkloadDetail,
    getAverageTimesByMaterials,
    getWorkloadTask,
    getWorkloadTaskItem,
    getDetailsSupClerk,
    getMaterialUsageSummary,
 } = require('../controllers1/supClerkDashController'); 
const { authenticateToken } = require('../controllers1/loginController1');

// Route สำหรับดึงข้อมูลภาพรวมรายวัน
router.get('/daily-overview', getDailyOverview);
router.get('/daily-issues', getDailyIssues); 
router.get('/daily-details', getDailyUploadDetails);
router.get('/user', getUserInfo);

// Route สำหรับดึงข้อมูลเพื่อวิเคราะห์
router.get('/workload-details', getWorkloadDetail);
router.get('/workload-tasks', getWorkloadTask);
router.get('/workload-tasks-item', getWorkloadTaskItem);
router.get('/average-times', getAverageTimes);
router.get('/average-times-materials', getAverageTimesByMaterials);
router.get('/details-SupClerk/:upload_id', getDetailsSupClerk);

// Route สำหรับดึงข้อมูลปริมาณการใช้
router.get('/materialUsageSummary', getMaterialUsageSummary);

module.exports = router;
