// routes/dashboard.js
const express = require('express');
const router = express.Router();
const { getDashboardData,  
    getDetails,  
    deleteUpload,  
    confirmUpload, 
    approveUpload, 
    getMaterialUsageData,
    updateDetails } = require('../controllers1/dashboardController'); 
const { authenticateToken } = require('../controllers1/loginController1');

router.get('/', getDashboardData);
router.get('/details/:upload_id', getDetails);
router.get('/edit-details/:upload_id', authenticateToken, getMaterialUsageData);
router.delete('/delete-uploads/:upload_id', authenticateToken, deleteUpload);
router.post('/confirm/:upload_id', authenticateToken, confirmUpload);
router.post('/approve/:uploadId', approveUpload);
router.post('/update-details/:upload_id', updateDetails);

module.exports = router;
