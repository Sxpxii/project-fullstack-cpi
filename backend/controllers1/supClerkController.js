const { pool1 } = require('../config/db');
const { logUserAction } = require('../controllers1/loginController1');
const { updateDurationAndAverage } = require('../controllers1/supClerkDashController');

const getMaterialUsageData = async (req, res) => {
  try {
      const { upload_id } = req.params;
      const query = `
        SELECT 
          m.id,
          m.mat_name,
          m.mat_unit,
          JSON_AGG(
            JSON_BUILD_OBJECT(
              'id', b.id,
              'mat_unit_id', b.mat_unit_id,
              'mat_lot', b.mat_lot,
              'loc', b.loc,
              'quantity', b.quantity,
              'actual_quantity', COALESCE(t.actual_quantity, b.actual_quantity), -- ใช้ค่าจาก material_temporary ถ้ามี
              'employee_reason', t.employee_reason,
              'manager_reason', b.manager_reason,
              'check', CASE 
                        WHEN b.quantity <> COALESCE(t.actual_quantity, b.actual_quantity) THEN true 
                        ELSE false 
                       END
            )
            ORDER BY b.id
          ) AS details
        FROM material_matunits m
        JOIN mat_requests b ON m.id = b.mat_unit_id AND b.upload_id = $1
        LEFT JOIN material_temporary t ON t.mat_requests_id = b.id -- เชื่อมกับ material_temporary
        WHERE b.upload_id = $1
        GROUP BY m.id, m.mat_name, m.mat_unit
        ORDER BY m.id;
      `;
  
      const { rows } = await pool1.query(query, [upload_id]);
      console.log(JSON.stringify(rows, null, 2));
      res.json(rows);
    } catch (err) {
      console.error("Error fetching task details", err);
      res.status(500).json({ error: "Failed to fetch task details" });
    }
};

const getRemainingDetails = async (req, res) => {
  try {
      const { upload_id } = req.params;
      const query = `
        SELECT 
          m.id,
          m.mat_name,
          m.matunit,
          JSON_AGG(
            JSON_BUILD_OBJECT(
              'id', b.id,
              'mat_unit_id', b.mat_unit_id,
              'mat_lot', b.mat_lot,
              'loc', b.loc,
              'quantity', b.quantity,
              'remaining_quantity', b.remaining_quantity,
              'counted_quantity', COALESCE(t.counted_quantity, b.counted_quantity), -- ใช้ค่าจาก material_temporary ถ้ามี
              'manager_reason_remaining', b.manager_reason_remaining,
              'check', CASE 
                      WHEN b.counted_quantity IS NOT NULL AND b.counted_quantity != b.remaining_quantity THEN true
                      ELSE false
                   END
            )
            ORDER BY b.matin
          ) AS details
        FROM material_matunits m
        JOIN mat_requests b ON m.id = b.mat_unit_id AND b.upload_id = $1
        LEFT JOIN material_temporary t ON t.mat_requests_id = b.id -- เชื่อมกับ material_temporary
        WHERE b.upload_id = $1
        GROUP BY m.id, m.mat_name, m.mat_unit
        ORDER BY m.id;
      `;
  
      const { rows } = await pool1.query(query, [upload_id]);
      console.log(JSON.stringify(rows, null, 2));
      res.json(rows);
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

/*const updateDetails = async (req, res) => {
    const { upload_id } = req.params;
    const { id, manager_reason } = req.body;
  
    if (!upload_id || !id || !manager_reason) {
      return res.status(400).send('Invalid input data');
    }
  
    try {
      // อัปเดตเหตุผลในฐานข้อมูล
      await pool1.query(
        'UPDATE material_usage SET manager_reason = $1 WHERE id = $2 AND upload_id = $3',
        [manager_reason, id, upload_id]
      );
  
      res.send('Update successful');
    } catch (err) {
      console.error('Error updating details:', err);
      res.status(500).send('Error updating details');
    }
  };*/

  const confirmEdit = async (req, res) => {
    const { upload_id } = req.params;
    const { tempData } = req.body;
  
    // ตรวจสอบว่า tempData มีข้อมูลหรือไม่
    if (!tempData || tempData.length === 0) {
      return res.status(400).json({ message: "ไม่มีข้อมูลสำหรับการบันทึก" });
    }
  
    const client = await pool1.connect();
  
    try {
      // เริ่มต้น transaction
      await client.query("BEGIN");
  
      // วน loop ผ่าน tempData เพื่ออัปเดต manager_reason ใน mat_requests
      for (const record of tempData) {
        const { id, manager_reason } = record;
  
        // ตรวจสอบความสมบูรณ์ของข้อมูล
        if (!id || !manager_reason) {
          throw new Error("ข้อมูลไม่สมบูรณ์");
        }
  
        // อัปเดตข้อมูลใน mat_requests
        await client.query(
          `UPDATE mat_requests SET manager_reason = $1 WHERE id = $2`,
          [manager_reason, id]
        );
      }
  
      console.log("Calling Notification  with upload_id:", upload_id);
      await sendNotificationToSender(upload_id, req); 

      // ยืนยันการเปลี่ยนแปลง
      await client.query("COMMIT");
      res.status(200).json({ message: "บันทึกข้อมูลสำเร็จ" });
    } catch (error) {
      // ยกเลิก transaction หากเกิดข้อผิดพลาด
      await client.query("ROLLBACK");
      console.error("Error updating material_usage:", error);
      res.status(500).json({ message: "เกิดข้อผิดพลาดในการบันทึกข้อมูล" });
    } finally {
      // ปล่อยการเชื่อมต่อกับฐานข้อมูล
      client.release();
    }
  };  

  const approveUpload = async (req, res) => {
    console.log("uploadId received in notifyManager:", upload_id);
    const { userId } = req.user;
    const { data } = req.body;

    try {
        // อัปเดตเหตุผลใน material_usage
        for (const record of data) {
          if (record.manager_reason) {
            await pool1.query(
              'UPDATE material_usage SET manager_reason = $1 WHERE id = $2 AND upload_id = $3',
              [record.manager_reason, record.id, upload_id]
            );
          }
        }

        // อัปเดตสถานะเป็น 'ดำเนินการเรียบร้อย'
        await pool1.query('UPDATE uploads SET current_status = $1 WHERE upload_id = $2', ['ดำเนินการเรียบร้อย', upload_id]);

        // อัปเดต duration และ average_duration
        await updateDurationAndAverage(upload_id, 'รอตรวจสอบ');

        // บันทึกการเปลี่ยนแปลงสถานะในตาราง operationstatuses
        await pool1.query('INSERT INTO operationstatuses (upload_id, status, timestamp) VALUES ($1, $2, NOW())', [upload_id, 'ดำเนินการเรียบร้อย']);
        
        // บันทึกการกระทำของผู้ใช้
        await logUserAction(userId, 'อนุมัติรายการ_${upload_id}', upload_id);

        res.status(200).json({ success: true });
    } catch (error) {
        console.error('Error updating status:', error);
        res.status(500).json({ success: false, message: "เกิดข้อผิดพลาดในการอนุมัติ" });
    }
};

const updateStatusNotificationsByid = async (req, res) => {
  const { id } = req.params;

  try {
    // อัพเดตสถานะการแจ้งเตือนเป็น "read"
    const result = await pool1.query(
      'UPDATE notifications SET status = $1 WHERE id = $2 RETURNING *',
      ['read', id]
    );

    if (result.rowCount === 0) {
      return res.status(404).json({ message: 'Notification not found' });
    }

    res.status(200).json(result.rows[0]);
  } catch (error) {
    console.error('Error updating notification status:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

const updateStatusNotificationsByuploadId = async (req, res) => {
  const { upload_id } = req.params;  // ใช้ upload_id แทน id
  if (!upload_id) {
    return res.status(400).json({ message: "Upload ID is required" });
  }

  try {
    // อัพเดตสถานะการแจ้งเตือนเป็น "read"
    const result = await pool1.query(
      'UPDATE notifications SET status = $1 WHERE upload_id = $2 RETURNING *',
      ['read', upload_id]  // ใช้ upload_id แทน id
    );

    if (result.rowCount === 0) {
      return res.status(404).json({ message: 'Notification not found' });
    }

    res.status(200).json(result.rows[0]);
  } catch (error) {
    console.error('Error updating notification status:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

const sendNotificationToSender = async (upload_id, req, res) => { 
  if (!req.io || !req.user) {
    console.error('Missing io or user data in request');
    return;
  }
  
  console.log("uploadId received in notifyManager:", upload_id);
  const io = req.io;
  const senderId = req.user.userId;
  
  try {
    // 1. ตรวจสอบ sender_id จาก upload_id
    const result = await pool1.query(
      'SELECT sender_id FROM notifications WHERE upload_id = $1',
      [upload_id]
    );
    if (result.rows.length === 0) {
      console.error('No recipient found for this upload_id:', upload_id);
      return res.status(404).json({ message: 'Recipient not found' });
    }

    const recipientId = result.rows[0].sender_id;
    console.log("recipientId:", recipientId);  // ตรวจสอบ recipientId

    // 2. ตรวจสอบ inventory_id จาก upload_id
    const uploadResult = await pool1.query(
      'SELECT inventory_id FROM uploads WHERE upload_id = $1',
      [upload_id]
    );
    if (uploadResult.rows.length === 0) {
      console.error('No inventory found for this upload_id:', upload_id);
      return res.status(404).json({ message: 'Inventory not found' });
    }

    const inventoryId = uploadResult.rows[0].inventory_id;
    console.log("inventoryId:", inventoryId);  // ตรวจสอบ inventoryId

    const currentTime = new Date().toLocaleString();

    // ดึงชื่อของ senderId
    const senderResult = await pool1.query(
      "SELECT username FROM users1 WHERE user_id = $1",
      [senderId]
    );
    if (senderResult.rows.length === 0) {
      console.error('No sender found for this userId:', senderId);
      return res.status(404).json({ message: 'Sender not found' });
    }

    const sendername = senderResult.rows[0].username;
    console.log("sendername:", sendername);  // ตรวจสอบ sendername

    // 3. บันทึกการแจ้งเตือน
    const message = 'ทำการตรวจสอบรายการนี้เรียบร้อยแล้ว';
    const type = 'Review Record';
    const status = 'unread';  // หรือ 'read' ตามสถานะ

    const respondnotification = await pool1.query(
      'INSERT INTO notifications (sender_id, recipient_id, message, type, status, inventory_id, upload_id) VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING *',
      [senderId, recipientId, message, type, status, inventoryId, upload_id]
    );

    console.log("Respond notification inserted:", respondnotification.rows[0]);

    // ส่งการแจ้งเตือนแบบเรียลไทม์ผ่าน Socket.IO
    if (io && io.emit) {
      io.emit('respondnotification', {
        userName: sendername,
        inventoryId: inventoryId,
        message: message,
        type: type,
        createdAt: currentTime
      });
    } else {
      console.error('Socket.IO instance is not defined');
    }

  } catch (error) {
    console.error('Error sending respondnotification:', error);
    res.status(500).json({ message: 'Server error' });
  }
};




module.exports = {
    getMaterialUsageData,
    getTotalRequested,
    approveUpload,
    confirmEdit,
    updateStatusNotificationsByid,
    updateStatusNotificationsByuploadId,
    getRemainingDetails
};