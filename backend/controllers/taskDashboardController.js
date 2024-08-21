// controllers/taskDashboardController.js
const pool = require('../config/db');
//const { compareAndCalculate } = require('./resultsController');

// ฟังก์ชันสำหรับดึงรายการงานทั้งหมด
const getTasks = async (req, res) => {
    try {
        console.log('Fetching tasks with status กำลังดำเนินการ and assigned_to is NULL');
        const result = await pool.query('SELECT * FROM dashboard_status WHERE status = $1 AND assigned_to IS NULL', ['กำลังดำเนินการ']);
        console.log('Query Result:', result.rows);
        if (result.rows.length === 0) {
            return res.status(404).json({ error: 'ไม่พบงานที่ต้องการ' });
        }
        res.json(result.rows);
    } catch (error) {
        console.error('เกิดข้อผิดพลาดในการดึงข้อมูลงาน:', error);
        res.status(500).json({ error: 'เกิดข้อผิดพลาดในการดึงข้อมูลงาน' });
    }
};

// ฟังก์ชันสำหรับรับงาน
const acceptTask = async (req, res) => {
    const id = req.params.id;
    const username = req.user.username; // ใช้ชื่อของผู้ใช้ที่ล็อกอินอยู่

    try {
        // ตรวจสอบว่ามีงานนี้อยู่ในฐานข้อมูลหรือไม่
        const taskResult = await pool.query('SELECT * FROM dashboard_status WHERE id = $1', [id]);
        if (taskResult.rows.length === 0) {
            return res.status(404).json({ error: 'ไม่พบงานที่ต้องการรับ' });
        }

        // ตรวจสอบว่างานนี้ยังไม่ถูกรับไปแล้วหรือไม่
        if (taskResult.rows[0].assigned_to) {
            return res.status(400).json({ error: 'งานนี้ถูกรับไปแล้ว' });
        }

        // บันทึกงานที่ผู้ใช้รับมาในฐานข้อมูล
        await pool.query('UPDATE dashboard_status SET assigned_to = $1 WHERE id = $2', [username, id]);
        res.json({ message: 'รับงานเรียบร้อยแล้ว' });
    } catch (error) {
        console.error('เกิดข้อผิดพลาดในการรับงาน:', error);
        res.status(500).json({ error: 'เกิดข้อผิดพลาดในการรับงาน' });
    }
};


// ฟังก์ชันสำหรับดึงงานของผู้ใช้
const getMyTasks = async (req, res) => {
    const username = req.user.username;
    console.log(`Fetching tasks for user: ${username}`);
    try {
        const result = await pool.query('SELECT id, mat_type, date, status FROM dashboard_status WHERE assigned_to = $1', [username]);
        console.log('Query Result:', result.rows);
        if (result.rows.length === 0) {
            return res.status(404).json({ error: 'ไม่พบงานที่ต้องการ' });
        }
        res.json(result.rows);
    } catch (error) {
        console.error('เกิดข้อผิดพลาดในการดึงข้อมูลงาน:', error);
        res.status(500).json({ error: 'เกิดข้อผิดพลาดในการดึงข้อมูลงาน' });
    }
};

// ฟังก์ชันสำหรับดึงข้อมูลที่เกี่ยวข้อง
const getFilteredBalanceData = async (matunits) => {
    try {
        const queryText = `
            SELECT * FROM balance
            WHERE matunit = ANY($1)
            AND quantity != 0
        `;
        const res = await pool.query(queryText, [matunits]);
        return res.rows;
    } catch (err) {
        console.error('Error fetching filtered balance data:', err);
        throw err;
    }
};

const getWDData = async (tableName, dashboardStatusId) => {
    try {
        const queryText = `SELECT * FROM ${tableName} WHERE dashboard_status_id = $1`;
        const res = await pool.query(queryText, [dashboardStatusId]);
        return res.rows;
    } catch (err) {
        console.error(`Error fetching ${tableName} data:`, err);
        throw err;
    }
};

const updateBalanceAndSaveHistory = async (client, balance, newQuantity) => {
    const queryUpdateBalance = `
        UPDATE balance
        SET quantity = $1
        WHERE mat_id = $2
    `;
    
    const queryInsertHistory = `
        INSERT INTO historical_data (mat_balance_id, quantity, transaction_date, balance_after_transaction)
        VALUES ($1, $2, CURRENT_TIMESTAMP, $3)
    `;
    
    await client.query(queryUpdateBalance, [newQuantity, balance.mat_id]);
    await client.query(queryInsertHistory, [balance.mat_id, balance.quantity - newQuantity, newQuantity]);
};

const compareResults = async (newResults, resultTable) => {
    const client = await pool.connect();
    try {
        const queryText = `SELECT * FROM ${resultTable} WHERE dashboard_status_id = $1`;
        const res = await client.query(queryText, [newResults[0].dashboard_status_id]);

        const existingResults = res.rows;

        if (existingResults.length === 0) {
            return false;
        }

        for (let i = 0; i < newResults.length; i++) {
            if (JSON.stringify(newResults[i]) !== JSON.stringify(existingResults[i])) {
                return false;
            }
        }

        return true;
    } catch (err) {
        console.error('Error comparing results:', err);
        throw err;
    } finally {
        client.release();
    }
};

const saveResults = async (results, resultTable) => {
    const client = await pool.connect();
    try {
        await client.query('BEGIN');
        const queryText = `
            INSERT INTO ${resultTable} (matunit, matname, lot, matin, location, qty_mat, qty_balance, quantity, dashboard_status_id, status) 
            VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
            ON CONFLICT (matunit, lot, matin, location, dashboard_status_id) 
            DO UPDATE SET 
                matname = EXCLUDED.matname,
                qty_mat = EXCLUDED.qty_mat,
                qty_balance = EXCLUDED.qty_balance,
                quantity = EXCLUDED.quantity,
                status = EXCLUDED.status
        `;
        for (let result of results) {
            await client.query(queryText, [
                result.matunit, result.matname, result.lot, 
                result.matin, result.location, result.qty_mat, result.qty_balance, result.newQuantity, result.dashboard_status_id, result.status
            ]);
        }
        await client.query('COMMIT');
        console.log(`Results saved successfully to ${resultTable}`);
    } catch (err) {
        await client.query('ROLLBACK');
        console.error(`Error saving results to ${resultTable}:`, err);
        throw err;
    } finally {
        client.release();
    }
};

const calculateForMaterial = async (materialType, tableName, resultTable, dashboardStatusId) => {
    const client = await pool.connect();
    try {
        await client.query('BEGIN');

        console.log(`Fetching data for table: ${tableName} with dashboard_status_id: ${dashboardStatusId}`);
        const wdData = await getWDData(tableName, dashboardStatusId);
        
        if (!wdData.length) {
            console.warn(`No data found for table: ${tableName} with dashboard_status_id: ${dashboardStatusId}`);
            return [];
        }

        const matunits = wdData.map(wd => wd.matunit);
        
        console.log(`Fetching balance data for matunits: ${matunits}`);
        const balanceData = await getFilteredBalanceData(matunits);
        console.log('Fetched balance data:', balanceData);

        const wdMap = new Map();
        wdData.forEach(wd => {
            wdMap.set(wd.matunit, wd.quantity);
        });

        const balanceGroupedByMatunit = balanceData.reduce((acc, balance) => {
            if (!acc[balance.matunit]) acc[balance.matunit] = [];
            acc[balance.matunit].push(balance);
            return acc;
        }, {});

        const compareMatin = (a, b) => {
            const regex = /(\d+|[a-zA-Z]+)/g;
            const aParts = a.match(regex);
            const bParts = b.match(regex);

            for (let i = 0; i < Math.max(aParts.length, bParts.length); i++) {
                if (aParts[i] !== bParts[i]) {
                    const aPart = aParts[i];
                    const bPart = bParts[i];
                    
                    if (/\d/.test(aPart) && /\d/.test(bPart)) {
                        return parseInt(aPart, 10) - parseInt(bPart, 10);
                    }

                    return aPart.localeCompare(bPart);
                }
            }

            return 0;
        };

        for (let key in balanceGroupedByMatunit) {
            balanceGroupedByMatunit[key].sort((a, b) => compareMatin(a.matin, b.matin));
        }

        const results = [];
        
        for (let matunit in balanceGroupedByMatunit) {
            let remainingWdQuantity = wdMap.get(matunit) || 0;
            for (let balance of balanceGroupedByMatunit[matunit]) {
                let newQuantity = balance.quantity - remainingWdQuantity;
                let status = 'not cut'; // สถานะเริ่มต้นเป็น "not cut"
                
                if (newQuantity < 0) {
                    remainingWdQuantity = Math.abs(newQuantity);
                    newQuantity = 0;
                    status = 'cut'; // หากตัดไปจนหมด จะเป็น "cut"
                } else if (newQuantity < balance.quantity) {
                    status = 'cut'; // หากมีการตัดบางส่วน จะเป็น "cut"
                    remainingWdQuantity = 0;
                } else {
                    remainingWdQuantity = 0;
                }
                
                results.push({
                    ...balance,
                    newQuantity,
                    qty_mat: wdMap.get(matunit) || 0, // นำค่า quantity จาก wd มาใส่ใน qty_mat
                    qty_balance: balance.quantity,
                    dashboard_status_id: dashboardStatusId, // เพิ่ม dashboard_status_id ลงในผลลัพธ์
                    status // เพิ่มสถานะลงในผลลัพธ์
                });
                await updateBalanceAndSaveHistory(client, balance, newQuantity);
            }
        }
        await client.query('COMMIT');

        const isSameResults = await compareResults(results, resultTable);
        if (!isSameResults) {
            await saveResults(results, resultTable);
        } else {
            console.log('Results are the same, no need to save.');
        }

        console.log(`Calculated Results for ${materialType}:`, results);
        
        return results;
    } catch (err) {
        console.error(`Error comparing and calculating data for ${materialType}:`, err);
        await client.query('ROLLBACK');
        throw err;
    }
    finally {
        client.release();
    }
};

const getTaskDetail = async (req, res) => {
    const taskId = req.params.id;
    try {
        const result = await pool.query('SELECT * FROM dashboard_status WHERE id = $1', [taskId]);
        if (result.rows.length === 0) {
            return res.status(404).json({ error: 'ไม่พบรายละเอียดของงาน' });
        }

        const taskDetail = result.rows[0];
        const materialType = taskDetail.mat_type.toLowerCase();
        
        // เลือกตารางและผลลัพธ์ตามประเภทของวัตถุดิบ
        const materialTypes = {
            'pk_dis': { tableName: 'pk_dis', resultTable: 'result_pk_dis' },
            'pk_shoe': { tableName: 'pk_shoe', resultTable: 'result_pk_shoe' },
            'wd': { tableName: 'wd', resultTable: 'result_wd' },
            'pin': { tableName: 'pin', resultTable: 'result_pin' },
            'bp': { tableName: 'bp', resultTable: 'result_bp' },
            'chemical': { tableName: 'chemical', resultTable: 'result_chemical' }
        };

        const { tableName, resultTable } = materialTypes[materialType] || {};

        if (!tableName || !resultTable) {
            return res.status(400).json({ error: 'ไม่รองรับประเภทวัตถุดิบนี้' });
        }

        const results = await calculateForMaterial(materialType, tableName, resultTable, taskId);
        res.json({ results });
    } catch (error) {
        console.error('เกิดข้อผิดพลาดในการดึงรายละเอียดงาน:', error);
        res.status(500).json({ error: 'เกิดข้อผิดพลาดในการดึงรายละเอียดงาน' });
    }
};



module.exports = {
    getTasks,
    acceptTask,
    getMyTasks,
    getTaskDetail
};