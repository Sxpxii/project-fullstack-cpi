const express = require('express');
const router = express.Router();
const { handleUpload, insertMaterialFromForm, getMaterials , deleteMaterial, updateMaterial } = require('../controllers1/uploadMaterialController');
const { authenticateToken } = require('../controllers1/loginController1');

router.get('/',  getMaterials);
router.post('/', authenticateToken, insertMaterialFromForm);
router.post('/upload', authenticateToken, handleUpload);
router.delete('/:material_id', authenticateToken, deleteMaterial);
router.put('/:material_id', authenticateToken, updateMaterial);

module.exports = router;
