// src/controllers/materialController.js
const fs = require('fs');
const path = require('path');
const XLSX = require('xlsx');
const pool = require('../config/db');

// ฟังก์ชันบันทึกการกระทำของผู้ใช้
const logUserAction = async (userId, action) => {
    try {
        await pool.query('INSERT INTO userActions (user_id, action_type) VALUES ($1, $2)', [userId, action]);
    } catch (err) {
        console.error('Error logging user action:', err);
    }
};

// ฟังก์ชันเพิ่มข้อมูลวัสดุ
const insertMaterial = async (row) => {
    const client = await pool.connect();
    try {
        const queryText = `
            INSERT INTO materials (matunit, mat_name)
            VALUES ($1, $2)
            ON CONFLICT (matunit, mat_name) DO NOTHING
        `;
        const values = [row.matunit, row.mat_name];
        console.log('Inserting material:', values);
        await client.query(queryText, values);
    } catch (error) {
        console.error('Error inserting material:', error);
        throw error;
    } finally {
        client.release();
    }
};

// ฟังก์ชันจัดการการอัปโหลด
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

            for (let R = 1; R <= range.e.r; R++) {
                const rowData = {
                    matunit: null,
                    mat_name: null
                };
                let validRow = true;

                for (const columnIndex of [0, 1]) {
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
                
                    if (columnIndex === 0) {
                        rowData.matunit = cellValue;
                    } else if (columnIndex === 1) {
                        rowData.mat_name = cellValue;
                    }
                }                

                if (validRow) {
                    try {
                        await insertMaterial(rowData);
                        data.push(rowData);
                    } catch (error) {
                        console.error('Error inserting row:', rowData, error);
                        errors.push(rowData);
                    }
                }
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
