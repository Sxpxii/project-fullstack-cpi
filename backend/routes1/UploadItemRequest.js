// routes/uploadRoutes.js
const express = require('express');
const router = express.Router();
const { uploadFileAndConvert, ReturnData } = require('../controllers1/UploadItemRequestController');
const { authenticateToken } = require('../controllers1/loginController1');

// เส้นทางสำหรับอัปโหลดไฟล์
router.post('/upload', authenticateToken, uploadFileAndConvert);
router.post('/ReturnData', authenticateToken, ReturnData);

module.exports = router;
