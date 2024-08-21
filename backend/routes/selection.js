// routes/selection.js
const express = require('express');
const router = express.Router();
const { handleFileUpload } = require('../controllers/selectionController');
const { authenticateToken } = require('../controllers/loginController');

// GET route
router.get('/', (req, res) => {
    res.send('GET request received for selection');
});

// POST route
router.post('/', authenticateToken, (req, res) => {
    try {
        const { materialType } = req.body;
        if (!req.files || Object.keys(req.files).length === 0) {
            return res.status(400).send('No files were uploaded.');
        }

        if (!materialType || !['PK_DIS', 'PK_shoe', 'WD', 'PIN', 'BP', 'CHEMICAL'].includes(materialType)) {
            return res.status(400).json({ message: 'Invalid type parameter.' });
        }

        switch (materialType) {
            case 'PK_DIS':
                handleFileUpload(req, res, 'PK_DIS', 'PK');
                break;
            case 'PK_shoe':
                handleFileUpload(req, res, 'PK_shoe', 'กล่อง');
                break;
            case 'WD':
                handleFileUpload(req, res, 'WD', 'WD');
                break;
            case 'PIN':
                handleFileUpload(req, res, 'PIN', 'สลัก');
                break;
            case 'BP':
                handleFileUpload(req, res, 'BP', 'โหลดใบเบิก');
                break;
            case 'CHEMICAL':
                handleFileUpload(req, res, 'CHEMICAL', 'โหลดStore');
                break;
            default:
                return res.status(400).json({ message: 'Invalid type parameter.' });
        }
    } catch (error) {
        console.error('Error handling POST request:', error);
        res.status(500).json({ message: 'Internal Server Error' });
    }
});


module.exports = router;
