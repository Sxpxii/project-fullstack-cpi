const { pool1 } = require('../config/db');
const { logUserAction } = require('../controllers1/loginController1');
const { updateDurationAndAverage } = require('../controllers1/supClerkDashController');

const getMaterialUsageData = async (req, res) => {
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
              'actual_quantity', COALESCE(t.actual_quantity, b.actual_quantity), -- ใช้ค่าจาก material_temporary ถ้ามี
              'employee_reason', t.employee_reason,
              'manager_reason', b.manager_reason,
              'check', CASE 
                        WHEN b.used_quantity <> COALESCE(t.actual_quantity, b.actual_quantity) THEN true 
                        ELSE false 
                       END
            )
            ORDER BY b.matin
          ) AS details
        FROM materials m
        JOIN materialrequests r ON m.material_id = r.material_id
        LEFT JOIN material_usage b ON m.material_id = b.material_id AND b.upload_id = $1
        LEFT JOIN material_temporary t ON t.material_usage_id = b.id
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

const getRemainingDetails = async (req, res) => {
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
              'counted_quantity', COALESCE(t.counted_quantity, b.counted_quantity), -- ใช้ค่าจาก material_temporary ถ้ามี
              'manager_reason_remaining', b.manager_reason_remaining,
              'check', CASE 
                      WHEN b.counted_quantity IS NOT NULL AND b.counted_quantity != b.remaining_quantity THEN true
                      ELSE false
                   END
            )
            ORDER BY b.matin
          ) AS details
        FROM materials m
        JOIN materialrequests r ON m.material_id = r.material_id
        LEFT JOIN material_usage b ON m.material_id = b.material_id AND b.upload_id = $1
        LEFT JOIN material_temporary t ON t.material_usage_id = b.id
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

const getTotalRequested = async (req, res) => {
    try {
        const { upload_id } = req.params;
        const query = `
            SELECT SUM(r.quantity) AS total_requested_quantity
            FROM materialrequests r
            WHERE r.upload_id = $1;
        `;
        const { rows } = await pool1.query(query, [upload_id]);
        const totalRequested = rows[0]?.total_requested_quantity || 0;
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
    const { tempData } = req.body;
  
    // ตรวจสอบว่า tempData มีข้อมูลหรือไม่
    if (!tempData || tempData.length === 0) {
      return res.status(400).json({ message: "ไม่มีข้อมูลสำหรับการบันทึก" });
    }
  
    const client = await pool1.connect();
  
    try {
      // เริ่มต้น transaction
      await client.query("BEGIN");
  
      // วน loop ผ่าน tempData เพื่ออัปเดต manager_reason ใน material_usage
      for (const record of tempData) {
        const { id, manager_reason } = record;
  
        // ตรวจสอบความสมบูรณ์ของข้อมูล
        if (!id || !manager_reason) {
          throw new Error("ข้อมูลไม่สมบูรณ์");
        }
  
        // อัปเดตข้อมูลใน material_usage
        await client.query(
          `UPDATE material_usage SET manager_reason = $1 WHERE id = $2`,
          [manager_reason, id]
        );
      }
  
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
    const { upload_id } = req.params;
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

const updateStatusNotifications = async (req, res) => {
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



module.exports = {
    getMaterialUsageData,
    getTotalRequested,
    approveUpload,
    confirmEdit,
    updateStatusNotifications,
    getRemainingDetails
};