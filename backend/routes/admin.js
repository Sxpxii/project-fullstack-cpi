const express = require('express');
const router = express.Router();
const { getAdminStats, getUserStatuses } = require('../controllers/adminController');

// Routes
router.get('/stats', getAdminStats);
router.get('/user-statuses', getUserStatuses);

module.exports = router;

