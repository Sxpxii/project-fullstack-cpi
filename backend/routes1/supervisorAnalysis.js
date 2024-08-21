const express = require('express');
const router = express.Router();
const { getProcessPerformance } = require('../controllers1/supervisorAnalysisController');

// Route สำหรับดึงข้อมูลกระบวนการเบิกจ่าย
router.get('/process-performance', getProcessPerformance);

module.exports = router;
