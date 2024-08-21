// controllers/myTasksController.js
const pool = require('../config/db');

// ฟังก์ชันสำหรับดึงงานของผู้ใช้
const getMyTasks = async (req, res) => {
    const username = req.user.username; // ใช้ชื่อของผู้ใช้ที่ล็อกอินอยู่

    try {
        const result = await pool.query('SELECT id, mat_type, date, status FROM dashboard_status WHERE assigned_to = $1', [username]);
        res.json(result.rows);
    } catch (error) {
        console.error('เกิดข้อผิดพลาดในการดึงข้อมูลงาน:', error);
        res.status(500).json({ error: 'เกิดข้อผิดพลาดในการดึงข้อมูลงาน' });
    }
};

module.exports = {
    getMyTasks,
};
