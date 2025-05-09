const { pool1 } = require('../config/db'); // PostgreSQL connection pool


// ฟังก์ชันสำหรับดึงรายละเอียดของงาน
const getDetailsReports = async (req, res) => {
  try {
    const { startDate, endDate } = req.query;

    const query = `
      SELECT 
        u.inventory_id,
        m.id AS mat_unit_id,
        m.mat_name,
        m.mat_unit,
        u.user_id,
        u1.username AS uploaded_by,
        u.assigned_to,
        u2.username AS assigned_to_name,
        r.id AS request_id,
        r.mat_lot,
        r.loc,
        r.quantity,
        r.actual_quantity,
        r.remaining_quantity,
        r.counted_quantity,
        r.total_quantity,
        r.employee_reason,
        r.employee_reason_remaining,
        r.manager_reason,
        r.manager_reason_remaining,
        r.selected_time
      FROM material_matunits m
      JOIN mat_requests r ON m.id = r.mat_unit_id
      JOIN uploads u ON r.upload_id = u.upload_id
      LEFT JOIN users1 u1 ON u.user_id = u1.user_id
      LEFT JOIN users1 u2 ON u.assigned_to = u2.user_id
      WHERE ($1::date IS NULL OR $2::date IS NULL OR u.upload_date BETWEEN $1 AND $2)
      ORDER BY m.id, r.id;
    `;

    const values = [startDate || null, endDate || null];

    const { rows } = await pool1.query(query, values);

    console.log("📦 Report Data:", JSON.stringify(rows, null, 2));
    res.json(rows);
  } catch (err) {
    console.error("Error fetching task details", err);
    res.status(500).json({ error: "Failed to fetch task details" });
  }
};

module.exports = { getDetailsReports };
