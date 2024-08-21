// controllers/dashboardController.js
const pool = require('../config/db');

const getDashboardData = async (req, res) => {
    try {
        const result = await pool.query('SELECT id, mat_type, date , status FROM dashboard_status');
        res.json(result.rows);
    } catch (err) {
        console.error('Error fetching dashboard data:', err);
        console.error('Query:', 'SELECT mat_type, created_at AS date, status FROM dashboard_status');
        res.status(500).send('Error fetching dashboard data');
    }
};

module.exports = {
    getDashboardData
};
