// routes/dashboard.js
const express = require('express');
const router = express.Router();
const { getDashboardData, getMaterialUsageData, getTotalRequested, approveUpload, confirmEdit, updateStatusNotificationsByid, updateStatusNotificationsByuploadId, getRemainingDetails, approveRemaining, getAuditDetails} = require('../controllers/supClerkController'); 
const { authenticateToken } = require('../controllers/loginController');

router.get('/', getDashboardData);
router.get('/audit-details/:upload_id', authenticateToken, getAuditDetails);
router.get('/details/:upload_id', authenticateToken, getMaterialUsageData);
router.get('/remaining-details/:upload_id', authenticateToken, getRemainingDetails);
router.get('/total-requested-quantity/:upload_id', authenticateToken, getTotalRequested);
router.post('/approve/:upload_id', authenticateToken, approveUpload);
router.post("/confirm-edit/:upload_id", authenticateToken, confirmEdit);
router.post("/update-status/:id", authenticateToken, updateStatusNotificationsByid);
router.post("/update-status-notification/:upload_id", authenticateToken, updateStatusNotificationsByuploadId);
router.post('/approveRemaining/:upload_id', authenticateToken, approveRemaining);

module.exports = router;
