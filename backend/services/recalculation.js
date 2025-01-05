// services/recalculation.js
const { pool1 } = require('../config/db');
const calculationService = require('../services/calculationService');

const revertCalculations = async (uploadId) => {
    const client = await pool1.connect();
    try {
        await client.query('BEGIN');

        // ดึงข้อมูลการใช้วัตถุดิบ
        const materialUsage = await client.query('SELECT * FROM material_usage WHERE upload_id = $1', [uploadId]);

        console.log(`Reverting calculations for upload_id: ${uploadId}, Material usage data:`, materialUsage.rows);

        // คืนค่าการคำนวณ
        for (let usage of materialUsage.rows) {
            const { material_id, lot, matin, used_quantity } = usage;

            // ดึงข้อมูลจาก materialbalances
            const balance = await client.query(
                'SELECT * FROM materialbalances WHERE material_id = $1 AND lot = $2 AND matin = $3',
                [material_id, lot, matin]
            );

            console.log(`Material balances for ${material_id} - Lot: ${lot}, Matin: ${matin}:`, balance.rows);

            if (balance.rows.length > 0) {
                await client.query('UPDATE materialbalances SET remaining_quantity = remaining_quantity + $1 WHERE material_id = $2 AND lot = $3 AND matin = $4', [usage.used_quantity, usage.material_id, usage.lot, usage.matin]);
                console.log(`Updated materialbalances for material_id: ${material_id}, lot: ${lot}, matin: ${matin} by adding ${used_quantity}`);
            } else {
                const historicalData = await client.query('SELECT * FROM materialbalances_history WHERE material_id = $1 AND lot = $2 AND matin = $3', [usage.material_id, usage.lot, usage.matin]);
                console.log(`Historical balances for ${material_id} - Lot: ${lot}, Matin: ${matin}:`, historicalData.rows);
                if (historicalData.rows.length > 0) {
                    await client.query('INSERT INTO materialbalances (material_id, lot, matin, quantity, remaining_quantity) VALUES ($1, $2, $3, $4, $5)', [usage.material_id, usage.lot, usage.matin, historicalData.rows[0].quantity, historicalData.rows[0].remaining_quantity + usage.use_quantity]);
                    console.log(`Inserted into materialbalances for material_id: ${material_id}, lot: ${lot}, matin: ${matin} with updated remaining_quantity: ${remaining_quantity + used_quantity}`);
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

    const client = await pool1.connect();
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