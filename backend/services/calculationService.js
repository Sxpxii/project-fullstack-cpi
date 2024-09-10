const pool = require('../config/db');

// ฟังก์ชันดึงข้อมูลจากตารางวัตถุดิบ
const getMaterialRequestData = async (uploadId) => {
    try {
        const queryText = `SELECT * FROM materialrequests WHERE upload_id = $1`;
        const res = await pool.query(queryText, [uploadId]);
        return res.rows;
    } catch (err) {
        console.error('Error fetching material request data:', err);
        throw err;
    }
};

// ฟังก์ชันดึงข้อมูลจากตารางยอดคงเหลือ
const getMaterialBalanceData = async (materialIds) => {
    try {
        const queryText = `
            SELECT * FROM materialbalances
            WHERE material_id = ANY($1)
            AND (quantity != 0 OR remaining_quantity != 0)
        `;
        const res = await pool.query(queryText, [materialIds]);
        return res.rows;
    } catch (err) {
        console.error('Error fetching material balance data:', err);
        throw err;
    }
};

// ฟังก์ชันสำหรับเปรียบเทียบ matin
const compareMatin = (a, b) => {
    const aParts = a.split('');
    const bParts = b.split('');

    for (let i = 0; i < Math.min(aParts.length, bParts.length); i++) {
        const aPart = aParts[i];
        const bPart = bParts[i];

        if (aPart !== bPart) {
            if (/\d/.test(aPart) && /\d/.test(bPart)) {
                return aPart.localeCompare(bPart, undefined, { numeric: true });
            }

            if (/\d/.test(aPart)) {
                return -1;
            }
            if (/\d/.test(bPart)) {
                return 1;
            }

            return aPart.localeCompare(bPart);
        }
    }

    return aParts.length - bParts.length;
};


const checkTask = async (uploadId) => {
    try {
        // ดึงข้อมูล material_id จากตาราง materialrequests ตาม upload_id
        const materialRequestsResult = await pool.query(`
            SELECT material_id FROM materialrequests WHERE upload_id = $1
        `, [uploadId]);

        const materialIds = materialRequestsResult.rows.map(row => row.material_id);
        console.log('Material IDs:', materialIds);

        // ดึงข้อมูลจากตาราง materialbalances ตาม material_ids
        const materialBalancesResult = await pool.query(`
            SELECT material_id, lot, matin, location, quantity, remaining_quantity
            FROM materialbalances
            WHERE material_id = ANY($1)
            AND quantity != 0
        `, [materialIds]);

        const materialBalances = materialBalancesResult.rows;
        console.log('Material Balances:', materialBalances);

        // ดึงข้อมูลจากตาราง materials ตาม material_ids
        const materialsResult = await pool.query(`
            SELECT material_id, matunit, mat_name
            FROM materials
            WHERE material_id = ANY($1)
        `, [materialIds]);

        // สร้างตัวแปร materials จากผลลัพธ์
        const materials = materialsResult.rows.reduce((acc, row) => {
            acc[row.material_id] = { matunit: row.matunit, mat_name: row.mat_name };
            return acc;
        }, {});
        console.log('Materials:', materials);

        // ตรวจสอบการตัดจากตาราง material_usage
        const materialUsageResult = await pool.query(`
            SELECT DISTINCT matin FROM material_usage WHERE upload_id = $1
        `, [uploadId]);

        const usedMatins = new Set(materialUsageResult.rows.map(row => row.matin));
        console.log('Used Matins:', usedMatins); 

        const sortedMaterialBalances = materialBalances.sort((a, b) => {
            if (a.material_id === b.material_id) {
                return compareMatin(a.matin, b.matin);
            }
            return a.material_id - b.material_id;
        });
        console.log('Sorted Material Balances:', sortedMaterialBalances);

        // คำนวณข้อมูลที่ต้องบันทึกลงในตาราง check_cutting
        const checkCuttingData = sortedMaterialBalances.map(balance => {
            const material = materials[balance.material_id];
            const cutStatus = usedMatins.has(balance.matin);
            
            console.log(`Matin: ${balance.matin}, Cut Status: ${cutStatus}`);

            return {
                upload_id: uploadId,
                material_id: balance.material_id,
                matunit: material.matunit,
                mat_name: material.mat_name,
                lot: balance.lot,
                matin: balance.matin,
                location: balance.location,
                quantity: balance.quantity,
                remaining_quantity: balance.remaining_quantity,
                cut_status: cutStatus
            };
        });

        // บันทึกข้อมูลลงในตาราง check_cutting
        const queryText = `
            INSERT INTO check_cutting (upload_id, material_id, matunit, mat_name, lot, matin, location, quantity, remaining_quantity, cut_status)
            VALUES ${checkCuttingData.map((_, i) => `($${i * 10 + 1}, $${i * 10 + 2}, $${i * 10 + 3}, $${i * 10 + 4}, $${i * 10 + 5}, $${i * 10 + 6}, $${i * 10 + 7}, $${i * 10 + 8}, $${i * 10 + 9}, $${i * 10 + 10})`).join(', ')}
        `;
        const values = checkCuttingData.flatMap(data => [
            data.upload_id,
            data.material_id,
            data.matunit,
            data.mat_name,
            data.lot,
            data.matin,
            data.location,
            data.quantity,
            data.remaining_quantity,
            data.cut_status
        ]);

        console.log('Query Text:', queryText); 
        console.log('Values:', values);

        await pool.query(queryText, values);

    } catch (error) {
        console.error('Error checking task:', error);
        throw error;
    }
};


// ฟังก์ชันคำนวณ FIFO
const calculateFIFO = async (uploadId) => {
    const client = await pool.connect();
    try {
        await client.query('BEGIN');

        // ดึงข้อมูลการสั่งเบิก
        const requestData = await getMaterialRequestData(uploadId);
        if (!requestData.length) {
            console.warn(`No material request data found for uploadId: ${uploadId}`);
            return [];
        }

        const materialIds = [...new Set(requestData.map(req => req.material_id))];

        // ดึงข้อมูลยอดคงเหลือ
        const balanceData = await getMaterialBalanceData(materialIds);
        const balanceGroupedByMaterial = balanceData.reduce((acc, balance) => {
            if (!acc[balance.material_id]) acc[balance.material_id] = [];
            acc[balance.material_id].push(balance);
            return acc;
        }, {});
        
        const results = [];

        for (let request of requestData) {
            const balances = balanceGroupedByMaterial[request.material_id] || [];
            balances.sort((a, b) => compareMatin(a.matin, b.matin));

            let requestedQuantity = request.quantity;

            for (let balance of balances) {
                if (requestedQuantity <= 0 || (balance.remaining_quantity !== null && balance.remaining_quantity === 0)) break;

                const currentRemainingQuantity = balance.remaining_quantity !== null ? balance.remaining_quantity : balance.quantity;
                const usedQuantity = Math.min(requestedQuantity, currentRemainingQuantity);
                const remainingQuantity = currentRemainingQuantity - usedQuantity;

                results.push({
                    material_id: request.material_id,
                    lot: balance.lot,
                    matin: balance.matin,
                    location: balance.location,
                    quantity: request.quantity,
                    used_quantity: usedQuantity,
                    remaining_quantity: remainingQuantity,
                });

                // อัพเดตในฐานข้อมูล
                await client.query(`
                    UPDATE materialbalances
                    SET remaining_quantity = $1
                    WHERE material_id = $2 AND lot = $3 AND matin = $4 AND location = $5
                `, [remainingQuantity, request.material_id, balance.lot, balance.matin, balance.location]);
                
                // บันทึกการใช้ `matin` กับ `uploadId`
                await client.query(`
                    INSERT INTO material_usage (upload_id, material_id, lot, matin, location, quantity, used_quantity, remaining_quantity)
                    VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
                `, [uploadId, request.material_id, balance.lot, balance.matin, balance.location, request.quantity, usedQuantity, remainingQuantity]);

                requestedQuantity -= usedQuantity;
            }
        }

        await client.query('COMMIT');
        console.log('FIFO calculation results:', results);
        return results;
    } catch (err) {
        await client.query('ROLLBACK');
        console.error('Error calculating FIFO:', err);
        throw err;
    } finally {
        client.release();
    }
};

module.exports = {
    calculateFIFO,
    checkTask,
};