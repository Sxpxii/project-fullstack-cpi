// services/recalculation.js
const pool = require('../config/db');
const calculationService = require('../services/calculationService');

const revertCalculations = async (uploadId) => {
    const client = await pool.connect();
    try {
        await client.query('BEGIN');

        // ดึงข้อมูลการใช้วัตถุดิบ
        const materialUsage = await client.query('SELECT * FROM material_usage WHERE upload_id = $1', [uploadId]);

        // คืนค่าการคำนวณ
        for (let usage of materialUsage.rows) {
            const balance = await client.query('SELECT * FROM materialbalances WHERE material_id = $1 AND lot = $2 AND matin = $3', [usage.material_id, usage.lot, usage.matin]);

            if (balance.rows.length > 0) {
                await client.query('UPDATE materialbalances SET remaining_quantity = remaining_quantity + $1 WHERE material_id = $2 AND lot = $3 AND matin = $4', [usage.use_quantity, usage.material_id, usage.lot, usage.matin]);
            } else {
                const historicalData = await client.query('SELECT * FROM materialbalances_history WHERE material_id = $1 AND lot = $2 AND matin = $3', [usage.material_id, usage.lot, usage.matin]);
                if (historicalData.rows.length > 0) {
                    await client.query('INSERT INTO materialbalances (material_id, lot, matin, quantity, remaining_quantity) VALUES ($1, $2, $3, $4, $5)', [usage.material_id, usage.lot, usage.matin, historicalData.rows[0].quantity, historicalData.rows[0].remaining_quantity + usage.use_quantity]);
                }
            }
        }

        await client.query('COMMIT');
    } catch (error) {
        await client.query('ROLLBACK');
        console.error('Error reverting calculations:', error);
        throw error;
    } finally {
        client.release();
    }
};

const recalculateFIFO = async (uploadIdList) => {
    if (!Array.isArray(uploadIdList)) {
        throw new TypeError('Expected uploadIdList to be an array');
    }

    const client = await pool.connect();
    try {
        await client.query('BEGIN');

        for (let uploadId of uploadIdList) {
            await calculationService.calculateFIFO(uploadId);
            await calculationService.checkTask(uploadId);
        }

        await client.query('COMMIT');
    } catch (error) {
        await client.query('ROLLBACK');
        console.error('Error recalculating FIFO:', error);
        throw error;
    } finally {
        client.release();
    }
};

module.exports = { revertCalculations, recalculateFIFO };