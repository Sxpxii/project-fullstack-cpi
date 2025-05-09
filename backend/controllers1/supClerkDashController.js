// controllers/supClerkDashController.js
const { pool1 } = require('../config/db');
const { logUserAction } = require('../controllers1/loginController1');

//
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
  console.log("Received date from query:", date);
  try {
    // ตรวจสอบ upload_id ที่มี approved_date ตรงกับวันที่ปัจจุบัน
    const uploadIdsResult = await pool1.query(
      `SELECT upload_id, inventory_id FROM uploads WHERE DATE(approved_date) = $1`,
      [date]
    );
    console.log("Upload IDs and Inventory IDs result:", uploadIdsResult.rows);

    // สร้างอาร์เรย์ของ upload_id และ inventory_id
    const uploadsData = uploadIdsResult.rows;

    if (uploadsData.length === 0) {
      return res.json([]);
    }

    const uploadIds = uploadIdsResult.rows.map(row => row.upload_id);

    // ดึงข้อมูลจำนวน ID ของแต่ละ upload_id
    const result = await pool1.query(
      `
      SELECT
        mr.upload_id,
        u.inventory_id,
        COUNT(*) AS total_requests,
        SUM(CASE WHEN mr.manager_reason IS NOT NULL THEN 1 ELSE 0 END) AS manager_reason_count,
        SUM(CASE WHEN mr.manager_reason_remaining IS NOT NULL THEN 1 ELSE 0 END) AS manager_reason_remaining_count
      FROM
        mat_requests mr
      JOIN
        uploads u ON mr.upload_id = u.upload_id
      WHERE
        mr.upload_id = ANY($1)
      GROUP BY
        mr.upload_id, u.inventory_id
      ORDER BY
        mr.upload_id
      `,
      [uploadIds]
    );

    console.log("Query result for daily issues:", result.rows);
    res.json(result.rows);
  } catch (err) {
    console.error("Error fetching daily issues:", err.message);
    res.status(500).send("Server error");
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
              u.is_overdue,
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

      // คำนวณ duration ในหน่วยมิลลิวินาที
      const durationInMilliseconds = lastTimestamp ? (currentTimestamp - new Date(lastTimestamp)) : null;

      // แปลง duration ให้เป็นวินาที (และตรวจสอบค่าที่แปลง)
      const durationInSeconds = durationInMilliseconds / 1000;
      console.log('calculated duration (in seconds):', durationInSeconds);

      // อัปเดต duration ของสถานะก่อนหน้า (เก็บเป็นวินาที)
      if (lastStatus) {
        const newDuration = lastDuration + (durationInSeconds || 0); // รวมเวลาเดิมกับเวลาที่คำนวณได้

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

        const averageDuration = averageDurationResult.rows[0]?.avg_duration || 0;

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

//Analysis
// ฟังก์ชันดึงข้อมูลภาระงาน
const getWorkloadDetail = async (req, res) => {
  try {
    console.log("Received Query Params:", req.query);
    const { startDate, endDate } = req.query;
    console.log("Start Date:", startDate);
    console.log("End Date:", endDate);

    // SQL query ที่ใช้ JOIN กับตาราง user1 เพื่อดึงชื่อ user_id และ assigned_to
    let  query = `
      SELECT 
        u.upload_id,
        u.user_id,
        u.assigned_to,
        users1.username AS user_username,
        assigned_to_user.username AS assigned_to_username
      FROM uploads u
      LEFT JOIN users1 ON u.user_id = users1.user_id
      LEFT JOIN users1 AS assigned_to_user ON u.assigned_to = assigned_to_user.user_id
      
    `;
    
    let queryParams = [];
    if (startDate && endDate) {
        query += ` WHERE u.approved_date BETWEEN $1 AND $2 `;
        queryParams.push(startDate, endDate);
    }

    // GROUP BY ต้องไม่มี WHERE ข้างหน้า
    query += ` GROUP BY u.upload_id, u.user_id, u.assigned_to, users1.username, assigned_to_user.username, u.approved_date`;

    const result = await pool1.query(query, queryParams);

    // เปลี่ยน user_id และ assigned_to เป็นชื่อ
    const userIdCounts = result.rows.reduce((acc, row) => {
      if (row.user_username !== null) {
        acc[row.user_username] = (acc[row.user_username] || 0) + 1;
      }
      return acc;
    }, {});

    const assignedToCounts = result.rows.reduce((acc, row) => {
      if (row.assigned_to_username !== null) {
        acc[row.assigned_to_username] = (acc[row.assigned_to_username] || 0) + 1;
      }
      return acc;
    }, {});

    const totalUploads = result.rows.length;

    // แสดงผลลัพธ์การนับ
    /*console.log('Total Uploads:', totalUploads);
    console.log('Counts by user_id:', userIdCounts);
    console.log('Counts by assigned_to:', assignedToCounts);
    console.log('Workload Details:', result.rows);*/


    // คืนค่าผลลัพธ์ที่นับได้
    return res.json({
      totalUploads,
      userIdCounts,
      assignedToCounts,
      WorkloadDetails: result.rows,
    });
    
  } catch (err) {
    console.error('Error fetching upload details:', err);
    throw err;
  }
};

// ฟังก์ชันดึงข้อมูลภาระงาน(รายการย่อย)
const getWorkloadTask = async (req, res) => {
  try {
    const { startDate, endDate } = req.query;

    let query = `
        SELECT 
            u.upload_id,
            u.user_id,
            u.assigned_to,
            u1.username AS user_username,
            u2.username AS assigned_to_username,
            COUNT(mr.id) AS total_requests
        FROM uploads u
        LEFT JOIN mat_requests mr ON u.upload_id = mr.upload_id
        LEFT JOIN users1 u1 ON u.user_id = u1.user_id 
        LEFT JOIN users1 u2 ON u.assigned_to = u2.user_id 
        WHERE u.user_id IS NOT NULL 
        
    `;

    let queryParams = [];

    if (startDate && endDate) {
      query += ` AND  u.approved_date BETWEEN $1 AND $2 `;
      queryParams.push(startDate, endDate);
    }

    query += `
        GROUP BY u.upload_id, u.user_id, u.assigned_to, u1.username, u2.username, u.approved_date
        ORDER BY u.upload_id;
    `;

    const result = await pool1.query(query, queryParams);

     //แปลงข้อมูล `WorkloadDetails`
     const workloadDetails = result.rows;

      // คำนวณยอดรวมตาม assigned_to (เปลี่ยนเป็น object)
    const assignedTo = {};
    workloadDetails.forEach(({ assigned_to_username, total_requests }) => {
      if (assigned_to_username) { // ตรวจสอบค่า null หรือ undefined
        if (!assignedTo[assigned_to_username]) {
          assignedTo[assigned_to_username] = 0;
        }
        assignedTo[assigned_to_username] += parseInt(total_requests, 10);
      }
    });

    // คำนวณยอดรวมตาม user_id (เปลี่ยนเป็น object)
    const userId = {};
    workloadDetails.forEach(({ user_username, total_requests }) => {
      if (user_username) { // ตรวจสอบค่า null หรือ undefined
        if (!userId[user_username]) {
          userId[user_username] = 0;
        }
        userId[user_username] += parseInt(total_requests, 10);
      }
    });

    // คำนวณยอดรวมของ total_requests ทั้งหมด
    const grandTotalRequests = workloadDetails.reduce((sum, { total_requests }) => sum + parseInt(total_requests, 10), 0);

    // ส่งข้อมูลกลับไปยัง frontend
    res.json({
      WorkloadTask: workloadDetails,
      assignedTo: assignedTo,
      userId: userId,
      grandTotalRequests: grandTotalRequests
    });

  } catch (err) {
    console.error("Error fetching workload task counts:", err);
    res.status(500).json({ error: "Internal Server Error" });
  }
};

// ฟังก์ชันดึงข้อมูลภาระงาน(ยอดรวม)
const getWorkloadTaskItem = async (req, res) => {
  try {
    const { startDate, endDate } = req.query;

    let query = `
      SELECT 
          u.upload_id,
          u.user_id, 
          u.assigned_to, 
          u1.username AS user_username, 
          u2.username AS assigned_to_username, 
          u.total_quantity
      FROM uploads u
      LEFT JOIN users1 u1 ON u.user_id = u1.user_id 
      LEFT JOIN users1 u2 ON u.assigned_to = u2.user_id 
      WHERE u.user_id IS NOT NULL
      
  `;

  let queryParams = [];

    if (startDate && endDate) {
      query += ` AND  u.approved_date BETWEEN $1 AND $2 `;
      queryParams.push(startDate, endDate);
    }

    query += `
      GROUP BY u.upload_id, u.user_id, u.assigned_to, u1.username, u2.username, u.total_quantity, u.approved_date
      ORDER BY u.upload_id;
    `;

    const result = await pool1.query(query, queryParams);

    //แปลงข้อมูล `TaskItemData`
    const TaskItemData = result.rows;

    // คำนวณยอดรวมตาม assigned_to (เฉพาะ assigned_to_username)
    const assignedToTaskItem = {};
    TaskItemData.forEach(({ assigned_to_username, total_quantity }) => {
      if (assigned_to_username) {
        if (!assignedToTaskItem[assigned_to_username]) {
          assignedToTaskItem[assigned_to_username] = 0;
        }
        assignedToTaskItem[assigned_to_username] += parseInt(total_quantity, 10);
      }
    });

    // คำนวณยอดรวมตาม user_id (เฉพาะ user_username)
    const userIdTaskItem = {};
    TaskItemData.forEach(({ user_username, total_quantity }) => {
      if (user_username) {
        if (!userIdTaskItem[user_username]) {
          userIdTaskItem[user_username] = 0;
        }
        userIdTaskItem[user_username] += parseInt(total_quantity, 10);
      }
    });

    const TotalTaskItem = TaskItemData.reduce((sum, { total_quantity }) => sum + parseInt(total_quantity, 10), 0);

    console.log('user_id:', userIdTaskItem);
    console.log('assigned_to:', assignedToTaskItem);
    console.log('Workload Details:', TaskItemData);
    console.log('TotalTaskItem:', TotalTaskItem);

    //ส่งข้อมูลกลับไปยัง frontend
    res.json({
      TaskItemData: TaskItemData,
      assignedToTaskItem: assignedToTaskItem,
      userIdTaskItem: userIdTaskItem,
      TotalTaskItem: TotalTaskItem.toString()
    });

  } catch (err) {
    console.error("Error fetching workload task counts:", err);
    res.status(500).json({ error: "Internal Server Error" });
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
    console.log('AverageTimes',result.rows);
    res.status(200).json(result.rows);
  } catch (err) {
    console.error('Error fetching average durations:', err);
    res.status(500).json({ message: 'Failed to fetch average durations' });
  } finally {
    client.release();
  }
};

// ฟังก์ชันดึงข้อมูลเวลาเฉลี่ยของแต่ละสถานะ
const getAverageTimesByMaterials = async (req, res) => {
  try {
    console.log('Start fetching average times by materials and status...');
    
    // ขั้นตอนที่ 1: สร้าง CTE material_uploads
    const queryMaterialUploads = `
      SELECT 
        u.material_type,
        os.upload_id,
        os.status,
        os.duration
      FROM uploads u
      JOIN operationstatuses os
      ON u.upload_id = os.upload_id
      WHERE os.duration IS NOT NULL
    `;
    const materialUploadsResult = await pool1.query(queryMaterialUploads);
    //console.log('Step 1: material_uploads data:', materialUploadsResult.rows);

    // ขั้นตอนที่ 2: คำนวณค่าเฉลี่ย duration ต่อ material_type และ status
    const queryGroupedData = `
      WITH material_uploads AS (
        SELECT 
          u.material_type,
          os.upload_id,
          os.status,
          os.duration
        FROM uploads u
        JOIN operationstatuses os
        ON u.upload_id = os.upload_id
        WHERE os.duration IS NOT NULL
      )
      SELECT 
        material_type,
        status,
        AVG(duration) AS avg_duration_per_status
      FROM material_uploads
      GROUP BY material_type, status
    `;
    const groupedDataResult = await pool1.query(queryGroupedData);
    //console.log('Step 2: grouped_data with avg_duration_per_status:', groupedDataResult.rows);

    // ขั้นตอนที่ 3: เรียงลำดับข้อมูลขั้นสุดท้าย
    const finalQuery = `
      WITH material_uploads AS (
        SELECT 
          u.material_type,
          os.upload_id,
          os.status,
          os.duration
        FROM uploads u
        JOIN operationstatuses os
        ON u.upload_id = os.upload_id
        WHERE os.duration IS NOT NULL
      ),
      grouped_data AS (
        SELECT 
          material_type,
          status,
          AVG(duration) AS avg_duration_per_status
        FROM material_uploads
        GROUP BY material_type, status
      )
      SELECT 
        material_type,
        status,
        avg_duration_per_status AS avg_duration
      FROM grouped_data
      ORDER BY
        material_type,
        CASE 
          WHEN status = 'รอยืนยัน' THEN 1
          WHEN status = 'รอรับงาน' THEN 2
          WHEN status = 'กำลังดำเนินการ' THEN 3
          ELSE 4
        END;
    `;
    const finalResult = await pool1.query(finalQuery);
    //console.log('Step 3: Final result:', finalResult.rows);

    // ส่งผลลัพธ์กลับไปยัง client
    res.status(200).json(finalResult.rows);
  } catch (error) {
    console.error('Error fetching average times by material and status:', error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
};

// ฟังก์ชันสำหรับดึงรายละเอียดของงาน
const getDetailsSupClerk = async (req, res) => {
  try {
    const { upload_id } = req.params;

    if (!upload_id) {
      return res.status(400).json({ error: "upload_id is required" });
    }

    const query = `
      SELECT 
        u.inventory_id,
        m.id,
        m.mat_name,
        m.mat_unit,
        JSON_AGG(
          JSON_BUILD_OBJECT(
            'id', r.id,
            'mat_unit_id', r.mat_unit_id,
            'mat_lot', r.mat_lot,
            'loc', r.loc,
            'quantity', r.quantity,
            'actual_quantity', r.actual_quantity,
            'remaining_quantity', r.remaining_quantity,
            'counted_quantity', r.counted_quantity,
            'total_quantity', r.total_quantity,
            'employee_reason', r.employee_reason,
            'employee_reason_remaining', r.employee_reason_remaining,
            'manager_reason', r.manager_reason,
            'manager_reason_remaining', r.manager_reason_remaining,
            'selected_time', r.selected_time
          )
          ORDER BY r.id
        ) AS details
      FROM material_matunits m
      JOIN mat_requests r ON m.id = r.mat_unit_id
      JOIN uploads u ON r.upload_id = u.upload_id
      WHERE r.upload_id = $1
      GROUP BY u.inventory_id, m.id, m.mat_name, m.mat_unit
      ORDER BY m.id;
    `;

    const { rows } = await pool1.query(query, [upload_id]);

    // เพิ่มลำดับสำหรับแต่ละกลุ่มข้อมูล
    const resultWithSequence = rows.map((row, index) => ({
      sequence: index + 1, // เพิ่มลำดับเริ่มต้นที่ 1
      ...row,
    }));

    // ตรวจสอบผลลัพธ์
    console.log("Result with Sequence:", JSON.stringify(resultWithSequence, null, 2));

    // ส่งข้อมูลพร้อมลำดับกลับไปยัง client
    res.json(resultWithSequence);
  } catch (err) {
    console.error("Error fetching task details", err);
    res.status(500).json({ error: "Failed to fetch task details" });
  }
};

const getMaterialUsageSummary = async (req, res) => {
  try {
    const { materialType, startDate, endDate } = req.query;

    const values = [];
    let whereClause = `WHERE u.current_status = 'ดำเนินการเรียบร้อย' AND u.approved_date IS NOT NULL`;

    if (materialType) {
      values.push(materialType);
      whereClause += ` AND u.material_type = $${values.length}`;
    }

    if (startDate) {
      values.push(startDate);
      whereClause += ` AND u.upload_date >= $${values.length}`;
    }

    if (endDate) {
      values.push(endDate);
      whereClause += ` AND u.upload_date <= $${values.length}`;
    }

    const query = `
      SELECT
        mu.mat_unit,
        mu.mat_name,
        SUM(mr.quantity) AS total_requested,
        SUM(mr.actual_quantity) AS total_issued
      FROM
        mat_requests mr
      JOIN material_matunits mu ON mr.mat_unit_id = mu.id
      JOIN uploads u ON mu.upload_id = u.upload_id
      ${whereClause}
      GROUP BY
        mu.mat_unit, mu.mat_name
      ORDER BY
        mu.mat_unit;
    `;

    const result = await pool1.query(query, values);
    res.json({ success: true, data: result.rows });
  } catch (error) {
    console.error('Error getting material usage summary:', error);
    res.status(500).json({ success: false, message: 'Internal server error' });
  }
};


module.exports = {
    getDailyOverview,
    getDailyIssues,
    getDailyUploadDetails,
    getUserInfo,
    updateDurationAndAverage,
    getAverageTimes,
    getWorkloadDetail,
    getAverageTimesByMaterials,
    getWorkloadTask,
    getWorkloadTaskItem,
    getDetailsSupClerk,
    getMaterialUsageSummary,
};