// controllers/taskController.js
const { pool1 } = require('../config/db');
const { updateDurationAndAverage } = require('../controllers1/supClerkDashController');

const logUserAction = async (userId, action) => {
    const client = await pool1.connect(); // ใช้ client เพื่อควบคุม transaction
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
        
        const tasks = await pool1.query(
            'SELECT * FROM uploads WHERE current_status = $1 AND assigned_to IS NULL' ,
            ['รอรับงาน']
        );
        console.log('Query Parameters:', ['รอรับงาน']);

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
        await pool1.query('UPDATE uploads SET assigned_to = $1, current_status = $2, last_status_update = NOW() WHERE upload_id = $3', [userId, 'กำลังดำเนินการ', upload_id]);

        await updateDurationAndAverage(upload_id, 'รอรับงาน');

        // บันทึกการเปลี่ยนแปลงสถานะในตาราง operationstatuses
        await pool1.query(
          'INSERT INTO operationstatuses (upload_id, status, timestamp) VALUES ($1, $2, NOW())',
          [upload_id, 'กำลังดำเนินการ']
        );

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
        const tasks = await pool1.query('SELECT * FROM uploads WHERE assigned_to = $1 ', [userId ]);
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
      await pool1.query('UPDATE uploads SET assigned_to = NULL, current_status = $2, last_status_update = NOW() WHERE upload_id = $2 AND assigned_to = $3', ['รอรับงาน', upload_id, userId]);

      // อัปเดต duration และ average_duration สำหรับสถานะ "กำลังดำเนินการ"
      await updateDurationAndAverage(upload_id, 'กำลังดำเนินการ');

       // บันทึกการเปลี่ยนแปลงสถานะในตาราง operationstatuses
       await pool1.query(
        'INSERT INTO operationstatuses (upload_id, status, timestamp) VALUES ($1, $2, NOW())',
        [upload_id, 'รอรับงาน']
      );

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
              'remaining_quantity', b.remaining_quantity,
              'counted_quantity', b.counted_quantity,
              'actual_quantity', b.actual_quantity,
              'employee_reason', b.employee_reason,
              'manager_reason', b.manager_reason
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
      
  
      const { rows } = await pool1.query(query, [upload_id]);
      console.log(JSON.stringify(rows, null, 2));
      res.json(rows);
    } catch (err) {
      console.error("Error fetching task details", err);
      res.status(500).json({ error: "Failed to fetch task details" });
    }
};

const getPendingTaskDetails = async (req, res) => {
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
                  'remaining_quantity', b.remaining_quantity,
                  'counted_quantity', 
                  COALESCE(t.counted_quantity, b.counted_quantity), -- ใช้ค่าจาก material_temporary ถ้ามี
                  'actual_quantity', 
                  COALESCE(t.actual_quantity, b.actual_quantity), -- ใช้ค่าจาก material_temporary ถ้ามี
                  'employee_reason', t.employee_reason,
                  'manager_reason', b.manager_reason,
                  'is_temporary', CASE WHEN t.material_usage_id IS NOT NULL AND t.material_usage_id = b.id THEN true  ELSE false END
              )
              ORDER BY b.matin
          ) AS details
      FROM materials m
      JOIN materialrequests r ON m.material_id = r.material_id
      LEFT JOIN material_usage b ON m.material_id = b.material_id AND b.upload_id = $1
      LEFT JOIN material_temporary t ON t.material_usage_id = b.id -- เชื่อมกับ material_temporary
      WHERE r.upload_id = $1
      GROUP BY m.material_id, m.mat_name, m.matunit, r.quantity
      ORDER BY m.material_id;
      `;

      const { rows } = await pool1.query(query, [upload_id]);
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
        const { rows } = await pool1.query(query, [upload_id]);
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
        
        const { rows } = await pool1.query(query, [upload_id]);

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
        const result = await pool1.query('SELECT id, material_id, remaining_quantity FROM material_usage WHERE upload_id = $1', [upload_id]);
        const materialUsageRows = result.rows;

        // ตรวจสอบว่ามีข้อมูลที่ต้องอัพเดตหรือไม่
        if (materialUsageRows.length === 0) {
            return res.status(404).json({ error: 'No material usage found for the given upload_id' });
        }

        // สร้างรายการอัพเดตสำหรับแต่ละ material_id
        const updateQueries = payload.map(item => {
            const { id, counted_quantity, actual_quantity, selected_time } = item; // ดึงข้อมูลจาก payload ที่ frontend ส่งมา

            // ค้นหา row ที่ตรงกับ id จากฐานข้อมูล
            const row = materialUsageRows.find(row => row.id === id);
            if (row) {
                const { remaining_quantity } = row;

                // ตรวจสอบว่าค่าที่ได้รับแตกต่างจาก remaining_quantity หรือไม่
                if (counted_quantity !== undefined || remaining_quantity !== counted_quantity) {
                    return pool1.query(
                        'UPDATE material_usage SET counted_quantity = $1, actual_quantity = $2, selected_time = $3 WHERE id = $4',
                        [counted_quantity, actual_quantity, selected_time, id] // อัปเดตทั้ง counted_quantity และ selected_time
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
        const result = await pool1.query('SELECT remaining_quantity, counted_quantity FROM material_usage WHERE upload_id = $1', [upload_id]);
        
        const allEqual = result.rows.every(row => row.remaining_quantity === row.counted_quantity);

        // อัพเดตสถานะในตาราง uploads ตามผลการตรวจสอบ
        const newStatus = allEqual ? 'ดำเนินการเรียบร้อย' : 'รอตรวจสอบ';
        await pool1.query('UPDATE uploads SET current_status = $1, last_status_update = NOW() WHERE upload_id = $2', [newStatus, upload_id]);

        // อัปเดต duration และ average_duration สำหรับสถานะ "กำลังดำเนินการ"
        await updateDurationAndAverage(upload_id, 'กำลังดำเนินการ');

        // บันทึกการเปลี่ยนแปลงสถานะลงในตาราง operationstatuses
        await pool1.query(
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
      const result = await pool1.query('SELECT current_status FROM uploads WHERE upload_id = $1', [upload_id]);
  
      if (result.rows.length > 0) {
        console.log("Status from database:", result.rows[0].current_status);
        res.json({ status: result.rows[0].current_status });
      } else {
        res.status(404).json({ error: 'Upload not found' });
      }
    } catch (error) {
      console.error(error);
      res.status(500).json({ error: 'Internal Server Error' });
    }
  };

const savePartialCountedQuantities = async (req, res) => {
  const { upload_id } = req.params;
  const payload = req.body;

  // ตรวจสอบว่า `upload_id` และ `payload` มีข้อมูลครบถ้วน
  if (!upload_id) {
    return res.status(400).json({ message: "ไม่พบ upload_id" });
  }
  if (!payload || payload.length === 0) {
    return res.status(400).json({ message: "ข้อมูล payload ว่างเปล่า" });
  }

  try {
    const mismatchedItems = [];

    // บันทึกข้อมูลใน `material_temporary`
    const insertOrUpdatePromises  = payload.map(async (item) => {
      const { id, counted_quantity, actual_quantity, used_quantity, selected_time, employee_reason } = item;

      // ตรวจสอบความคลาดเคลื่อน
      if (actual_quantity !== used_quantity) {
        mismatchedItems.push({ id, actual_quantity, used_quantity, employee_reason });
      }

      // ตรวจสอบว่า id นี้มีข้อมูลใน material_temporary อยู่แล้วหรือไม่
      const checkQuery = 'SELECT id FROM material_temporary WHERE material_usage_id = $1';
      const checkResult = await pool1.query(checkQuery, [id]);

      if (checkResult.rows.length > 0) {
        // ถ้ามีข้อมูลแล้ว ให้ทำการอัพเดต
        const updateQuery = `
          UPDATE material_temporary
          SET counted_quantity = $1, actual_quantity = $2, selected_time = $3, employee_reason = $4
          WHERE material_usage_id = $5 AND upload_id = $6
        `;
        await pool1.query(updateQuery, [
          counted_quantity,
          actual_quantity,
          selected_time,
          employee_reason,
          id,
          upload_id,
        ]);
      } else {
        // ถ้าไม่มีข้อมูลในตาราง material_temporary ให้ทำการบันทึกใหม่
        const insertQuery = `
          INSERT INTO material_temporary (material_usage_id, counted_quantity, actual_quantity, selected_time, employee_reason, upload_id)
          VALUES ($1, $2, $3, $4, $5, $6)
        `;
        await pool1.query(insertQuery, [
          id,
          counted_quantity,
          actual_quantity,
          selected_time,
          employee_reason,
          upload_id,
        ]);
      }
    });

    // รอให้การอัพเดตหรือการบันทึกเสร็จสิ้น
    await Promise.all(insertOrUpdatePromises);

    if (!upload_id) {
      console.error("ไม่พบ upload_id");
      return;
    }

    // หากพบรายการที่ยอดไม่ตรงกัน ให้ส่งแจ้งเตือนหัวหน้า
    if (mismatchedItems.length > 0) {
      console.log("Calling Notification  with upload_id:", upload_id);
      await notifyManager(upload_id, req);
      
    }

    // ตอบกลับการบันทึกสำเร็จ
    res.status(200).json({ message: "บันทึกการเบิกจ่ายชั่วคราวสำเร็จ" });
  } catch (error) {
    console.error("เกิดข้อผิดพลาดในการบันทึก:", error);
    res.status(500).json({ message: "ไม่สามารถบันทึกการเบิกจ่ายชั่วคราวได้", error: error.message });
  }
};

const updateStatus = async (req, res) => {
  const { upload_id } = req.params;
  const { status } = req.body;

  console.log("Received request to update status:", { upload_id, status });

  try {
    await pool1.query(
      'UPDATE uploads SET current_status = $1, last_status_update = NOW() WHERE upload_id = $2',
      [status, upload_id]
    );

    // อัปเดต duration และ average_duration สำหรับสถานะ ""
    await updateDurationAndAverage(upload_id, 'กำลังดำเนินการ');

    await pool1.query(
      'INSERT INTO operationstatuses (upload_id, status, timestamp) VALUES ($1, $2, NOW())',
      [upload_id, status]
    );

    res.status(200).json({ message: "สถานะถูกอัพเดตเรียบร้อยแล้ว" });
  } catch (err) {
    console.error("Error updating status:", err);
    res.status(500).json({ message: "เกิดข้อผิดพลาดในการอัพเดตสถานะ" });
  }
};

// เพิ่ม socket.io ใน notifyManager
const notifyManager = async (upload_id, req) => {
  console.log("uploadId received in notifyManager:", upload_id);
  const io = req.io; 
  console.log("Socket.IO object:", io); 
  const senderId = req.user.userId; // ใช้ req ที่ได้รับเข้ามา
  try {
    const uploadResult = await pool1.query(
      "SELECT inventory_id FROM uploads WHERE upload_id = $1",
      [upload_id]
    );

    if (uploadResult.rows.length === 0) {
      console.log(`ไม่พบข้อมูล upload_id: ${upload_id}`);
      return;
    }

    const inventoryId = uploadResult.rows[0].inventory_id;
    const currentTime = new Date().toLocaleString();

    const supervisors = await pool1.query(
      "SELECT user_id, username FROM users1 WHERE role = $1",
      ["Supervisor Clerk"]
    );

    console.log("Supervisors query result:", supervisors.rows);

    if (supervisors.rows.length > 0) {
      const message = `มีวัตถุดิบบางรายการไม่เพียงพอ`;
      const type = "Mismatch Notification";
      const status = "unread";

      const notificationPromises = supervisors.rows.map(async (supervisor) => {
        // บันทึกในฐานข้อมูล
        await pool1.query(
          `INSERT INTO notifications (sender_id, recipient_id, message, type, status, inventory_id, upload_id) 
           VALUES ($1, $2, $3, $4, $5, $6, $7)`,
          [senderId, supervisor.user_id, message, type, status, inventoryId , upload_id]
        );

        // Log ข้อมูลที่จะส่งผ่าน Socket.IO
        console.log(`Sending notification to supervisor ${supervisor.user_id}:`, message);

        // ส่งการแจ้งเตือนแบบเรียลไทม์ผ่าน Socket.IO
        if (io && io.emit) {  // ตรวจสอบว่า io ถูกส่งเข้ามาหรือไม่
          io.emit('notification', {
            userName: supervisor.username ,
            inventoryId: inventoryId,
            message: message,
            type: type,
            status: status,
            createdAt: currentTime 
          });
        } else {
          console.error('Socket.IO instance is not defined');
        }

      });

      await Promise.all(notificationPromises);
      console.log("การแจ้งเตือนถูกส่งไปยัง Supervisor เรียบร้อยแล้ว");
    } else {
      console.log("ไม่พบผู้ใช้ที่มีบทบาทเป็น Supervisor");
    }
  } catch (err) {
    console.error("เกิดข้อผิดพลาดในการส่งการแจ้งเตือน:", err);
  }
};

const savePartialQuantities = async (req, res) => {
  const { upload_id } = req.params;
  const payload = req.body; // รับค่าที่ผู้ใช้กรอกมาในรูปแบบ [{ id, counted_quantity, actual_quantity, selected_time, employee_reason }]

  try {
    // ดึงข้อมูลทั้งหมดจาก material_temporary ที่เกี่ยวข้องกับ upload_id
    const result = await pool1.query('SELECT material_usage_id FROM material_temporary WHERE upload_id = $1', [upload_id]);
    const materialTemporaryRows = result.rows;

    // ถ้าไม่มีข้อมูลที่ตรงกับ upload_id
    if (materialTemporaryRows.length === 0) {
      // ถ้าไม่มีข้อมูลใด ๆ ที่ตรงกับ upload_id ก็จะบันทึกข้อมูลใหม่
      const insertQueries = payload.map(item => {
        const { id, counted_quantity, actual_quantity, selected_time, employee_reason } = item;
        return pool1.query(
          'INSERT INTO material_temporary (upload_id, material_usage_id, counted_quantity, actual_quantity, selected_time, employee_reason) VALUES ($1, $2, $3, $4, $5, $6)',
          [upload_id, id, counted_quantity, actual_quantity, selected_time, employee_reason]
        );
      });
      // รอให้การบันทึกทั้งหมดเสร็จสิ้น
      await Promise.all(insertQueries);
      return res.status(200).json({ message: 'New material temporary data saved successfully' });
    }

    // ถ้ามีข้อมูลที่ตรงกับ upload_id
    const updateQueries = payload.map(item => {
      const { id, counted_quantity, actual_quantity, selected_time, employee_reason } = item;

      // ค้นหา row ที่ตรงกับ id จากฐานข้อมูล
      const row = materialTemporaryRows.find(row => row.material_usage_id === id);
      if (row) {
        // ถ้ามีข้อมูลที่ตรงกับ id ใน material_temporary ก็ให้ทำการอัปเดต
        return pool1.query(
          'UPDATE material_temporary SET counted_quantity = $1, actual_quantity = $2, selected_time = $3, employee_reason = $4 WHERE material_usage_id = $5',
          [counted_quantity, actual_quantity, selected_time, employee_reason, row.id]
        );
      } else {
        // ถ้าไม่มีข้อมูลในตาราง material_temporary ให้ทำการบันทึกใหม่
        return pool1.query(
          'INSERT INTO material_temporary (upload_id, material_usage_id, counted_quantity, actual_quantity, selected_time, employee_reason) VALUES ($1, $2, $3, $4, $5, $6)',
          [upload_id, id, counted_quantity, actual_quantity, selected_time, employee_reason]
        );
      }
    });

    // รอให้การอัปเดตทั้งหมดเสร็จสิ้น
    await Promise.all(updateQueries);

    res.status(200).json({ message: 'Partial quantities and selected_time saved successfully' });
  } catch (error) {
    console.error('Error saving partial quantities:', error);
    res.status(500).json({ error: 'Failed to save partial quantities' });
  }
};

const updateMaterialTemporary = async (req, res) => {
  try {
    const { upload_id } = req.params;
    const { payload } = req.body;

    for (const entry of payload) {
      const { id, counted_quantity, actual_quantity, selected_time, employee_reason } = entry;

      // ตรวจสอบว่า id มีอยู่ใน material_temporary หรือไม่
      const existingRecord = await pool1.query(
        `SELECT material_usage_id FROM material_temporary WHERE id = $1 AND upload_id = $2`,
        [id, upload_id]
      );

      if (existingRecord.rows.length > 0) {
        // ถ้ามี id ให้ทำการอัพเดตข้อมูล
        await pool1.query(
          `UPDATE material_temporary
           SET counted_quantity = $1, actual_quantity = $2, selected_time = $3, employee_reason = $4
           WHERE id = $5 AND upload_id = $6`,
          [counted_quantity, actual_quantity, selected_time, employee_reason, id, upload_id]
        );
      } else {
        // ถ้าไม่มี id ให้ทำการบันทึกข้อมูลใหม่
        await pool1.query(
          `INSERT INTO material_temporary (material_usage_id, counted_quantity, actual_quantity, selected_time, employee_reason, upload_id)
           VALUES ($1, $2, $3, $4, $5, $6)`,
          [id, counted_quantity, actual_quantity, selected_time, employee_reason, upload_id]
        );
      }
    }

    res.status(200).json({ message: "Material temporary data processed successfully" });
  } catch (error) {
    console.error("Error updating material_temporary:", error);
    res.status(500).json({ message: "Error processing material temporary data" });
  }
};


const saveMaterialUsage = async (req, res) => {
  try {
    const { upload_id } = req.params;

    
    // บันทึกข้อมูลจาก material_temporary ไปยัง material_usage
    const result = await pool1.query(
      `UPDATE material_usage mu
       SET counted_quantity = mt.counted_quantity,
           employee_reason = mt.employee_reason,
           selected_time = mt.selected_time,
           actual_quantity = mt.actual_quantity
       FROM material_temporary mt
       WHERE mu.id = mt.material_usage_id
         AND mt.upload_id = $1`,
      [upload_id]
    );

    // ลบข้อมูลใน material_temporary หลังการย้าย
    await pool1.query(`DELETE FROM material_temporary WHERE upload_id = $1`, [upload_id]);

    res.status(200).json({ message: "Saved material usage successfully" });
  } catch (error) {
    console.error("Error saving material usage:", error);
    res.status(500).json({ message: "Error saving material usage" });
  }
};




module.exports = {
    getTasks,
    acceptTask,
    getMyTasks,
    returnTask, 
    getTaskDetails,
    getPendingTaskDetails,
    getTotalRequestedQuantity,
    completeTask,
    getcheckTask,
    saveCountedQuantities,
    getStatus,
    savePartialCountedQuantities,
    notifyManager,
    updateStatus,
    savePartialQuantities,
    updateMaterialTemporary,
    saveMaterialUsage
};