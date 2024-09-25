const fs = require('fs');
const path = require('path');
const XLSX = require('xlsx');
const pool = require('../config/db');
const {logUserAction} = require('../controllers1/loginController1');

/*const logUserAction = async (userId, action) => {
    const client = await pool.connect(); // ใช้ client เพื่อควบคุม transaction
    try {
        await client.query('BEGIN'); // เริ่ม transaction

        // บันทึกการกระทำในตาราง useractions
        await client.query('INSERT INTO useractions (user_id, action_type) VALUES ($1, $2)', [userId, action]);

        // อัปเดต lastActivity ในตาราง users1
        await client.query('UPDATE users1 SET lastActivity = NOW() WHERE user_id = $1', [userId]);

        await client.query('COMMIT'); // ยืนยันการเปลี่ยนแปลงทั้งหมด
    } catch (err) {
        await client.query('ROLLBACK'); // ยกเลิกการเปลี่ยนแปลงหากเกิดข้อผิดพลาด
        console.error('Error logging user action and updating lastActivity:', err);
    } finally {
        client.release(); // ปล่อย client กลับคืน pool
    }
};*/

const findMaterialId = async (matunit, matname) => {
    try {
        const result = await pool.query('SELECT material_id FROM materials WHERE matunit = $1 AND mat_name = $2', [matunit, matname]);
        return result.rows.length > 0 ? result.rows[0].material_id : null;
    } catch (error) {
        console.error('Error finding material ID:', error);
        throw error;
    }
};

const insertMaterialBalance = async (materialId, row) => {
    const client = await pool.connect();
    try {
        const queryText = `
            INSERT INTO materialbalances (material_id, date, lot, matin, location, quantity, remaining_quantity)
            VALUES ($1, CURRENT_DATE, $2, $3, $4, $5, $5)
        `;
        const values = [
            materialId,
            row.lot,
            row.matin,
            row.location,
            row.quantity,
        ];
        console.log('Inserting material balance:', values);
        const result = await client.query(queryText, values);
        if (result.rowCount > 0) {
            console.log('Data inserted successfully into materialBalances.');
        } else {
            console.log('No data inserted into materialBalances.');
        }
    } catch (error) {
        console.error('Error executing query:', error);
        throw error;
    } finally {
        client.release();
    }
};

const moveToHistoryAndClearBalances = async () => {
    const client = await pool.connect();
    try {
        await client.query('BEGIN');
        await client.query(`
            INSERT INTO materialbalances_history (material_id, date, lot, matin, location, quantity, remaining_quantity )
            SELECT material_id, date, lot, matin, location, quantity, remaining_quantity
            FROM materialbalances
        `);
        await client.query('DELETE FROM materialbalances');
        await client.query('COMMIT');
        console.log('Data moved to history and cleared from materialbalances.');
    } catch (error) {
        await client.query('ROLLBACK');
        console.error('Error moving data to history:', error);
        throw error;
    } finally {
        client.release();
    }
};

const handleUpload = async (req, res) => {
    try {
        if (!req.files || !req.files.file) {
            return res.status(400).send('No file was uploaded.');
        }

        const { file } = req.files;
        const fileName = file.name;
        const filePath = path.join(__dirname, '..', 'temp', fileName);

        file.mv(filePath, async (err) => {
            if (err) {
                console.error(err);
                return res.status(500).send(err);
            }

            const workbook = XLSX.readFile(filePath, { cellDates: false, raw: true });
            const sheetName = workbook.SheetNames[0];
            const worksheet = workbook.Sheets[sheetName];
            const range = XLSX.utils.decode_range(worksheet['!ref']);

            const data = [];
            const errors = [];

            await moveToHistoryAndClearBalances();

            for (let R = 5; R <= range.e.r; R++) {
                const rowData = {};
                let validRow = true;

                for (const columnIndex of [0, 1, 2, 5, 14]) {
                    const cellAddress = XLSX.utils.encode_cell({ r: R, c: columnIndex });
                    const cell = worksheet[cellAddress];
                    const cellValue = cell ? cell.v : null;

                    // Debugging each cell
                    //console.log(`Row ${R + 1}, Column ${columnIndex + 1}:`, cellValue);

                    if (cellValue === null || cellValue === undefined || cellValue === '') {
                        validRow = false;
                        console.error(`Invalid cell at row ${R + 1}, column ${columnIndex + 1}:`, cellValue);
                        break;
                    }

                    switch (columnIndex) {
                        case 0:
                            const [matunit, matname] = cellValue.split(':').map(part => part.trim());
                            if (!matunit || !matname) {
                                validRow = false;
                                console.error(`Invalid matunit or matname at row ${R + 1}:`, cellValue);
                                break;
                            }
                            rowData['matunit'] = matunit;
                            rowData['matname'] = matname;
                            break;
                        case 1:
                            if (typeof cellValue === 'number') {
                                // Handle date stored as number
                                const date = new Date((cellValue - (25567 + 2)) * 86400 * 1000);
                                const day = String(date.getUTCDate()).padStart(2, '0');
                                const month = String(date.getUTCMonth() + 1).padStart(2, '0');
                                const year = String(date.getUTCFullYear()).slice(-2);
                                rowData['lot'] = `${day}-${month}-${year}`;
                            } else {
                                rowData['lot'] = cellValue.toString();
                            }
                            break;
                        case 2:
                            let matinValue = cellValue.toString();
                            if (!matinValue.startsWith('0')) {
                                matinValue = '0' + matinValue;
                            }
                            rowData['matin'] = matinValue;
                            break;
                        case 5:
                            rowData['location'] = cellValue.toString();
                            break;
                        case 14:
                            if (!isNaN(cellValue)) {
                                rowData['quantity'] = parseFloat(cellValue);
                            } else {
                                validRow = false;
                                console.error(`Invalid quantity at row ${R + 1}:`, cellValue);
                            }
                            break;
                    }
                }

                if (!validRow) {
                    console.error('Invalid row:', rowData);
                    continue;
                }

                const materialId = await findMaterialId(rowData.matunit, rowData.matname);
                if (materialId) {
                    try {
                        //await insertMaterialBalance(materialId, rowData);
                        rowData['materialId'] = materialId;
                        data.push(rowData);
                    } catch (error) {
                        console.error('Error inserting row:', rowData, error);
                        errors.push({ matunit: rowData.matunit, matname: rowData.matname });
                    }
                } else {
                    console.error('Material not found for:', rowData);
                    errors.push({ ...rowData, error: 'Material not found' });
                }
            }

            // ตรวจสอบว่ามีรายการที่ไม่มี material_id หรือไม่
            if (errors.length > 0) {
                // แจ้งเตือนผู้ใช้งาน
                return res.status(200).json({ errors });
            }

            // บันทึกรายการถ้าไม่มี error
            for (const row of data) {
                await insertMaterialBalance(row.materialId, row);
            }

            // Log user action
            const userId = req.user ? req.user.userId : null;
            if (userId) {
                await logUserAction(userId, `upload_${fileName}`);
            } else {
                console.error('User ID not found in request');
            }

            res.json({ data, errors });
        });
    } catch (error) {
        console.error('Error:', error);
        res.status(500).send(error.message);
    }
};

module.exports = {
    handleUpload
};
