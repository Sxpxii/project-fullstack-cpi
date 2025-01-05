// routes/task.js
const express = require('express');
const router = express.Router();
const { getTasks, 
    acceptTask, 
    getMyTasks, 
    returnTask, 
    getTaskDetails,
    getPendingTaskDetails,
    getTotalRequestedQuantity, 
    completeTask, 
    getcheckTask, 
    saveCountedQuantities,
    getStatus,
    savePartialCountedQuantities,
    notifyManager,
    updateStatus,
    savePartialQuantities,
    updateMaterialTemporary,
    saveMaterialUsage
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
router.post("/save-partial-counted-quantities/:upload_id", authenticateToken, savePartialCountedQuantities);
router.post("/notify-manager", authenticateToken, notifyManager);
router.post("/update-status/:upload_id", authenticateToken, updateStatus);
router.get('/pending-detail/:upload_id', authenticateToken, getPendingTaskDetails);
router.post("/save-partial/:upload_id", authenticateToken, savePartialQuantities);
router.post("/update-material-temporary/:upload_id", authenticateToken, updateMaterialTemporary);
router.post("/save-material-usage/:upload_id", authenticateToken, saveMaterialUsage);

module.exports = router;
;
