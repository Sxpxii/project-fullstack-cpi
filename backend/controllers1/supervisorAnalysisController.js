const db = require('../db');

const getProcessPerformance = async (req, res) => {
    try {
        const result = await db.query(`
            SELECT 
                a.upload_id,
                AVG(EXTRACT(EPOCH FROM (confirm_time - upload_time)) / 60) AS upload_to_confirm_duration, 
                AVG(EXTRACT(EPOCH FROM (accept_time - confirm_time)) / 60) AS confirm_to_accept_duration,
                AVG(EXTRACT(EPOCH FROM (review_time - accept_time)) / 60) AS accept_to_review_duration,
                AVG(EXTRACT(EPOCH FROM (completed_time - review_time)) / 60) AS review_to_complete_duration 
            FROM
                (
                    SELECT 
                        ua.upload_id, 
                        MIN(CASE WHEN ua.action_type = 'upload' THEN ua.timestamp END) AS upload_time,
                        MIN(CASE WHEN ua.action_type = 'ยืนยันรายการ' THEN ua.timestamp END) AS confirm_time,
                        MIN(CASE WHEN ua.action_type = 'กดรับงาน' THEN ua.timestamp END) AS accept_time
                    FROM 
                        useractions ua
                    JOIN 
                        uploads u ON ua.upload_id = u.upload_id
                    GROUP BY 
                        ua.upload_id
                ) AS a
            LEFT JOIN 
                (
                    SELECT 
                        upload_id, 
                        MIN(CASE WHEN status = 'รอตรวจสอบ' THEN timestamp END) AS review_time,
                        MIN(CASE WHEN status = 'ดำเนินการเรียบร้อย' THEN timestamp END) AS completed_time
                    FROM 
                        operationstatus
                    GROUP BY 
                        upload_id
                ) AS o
            ON a.upload_id = o.upload_id
            GROUP BY a.upload_id;
        `);

        res.json(result.rows);
    } catch (error) {
        console.error('Error fetching process performance:', error);
        res.status(500).json({ error: 'Internal Server Error' });
    }
};

module.exports = {
    getProcessPerformance,
};
