const { pool1 } = require('../config/db');
const { logUserAction } = require('../controllers/loginController');
const { updateDurationAndAverage } = require('../controllers/supClerkDashController');

const getDashboardData = async (req, res) => {
  try {
    // ดึงข้อมูลจากตาราง uploads ที่มี status เป็น "รอดดำเนินการต่อ" หรือ "รอตรวจสอบ"
    const result = await pool1.query(
      `SELECT upload_id, material_type, approved_date AS date, current_status AS status, last_status_update, inventory_id 
      FROM uploads 
      WHERE current_status IN ('รอดำเนินการต่อ', 'รอตรวจสอบ')`
    );
    console.log("Step 1: Fetched uploads data:", result.rows);

    // ใช้ Promise.all เพื่อรอให้การตรวจสอบใน notifications เสร็จสิ้นทั้งหมด
    const filteredData = await Promise.all(result.rows.map(async (row) => {
      console.log("Processing row:", row);
      // ถ้าสถานะเป็น "รอดำเนินการต่อ"
      if (row.status === 'รอดำเนินการต่อ') {
        // ตรวจสอบว่าในตาราง notifications มี upload_id ที่ตรงกัน
        const notificationResult = await pool1.query(
          `SELECT 1 FROM notifications WHERE upload_id = $1`, [row.upload_id]
        );
        console.log("Checking notifications for upload_id:", row.upload_id);
        console.log("Notification result:", notificationResult.rows);

        // ถ้ามีตรงกันให้คืนค่าข้อมูลนี้
        if (notificationResult.rows.length > 0) {
          console.log("Found matching notification, returning row:", row);
          return row;
        } else {
          console.log("No matching notification found for upload_id:", row.upload_id);
        }
      } else if (row.status === 'รอตรวจสอบ') {
        // ถ้าสถานะเป็น "รอตรวจสอบ" ให้คืนค่าทันที
        console.log("Status is 'รอตรวจสอบ', returning row:", row);
        return row;
      }

      // ถ้าไม่ตรงกับเงื่อนไขก็ให้ return null
      console.log("No conditions met for row:", row);
      return null;
    }));

    // กรอง undefined หรือ null ออก
    const cleanData = filteredData.filter(row => row !== null);
    console.log("Step 2: Filtered data after conditions:", cleanData);

    // ส่งข้อมูลไปยังหน้าบ้าน
    res.json(cleanData);
  } catch (err) {
    console.error('Error fetching dashboard data:', err);
    res.status(500).send('Error fetching dashboard data');
  }
};


const getMaterialUsageData = async (req, res) => {
  try {
      const { upload_id } = req.params;
      const query = `
        SELECT 
          u.inventory_id,
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
        JOIN uploads u ON u.upload_id = b.upload_id
        LEFT JOIN material_temporary t ON t.mat_requests_id = b.id -- เชื่อมกับ material_temporary
        WHERE b.upload_id = $1
        GROUP BY u.inventory_id, m.id, m.mat_name, m.mat_unit
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
          u.inventory_id,
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
              'remaining_quantity', b.remaining_quantity,
              'counted_quantity', COALESCE(t.counted_quantity, b.counted_quantity), -- ใช้ค่าจาก material_temporary ถ้ามี
              'manager_reason_remaining', b.manager_reason_remaining,
              'check', CASE 
                      WHEN b.counted_quantity IS NOT NULL AND b.counted_quantity != b.remaining_quantity THEN true
                      ELSE false
                   END
            )
            ORDER BY b.id
          ) AS details
        FROM material_matunits m
        JOIN mat_requests b ON m.id = b.mat_unit_id AND b.upload_id = $1
        JOIN uploads u ON u.upload_id = b.upload_id
        LEFT JOIN material_temporary t ON t.mat_requests_id = b.id -- เชื่อมกับ material_temporary
        WHERE b.upload_id = $1
        GROUP BY u.inventory_id, m.id, m.mat_name, m.mat_unit
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

const getAuditDetails = async (req, res) => {
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
              'employee_reason_remaining', t.employee_reason_remaining,
              'manager_reason', b.manager_reason,
              'remaining_quantity', b.remaining_quantity,
              'counted_quantity', COALESCE(t.counted_quantity, b.counted_quantity), -- ใช้ค่าจาก material_temporary ถ้ามี
              'manager_reason_remaining', b.manager_reason_remaining,
              'check', CASE 
                      WHEN b.counted_quantity IS NOT NULL AND b.counted_quantity != b.remaining_quantity THEN true
                      ELSE false
                   END,
              'check_remaining', CASE 
                      WHEN b.counted_quantity IS NOT NULL 
                        AND b.counted_quantity != b.remaining_quantity 
                      THEN true
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

  if (!tempData || tempData.length === 0) {
    return res.status(400).json({ message: "ไม่มีข้อมูลสำหรับการบันทึก" });
  }

  const client = await pool1.connect();

  try {
    await client.query("BEGIN");

    for (const record of tempData) {
      const { id, manager_reason } = record;

      if (!id || !manager_reason) {
        throw new Error("ข้อมูลไม่สมบูรณ์");
      }

      await client.query(
        `UPDATE mat_requests SET manager_reason = $1 WHERE id = $2`,
        [manager_reason, id]
      );
    }

    // ตรวจสอบว่า manager_reason ทั้งหมดเป็น "จ่ายวัตถุดิบเท่าที่เหลือ"
    const allReasonsMatch = tempData.every(
      (item) => item.manager_reason === "จ่ายวัตถุดิบเท่าที่เหลือ"
    );

    await client.query("COMMIT");

    if (allReasonsMatch) {
      // ถ้าตรงเงื่อนไข ให้เรียก approveUpload โดยไม่ต้องแจ้งเตือนปกติ
      const fakeReq = {
        ...req,
        user: req.user,
        params: { upload_id },
      };

      // เรียก approveUpload (และมันจะส่ง notification ผ่าน sendNotificationToSenderApprove อยู่แล้ว)
      await approveUpload(fakeReq, res);
    } else {
      // ถ้าไม่ใช่ทั้งหมด "จ่ายวัตถุดิบเท่าที่เหลือ" ให้ส่ง Notification ตามปกติ
      console.log("Calling Notification with upload_id:", upload_id);
      await sendNotificationToSender(upload_id, req);
      res.status(200).json({ message: "บันทึกข้อมูลสำเร็จ" });
    }

  } catch (error) {
    await client.query("ROLLBACK");
    console.error("Error updating material_usage:", error);
    res.status(500).json({ message: "เกิดข้อผิดพลาดในการบันทึกข้อมูล" });
  } finally {
    client.release();
  }
};
  
const saveMaterialUsage = async (upload_id) => {
  try {
    // บันทึกข้อมูลจาก material_temporary ไปยัง mat_requests
    await pool1.query(
      `UPDATE mat_requests mu
       SET counted_quantity = mt.counted_quantity,
           employee_reason = mt.employee_reason,
           employee_reason_remaining = mt.employee_reason_remaining,
           selected_time = mt.selected_time,
           actual_quantity = mt.actual_quantity
       FROM material_temporary mt
       WHERE mu.id = mt.mat_requests_id
         AND mt.upload_id = $1`,
      [upload_id]
    );

    // ลบข้อมูลใน material_temporary หลังการย้าย
    await pool1.query(`DELETE FROM material_temporary WHERE upload_id = $1`, [upload_id]);

    console.log(`Saved material usage for upload_id: ${upload_id}`);
  } catch (error) {
    console.error("Error saving material usage:", error);
    throw error; // โยน error เพื่อให้ approveUpload จัดการต่อ
  }
};

  const approveUpload = async (req, res) => {
    const { userId } = req.user;
    const { upload_id } = req.params;
    // ย้าย console.log มาหลังจากการประกาศ upload_id
    console.log("uploadId received in notifyManager:", upload_id);

    try {
        // อัปเดตเหตุผลใน material_usage
        /*for (const record of data) {
          if (record.manager_reason) {
            await pool1.query(
              'UPDATE mat_requests SET manager_reason = $1 WHERE id = $2 AND upload_id = $3',
              [record.manager_reason, record.id, upload_id]
            );
          }
        }*/

        // เรียกใช้ saveMaterialUsage
        await saveMaterialUsage(upload_id); 

        // 🔍 ตรวจสอบว่าใน mat_requests มี record ที่ employee_reason_remaining ไม่ว่างหรือไม่
        const checkResult = await pool1.query(
          `SELECT COUNT(*) AS count
            FROM mat_requests
            WHERE upload_id = $1 AND employee_reason_remaining IS NOT NULL AND TRIM(employee_reason_remaining) <> ''`,
          [upload_id]
         );

        const remainingCount = parseInt(checkResult.rows[0].count, 10);

        let newStatus = '';
        if (remainingCount > 0) {
            // ถ้ามี reason → สถานะเป็น 'รอตรวจสอบ'
            newStatus = 'รอตรวจสอบ';
        } else {
            // ถ้าไม่มี reason → สถานะเป็น 'ดำเนินการเรียบร้อย'
            newStatus = 'ดำเนินการเรียบร้อย';
        }

        // อัปเดตสถานะเป็น 'ดำเนินการเรียบร้อย'
        await pool1.query('UPDATE uploads SET current_status = $1 WHERE upload_id = $2', [newStatus, upload_id]);

        // อัปเดต duration และ average_duration
        await updateDurationAndAverage(upload_id, 'รอตรวจสอบ');

        // บันทึกการเปลี่ยนแปลงสถานะในตาราง operationstatuses
        await pool1.query('INSERT INTO operationstatuses (upload_id, status, timestamp) VALUES ($1, $2, NOW())', [upload_id, 'ดำเนินการเรียบร้อย']);
        
        // บันทึกการกระทำของผู้ใช้
        await logUserAction(userId, 'อนุมัติรายการ_${upload_id}', upload_id);

        console.log("Calling Notification with upload_id:", upload_id);
        await sendNotificationToSenderApprove(upload_id, req); 
        res.status(200).json({ success: true });
    } catch (error) {
        console.error('Error updating status:', error);
        res.status(500).json({ success: false, message: "เกิดข้อผิดพลาดในการอนุมัติ" });
    }
};

const approveRemaining = async (req, res) => {
  const { userId } = req.user;
  const { data } = req.body;
  const { upload_id } = req.params;
  // ย้าย console.log มาหลังจากการประกาศ upload_id
  console.log("uploadId received in notifyManager:", upload_id);

  try {
      // อัปเดตเหตุผลใน mat_requests
      for (const record of data) {
        if (record.manager_reason_remaining) {
          await pool1.query(
            'UPDATE mat_requests SET manager_reason_remaining = $1 WHERE id = $2 AND upload_id = $3',
            [record.manager_reason_remaining, record.id, upload_id]
          );
        }
      }

      // เรียกใช้ saveMaterialUsage
      await saveMaterialUsage(upload_id); 

      // อัปเดตสถานะเป็น 'ดำเนินการเรียบร้อย'
      await pool1.query('UPDATE uploads SET current_status = $1 WHERE upload_id = $2', ['ดำเนินการเรียบร้อย', upload_id]);

      // อัปเดต duration และ average_duration
      await updateDurationAndAverage(upload_id, 'รอตรวจสอบ');

      // บันทึกการเปลี่ยนแปลงสถานะในตาราง operationstatuses
      await pool1.query('INSERT INTO operationstatuses (upload_id, status, timestamp) VALUES ($1, $2, NOW())', [upload_id, 'ดำเนินการเรียบร้อย']);
      
      // บันทึกการกระทำของผู้ใช้
      await logUserAction(userId, 'อนุมัติรายการ_${upload_id}', upload_id);

      console.log("Calling Notification with upload_id:", upload_id);
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

const sendNotificationToSenderApprove = async (upload_id, req, res) => { 
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
    const message = 'ปิดงานรายการนี้เรียบร้อยแล้ว';
    const type = 'Approve';
    const status = 'unread';  // หรือ 'read' ตามสถานะ

    const approvenotification = await pool1.query(
      'INSERT INTO notifications (sender_id, recipient_id, message, type, status, inventory_id, upload_id) VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING *',
      [senderId, recipientId, message, type, status, inventoryId, upload_id]
    );

    console.log("Approve notification inserted:", approvenotification.rows[0]);

    // ส่งการแจ้งเตือนแบบเรียลไทม์ผ่าน Socket.IO
    if (io && io.emit) {
      io.emit('approvenotification', {
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
    console.error('Error sending approvenotification:', error);
    res.status(500).json({ message: 'Server error' });
  }
};


module.exports = {
    getDashboardData,
    getAuditDetails,
    getMaterialUsageData,
    getTotalRequested,
    approveUpload,
    confirmEdit,
    updateStatusNotificationsByid,
    updateStatusNotificationsByuploadId,
    getRemainingDetails,
    approveRemaining
};