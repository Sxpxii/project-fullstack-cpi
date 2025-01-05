// controllers/supClerkDashController.js
const { pool1 } = require('../config/db');
const { logUserAction } = require('../controllers1/loginController1');

const getSupClerkDashboardData = async (req, res) => {
    try {
        // ปรับ query ให้ตรงกับ column ที่มีในฐานข้อมูล
        const result = await pool1.query('SELECT upload_id, material_type, approved_date AS date, current_status AS status, inventory_id FROM uploads');
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
        mr.quantity
      FROM 
        materialrequests mr
      JOIN 
        materials m 
      ON 
        mr.material_id = m.material_id
      WHERE mr.upload_id = $1;  
    `;
  
    try {
      const result = await pool1.query(query, [upload_id]);  // ส่ง upload_id เป็น parameter ให้กับ query
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
        //console.log(JSON.stringify(rows, null, 2));
        res.json(rows);
      } catch (err) {
        console.error("Error fetching task details", err);
        res.status(500).json({ error: "Failed to fetch task details" });
      }
  };

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
    } catch (err) {
        console.error('Error fetching material usage data:', err);
        res.status(500).send('Error fetching material usage data');
    }
};


const getDailyOverview = async (req, res) => {
  try {
      const { date } = req.query;
  
      const result = await pool1.query(`
        SELECT 
          COUNT(*) AS total,
          COUNT(CASE WHEN current_status = 'รอรับงาน' THEN 1 END) AS padding,
          COUNT(CASE WHEN current_status = 'กำลังดำเนินการ' THEN 1 END) AS in_progress,
          COUNT(CASE WHEN current_status = 'รอตรวจสอบ' THEN 1 END) AS pending_review,
          COUNT(CASE WHEN current_status = 'ดำเนินการเรียบร้อย' THEN 1 END) AS completed
        FROM uploads
        WHERE DATE(approved_date) = $1
      `, [date]);

      // Console.log ข้อมูลที่ดึงออกมา
      //console.log("Daily Overview Data:", result.rows[0]);
  
      res.json(result.rows[0]);
    } catch (err) {
      console.error('Error fetching daily overview:', err.message);
      res.status(500).send('Server error');
    }
  };

// ฟังก์ชันสำหรับดึงข้อมูลปัญหา
const getDailyIssues = async (req, res) => {
  const { date } = req.query; // รับวันที่จาก query params
  try {
    const result = await pool1.query(`
      SELECT
        mu.manager_reason,
        COUNT(*) AS issue_count
      FROM
        material_usage mu
      JOIN
        uploads u ON mu.upload_id = u.upload_id
      WHERE
        DATE(u.approved_date) = $1
      GROUP BY
        mu.manager_reason
      ORDER BY
        issue_count DESC
    `, [date]);

    // Console.log ข้อมูลที่ดึงออกมา
    //console.log("Daily Issues:", result.rows);

    res.json(result.rows);
  } catch (err) {
    console.error('Error fetching daily issues:', err.message);
    res.status(500).send('Server error');
  }
};

const getDailyUploadDetails = async (req, res) => {
  try {
      const query = `
          SELECT 
              u.upload_id,
              u.material_type,
              u.inventory_id,
              TO_CHAR(u.approved_date, 'DD/MM/YYYY') AS approved_date,
              u.user_id,
              u.assigned_to,
              u.current_status,
              u.total_quantity,
              us_assigned.username AS assigned_username,
              us_user.username AS user_username,
              MIN(CASE WHEN os.status = 'กำลังดำเนินการ' THEN os.timestamp END) AS start_time,
              MAX(CASE WHEN os.status = 'ดำเนินการเรียบร้อย' THEN os.timestamp END) AS end_time
          FROM 
              uploads u
          JOIN 
              operationstatuses os ON u.upload_id = os.upload_id
          LEFT JOIN 
              users1 us_assigned ON u.assigned_to = us_assigned.user_id
          LEFT JOIN 
              users1 us_user ON u.user_id = us_user.user_id
          LEFT JOIN 
              materialrequests mr ON u.upload_id = mr.upload_id 
          GROUP BY 
              u.upload_id, 
              u.material_type,
              u.inventory_id,
              u.approved_date,
              u.user_id, 
              u.assigned_to, 
              u.current_status,
              us_assigned.username,
              us_user.username
      `;

      const results = await pool1.query(query);

      const detailedResults = results.rows.map(row => {
        if (row.start_time && row.end_time) {
            const durationInSeconds = (new Date(row.end_time) - new Date(row.start_time)) / 1000;
            const hours = Math.floor(durationInSeconds / 3600);
            const minutes = Math.floor((durationInSeconds % 3600) / 60);
            
            let duration;
            if (hours > 0) {
                duration = `${hours} ชม. ${minutes} นาที`;
            } else {
                duration = `${minutes} นาที`;
            }
            
            return { 
                ...row, 
                duration 
            };
        } else {
            return { 
                ...row, 
                duration: "N/A" 
            };
        }
    });

      //console.log("Detailed Results:", detailedResults);

      res.json(detailedResults);
  } catch (err) {
      console.error(err.message);
      res.status(500).send("Server Error");
  }
};


// ฟังก์ชันสำหรับดึงข้อมูลผู้ใช้
const getUserInfo = async (req, res) => {
try {
    // ตรวจสอบว่า req.user.userId มีค่าอยู่หรือไม่
    const userId = req.user ? req.user.userId : null;
    if (!userId) {
        return res.status(400).json({ error: 'User ID not found' });
    }

    const result = await pool1.query(`
        SELECT username, role FROM user1 WHERE user_id = $1
    `, [userId]);

    if (result.rows.length === 0) {
        return res.status(404).json({ error: 'User not found' });
    }

    res.json(result.rows[0]);
} catch (err) {
    console.error('Error fetching user info:', err.message);
    res.status(500).send('Server error');
}
};

const updateDurationAndAverage = async (upload_id, status) => {
  const client = await pool1.connect();
  try {
      await client.query('BEGIN');

      // ดึงข้อมูล timestamp และสถานะก่อนหน้า
      const lastStatusResult = await client.query(
        'SELECT timestamp, status, duration FROM operationstatuses WHERE upload_id = $1 ORDER BY timestamp DESC LIMIT 1',
        [upload_id]
      );

      // ตรวจสอบค่าที่ได้จากการดึงข้อมูล
      console.log('lastStatusResult:', lastStatusResult.rows);

      const lastStatus = lastStatusResult.rows[0]?.status;
      const lastTimestamp = lastStatusResult.rows[0]?.timestamp;
      const lastDuration = lastStatusResult.rows[0]?.duration || 0;
      const currentTimestamp = new Date();

      // ตรวจสอบค่าก่อนคำนวณ
      //console.log('lastStatus:', lastStatus);
      //console.log('lastTimestamp:', lastTimestamp);
      //console.log('lastDuration:', lastDuration);
      //console.log('currentTimestamp:', currentTimestamp);

      // คำนวณ duration ในหน่วยมิลลิวินาที
      const durationInMilliseconds = lastTimestamp ? (currentTimestamp - new Date(lastTimestamp)) : null;
      
      // ตรวจสอบค่าที่คำนวณ
      //console.log('calculated duration (in milliseconds):', durationInMilliseconds);

      // แปลง duration ให้เป็นวินาที (และตรวจสอบค่าที่แปลง)
      const durationInSeconds = durationInMilliseconds / 1000;
      console.log('calculated duration (in seconds):', durationInSeconds);

      // อัปเดต duration ของสถานะก่อนหน้า (เก็บเป็นวินาที)
      if (lastStatus) {
        const newDuration = lastDuration + (durationInSeconds || 0); // รวมเวลาเดิมกับเวลาที่คำนวณได้
        // ตรวจสอบค่าที่จะอัปเดต
        //console.log('newDuration to update:', newDuration);

        //console.log('Updating duration with:', newDuration, upload_id, lastStatus);
        await client.query(
            'UPDATE operationstatuses SET duration = $1 WHERE upload_id = $2 AND status = $3 ',
            [newDuration, upload_id, lastStatus]
        );
      }

      // คำนวณ average_duration สำหรับสถานะก่อนหน้า
      if (lastStatus) {
        const averageDurationResult = await client.query(
            'SELECT AVG(duration) as avg_duration FROM operationstatuses WHERE status = $1',
            [lastStatus]
        );
        // ตรวจสอบผลลัพธ์จากการคำนวณค่าเฉลี่ย
        //console.log('averageDurationResult:', averageDurationResult.rows);

        const averageDuration = averageDurationResult.rows[0]?.avg_duration || 0;

        // ตรวจสอบค่าที่จะอัปเดตค่าเฉลี่ย
        //console.log('averageDuration to update:', averageDuration);

        // อัปเดตค่าเฉลี่ยในตาราง
        await client.query(
            'UPDATE operationstatuses SET average_duration = $1 WHERE status = $2',
            [averageDuration, lastStatus]
        );
      }

      await client.query('COMMIT');
      console.log('Transaction committed successfully');
  } catch (err) {
      await client.query('ROLLBACK');
      console.error('Error updating duration and average duration:', err);
  } finally {
      client.release();
      console.log('Database connection released');
  }
};

// ฟังก์ชันดึงข้อมูลเวลาเฉลี่ยของแต่ละสถานะ
const getAverageTimes = async (req, res) => {
  const client = await pool1.connect();
  try {
    const result = await client.query(`
      SELECT status, MAX(average_duration) AS avg_duration_seconds
      FROM operationstatuses
      WHERE average_duration IS NOT NULL
      GROUP BY status
      ORDER BY
        CASE 
          WHEN status = 'รอยืนยัน' THEN 1
          WHEN status = 'รอรับงาน' THEN 2
          WHEN status = 'กำลังดำเนินการ' THEN 3
          ELSE 4  -- ใช้ค่าอื่นๆ ถ้าสถานะไม่ตรงตามที่กำหนด
        END
    `);
    //console.log('AverageTimes',result.rows);
    res.status(200).json(result.rows);
  } catch (err) {
    console.error('Error fetching average durations:', err);
    res.status(500).json({ message: 'Failed to fetch average durations' });
  } finally {
    client.release();
  }
};


module.exports = {
    getSupClerkDashboardData,
    getDetails,
    approveUpload,
    getMaterialUsageData,
    getMaterialDetails,
    getDailyOverview,
    getDailyIssues,
    getDailyUploadDetails,
    getUserInfo,
    updateDurationAndAverage,
    getAverageTimes
};