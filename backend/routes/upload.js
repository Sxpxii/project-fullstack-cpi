//routes/upload.js
const express = require('express');
const router = express.Router();
const { handleUpload } = require('../controllers/uploadController');
const { authenticateToken } = require('../controllers/loginController');

// Routes
router.post('/', authenticateToken, handleUpload);

// GET Routes
router.get('/', (req, res) => {
    res.send('GET request received for upload');
});

module.exports = router;
