const express = require('express');
const router = express.Router();
const { getAllUsers, updateUser, deleteUser } = require('../controllers/usermanagementController')
const { register } = require('../controllers/loginController');

router.get('/users', getAllUsers);
router.post('/register', register);
router.put('/users/:user_id', updateUser);
router.delete('/users/:user_id',  deleteUser);

module.exports = router;