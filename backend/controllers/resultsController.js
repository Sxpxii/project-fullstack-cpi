//resultsController.js
const pool = require('../config/db');

// ฟังก์ชันดึงข้อมูลจากตาราง balance เฉพาะ matunit ที่ตรงกับ wd
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

// ฟังก์ชันดึงข้อมูลจากตารางวัตถุดิบเฉพาะรายการที่มี dashboard_status_id ตรงกับ id ที่ได้รับมา
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

// ฟังก์ชันบันทึกผลลัพธ์ที่คำนวณแล้วลงฐานข้อมูล
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

const compareAndCalculate = async (req, res) => {
    const { materialType, id } = req.params;
    
    const materialTypes = [
        { type: 'pk_dis', tableName: 'pk_dis', resultTable: 'result_pk_dis' },
        { type: 'pk_shoe', tableName: 'pk_shoe', resultTable: 'result_pk_shoe' },
        { type: 'wd', tableName: 'wd', resultTable: 'result_wd' },
        { type: 'pin', tableName: 'pin', resultTable: 'result_pin' },
        { type: 'bp', tableName: 'bp', resultTable: 'result_bp' },
        { type: 'chemical', tableName: 'chemical', resultTable: 'result_chemical' },
    ];

    const selectedMaterial = materialTypes.find(mat => mat.type === materialType);

    if (!selectedMaterial) {
        return res.status(400).send('Invalid material type');
    }

    try {
        const results = await calculateForMaterial(selectedMaterial.type, selectedMaterial.tableName, selectedMaterial.resultTable, id);
        res.json(results);
    } catch (err) {
        console.error(`Error in compareAndCalculate for materialType: ${materialType}, id: ${id}`, err);
        res.status(500).send('Error comparing and calculating data');
    }
};

// ฟังก์ชันดึงผลลัพธ์ที่คำนวณไว้แล้วจากฐานข้อมูล
const getResults = async (req, res) => {
    try {
        const { materialType, id } = req.params;
        if (!materialType || !id) {
            return res.status(400).send('Material type and ID are required');
        }
        const queryText = `SELECT * FROM result_${materialType} WHERE dashboard_status_id = $1`;
        const result = await pool.query(queryText, [id]);
        res.json(result.rows);
    } catch (err) {
        console.error('Error fetching results:', err);
        res.status(500).send('Error fetching results');
    }
};

module.exports = {
    compareAndCalculate,
    getResults
};

