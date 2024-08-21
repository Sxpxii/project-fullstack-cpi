//routes/upload.js
const express = require('express');
const router = express.Router();
const { handleUpload } = require('../controllers1/balanceController');
const { authenticateToken } = require('../controllers1/loginController1');

// Routes
router.post('/', authenticateToken, handleUpload);

// GET Routes
router.get('/', (req, res) => {
    res.send('GET request received for upload');
});

module.exports = router;
