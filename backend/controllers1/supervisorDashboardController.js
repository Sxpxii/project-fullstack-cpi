const pool = require('../config/db'); // สมมติว่าคุณใช้ PostgreSQL และใช้ pool จาก pg library

const getDailyOverview = async (req, res) => {
    try {
        const { date } = req.query;
    
        const result = await pool.query(`
          SELECT 
            COUNT(*) AS total,
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

// ฟังก์ชันสำหรับดึงข้อมูลภาพรวมรายวัน
const getInventoryStock = async (req, res) => {
    const { materialType } = req.query; // รับประเภทวัตถุดิบจาก query params
    const today = new Date().toISOString().split('T')[0]; // วันที่ปัจจุบันในรูปแบบ YYYY-MM-DD

    try {
      const result = await pool.query(`
        WITH Requests AS (
            SELECT 
                u.upload_date::date AS date,
                u.material_type,
                m.material_id,
                m.mat_name,
                SUM(mr.quantity) AS total_requested
            FROM 
                uploads u
            JOIN 
                materialrequests mr ON u.upload_id = mr.upload_id
            JOIN 
                materials m ON mr.material_id = m.material_id
            WHERE
                u.upload_date::date = $1
                ${materialType ? 'AND u.material_type = $2' : ''}
            GROUP BY 
                u.upload_date::date,
                u.material_type,
                m.material_id,
                m.mat_name
        ),
        Balances AS (
            SELECT 
                 material_id,
                SUM(remaining_quantity) AS total_remaining
            FROM 
                materialbalances
            GROUP BY 
                material_id
        )
        SELECT 
            r.date,
            r.material_type,
            r.material_id,
            r.mat_name,
            r.total_requested,
            COALESCE(b.total_remaining, 0) AS total_remaining
        FROM 
            Requests r
        LEFT JOIN 
            Balances b ON r.material_id = b.material_id
        ORDER BY 
            r.date DESC,
            r.material_type,
            r.material_id;
        `, [today, materialType].filter(Boolean)
        );

        // Console.log ข้อมูลที่ดึงออกมา
      //console.log("Inventory Stock Data:", result.rows);
  
      res.json(result.rows);
    } catch (err) {
      console.error('Error fetching data:', err.message);
      res.status(500).send('Server error');
    }
  };
  
  // ฟังก์ชันสำหรับดึงข้อมูลปัญหา
  const getDailyIssues = async (req, res) => {
    const { date } = req.query; // รับวันที่จาก query params
    try {
      const result = await pool.query(`
        SELECT
          mu.reason,
          COUNT(*) AS issue_count
        FROM
          material_usage mu
        JOIN
          uploads u ON mu.upload_id = u.upload_id
        WHERE
          DATE(u.approved_date) = $1
        GROUP BY
          mu.reason
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

  // ฟังก์ชันสำหรับดึงข้อมูลรายละเอียดผู้รับผิดชอบงาน
  const getDailyUploadDetails = async (req, res) => {
    try {
        const { date } = req.query;
  
        if (!date) {
            return res.status(400).send("Date parameter is required");
        }

        const query = `
            SELECT 
                u.upload_id,
                u.material_type,
                u.inventory_id,
                u.user_id,
                u.assigned_to,
                us_assigned.username AS assigned_username,
                us_user.username AS user_username,
                SUM(mr.quantity) AS total_requested,
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
            WHERE 
                DATE(u.approved_date) = $1
            GROUP BY 
                u.upload_id, 
                u.material_type,
                u.inventory_id,
                u.user_id, 
                u.assigned_to, 
                us_assigned.username,
                us_user.username
        `;

        const results = await pool.query(query, [date]);

        const detailedResults = results.rows.map(row => {
          if (row.start_time && row.end_time) {
              const durationInSeconds = (new Date(row.end_time) - new Date(row.start_time)) / 1000;
              const hours = Math.floor(durationInSeconds / 3600);
              const minutes = Math.floor((durationInSeconds % 3600) / 60);
              
              let duration;
              if (hours > 0) {
                  duration = `${hours} ชั่วโมง ${minutes} นาที`;
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

        console.log("Detailed Results:", detailedResults);

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

      const result = await pool.query(`
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

module.exports = {
    getDailyOverview,
    getInventoryStock,
    getDailyIssues,
    getDailyUploadDetails,
    getUserInfo
};

