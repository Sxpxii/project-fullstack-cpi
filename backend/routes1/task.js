// routes/task.js
const express = require('express');
const router = express.Router();
const { getTasks, 
    acceptTask, 
    getMyTasks, 
    returnTask, 
    getTaskDetails,
    getTotalRequestedQuantity, 
    completeTask, 
    getcheckTask, 
    saveCountedQuantities,
    getStatus,
    } = require('../controllers1/taskController');
const { authenticateToken } = require('../controllers1/loginController1');

router.get('/', authenticateToken, getTasks);
router.post('/accept/:upload_id', authenticateToken, acceptTask);
router.get('/mytasks', authenticateToken, getMyTasks);
router.post('/return/:upload_id', authenticateToken, returnTask);
router.get('/detail/:upload_id', authenticateToken, getTaskDetails);
router.get('/detail/:upload_id/total-requested-quantity', authenticateToken, getTotalRequestedQuantity);
router.get('/detail/:upload_id/check', authenticateToken, getcheckTask);
router.post('/complete/:upload_id', authenticateToken, completeTask);
router.post('/save-counted-quantities/:upload_id', authenticateToken, saveCountedQuantities);
router.get('/status/:upload_id', authenticateToken, getStatus);



module.exports = router;
;
