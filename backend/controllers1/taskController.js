// controllers/taskController.js
const db = require('../config/db');

const logUserAction = async (userId, action) => {
    try {
        await db.query('INSERT INTO useractions (user_id, action_type) VALUES ($1, $2)', [userId, action]);
    } catch (err) {
        console.error('Error logging user action:', err);
    }
};

// ฟังก์ชันสำหรับดึงรายการงานทั้งหมด
const getTasks = async (req, res) => {
    try {
        const tasks = await db.query(
            'SELECT * FROM uploads WHERE current_status = $1 AND assigned_to IS NULL',
            ['กำลังดำเนินการ']
        );
        res.json(tasks.rows);
    } catch (error) {
        console.error('Error fetching tasks:', error);
        res.status(500).json({ error: 'Failed to fetch tasks' });
    }
};

// ฟังก์ชันสำหรับรับงาน
const acceptTask = async (req, res) => {
    const { upload_id } = req.params;
    const { userId } = req.user;

    try {
        // อัปเดตสถานะงานและผู้รับงาน
        await db.query('UPDATE uploads SET assigned_to = $1 WHERE upload_id = $2', [userId, upload_id]);

        // บันทึกการกระทำของผู้ใช้
        await logUserAction(userId, 'กดรับงาน', upload_id);

        // ส่ง response ไปยัง client
        res.status(200).json({ message: 'Task accepted' });
    } catch (error) {
        console.error('Error accepting task:', error);
        res.status(500).json({ error: 'Failed to accept task' });
    }
};

// ฟังก์ชันสำหรับดึงงานของผู้ใช้
const getMyTasks = async (req, res) => {
    const { userId } = req.user; 

    try {
        const tasks = await db.query('SELECT * FROM uploads WHERE assigned_to = $1', [userId]);
        res.json(tasks.rows);
    } catch (error) {
        console.error('Error fetching my tasks:', error);
        res.status(500).json({ error: 'Failed to fetch my tasks' });
    }
};

// ฟังก์ชันสำหรับคืนงาน
const returnTask = async (req, res) => {
    const { upload_id } = req.params;
    const { userId } = req.user;
  
    try {
      // ลบค่าจากคอลัมน์ assigned_to
      await db.query('UPDATE uploads SET assigned_to = NULL WHERE upload_id = $1 AND assigned_to = $2', [upload_id, userId]);
  
      // บันทึกการกระทำของผู้ใช้
      await logUserAction(userId, 'คืนงาน', upload_id);
  
      res.status(200).json({ message: 'Task returned successfully' });
    } catch (error) {
      console.error('Error returning task:', error);
      res.status(500).json({ error: 'Failed to return task' });
    }
  };
  

// ฟังก์ชันสำหรับดึงรายละเอียดของงาน
const getTaskDetails = async (req, res) => {
    try {
      const { upload_id } = req.params;
  
      const query = `
        SELECT 
          m.material_id,
          m.mat_name,
          m.matunit,
          SUM(r.quantity) AS total_quantity,
          JSON_AGG(
            JSON_BUILD_OBJECT(
              'lot', b.lot,
              'location', b.location,
              'used_quantity', b.used_quantity,
              'remaining_quantity', b.remaining_quantity
            )
          ) AS details
        FROM materials m
        JOIN materialrequests r ON m.material_id = r.material_id
        JOIN material_usage b ON m.material_id = b.material_id
        WHERE r.upload_id = $1
        GROUP BY m.material_id, m.mat_name, m.matunit
        ORDER BY m.material_id;
      `;
  
      const { rows } = await db.query(query, [upload_id]);
      console.log(JSON.stringify(rows, null, 2));
      res.json(rows);
    } catch (err) {
      console.error("Error fetching task details", err);
      res.status(500).json({ error: "Failed to fetch task details" });
    }
  };
  



// ฟังก์ชันสำหรับตรวจสอบสถานะการตัด
const getcheckTask = async (req, res) => {
    const { upload_id } = req.params;

    try {
        const result = await db.query(`
            SELECT material_id, matunit, mat_name, lot, location, quantity, remaining_quantity, cut_status
            FROM check_cutting WHERE upload_id = $1
        `, [upload_id]);

        if (result.rows.length === 0) {
            return res.status(404).send('No check cutting data found for the given upload_id');
        }

        // จัดการกับคอลัมน์ display_quantity โดยสร้างขึ้นจาก remaining_quantity หรือ quantity
        const checkData = result.rows.map(row => ({
            ...row,
            display_quantity: row.remaining_quantity !== null ? row.remaining_quantity : row.quantity
        }));

        res.json(checkData);
    } catch (err) {
        console.error('Error fetching check details:', err);
        res.status(500).send('Error fetching check details');
    }
};

// ฟังก์ชันสำหรับบันทึกจำนวนการนับจริง (counted_quantity)
const saveCountedQuantities = async (req, res) => {
    const { upload_id } = req.params;
    const countedQuantities = req.body; // รับค่าที่ผู้ใช้กรอกมาในรูปแบบ { material_id: counted_quantity }

    try {
        // ดึงข้อมูลทั้งหมดจาก material_usage ที่เกี่ยวข้องกับ upload_id
        const result = await db.query('SELECT id, material_id, remaining_quantity FROM material_usage WHERE upload_id = $1', [upload_id]);
        const materialUsageRows = result.rows;

        // ตรวจสอบว่ามีข้อมูลที่ต้องอัพเดตหรือไม่
        if (materialUsageRows.length === 0) {
            return res.status(404).json({ error: 'No material usage found for the given upload_id' });
        }

        // สร้างรายการอัพเดตสำหรับแต่ละ material_id
        const updateQueries = materialUsageRows.map(row => {
            const { id,  remaining_quantity } = row;
            // ใช้ค่า counted_quantity ที่ได้รับ หรือถ้าไม่มีให้ใช้ remaining_quantity
            const counted_quantity = countedQuantities[id] !== undefined ? countedQuantities[id] : remaining_quantity;

            // เฉพาะรายการที่มีการกรอกจำนวนจริง
            if (countedQuantities[id] !== undefined || remaining_quantity !== counted_quantity) {
                return db.query(
                    'UPDATE material_usage SET counted_quantity = $1 WHERE id = $2',
                    [counted_quantity, id]
                );
            }
        });

        // รอให้การอัปเดตทั้งหมดเสร็จสิ้น
        await Promise.all(updateQueries.filter(query => query !== undefined));

        res.status(200).json({ message: 'Counted quantities saved successfully' });
    } catch (error) {
        console.error('Error saving counted quantities:', error);
        res.status(500).json({ error: 'Failed to save counted quantities' });
    }
};

// ฟังก์ชันสำหรับเปลี่ยนสถานะเป็น 'Completed'
const completeTask = async (req, res) => {
    const { upload_id } = req.params;

    try {
        // ดึงข้อมูล material_usage ทั้งหมดที่เกี่ยวข้องกับ upload_id
        const result = await db.query('SELECT remaining_quantity, counted_quantity FROM material_usage WHERE upload_id = $1', [upload_id]);
        
        const allEqual = result.rows.every(row => row.remaining_quantity === row.counted_quantity);

        // อัพเดตสถานะในตาราง uploads ตามผลการตรวจสอบ
        const newStatus = allEqual ? 'ดำเนินการเรียบร้อย' : 'รอตรวจสอบ';
        await db.query('UPDATE uploads SET current_status = $1 WHERE upload_id = $2', [newStatus, upload_id]);

        // บันทึกการเปลี่ยนแปลงสถานะลงในตาราง operationstatuses
        await db.query(
            'INSERT INTO operationstatuses (upload_id, status, timestamp) VALUES ($1, $2, NOW())',
            [upload_id, newStatus]
        );
        
        res.status(200).send(`Task marked as ${newStatus}`);
    } catch (err) {
        console.error('Error marking task as completed:', err);
        res.status(500).send('Error marking task as completed');
    }
};


module.exports = {
    getTasks,
    acceptTask,
    getMyTasks,
    returnTask, 
    getTaskDetails,
    completeTask,
    getcheckTask,
    saveCountedQuantities
};