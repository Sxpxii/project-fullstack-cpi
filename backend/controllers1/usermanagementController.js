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

// ฟังก์ชันดึงข้อมูลผู้ใช้งานทั้งหมด
const getAllUsers = async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT u1.user_id, u1.username, u1.role, u2.username as invited_by, u1.created_at, u1.lastactivity
      FROM users1 u1
      LEFT JOIN users1 u2 ON u1.invited_by = u2.user_id
    `);
    res.status(200).json(result.rows);
  } catch (error) {
    console.error('Error fetching all users:', error);
    res.status(500).json({ error: 'Error fetching all users' });
  }
};

// ฟังก์ชันดึงข้อมูลผู้ใช้งานที่ออนไลน์
const getOnlineUsers = async (req, res) => {
    try {
      const result = await pool.query(
        `SELECT user_id, username 
         FROM users1 
         WHERE lastActivity >= NOW() - INTERVAL '60 minutes'` // สมมติว่าผู้ใช้งานที่ออนไลน์ได้กระทำล่าสุดภายใน 5 นาทีที่ผ่านมา
      );
      res.status(200).json(result.rows);
    } catch (error) {
      console.error('Error fetching online users:', error);
      res.status(500).json({ error: 'Error fetching online users' });
    }
  };
  
  // ฟังก์ชันดึงข้อมูลผู้ใช้งานที่ออฟไลน์
  const getOfflineUsers = async (req, res) => {
    try {
      const result = await pool.query(
        `SELECT user_id, username 
         FROM users1 
         WHERE lastActivity < NOW() - INTERVAL '60 minutes' OR lastActivity IS NULL`
      );
      res.status(200).json(result.rows);
    } catch (error) {
      console.error('Error fetching offline users:', error);
      res.status(500).json({ error: 'Error fetching offline users' });
    }
  };

  // ฟังก์ชันแก้ไขข้อมูลผู้ใช้
const updateUser = async (req, res) => {
  const { user_id } = req.params;
  const { username, password, role } = req.body;
  const { updated_by } = req.body;

  try {
    await pool.query(
      'UPDATE users1 SET username = $1, password = COALESCE($2, password), role = $3 WHERE user_id = $4',
      [username, password, role, user_id]
    );
    
    // บันทึกการกระทำการแก้ไขผู้ใช้
    await logUserAction(updated_by, 'แก้ไขผู้ใช้งาน');
    res.status(200).json({ message: 'User updated successfully' });
  } catch (error) {
    console.error('Error updating user:', error);
    res.status(500).json({ error: 'Error updating user' });
  }
};

// ฟังก์ชันลบผู้ใช้
const deleteUser = async (req, res) => {
  const { user_id } = req.params;
  const { performed_by } = req.body;

  try {
    // ตรวจสอบว่า userId ถูกต้อง
    if (!user_id) {
      return res.status(400).json({ error: 'User ID is required' });
    }

    // ลบข้อมูลที่อ้างอิงถึงในตาราง useractions ก่อน
    await pool.query('DELETE FROM useractions WHERE user_id = $1', [user_id]);

    const result = await pool.query('DELETE FROM users1 WHERE user_id = $1 RETURNING *', [user_id]);
    
    if (result.rowCount === 0) {
      return res.status(404).json({ error: 'User not found' });
    }

    // บันทึกการกระทำการลบผู้ใช้
    await logUserAction(performed_by, 'ลบผู้ใช้งาน');
    res.status(200).json({ message: 'User deleted successfully' });
  } catch (error) {
    console.error('Error deleting user:', error);
    res.status(500).json({ error: 'Error deleting user' });
  }
};




module.exports = {
  getAllUsers,
  getOnlineUsers,
  getOfflineUsers,
  updateUser,
  deleteUser
  
};
