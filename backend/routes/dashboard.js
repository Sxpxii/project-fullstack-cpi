// routes/dashboard.js
const express = require('express');
const router = express.Router();
const { getDashboardData,  
    getDetails, 
    approveUpload, 
    getMaterialUsageData,
    updateDetails,
    getTotalRequested,
    getSaveInventory,
    getMaterialDetails,
    updateMaterialRequests,
    getUpdateInventory,
    updateApprovedDate
   
 } = require('../controllers/dashboardController'); 
const { authenticateToken } = require('../controllers/loginController');

router.get('/', getDashboardData);
router.get('/materialrequests/:upload_id', getMaterialDetails);
router.get('/details/:upload_id', getDetails);
router.get('/details/:upload_id/total-requested-quantity', authenticateToken, getTotalRequested);
router.get('/edit-details/:upload_id', authenticateToken, getMaterialUsageData);
/*router.delete('/delete-uploads/:upload_id', authenticateToken, deleteUpload);*/
//router.post('/confirm/:upload_id', authenticateToken, confirmUpload);
router.post('/approve/:uploadId', authenticateToken, approveUpload);
router.post('/update-details/:upload_id', updateDetails);
router.post('/save-inventory-id',  getSaveInventory );
router.put('/materialrequests/edit', authenticateToken ,updateMaterialRequests);
router.post('/updateInventoryId/:upload_id',  getUpdateInventory );
router.post('/updateApprovedDate/:upload_id',  updateApprovedDate );

module.exports = router;
