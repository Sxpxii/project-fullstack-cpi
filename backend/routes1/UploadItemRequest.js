// routes/uploadRoutes.js
const express = require('express');
const { uploadFileAndConvert } = require('../controllers1/UploadItemRequestController');
const router = express.Router();
const { authenticateToken } = require('../controllers1/loginController1');

// เส้นทางสำหรับอัปโหลดไฟล์
router.post('/upload', authenticateToken, uploadFileAndConvert);

module.exports = router;
