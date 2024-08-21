const pool = require('../config/db');

const getAdminStats = async (req, res) => {
    try {
        const userCountQuery = await pool.query('SELECT COUNT(*) FROM users');
        const userCount = userCountQuery.rows[0].count;

        const activityLogsQuery = await pool.query(`
            SELECT u.username, u.role, a.action, a.action_time 
            FROM user_activity_log a
            JOIN users u ON a.user_id = u.id
            ORDER BY a.action_time DESC
            LIMIT 10
        `);
        const activityLogs = activityLogsQuery.rows;

        res.json({ userCount, activityLogs });
    } catch (error) {
        console.error('Error fetching admin stats:', error);
        res.status(500).json({ error: 'Failed to fetch admin stats' });
    }
};

const getUserStatuses = async (req, res) => {
    try {
        const userStatusesQuery = await pool.query(`
            SELECT u.username, 
                   CASE
                       WHEN a.logout_time IS NULL THEN 'online'
                       WHEN AGE(NOW(), a.logout_time) <= INTERVAL '5 minutes' THEN 'online'
                       ELSE 'offline'
                   END AS status
            FROM users u
            LEFT JOIN (
                SELECT user_id, MAX(action_time) AS logout_time
                FROM user_activity_log
                WHERE action = 'logout'
                GROUP BY user_id
            ) a ON u.id = a.user_id
        `);
        const userStatuses = userStatusesQuery.rows;

        res.json(userStatuses);
    } catch (error) {
        console.error('Error fetching user statuses:', error);
        res.status(500).json({ error: 'Failed to fetch user statuses' });
    }
};

module.exports = {
    getAdminStats,
    getUserStatuses,
};
