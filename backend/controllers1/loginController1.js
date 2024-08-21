require('dotenv').config();
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const pool = require('../config/db');

const logUserAction = async (userId, action) => {
    try {
        await pool.query('INSERT INTO useractions (user_id, action_type) VALUES ($1, $2)', [userId, action]);
    } catch (err) {
        console.error('Error logging user action:', err);
    }
};

const register = async (req, res) => {
    const { username, password, role } = req.body;
    if (!username || !password || !role) {
        return res.status(400).json({ error: 'Missing required fields' });
    }

    const hashedPassword = await bcrypt.hash(password, 10);
    try {
        const result = await pool.query('INSERT INTO users1 (username, password, role) VALUES ($1, $2, $3) RETURNING user_id', [username, hashedPassword, role]);
        const userId = result.rows[0].user_id;
        await logUserAction(userId, 'Register');
        res.status(201).json({ userId });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Registration failed' });
    }
};

const login = async (req, res) => {
    const { username, password } = req.body;
    try {
        const result = await pool.query('SELECT * FROM users1 WHERE username = $1', [username]);
        if (result.rows.length === 0) {
            return res.status(400).json({ error: 'Invalid username or password' });
        }

        const user = result.rows[0];
        const isMatch = await bcrypt.compare(password, user.password);

        if (!isMatch) {
            return res.status(400).json({ error: 'Invalid username or password' });
        }

        const accessToken = jwt.sign({ userId: user.user_id, username: user.username, role: user.role }, process.env.JWT_SECRET, { expiresIn: '8h' });
        const refreshToken = jwt.sign({ userId: user.user_id, username: user.username, role: user.role }, process.env.JWT_REFRESH_SECRET, { expiresIn: '8h' });

        await logUserAction(user.user_id, 'Login');
        res.json({ accessToken, refreshToken, username: user.username  }); // ส่งทั้ง accessToken และ refreshToken กลับไปที่ client
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Login failed' });
    }
};

const logout = async (req, res) => {
    try {
        const { userId } = req.user;
        await logUserAction(userId, 'Logout');
        res.sendStatus(204);
    } catch (err) {
        console.error('Logout failed:', err);
        res.status(500).json({ error: 'Logout failed' });
    }
};

const refreshToken = async (req, res) => {
    const { token } = req.body;
    if (!token) return res.sendStatus(401);

    jwt.verify(token, process.env.JWT_REFRESH_SECRET, (err, user) => {
        if (err) return res.sendStatus(403);

        const accessToken = jwt.sign({ userId: user.userId, role: user.role }, process.env.JWT_SECRET, { expiresIn: '15m' });
        res.json({ accessToken });
    });
};

const authenticateToken = (req, res, next) => {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1]; // ตรวจสอบ authHeader ก่อนใช้ split

    if (token == null) { 
        console.log('No token provided');
        return res.sendStatus(401);
    }

    jwt.verify(token, process.env.JWT_SECRET, (err, user) => {
        if (err) {
            if (err.name === 'TokenExpiredError') {
                console.log('Token expired:', err);
                return res.status(401).json({ error: 'TokenExpiredError', message: 'Token has expired' });
            }
            console.log('Token verification failed:', err);
            return res.sendStatus(403);
        }
        req.user = user;
        next();
    });
};

const authorizeRoles = (...allowedRoles) => {
    return (req, res, next) => {
        if (!allowedRoles.includes(req.user.role)) {
            return res.sendStatus(403);
        }
        next();
    };
};

module.exports = {
    register,
    login,
    logout,
    refreshToken,
    authenticateToken,
    authorizeRoles
};
