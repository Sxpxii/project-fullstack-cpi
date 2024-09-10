const express = require('express');
const router = express.Router();
const { getAllUsers, getOnlineUsers, getOfflineUsers, updateUser, deleteUser } = require('../controllers1/UserManagementController');
const { register } = require('../controllers1/loginController1')
const { authenticateToken, authorizeAdmin } = require('../controllers1/loginController1');


router.get('/users', getAllUsers);
router.get('/online', getOnlineUsers);
router.get('/offline', getOfflineUsers);
router.post('/register', register);
router.put('/users/:user_id', updateUser);
router.delete('/users/:user_id',  deleteUser);

module.exports = router;