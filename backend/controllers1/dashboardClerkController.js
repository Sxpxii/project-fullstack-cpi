const { pool1 } = require('../config/db');
const { logUserAction } = require('../controllers1/loginController1');
const { updateDurationAndAverage } = require('../controllers1/supClerkDashController');

const getDashboardData = async (req, res) => {
    try {
        const result = await pool1.query(
          `SELECT 
                upload_id, 
                material_type, 
                TO_CHAR(approved_date, 'YYYY-MM-DD') AS approved_date, 
                current_status AS status, 
                last_status_update, 
                inventory_id 
            FROM uploads`
      );
      console.log("data",result.rows)
      res.json(result.rows);
    } catch (err) {
        console.error('Error fetching dashboard data:', err);
        res.status(500).send('Error fetching dashboard data');
    }
};

/*// ฟังก์ชันสำหรับดึงข้อมูล
const getMaterialDetails = async (req, res) => {
    const { upload_id } = req.params; 
    const query = `
      SELECT 
        mr.request_id,
        mr.material_id, 
        m.mat_name, 
        m.matunit, 
        mr.quantity,
        u.inventory_id,
        u.approved_date
      FROM 
        materialrequests mr
      JOIN 
        materials m 
      ON 
        mr.material_id = m.material_id
      JOIN 
        uploads u
      ON 
        mr.upload_id = u.upload_id
      WHERE mr.upload_id = $1;  
    `;
  
    try {
      const result = await pool1.query(query, [upload_id]);  // ส่ง upload_id เป็น parameter ให้กับ query
      // แปลง approved_date ให้อยู่ในรูปแบบ yyyy-mm-dd
      const formattedResult = result.rows.map(row => {
        return {
          ...row,
          approved_date: row.approved_date ? row.approved_date.toISOString().split('T')[0] : null, // แปลงเป็น yyyy-mm-dd
        };
      });
      
      // แสดงผลลัพธ์ที่ได้จากฐานข้อมูล
      //console.log("Query Result:",formattedResult);
      res.json(result.rows);  // ส่งคืนผลลัพธ์ทั้งหมดในรูปแบบ JSON
    } catch (error) {
      console.error('Error executing query', error);
      res.status(500).json({ error: 'Error fetching material details' });
    }
  };*/
  

// ฟังก์ชันสำหรับดึงรายละเอียดของงาน
const getDetails = async (req, res) => {
  try {
    const { upload_id } = req.params;

    if (!upload_id) {
      return res.status(400).json({ error: "upload_id is required" });
    }

    const query = `
      SELECT 
        u.inventory_id,
        m.id,
        m.mat_name,
        m.mat_unit,
        JSON_AGG(
          JSON_BUILD_OBJECT(
            'id', r.id,
            'mat_unit_id', r.mat_unit_id,
            'mat_lot', r.mat_lot,
            'loc', r.loc,
            'quantity', r.quantity,
            'total_quantity', r.total_quantity
          )
          ORDER BY r.id
        ) AS details
      FROM material_matunits m
      JOIN mat_requests r ON m.id = r.mat_unit_id
      JOIN uploads u ON r.upload_id = u.upload_id
      WHERE r.upload_id = $1
      GROUP BY u.inventory_id, m.id, m.mat_name, m.mat_unit
      ORDER BY m.id;
    `;

    const { rows } = await pool1.query(query, [upload_id]);

    // เพิ่มลำดับสำหรับแต่ละกลุ่มข้อมูล
    const resultWithSequence = rows.map((row, index) => ({
      sequence: index + 1, // เพิ่มลำดับเริ่มต้นที่ 1
      ...row,
    }));

    // ตรวจสอบผลลัพธ์
    console.log("Result with Sequence:", JSON.stringify(resultWithSequence, null, 2));

    // ส่งข้อมูลพร้อมลำดับกลับไปยัง client
    res.json(resultWithSequence);
  } catch (err) {
    console.error("Error fetching task details", err);
    res.status(500).json({ error: "Failed to fetch task details" });
  }
};

const getTotalRequested = async (req, res) => {
  try {
      const { upload_id } = req.params;
      const query = `
          SELECT total_quantity
          FROM uploads r
          WHERE r.upload_id = $1;
      `;
      const { rows } = await pool1.query(query, [upload_id]);
      const totalRequested = rows[0]?.total_quantity || 0;
      console.log("Total requested quantity:", totalRequested); // ตรวจสอบค่าที่ดึงมา
      res.json({ totalRequested });
  } catch (err) {
      console.error("Error fetching total requested quantity", err);
      res.status(500).json({ error: "Failed to fetch total requested quantity" });
  }
};

// ฟังก์ชันสำหรับลบข้อมูลทั้งหมดของ upload_id นั้น
const deleteUpload = async (req, res) => {
    const { upload_id } = req.params;
    const { userId } = req.user;

    if (!upload_id) {
        return res.status(400).json({ error: 'Invalid upload_id' });
    }

    try {
        await pool1.query('BEGIN');

        // ลบข้อมูลที่เกี่ยวข้องกับ upload_id ที่ถูกเลือก
        // ลบข้อมูลในตารางsmat_requests
        await pool1.query('DELETE FROM mat_requests WHERE upload_id = $1', [upload_id]);
        // ลบข้อมูลในตาราง material_matunits
        await pool1.query('DELETE FROM material_matunits WHERE upload_id = $1', [upload_id]);
        // ลบข้อมูลที่อ้างอิงในตาราง notifications ก่อน
        await pool1.query('DELETE FROM notifications WHERE upload_id = $1', [upload_id]);
        // ลบข้อมูลที่อ้างอิงในตาราง operationstatuses ก่อน
        await pool1.query('DELETE FROM operationstatuses WHERE upload_id = $1', [upload_id]);
        // ลบข้อมูลในตาราง uploads
        await pool1.query('DELETE FROM uploads WHERE upload_id = $1', [upload_id]);

        // บันทึกการกระทำของผู้ใช้
        await logUserAction(userId, 'ลบรายการ', upload_id);

        await pool1.query('COMMIT');
        res.status(200).send('Upload deleted successfully');
    } catch (err) {
        await pool1.query('ROLLBACK');
        console.error('Error deleting upload:', err);
        res.status(500).send('Error deleting upload');
    }
};

  // Endpoint to save Inventory ID
  const getSaveInventory = async (req, res) => {
    try {
        const { upload_id, inventory_id  } = req.body;
        console.log("Received data:", { upload_id, inventory_id  });
      
        // ตรวจสอบว่า upload_id และ inventory_id ถูกส่งมาหรือไม่
        if (!upload_id || !inventory_id) {
            return res.status(400).json({ message: 'Missing upload_id or inventory_id' });
        }

        // อัพเดตฐานข้อมูลด้วยข้อมูลที่ได้รับ
        await pool1.query(
            'UPDATE uploads SET inventory_id = $1 WHERE upload_id = $2',
            [inventory_id, upload_id]
        );

        await notifyUrgentTask(upload_id, inventory_id, req);

      res.status(200).json({ message: 'Inventory IDs updated successfully' });
    } catch (error) {
      console.error('Error updating Inventory IDs:', error);
      res.status(500).json({ message: 'Failed to update Inventory IDs' });
    }
};

const notifyUrgentTask = async (upload_id, inventory_id, req) => {
  console.log("uploadId received in getSaveInventory:", upload_id);
  console.log("Inventory IDs received in getSaveInventory:", inventory_id);
  const io = req.io; 
  console.log("Socket.IO ใน Request:", io);
  
  const { userId } = req.user;  // ใช้ userId แทน senderId
  console.log("Sender ID from request:", userId);

  const client = await pool1.connect();
    try {
        await client.query('BEGIN');

        // ตรวจสอบว่าอัปโหลดนี้เป็นงานด่วนหรือไม่
        const { rows: uploadRows } = await client.query(
            'SELECT isurgent FROM uploads WHERE upload_id = $1',
            [upload_id]
        );

        if (uploadRows.length === 0 || !uploadRows[0].isurgent) {
            console.log("Not an urgent task, skipping notifications.");
            await client.query('COMMIT');
            return;
        }

        console.log("Urgent task detected! Notifying Operations...");

        // ดึงรายชื่อ user_id ของ Operations
        const { rows: operationsUsers } = await client.query(
            "SELECT user_id FROM users1 WHERE role = 'Operations'"
        );

        if (operationsUsers.length > 0) {
            const message = `มีงานด่วนที่ต้องดำเนินการ`;
            const type = "urgent_task";
            const status = "unread";

            // เพิ่มแจ้งเตือนให้ทีม Operations
            const notifications = operationsUsers.map((user) =>
                client.query(
                    `INSERT INTO notifications 
                        (sender_id, recipient_id, message, type, status, created_at, inventory_id, upload_id) 
                    VALUES 
                        ($1, $2, $3, $4, $5, NOW(), $6, $7)`,
                    [userId, user.user_id, message, type, status, inventory_id, upload_id]
                )
            );

            await Promise.all(notifications);
            console.log("Notifications sent successfully to Operations team.");

            // แจ้งเตือนผ่าน Socket.IO
            io.emit('notificationUrgent', {
                inventoryId: inventory_id,
                message: message,
                type: type,
                createdAt: new Date().toLocaleString()
            });
        }

        await client.query('COMMIT');
    } catch (err) {
        await client.query('ROLLBACK');
        console.error("Error while sending urgent task notifications:", err);
    } finally {
        client.release();
    }
};

const getUpdateInventory = async (req, res) => {
  const { inventoryId } = req.body; // รับค่า inventoryId จาก request
  const { upload_id } = req.params; // รับค่า upload_id จาก URL params

 // ตรวจสอบว่า inventoryId มีค่าหรือไม่
 if (!inventoryId) {
  return res.status(400).json({ error: 'Inventory ID is required' });
}

try {
  // อัปเดตข้อมูลในตาราง uploads โดยใช้ upload_id เพื่ออัปเดตเฉพาะแถวที่ตรงกับ upload_id
  const result = await pool1.query(
    'UPDATE uploads SET inventory_id = $1 WHERE upload_id = $2 RETURNING *',
    [inventoryId, upload_id]
  );

  if (result.rowCount > 0) {
    // หากอัปเดตสำเร็จ ส่งผลลัพธ์กลับไปที่ frontend
    return res.status(200).json({ message: 'Inventory ID updated successfully' });
  } else {
    return res.status(404).json({ error: 'Upload ID not found' });
  }
} catch (error) {
  console.error('Error updating inventory ID:', error);
  return res.status(500).json({ error: 'Failed to update inventory ID' });
}
};


module.exports = {
    getDashboardData,
    getDetails,
    getSaveInventory,
    //getMaterialDetails,
    getUpdateInventory,
    deleteUpload,
    getTotalRequested
};