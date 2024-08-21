//controllers/uploadController.js
const fs = require('fs');
const path = require('path');
const XLSX = require('xlsx');
const pool = require('../config/db');

const logUserAction = async (userId, action) => {
    try {
        await pool.query('INSERT INTO user_activity_log (user_id, action) VALUES ($1, $2)', [userId, action]);
    } catch (err) {
        console.error('Error logging user action:', err);
    }
};

async function insertData(row) {
    const client = await pool.connect();
    try {
        const queryText = `
            INSERT INTO balance (matunit, matname, lot, matin, location, quantity)
            VALUES ($1, $2, $3, $4, $5, $6)
        `;
        const values = [
            row.matunit.trim(),
            row.matname.trim(),
            row.lot,
            row.matin,
            row.location,
            row.quantity
        ];
        console.log('Inserting row:', values);
        const result = await client.query(queryText, values);
        if (result.rowCount > 0) {
            console.log('Data inserted successfully into the database.');
        } else {
            console.log('No data inserted into the database.');
        }
    } catch (error) {
        console.error('Error executing query:', error);
        throw error;
    } finally {
        client.release();
    }
}

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

            for (let R = 5; R <= range.e.r; R++) {
                const rowData = {};
                let validRow = true;

                for (const columnIndex of [0, 1, 2, 5, 13]) {
                    const cellAddress = XLSX.utils.encode_cell({ r: R, c: columnIndex });
                    const cell = worksheet[cellAddress];
                    const cellValue = cell ? cell.v : null;

                    // Debugging each cell
                    console.log(`Row ${R + 1}, Column ${columnIndex + 1}:`, cellValue);

                    if (cellValue === null || cellValue === undefined || cellValue === '') {
                        validRow = false;
                        console.error(`Invalid cell at row ${R + 1}, column ${columnIndex + 1}:`, cellValue);
                        break;
                    }

                    switch (columnIndex) {
                        case 0:
                            const splitData = cellValue.split(':');
                            if (splitData.length < 2) {
                                validRow = false;
                                console.error(`Invalid matunit or matname at row ${R + 1}:`, cellValue);
                                break;
                            }
                            rowData['matunit'] = splitData[0].trim().replace(/\(.*\)/, '');
                            rowData['matname'] = splitData[1].trim().replace(/\(.*\)/, '');
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
                        case 13:
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

                data.push(rowData);
            }

            console.log('Data from uploaded Excel file:', data);

            // Insert data one by one to handle errors better
            for (const row of data) {
                try {
                    await insertData(row);
                } catch (error) {
                    console.error('Error inserting row:', row, error);
                }
            }

            // Log user action
            const userId = req.user ? req.user.userId : null; // Ensure correct field userId
            if (userId) {
                await logUserAction(userId, `upload_${fileName}`);
            } else {
                console.error('User ID not found in request');
            }
            
            res.json({ data });
        });
    } catch (error) {
        console.error('Error:', error);
        res.status(500).send(error.message);
    }
};

module.exports = {
    handleUpload
};
