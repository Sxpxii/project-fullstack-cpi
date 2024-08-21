const pool = require('../config/db'); // สมมติว่าคุณใช้ PostgreSQL และใช้ pool จาก pg library

// ฟังก์ชันสำหรับดึงข้อมูลภาพรวมรายวัน
const getDailyOverview = async (req, res) => {
  try {
      console.log('Starting to fetch daily overview');
      const result = await pool.query(`
          SELECT 
              (upload_date AT TIME ZONE 'UTC' AT TIME ZONE 'Asia/Bangkok')::date AS date,
              COUNT(upload_id) AS total_uploads,
              COUNT(CASE WHEN current_status = 'กำลังดำเนินการ' THEN 1 END) AS in_progress,
              COUNT(CASE WHEN current_status = 'ดำเนินการเรียบร้อย' THEN 1 END) AS completed,
              COUNT(CASE WHEN current_status = 'รอตรวจสอบ' THEN 1 END) AS review
          FROM uploads
          GROUP BY (upload_date AT TIME ZONE 'UTC' AT TIME ZONE 'Asia/Bangkok')::date
          ORDER BY (upload_date AT TIME ZONE 'UTC' AT TIME ZONE 'Asia/Bangkok')::date DESC;
      `);

      // เพิ่มการคำนวณเปอร์เซ็นต์ของแต่ละสถานะ
      const overviewData = result.rows.map(row => {
          return {
              ...row,
              in_progress_percent: (row.in_progress / row.total_uploads) * 100,
              completed_percent: (row.completed / row.total_uploads) * 100,
              review_percent: (row.review / row.total_uploads) * 100,
          };
      });

      console.log('Data fetched successfully:', overviewData);
      res.json(overviewData);
  } catch (err) {
      console.error('Error fetching data:', err.message);
      res.status(500).send('Server error');
  }
};

  

// ฟังก์ชันสำหรับดึงข้อมูลผู้ใช้
const getUserInfo = async (req, res) => {
  try {
      // ตรวจสอบว่า req.user.userId มีค่าอยู่หรือไม่
      const userId = req.user ? req.user.userId : null;
      if (!userId) {
          return res.status(400).json({ error: 'User ID not found' });
      }

      const result = await pool.query(`
          SELECT username, role FROM user1 WHERE user_id = $1
      `, [userId]);

      if (result.rows.length === 0) {
          return res.status(404).json({ error: 'User not found' });
      }

      res.json(result.rows[0]);
  } catch (err) {
      console.error('Error fetching user info:', err.message);
      res.status(500).send('Server error');
  }
};

module.exports = {
    getDailyOverview,
    getUserInfo
};

