const { pool1 } = require('../config/db');
const { revertCalculations, recalculateFIFO } = require('../services/recalculation');
const { logUserAction } = require('../controllers1/loginController1');
const { getMaterial,insertmaterialrequests } = require('../controllers1/requestsController');
const { updateDurationAndAverage } = require('../controllers1/supClerkDashController');

const getDashboardData = async (req, res) => {
    try {
        const result = await pool1.query(
          'SELECT upload_id, material_type, approved_date AS date, current_status AS status, last_status_update, inventory_id FROM uploads'
      );
      res.json(result.rows);
    } catch (err) {
        console.error('Error fetching dashboard data:', err);
        res.status(500).send('Error fetching dashboard data');
    }
};

// ฟังก์ชันสำหรับดึงข้อมูล
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
      console.log("Query Result:",formattedResult);
      res.json(result.rows);  // ส่งคืนผลลัพธ์ทั้งหมดในรูปแบบ JSON
    } catch (error) {
      console.error('Error executing query', error);
      res.status(500).json({ error: 'Error fetching material details' });
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
                'remaining_quantity', b.remaining_quantity,
                'reason', b.reason
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

      res.status(200).json({ message: 'Inventory IDs updated successfully' });
    } catch (error) {
      console.error('Error updating Inventory IDs:', error);
      res.status(500).json({ message: 'Failed to update Inventory IDs' });
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
    getMaterialDetails,
    getUpdateInventory,
    deleteUpload
};