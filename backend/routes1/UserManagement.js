const express = require('express');
const router = express.Router();
const { getAllUsers, updateUser, deleteUser } = require('../controllers1/usermanagementController')
const { register } = require('../controllers1/loginController1');

router.get('/users', getAllUsers);
router.post('/register', register);
router.put('/users/:user_id', updateUser);
router.delete('/users/:user_id',  deleteUser);

module.exports = router;