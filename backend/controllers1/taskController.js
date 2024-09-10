// controllers/taskController.js
const db = require('../config/db');

const logUserAction = async (userId, action) => {
    const client = await db.connect(); // ใช้ client เพื่อควบคุม transaction
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

const getTodayDate = () => {
    const today = new Date(); // สร้างวัตถุ Date ใหม่
    const year = today.getFullYear(); // ดึงปี
    const month = String(today.getMonth() + 1).padStart(2, '0'); // ดึงเดือนและเติมศูนย์ข้างหน้า
    const day = String(today.getDate()).padStart(2, '0'); // ดึงวันและเติมศูนย์ข้างหน้า
    return `${year}-${month}-${day}`; // ส่งคืนวันที่ในรูปแบบ YYYY-MM-DD
};

// ใช้งานฟังก์ชัน
const todayDate = getTodayDate();
console.log(todayDate); // แสดงวันที่ในรูปแบบ YYYY-MM-DD


// ฟังก์ชันสำหรับดึงรายการงานทั้งหมด
const getTasks = async (req, res) => {
    try {
        const today = getTodayDate();
        const tasks = await db.query(
            'SELECT * FROM uploads WHERE current_status = $1 AND assigned_to IS NULL AND DATE(upload_date) = $2',
            ['กำลังดำเนินการ', today]
        );
        console.log('Query Parameters:', ['กำลังดำเนินการ', today]);

        console.log('Tasks fetched:', tasks.rows);
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
    const today = getTodayDate();

    try {
        const tasks = await db.query('SELECT * FROM uploads WHERE assigned_to = $1 AND DATE(upload_date) = $2', [userId , today]);
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
          r.quantity,
          JSON_AGG(
            JSON_BUILD_OBJECT(
              'id', b.id,
              'lot', b.lot,
              'matin', b.matin,
              'location', b.location,
              'used_quantity', b.used_quantity,
              'remaining_quantity', b.remaining_quantity
            )
            ORDER BY b.matin
          ) AS details
        FROM materials m
        JOIN materialrequests r ON m.material_id = r.material_id
        LEFT JOIN material_usage b ON m.material_id = b.material_id AND b.upload_id = $1
        WHERE r.upload_id = $1 
        GROUP BY m.material_id, m.mat_name, m.matunit, r.quantity
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
  
const getTotalRequestedQuantity = async (req, res) => {
    try {
        const { upload_id } = req.params;
        const query = `
            SELECT SUM(r.quantity) AS total_requested_quantity
            FROM materialrequests r
            WHERE r.upload_id = $1;
        `;
        const { rows } = await db.query(query, [upload_id]);
        const totalRequestedQuantity = rows[0]?.total_requested_quantity || 0;
        res.json({ totalRequestedQuantity });
    } catch (err) {
        console.error("Error fetching total requested quantity", err);
        res.status(500).json({ error: "Failed to fetch total requested quantity" });
    }
};


// ฟังก์ชันสำหรับตรวจสอบสถานะการตัด
const getcheckTask = async (req, res) => {
    const { upload_id } = req.params;

    try {
        const query = `
            SELECT 
                c.material_id,
                c.mat_name,
                c.matunit,
                JSON_AGG(
                    JSON_BUILD_OBJECT(
                        'lot', c.lot,
                        'matin', c.matin,
                        'location', c.location,
                        'quantity', c.quantity,
                        'remaining_quantity', c.remaining_quantity,
                        'cut_status', c.cut_status,
                        'display_quantity', COALESCE(c.remaining_quantity, c.quantity)
                    )
                    ORDER BY c.matin
                ) AS details
            FROM check_cutting c
            WHERE c.upload_id = $1
            GROUP BY c.material_id, c.mat_name, c.matunit
            ORDER BY c.material_id;
        `;
        
        const { rows } = await db.query(query, [upload_id]);

        if (rows.length === 0) {
            return res.status(404).send('No check cutting data found for the given upload_id');
        }

        res.json(rows);
    } catch (err) {
        console.error('Error fetching check details:', err);
        res.status(500).send('Error fetching check details');
    }
};


// ฟังก์ชันสำหรับบันทึกจำนวนการนับจริง (counted_quantity)
const saveCountedQuantities = async (req, res) => {
    const { upload_id } = req.params;
    const payload = req.body; // รับค่าที่ผู้ใช้กรอกมาในรูปแบบ [{ id, counted_quantity, selected_time }]

    try {
        // ดึงข้อมูลทั้งหมดจาก material_usage ที่เกี่ยวข้องกับ upload_id
        const result = await db.query('SELECT id, material_id, remaining_quantity FROM material_usage WHERE upload_id = $1', [upload_id]);
        const materialUsageRows = result.rows;

        // ตรวจสอบว่ามีข้อมูลที่ต้องอัพเดตหรือไม่
        if (materialUsageRows.length === 0) {
            return res.status(404).json({ error: 'No material usage found for the given upload_id' });
        }

        // สร้างรายการอัพเดตสำหรับแต่ละ material_id
        const updateQueries = payload.map(item => {
            const { id, counted_quantity, selected_time } = item; // ดึงข้อมูลจาก payload ที่ frontend ส่งมา

            // ค้นหา row ที่ตรงกับ id จากฐานข้อมูล
            const row = materialUsageRows.find(row => row.id === id);
            if (row) {
                const { remaining_quantity } = row;

                // ตรวจสอบว่าค่าที่ได้รับแตกต่างจาก remaining_quantity หรือไม่
                if (counted_quantity !== undefined || remaining_quantity !== counted_quantity) {
                    return db.query(
                        'UPDATE material_usage SET counted_quantity = $1, selected_time = $2 WHERE id = $3',
                        [counted_quantity, selected_time, id] // อัปเดตทั้ง counted_quantity และ selected_time
                    );
                }
            }
        });

        // รอให้การอัปเดตทั้งหมดเสร็จสิ้น
        await Promise.all(updateQueries.filter(query => query !== undefined));

        res.status(200).json({ message: 'Counted quantities and selected_time saved successfully' });
    } catch (error) {
        console.error('Error saving counted quantities:', error);
        res.status(500).json({ error: 'Failed to save counted quantities' });
    }
};


// ฟังก์ชันสำหรับเปลี่ยนสถานะเป็น 'Completed'
const completeTask = async (req, res) => {
    const { upload_id } = req.params;
    const { userId } = req.user;

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

        // บันทึกการกระทำของผู้ใช้
        await logUserAction(userId, 'บันทึกการเบิกจ่าย', upload_id);
        
        res.status(200).send(`Task marked as ${newStatus}`);
    } catch (err) {
        console.error('Error marking task as completed:', err);
        res.status(500).send('Error marking task as completed');
    }
};

const getStatus = async (req, res) => {
    const { upload_id } = req.params;
  
    try {
      // Query the database for the upload status using the upload_id
      const result = await db.query('SELECT current_status FROM uploads WHERE upload_id = $1', [upload_id]);
  
      if (result.rows.length > 0) {
        res.json({ status: result.rows[0].status });
      } else {
        res.status(404).json({ error: 'Upload not found' });
      }
    } catch (error) {
      console.error(error);
      res.status(500).json({ error: 'Internal Server Error' });
    }
  };



module.exports = {
    getTasks,
    acceptTask,
    getMyTasks,
    returnTask, 
    getTaskDetails,
    getTotalRequestedQuantity,
    completeTask,
    getcheckTask,
    saveCountedQuantities,
    getStatus,
};