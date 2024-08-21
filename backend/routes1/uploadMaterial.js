const express = require('express');
const router = express.Router();
const { handleUpload } = require('../controllers1/uploadMaterialController');
const { authenticateToken } = require('../controllers1/loginController1');

router.post('/', authenticateToken, handleUpload);

module.exports = router;
