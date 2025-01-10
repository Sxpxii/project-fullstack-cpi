// routes/dashboard.js
const express = require('express');
const router = express.Router();
const { getDashboardData,  
    getDetails, 
    getSaveInventory,
    getMaterialDetails,
    getUpdateInventory,
    deleteUpload
   
 } = require('../controllers1/dashboardClerkController'); 
const { authenticateToken } = require('../controllers1/loginController1');

router.get('/', getDashboardData);
router.get('/materialrequests/:upload_id', getMaterialDetails);
router.get('/details/:upload_id', getDetails);
//router.get('/details/:upload_id/total-requested-quantity', authenticateToken, getTotalRequested);
router.post('/save-inventory-id',  getSaveInventory );
router.post('/updateInventoryId/:upload_id',  getUpdateInventory );
router.delete('/delete-uploads/:upload_id',authenticateToken, deleteUpload );

module.exports = router;
