const pool = require('../config/db');

const getProcessPerformance = async (req, res) => {
    const { month, year } = req.query; // รับข้อมูลเดือนและปีจาก query params
  
    try {
        let query = `
            SELECT assignee.username AS assignee_name,
                   uploader.username AS uploader_name,
                   u.upload_id,
                   u.approved_date,
                   EXTRACT(MONTH FROM u.approved_date) AS upload_month,
                   EXTRACT(YEAR FROM u.approved_date) AS upload_year
            FROM uploads u
            LEFT JOIN users1 uploader ON u.user_id = uploader.user_id
            LEFT JOIN users1 assignee ON u.assigned_to = assignee.user_id
            WHERE ($1::int IS NULL OR EXTRACT(MONTH FROM u.approved_date) = $1::int)
            AND ($2::int IS NULL OR EXTRACT(YEAR FROM u.approved_date) = $2::int)
            ORDER BY assignee.username, uploader.username, u.upload_id;
        `;

        const values = [month ? parseInt(month) : null, year ? parseInt(year) : null];
        const { rows } = await pool.query(query, values);

        const totalUploads = rows.length;

        // แสดงผลลัพธ์ที่ไม่ได้จัดกลุ่ม
        console.log("Raw Data", rows , totalUploads);

        const groupedData = rows.reduce((acc, item) => {
            const uploaderName = item.uploader_name || 'Unknown Uploader';
            const assigneeName = item.assignee_name || 'Unknown Assignee';
        
            if (!acc.uploader) {
                acc.uploader = {};
            }
            if (!acc.assignee) {
                acc.assignee = {};
            }
        
            if (!acc.uploader[uploaderName]) {
                acc.uploader[uploaderName] = [];
            }
            if (!acc.assignee[assigneeName]) {
                acc.assignee[assigneeName] = [];
            }
        
            acc.uploader[uploaderName].push({
                upload_id: item.upload_id,
                upload_month: item.upload_month,
            });
            acc.assignee[assigneeName].push({
                upload_id: item.upload_id,
                upload_month: item.upload_month,
            });
        
            return acc;
        }, {});

        console.log("Data", groupedData);

        res.json({
            ...groupedData,
            totalUploads
        });

    } catch (error) {
        console.error("Error fetching process performance:", error);
        res.status(500).json({ error: "Error fetching process performance" });
    }
};

module.exports = {
    getProcessPerformance,
};