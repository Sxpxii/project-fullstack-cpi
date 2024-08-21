const express = require('express');
const router = express.Router();
const { register, login, logout, refreshToken, authenticateToken, authorizeRoles } = require('../controllers1/loginController1');

// Routes
router.post('/register',  register);
router.post('/login', login);
router.post('/logout', authenticateToken, logout);
router.post('/refreshToken', refreshToken);

// GET Routes
router.get('/register', (req, res) => {
    res.send('GET request received for register');
});
router.get('/login', (req, res) => {
    res.send('GET request received for login');
});
router.get('/logout', authenticateToken, (req, res) => {
    res.send('GET request received for logout');
});

module.exports = router;
