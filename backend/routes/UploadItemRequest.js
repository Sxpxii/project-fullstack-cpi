// routes/uploadRoutes.js
const express = require('express');
const router = express.Router();
const { uploadFileAndConvert, ReturnData } = require('../controllers/UploadItemRequestController');
const { authenticateToken } = require('../controllers/loginController');

// เส้นทางสำหรับอัปโหลดไฟล์
router.post('/upload', authenticateToken, uploadFileAndConvert);
router.post('/ReturnData', authenticateToken, ReturnData);

module.exports = router;
