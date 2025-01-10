// routes/dashboard.js
const express = require('express');
const router = express.Router();
const { getMaterialUsageData, getTotalRequested, approveUpload, confirmEdit, updateStatusNotificationsByid, updateStatusNotificationsByuploadId, getRemainingDetails} = require('../controllers1/supClerkController'); 
const { authenticateToken } = require('../controllers1/loginController1');

router.get('/details/:upload_id', authenticateToken, getMaterialUsageData);
router.get('/remaining-details/:upload_id', authenticateToken, getRemainingDetails);
router.get('/total-requested-quantity/:upload_id', authenticateToken, getTotalRequested);
router.post('/approve/:upload_id', authenticateToken, approveUpload);
router.post("/confirm-edit/:upload_id", authenticateToken, confirmEdit);
router.post("/update-status/:id", authenticateToken, updateStatusNotificationsByid);
router.post("/update-status-notification/:upload_id", authenticateToken, updateStatusNotificationsByuploadId);

module.exports = router;
