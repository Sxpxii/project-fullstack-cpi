const XLSX = require('xlsx');
const fs = require('fs');
const pool = require('../config/db');
const calculationService = require('../services/calculationService');
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

// จัดการการอัปโหลดไฟล์
const handleFileUpload = async (req, res, materialType, sheetName) => {
    try {
        if (!req.files || Object.keys(req.files).length === 0) {
            console.error('No files were uploaded.');
            return res.status(400).send('No files were uploaded.');
        }

        const file = req.files.file;
        const approvedDate = req.body.approvedDate; 

        const fileExtension = file.name.split('.').pop();
        if (fileExtension !== 'xlsx') {
            console.error('Invalid file format. Only .xlsx files are allowed.');
            return res.status(400).json({ message: 'Invalid file format. Only .xlsx files are allowed.' });
        }

        await fs.promises.access(file.tempFilePath, fs.constants.R_OK);

        // Create dashboard status and get the ID
        const uploadId = await recordFileUpload(req.user.userId, file.name, materialType, approvedDate);

        await recordOperationStatus(uploadId, 'รอยืนยัน');
        
        // Process file and get data
        const filteredDataWithoutZeroMATUnit = await readFileAndProcess(file.tempFilePath, materialType, sheetName, null);
        
        await updateMaterialRequestsWithUploadId(uploadId);
        
        // Determine end column for formatting
        const endCol = materialType === 'CHEMICAL' ? 'K' : null;
        const endColIndex = endCol ? XLSX.utils.decode_col(endCol) : null;

        // Format data for output file
        const formattedData = filteredDataWithoutZeroMATUnit.map(row => {
            const formattedRow = [];
            const date = new Date(row[0]);
            const formattedDate = isNaN(date.getTime()) ? row[0] : date.toLocaleDateString('en-GB', {
                day: '2-digit',
                month: '2-digit',
                year: 'numeric'
            });
            formattedRow.push(formattedDate);
            for (let i = 1; i < row.length; i++) {
                // Stop reading at column L for CHEMICAL
                if (endColIndex && i > endColIndex) {
                    break;
                }
                formattedRow.push(typeof row[i] === 'number' ? row[i].toFixed(2) : row[i]);
            }
            return formattedRow.join('\t');
        }).join('\r\n');

        // Write formatted data to output file
        const outputFile = `${materialType}.txt`;
        await fs.promises.writeFile(outputFile, formattedData);

        await calculationService.calculateFIFO(uploadId);

        await calculationService.checkTask(uploadId);

        // Log user action if user ID exists
        const userId = req.user ? req.user.userId : null;
        if (userId) {
            await logUserAction(userId, `upload_${file.name}`);
            // Download output file and delete it after download
            res.download(outputFile, outputFile, async (err) => {
                if (err) {
                    console.error('Error downloading file:', err);
                    res.status(500).send('Error downloading file.');
                } else {
                    await fs.promises.unlink(outputFile);
                }
            });
        } else {
            console.error('User ID not found in request');
            res.status(400).send('User ID not found in request');
        }

    } catch (error) {
        console.error('Error handling file upload:', error);
        res.status(500).send('Internal Server Error');
    }
};


// อ่านและประมวลผลไฟล์
const readFileAndProcess = async (filePath, materialType, sheetName, uploadId) => {
    try {
        const workbook = XLSX.readFile(filePath, { cellDates: false, raw: false });

        let startRow, startCol, endCol;
        if (materialType === 'BP') {
            startRow = 2;
            startCol = 'A';
        } else if (materialType === 'CHEMICAL') {
            startRow = 5;
            startCol = 'B';
            endCol = 'L';
        } else {
            startRow = 3;
            startCol = 'K';
        }

        const worksheet = workbook.Sheets[sheetName];

        if (!worksheet) {
            throw new Error(`Sheet ${sheetName} not found.`);
        }

        const range = XLSX.utils.decode_range(worksheet['!ref']);
        range.s.r = startRow - 1;
        range.s.c = XLSX.utils.decode_col(startCol);
        const data = XLSX.utils.sheet_to_json(worksheet, {
            header: 1,
            range,
            cellDates: false,
            raw: false
        });

        let lastRow = data.length;
        for (let i = data.length - 1; i >= 0; i--) {
            if (data[i][5] !== '0' && data[i][5] !== '-' && data[i][5] !== '' && data[i][5] !== '1 empty item') {
                lastRow = i + 1;
                break;
            }
        }

        const filteredData = data.slice(0, lastRow);
        const filteredDataWithoutZeroMATUnit = filteredData.filter(row => row[5] !== '0' && row[5] !== '-' && row[5] !== '1 empty item' && row[5] !== '');

        const insertions = filteredDataWithoutZeroMATUnit.map(row => ({
            matunit: row[5],
            quantity: row[7] ? parseFloat(row[7].replace(/,/g, '')) : 0
        })).filter(record => record.matunit && !isNaN(record.quantity));

        const promises = insertions.map(async (record) => {
            const material = await getMaterial(record.matunit);
            if (material) {
                await insertmaterialrequests(material.material_id, uploadId, new Date(), record.quantity);
            } else {
                console.warn(`Material not found for matunit: ${record.matunit}`);
            }
        });

        await Promise.all(promises);

        return filteredDataWithoutZeroMATUnit;
    } catch (error) {
        console.error('Error processing file:', error);
        throw error;
    }
};

// ฟังก์ชันนี้จะอัปเดต uploadId หลังจากที่มันถูกบันทึกลง uploads แล้ว
const updateMaterialRequestsWithUploadId = async (uploadId) => {
    try {
        await pool.query(
            'UPDATE materialrequests SET upload_id = $1 WHERE upload_id IS NULL',
            [uploadId]
        );
    } catch (error) {
        console.error('Error updating material requests with uploadId:', error);
        throw error;
    }
};



// ดึงข้อมูลวัตถุดิบจากฐานข้อมูล
const getMaterial = async (matunit) => {
    const modifiedMatunit = matunit.replace(/\s*\(.*?\)\s*/g, '');
    const query = 'SELECT material_id, matunit, mat_name FROM materials WHERE matunit LIKE $1';
    const result = await pool.query(query, [`${modifiedMatunit}%`]); // ใช้ LIKE เพื่อให้ตรงกันแม้จะมีข้อความหลัง matunit
    return result.rows[0];
};

// บันทึกข้อมูลการสั่งเบิกวัตถุดิบในฐานข้อมูล
const insertmaterialrequests = async (materialId, uploadId, date, quantity) => {
    try {
        await pool.query(
            'INSERT INTO materialrequests (material_id, upload_id, date, quantity) VALUES ($1, $2, $3, $4)',
            [materialId, uploadId, date, quantity]
        );
    } catch (error) {
        console.error('Error inserting material request:', error);
        throw error;
    }
};



// บันทึกการอัปโหลดไฟล์
const recordFileUpload = async (userId, fileName, materialType, approvedDate) => {
    try {
        const result = await pool.query(
            'INSERT INTO uploads (user_id, filename, upload_date, material_type, approved_date, current_status) VALUES ($1, $2, NOW(), $3, $4, $5) RETURNING upload_id',
            [userId, fileName, materialType, approvedDate, 'รอยืนยัน']
        );
        return result.rows[0].upload_id;
    } catch (error) {
        console.error('Error recording file upload:', error);
        throw error;
    }
};

// บันทึกสถานะการดำเนินการ
const recordOperationStatus = async (uploadId, status) => {
    try {
        await pool.query(
            'INSERT INTO operationstatuses (upload_id, status, timestamp) VALUES ($1, $2, NOW())',
            [uploadId, status]
        );
    } catch (error) {
        console.error('Error recording operation status:', error);
        throw error;
    }
};


module.exports = {
    handleFileUpload,
};





