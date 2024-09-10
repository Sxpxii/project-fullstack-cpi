// routes/dashboard.js
const express = require('express');
const router = express.Router();
const { getDashboardData,  
    getDetails,  
    deleteUpload,  
    confirmUpload, 
    approveUpload, 
    getMaterialUsageData,
    updateDetails,
    getTotalRequested,
    getSaveInventory 
 } = require('../controllers1/dashboardController'); 
const { authenticateToken } = require('../controllers1/loginController1');

router.get('/', getDashboardData);
router.get('/details/:upload_id', getDetails);
router.get('/details/:upload_id/total-requested-quantity', authenticateToken, getTotalRequested);
router.get('/edit-details/:upload_id', authenticateToken, getMaterialUsageData);
router.delete('/delete-uploads/:upload_id', authenticateToken, deleteUpload);
router.post('/confirm/:upload_id', authenticateToken, confirmUpload);
router.post('/approve/:uploadId', authenticateToken, approveUpload);
router.post('/update-details/:upload_id', updateDetails);
router.post('/save-inventory-id',  getSaveInventory );

module.exports = router;
