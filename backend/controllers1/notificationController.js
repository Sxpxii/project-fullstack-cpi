// controllers/supClerkDashController.js
const { pool1 } = require('../config/db');

// Controller สำหรับดึงแจ้งเตือน
const getNotifications = async (req, res) => {
  const userId = req.user.userId; // ดึง userId จาก token ที่ authenticate
  try {
    // Query เพื่อดึงข้อมูล notifications พร้อมกับ username ของ sender_id
    const result = await pool1.query(
      `SELECT 
        n.id, 
        n.sender_id, 
        u.username AS sender_username, 
        n.recipient_id, 
        n.message, 
        n.type, 
        n.status, 
        n.created_at, 
        n.inventory_id,
        n.upload_id
      FROM notifications n
      LEFT JOIN users1 u ON n.sender_id = u.user_id
      WHERE n.recipient_id = $1 
      ORDER BY n.created_at DESC`,
      [userId]
    );
    res.status(200).json(result.rows); // ส่งผลลัพธ์กลับ
    console.log("Notifications", result.rows);
  } catch (err) {
    console.error("เกิดข้อผิดพลาดในการดึงแจ้งเตือน:", err);
    res.status(500).json({ error: "เกิดข้อผิดพลาดในการดึงแจ้งเตือน" });
  }
};
  
  module.exports = {
    getNotifications
};