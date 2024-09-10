const pool = require('../config/db');
const { revertCalculations, recalculateFIFO } = require('../services/recalculation');

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


const getDashboardData = async (req, res) => {
    try {
        // ปรับ query ให้ตรงกับ column ที่มีในฐานข้อมูล
        const result = await pool.query('SELECT upload_id, material_type, approved_date AS date, current_status AS status, inventory_id FROM uploads');
        res.json(result.rows);
    } catch (err) {
        console.error('Error fetching dashboard data:', err);
        res.status(500).send('Error fetching dashboard data');
    }
};


// ฟังก์ชันสำหรับดึงรายละเอียดของงาน
const getDetails = async (req, res) => {
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
        
    
        const { rows } = await pool.query(query, [upload_id]);
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
        const { rows } = await pool.query(query, [upload_id]);
        const totalRequested = rows[0]?.total_requested_quantity || 0;
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
        await pool.query('BEGIN');

        // 1. คืนค่าการคำนวณทั้งหมดสำหรับ upload_id ที่ถูกอัปโหลดตั้งแต่รายการที่ถูกกดลบ
        const subsequentUploads = await pool.query('SELECT upload_id FROM uploads WHERE upload_id >= $1 ORDER BY upload_id ASC', [upload_id]);
        const subsequentUploadIds = Array.isArray(subsequentUploads.rows) ? subsequentUploads.rows.map(row => row.upload_id) : [];

        console.log('Subsequent Upload IDs:', subsequentUploadIds); // เพิ่มการพิมพ์ข้อมูลเพื่อดีบัก

        // Revert calculations for subsequent uploads
        for (let subsequentUploadId of subsequentUploadIds) {
            await revertCalculations(subsequentUploadId);
        }

        // 2. ลบข้อมูลที่เกี่ยวข้องกับ upload_id ที่ถูกเลือก
        // ลบข้อมูลในตาราง materialrequests
        await pool.query('DELETE FROM materialrequests WHERE upload_id = $1', [upload_id]);
        // ลบข้อมูลในตาราง material_usage
        await pool.query('DELETE FROM material_usage WHERE upload_id = $1', [upload_id]);
        // ลบข้อมูลในตาราง check_cutting
        await pool.query('DELETE FROM check_cutting WHERE upload_id = $1', [upload_id]);
        // ลบข้อมูลที่อ้างอิงในตาราง operationstatuses ก่อน
        await pool.query('DELETE FROM operationstatuses WHERE upload_id = $1', [upload_id]);
        // ลบข้อมูลในตาราง uploads
        await pool.query('DELETE FROM uploads WHERE upload_id = $1', [upload_id]);

        // 3. ลบข้อมูลในตาราง material_usage และ check_cutting ของ upload_id ที่ถูกอัปโหลดหลังจาก upload_id ที่ถูกลบ
        await pool.query('DELETE FROM material_usage WHERE upload_id IN (SELECT upload_id FROM uploads WHERE upload_id > $1)', [upload_id]);
        await pool.query('DELETE FROM check_cutting WHERE upload_id IN (SELECT upload_id FROM uploads WHERE upload_id > $1)', [upload_id]);

         // 4. คำนวณ FIFO ใหม่สำหรับ upload_id ที่เหลือ
         if (Array.isArray(subsequentUploadIds) && subsequentUploadIds.length > 0) {
            // กรองออก upload_id ที่ถูกลบ
            const filteredUploadIds = subsequentUploadIds.filter(id => id !== parseInt(upload_id, 10));
            if (filteredUploadIds.length > 0) {
                await recalculateFIFO(filteredUploadIds);
            } else {
                console.warn('No subsequent upload IDs to recalculate FIFO for');
            }
        }

        // บันทึกการกระทำของผู้ใช้
        await logUserAction(userId, 'ลบรายการ', upload_id);

        await pool.query('COMMIT');
        res.status(200).send('Upload deleted successfully');
    } catch (err) {
        await pool.query('ROLLBACK');
        console.error('Error deleting upload:', err);
        res.status(500).send('Error deleting upload');
    }
};

const confirmUpload = async (req, res) => {
    const { upload_id } = req.params;
    const { userId } = req.user;

    try {
        const client = await pool.connect();
        await client.query('BEGIN');
        
        // อัปเดตสถานะในตาราง uploads
        await client.query('UPDATE uploads SET current_status = $1 WHERE upload_id = $2', ['กำลังดำเนินการ', upload_id]);
        
        // บันทึกการเปลี่ยนแปลงสถานะในตาราง operationstatuses
        await client.query('INSERT INTO operationstatuses (upload_id, status, timestamp) VALUES ($1, $2, NOW())', [upload_id, 'กำลังดำเนินการ']);
        
        // บันทึกการกระทำของผู้ใช้
        await logUserAction(userId, 'ยืนยันรายการ', upload_id);

        await client.query('COMMIT');
        client.release();
        
        res.send('Upload confirmed and status updated');
    } catch (err) {
        console.error('Error confirming upload:', err);
        res.status(500).send('Error confirming upload');
    }
};

const approveUpload = async (req, res) => {
    const { uploadId } = req.params;
    const { userId } = req.user;

    try {
        // ตรวจสอบการมีอยู่ของรายการ
        const upload = await pool.query('SELECT * FROM uploads WHERE upload_id = $1', [uploadId]);
        if (upload.rows.length === 0) {
            return res.status(404).json({ message: 'ไม่พบรายการที่ต้องการอนุมัติ' });
        }

        // อัปเดตสถานะเป็น 'ดำเนินการเรียบร้อย'
        await pool.query('UPDATE uploads SET current_status = $1 WHERE upload_id = $2', ['ดำเนินการเรียบร้อย', uploadId]);

        // บันทึกการเปลี่ยนแปลงสถานะในตาราง operationstatuses
        await pool.query('INSERT INTO operationstatuses (upload_id, status, timestamp) VALUES ($1, $2, NOW())', [uploadId, 'ดำเนินการเรียบร้อย']);
        
        // บันทึกการกระทำของผู้ใช้
        await logUserAction(userId, 'อนุมัติรายการ', uploadId);

        res.status(200).json({ message: 'อนุมัติรายการสำเร็จ' });
    } catch (error) {
        console.error('Error updating status:', error);
        res.status(500).json({ message: 'เกิดข้อผิดพลาดในการอนุมัติรายการ' });
    }
};

const getMaterialUsageData = async (req, res) => {
    const { upload_id } = req.params;

    try {
        // ดึงข้อมูลจากตาราง material_usage และ materials
        const result = await pool.query(
            `SELECT 
                mu.id,
                mu.material_id, 
                m.matunit, 
                m.mat_name, 
                mu.quantity,
                mu.remaining_quantity,  
                mu.counted_quantity, 
                mu.reason
            FROM 
                material_usage mu
            JOIN 
                materials m 
            ON 
                mu.material_id = m.material_id 
            WHERE 
                mu.upload_id = $1`,
            [upload_id]
        );

        res.json(result.rows);
    } catch (err) {
        console.error('Error fetching material usage data:', err);
        res.status(500).send('Error fetching material usage data');
    }
};

const updateDetails = async (req, res) => {
    const { upload_id } = req.params;
    const { id, reason } = req.body;
  
    if (!upload_id || !id || !reason) {
      return res.status(400).send('Invalid input data');
    }
  
    try {
      // อัปเดตเหตุผลในฐานข้อมูล
      await pool.query(
        'UPDATE material_usage SET reason = $1 WHERE id = $2 AND upload_id = $3',
        [reason, id, upload_id]
      );
  
      res.send('Update successful');
    } catch (err) {
      console.error('Error updating details:', err);
      res.status(500).send('Error updating details');
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
        await pool.query(
            'UPDATE uploads SET inventory_id = $1 WHERE upload_id = $2',
            [inventory_id, upload_id]
        );

      res.status(200).json({ message: 'Inventory IDs updated successfully' });
    } catch (error) {
      console.error('Error updating Inventory IDs:', error);
      res.status(500).json({ message: 'Failed to update Inventory IDs' });
    }
};

module.exports = {
    getDashboardData,
    getDetails,
    deleteUpload,
    confirmUpload,
    approveUpload,
    getMaterialUsageData,
    updateDetails,
    getTotalRequested,
    getSaveInventory 
};