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

/*// ฟังก์ชันสำหรับลบข้อมูลทั้งหมดของ upload_id นั้น
const deleteUpload = async (req, res) => {
    const { upload_id } = req.params;
    const { userId } = req.user;

    if (!upload_id) {
        return res.status(400).json({ error: 'Invalid upload_id' });
    }

    try {
        await pool1.query('BEGIN');

        // 1. คืนค่าการคำนวณทั้งหมดสำหรับ upload_id ที่ถูกอัปโหลดตั้งแต่รายการที่ถูกกดลบ
        const subsequentUploads = await pool1.query('SELECT upload_id FROM uploads WHERE upload_id >= $1 ORDER BY upload_id ASC', [upload_id]);
        const subsequentUploadIds = Array.isArray(subsequentUploads.rows) ? subsequentUploads.rows.map(row => row.upload_id) : [];

        console.log('Subsequent Upload IDs:', subsequentUploadIds); // เพิ่มการพิมพ์ข้อมูลเพื่อดีบัก

        // Revert calculations for subsequent uploads
        for (let subsequentUploadId of subsequentUploadIds) {
            await revertCalculations(subsequentUploadId);
        }

        // 2. ลบข้อมูลที่เกี่ยวข้องกับ upload_id ที่ถูกเลือก
        // ลบข้อมูลในตาราง materialrequests
        await pool1.query('DELETE FROM materialrequests WHERE upload_id = $1', [upload_id]);
        // ลบข้อมูลในตาราง material_usage
        await pool1.query('DELETE FROM material_usage WHERE upload_id = $1', [upload_id]);
        // ลบข้อมูลในตาราง check_cutting
        await pool1.query('DELETE FROM check_cutting WHERE upload_id = $1', [upload_id]);
        // ลบข้อมูลที่อ้างอิงในตาราง operationstatuses ก่อน
        await pool1.query('DELETE FROM operationstatuses WHERE upload_id = $1', [upload_id]);
        // ลบข้อมูลในตาราง uploads
        await pool1.query('DELETE FROM uploads WHERE upload_id = $1', [upload_id]);

        // 3. ลบข้อมูลในตาราง material_usage และ check_cutting ของ upload_id ที่ถูกอัปโหลดหลังจาก upload_id ที่ถูกลบ
        await pool1.query('DELETE FROM material_usage WHERE upload_id IN (SELECT upload_id FROM uploads WHERE upload_id > $1)', [upload_id]);
        await pool1.query('DELETE FROM check_cutting WHERE upload_id IN (SELECT upload_id FROM uploads WHERE upload_id > $1)', [upload_id]);

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

        await pool1.query('COMMIT');
        res.status(200).send('Upload deleted successfully');
    } catch (err) {
        await pool1.query('ROLLBACK');
        console.error('Error deleting upload:', err);
        res.status(500).send('Error deleting upload');
    }
};*/

const updateMaterialRequests = async (req, res) => {
    const { upload_id, actions } = req.body;
    const { userId } = req.user;
  
    try {
      await pool1.query('BEGIN');
      // 1. อัปเดตคอลัมน์ isEditing ในตาราง uploads
      await pool1.query(
        'UPDATE uploads SET is_editing = TRUE WHERE upload_id = $1',
        [upload_id]
      );

      console.log(`Set is_editing to TRUE for upload_id: ${upload_id}`);
  
      // 2. คืนค่าการคำนวณทั้งหมดสำหรับ upload_id ที่ถูกอัปโหลดตั้งแต่รายการที่ถูกกดแก้ไข
      const subsequentUploads = await pool1.query(
        'SELECT upload_id FROM uploads WHERE upload_id >= $1 ORDER BY upload_id ASC',
        [upload_id]
      );
      const subsequentUploadIds = Array.isArray(subsequentUploads.rows) ? subsequentUploads.rows.map(row => row.upload_id) : [];
  
      console.log('Subsequent Upload IDs:', subsequentUploadIds); // เพิ่มการพิมพ์ข้อมูลเพื่อดีบัก
  
      // Revert calculations for subsequent uploads
      for (let subsequentUploadId of subsequentUploadIds) {
        await revertCalculations(subsequentUploadId);
      }

      //3. ลบข้อมูลในตาราง material_usage
      await pool1.query('DELETE FROM material_usage WHERE upload_id = ANY($1::int[])',[subsequentUploadIds]);
      // ลบข้อมูลในตาราง check_cutting
      await pool1.query('DELETE FROM check_cutting WHERE upload_id = ANY($1::int[])',[subsequentUploadIds]);
  
      // 4. อัปเดต, เพิ่ม, และลบข้อมูลตาม actions
      for (const action of actions) {
        switch (action.action_type) {
          case "update":
            await updateRequest(action.request_id, action.quantity, action.original_quantity);
            break;
          case "delete":
            await deleteRequest(action.request_id);
            break;
          case "add":
            await addRequest(action.data, upload_id);
            break;
          default:
            break;
        }
      }
  
      // 5. คำนวณ FIFO ใหม่สำหรับ upload_id ที่ถูกแก้ไขและ upload_id ที่อยู่ถัดไปทั้งหมด
      await recalculateFIFO(subsequentUploadIds);

      // 6.บันทึกการกระทำของผู้ใช้
      await logUserAction(userId, 'แก้ไขรายการสั่งเบิก', upload_id);
  
      await pool1.query('COMMIT'); // คอมมิทการเปลี่ยนแปลง
      res.status(200).json({ message: "Updated successfully." });
    } catch (error) {
      await pool1.query('ROLLBACK'); // ยกเลิกการเปลี่ยนแปลงถ้ามีข้อผิดพลาด
      console.error(error);
      res.status(500).json({ message: "Error processing the request." });
    }
  };

  // ฟังก์ชันตัวอย่างสำหรับ updateRequest
const updateRequest = async (request_id, quantity, original_quantity) => {
  try {
    await pool1.query(
      'UPDATE materialrequests SET quantity = $1, original_quantity = $2, action_type = $3 WHERE request_id = $4',
      [quantity, original_quantity, 'update', request_id]
    );
  } catch (error) {
    console.error(`Error updating request ID: ${request_id}`, error);
    throw error;
  }
};

const deleteRequest = async (request_id) => {
  try {
    // ลบข้อมูลจากตาราง material_requests โดยอ้างอิงจาก request_id
    await pool1.query(
      'DELETE FROM materialrequests  WHERE request_id = $1',
      [request_id]
    );
    console.log(`Successfully deleted request ID: ${request_id}`);
  } catch (error) {
    console.error(`Error deleting request ID: ${request_id}`, error);
    throw error;
  }
};

const addRequest = async (data, upload_id) => {
  try {
    // แปลงข้อมูล `insertions` เป็นอาร์เรย์ของการบันทึกข้อมูล
    const insertions = Array.isArray(data) ? data : [data]; // ถ้า `data` เป็นอาร์เรย์ ให้ใช้งานได้เลย แต่ถ้าไม่ใช่ ให้อยู่ในรูปแบบอาร์เรย์ก่อน

    // ใช้ `Promise.all` เพื่อรอการทำงานแบบขนานกันทุก `record`
    const promises = insertions.map(async (record) => {
      // ดึงข้อมูลวัตถุดิบจากฐานข้อมูลตาม matunit
      const material = await getMaterial(record.matunit);
      
      if (material) {
        // ถ้าเจอวัตถุดิบในฐานข้อมูล ให้บันทึกข้อมูลการสั่งเบิกวัตถุดิบ
        await pool1.query(
          `INSERT INTO materialrequests (material_id, upload_id, request_date, quantity, action_type)
           VALUES ($1, $2, $3, $4, $5)`,
          [material.material_id, upload_id, new Date(), record.quantity, "add"]
        );
        console.log(`Successfully added request for matunit: ${record.matunit}`);
      } else {
        // กรณีไม่พบวัตถุดิบ ให้พิมพ์คำเตือนในคอนโซล
        console.warn(`Material not found for matunit: ${record.matunit}`);
      }
    });

    // รอการทำงานของ `Promise.all` เพื่อให้การทำงานทั้งหมดเสร็จสมบูรณ์ก่อนดำเนินการต่อ
    await Promise.all(promises);

    await pool1.query(
      'INSERT INTO materialrequests (action_type) VALUES ($1)',
      [action_type]
    );
    
  } catch (error) {
    console.error('Error adding requests:', error);
    throw error;
  }
};


/*const confirmUpload = async (req, res) => {
    const { upload_id } = req.params;
    const { userId } = req.user;

    try {
        const client = await pool1.connect();
        await client.query('BEGIN');
        
        // อัปเดตสถานะในตาราง uploads
        await client.query('UPDATE uploads SET current_status = $1, last_status_update = NOW() WHERE upload_id = $2', ['รอรับงาน', upload_id]);
        
        // บันทึกการเปลี่ยนแปลงสถานะในตาราง operationstatuses
        await client.query('INSERT INTO operationstatuses (upload_id, status, timestamp) VALUES ($1, $2, NOW())', [upload_id, 'รอรับงาน']);
        
        // อัปเดต duration และ average_duration
        await updateDurationAndAverage(upload_id, 'รอยืนยัน');

        // บันทึกการกระทำของผู้ใช้
        await logUserAction(userId, 'ยืนยันรายการ', upload_id);

        await client.query('COMMIT');
        client.release();
        
        res.send('Upload confirmed and status updated');
    } catch (err) {
        console.error('Error confirming upload:', err);
        res.status(500).send('Error confirming upload');
    }
};*/

const approveUpload = async (req, res) => {
    const { uploadId } = req.params;
    const { userId } = req.user;

    try {
        // ตรวจสอบการมีอยู่ของรายการ
        const upload = await pool1.query('SELECT * FROM uploads WHERE upload_id = $1', [uploadId]);
        if (upload.rows.length === 0) {
            return res.status(404).json({ message: 'ไม่พบรายการที่ต้องการอนุมัติ' });
        }

        // อัปเดตสถานะเป็น 'ดำเนินการเรียบร้อย'
        await pool1.query('UPDATE uploads SET current_status = $1 WHERE upload_id = $2', ['ดำเนินการเรียบร้อย', uploadId]);

        // อัปเดต duration และ average_duration
        await updateDurationAndAverage(uploadId, 'รอตรวจสอบ');

        // บันทึกการเปลี่ยนแปลงสถานะในตาราง operationstatuses
        await pool1.query('INSERT INTO operationstatuses (upload_id, status, timestamp) VALUES ($1, $2, NOW())', [uploadId, 'ดำเนินการเรียบร้อย']);
        
        // บันทึกการกระทำของผู้ใช้
        await logUserAction(userId, 'อนุมัติรายการ_${upload_id}', uploadId);

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
        const result = await pool1.query(
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
        console.log("Result Rows:", result.rows);
    } catch (err) {
        console.error('Error fetching material usage data:', err);
        res.status(500).send('Error fetching material usage data');
    }
};

const updateDetails = async (req, res) => {
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

const updateApprovedDate = async (req, res) => {
  const { approvedDate } = req.body; // รับค่า approvedDate จาก request

  if (!approvedDate) {
    return res.status(400).json({ error: 'Approved Date is required' });
  }

  try {
    // อัปเดตข้อมูลในตาราง uploads
    const result = await db.query(
      'UPDATE uploads SET approved_date = $1 WHERE upload_id = $2 RETURNING *',
      [approvedDate, req.params.upload_id]
    );

    if (result.rowCount > 0) {
      return res.status(200).json({ message: 'Approved Date updated successfully' });
    } else {
      return res.status(404).json({ error: 'Upload ID not found' });
    }
  } catch (error) {
    console.error('Error updating Approved Date:', error);
    return res.status(500).json({ error: 'Failed to update Approved Date' });
  }
};


module.exports = {
    getDashboardData,
    getDetails,
    //confirmUpload,
    approveUpload,
    getMaterialUsageData,
    updateDetails,
    getTotalRequested,
    getSaveInventory,
    getMaterialDetails,
    updateMaterialRequests,
    getUpdateInventory,
    updateApprovedDate
    
};