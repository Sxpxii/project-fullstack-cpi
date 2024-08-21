const pool = require('../config/db');

const logUserAction = async (userId, action) => {
    try {
        await pool.query('INSERT INTO useractions (user_id, action_type) VALUES ($1, $2)', [userId, action]);
    } catch (err) {
        console.error('Error logging user action:', err);
    }
};


const getDashboardData = async (req, res) => {
    try {
        // ปรับ query ให้ตรงกับ column ที่มีในฐานข้อมูล
        const result = await pool.query('SELECT upload_id, material_type, upload_date AS date, current_status AS status FROM uploads');
        res.json(result.rows);
    } catch (err) {
        console.error('Error fetching dashboard data:', err);
        res.status(500).send('Error fetching dashboard data');
    }
};


// ฟังก์ชันสำหรับดึงรายละเอียดของงาน
const getDetails = async (req, res) => {
    const { upload_id } = req.params;

    try {
        const materialUsageResult = await pool.query(
            'SELECT lot, location, quantity, remaining_quantity, counted_quantity, material_id FROM material_usage WHERE upload_id = $1',
            [upload_id]
        );

        if (materialUsageResult.rows.length === 0) {
            return res.status(404).send('No material usage found for the given upload_id');
        }

        const materialIds = materialUsageResult.rows.map(row => row.material_id);
        const materialResults = await pool.query(
            'SELECT material_id, mat_name, matunit FROM materials WHERE material_id = ANY($1::int[])',
            [materialIds]
        );

        const materialMap = new Map();
        materialResults.rows.forEach(row => {
            materialMap.set(row.material_id, { mat_name: row.mat_name, matunit: row.matunit });
        });

        const taskStatusResult = await pool.query(
            'SELECT current_status FROM uploads WHERE upload_id = $1',
            [upload_id]
        );

        const detailsData = materialUsageResult.rows.map(row => ({
            ...row,
            ...materialMap.get(row.material_id) 
        }));

        res.json({ balances: detailsData, status: taskStatusResult.rows[0].current_status });
    } catch (err) {
        console.error('Error fetching task details:', err);
        res.status(500).send('Error fetching task details');
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
        await client.query('UPDATE uploads SET current_status = $1, approved_date = NOW() WHERE upload_id = $2', ['กำลังดำเนินการ', upload_id]);
        
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
  



module.exports = {
    getDashboardData,
    getDetails,
    deleteUpload,
    confirmUpload,
    approveUpload,
    getMaterialUsageData,
    updateDetails
};
