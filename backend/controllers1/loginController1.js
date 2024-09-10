require('dotenv').config();
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const pool = require('../config/db');

const logUserAction = async (userId, action) => {
    const client = await pool.connect(); // ใช้ client เพื่อควบคุม transaction
    try {
        await client.query('BEGIN'); // เริ่ม transaction

        // บันทึกการกระทำในตาราง useractions
        await client.query('INSERT INTO useractions (user_id, action_type) VALUES ($1, $2)', [userId, action]);

        // อัปเดต lastActivity ในตาราง users1
        await client.query('UPDATE users1 SET lastActivity = NOW() WHERE user_id = $1', [userId]);

        await client.query('COMMIT'); // ยืนยันการเปลี่ยนแปลงทั้งหมด
    } catch (err) {
        await client.query('ROLLBACK'); // ยกเลิกการเปลี่ยนแปลงหากเกิดข้อผิดพลาด
        console.error('Error logging user action and updating lastActivity:', err);
    } finally {
        client.release(); // ปล่อย client กลับคืน pool
    }
};

const register = async (req, res) => {
    const { username, password, role, invited_by } = req.body;
    if (!username || !password || !role || !invited_by) {
        return res.status(400).json({ error: 'Missing required fields' });
    }

    const hashedPassword = await bcrypt.hash(password, 10);
    try {
        const result = await pool.query('INSERT INTO users1 (username, password, role, invited_by, created_at) VALUES ($1, $2, $3, $4, NOW()) RETURNING user_id', [username, hashedPassword, role, invited_by]);
        const userId = result.rows[0].user_id;

        await logUserAction(invited_by, 'เพิ่มผู้ใช้งานใหม่');
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
        //console.log('Login response:', { accessToken, refreshToken, username: user.username, userId: user.user_id });
        res.json({ accessToken, refreshToken, username: user.username, userId: user.user_id  }); // ส่งทั้ง accessToken และ refreshToken กลับไปที่ client
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

const authorizeAdmin = (req, res, next) => {
    const { role } = req.user; // Assume req.user is populated with user data after authentication
    if (role === 'Admin') {
      next();
    } else {
      res.status(403).json({ error: 'Unauthorized' });
    }
  };

// ฟังก์ชันสำหรับตรวจสอบเซสชัน
const checkSession = async (req, res) => {
    const userId = req.user.userId; // ได้จากการ authenticateToken

    try {
        const result = await pool.query(
            'SELECT lastActivity FROM users1 WHERE user_id = $1',
            [userId]
        );

        if (result.rows.length === 0) {
            return res.sendStatus(404); // ไม่พบผู้ใช้
        }

        const lastActivity = result.rows[0].lastactivity;
        if (new Date() - new Date(lastActivity) > 60 * 60 * 1000) { // 60 นาที
            return res.sendStatus(401); // เซสชันหมดอายุ
        }

        res.sendStatus(200); // เซสชันยังคงใช้งานอยู่
    } catch (err) {
        console.error('Error checking session:', err);
        res.status(500).json({ error: 'Error checking session' });
    }
};


module.exports = {
    register,
    login,
    logout,
    refreshToken,
    authenticateToken,
    authorizeRoles,
    checkSession,
    authorizeAdmin,
    logUserAction
};
