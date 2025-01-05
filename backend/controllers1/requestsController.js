const XLSX = require('xlsx');
const fs = require('fs');
const { pool1 } = require('../config/db');
const calculationService = require('../services/calculationService');
const {logUserAction} = require('../controllers1/loginController1');

// จัดการการอัปโหลดไฟล์
const handleFileUpload = async (req, res, materialType, sheetName) => {
    let uploadId;
    let client;
    try {
        client = await pool1.connect();
        if (!req.files || Object.keys(req.files).length === 0) {
            console.error('No files were uploaded.');
            return res.status(400).send('No files were uploaded.');
        }

        const file = req.files.file;
        const approvedDate = req.body.approvedDate; 

        const fileExtension = file.name.split('.').pop();
        if (fileExtension !== 'xlsx') {
            console.error('Invalid file format. Only .xlsx files are allowed.');
            return res.status(300).json({ message: 'Invalid file format. Only .xlsx files are allowed.' });
        }

        await fs.promises.access(file.tempFilePath, fs.constants.R_OK);

        // Create dashboard status and get the ID
        uploadId = await recordFileUpload(req.user.userId, file.name, materialType, approvedDate);

        await recordOperationStatus(uploadId, 'รอรับงาน');
        
        // Process file and get data
        const filteredDataWithoutZeroMATUnit = await readFileAndProcess(file.tempFilePath, materialType, sheetName, null);
        
        // ตรวจสอบว่าไม่มีข้อมูลที่ไม่ตรงตามเงื่อนไข
        if (filteredDataWithoutZeroMATUnit.length === 0) {
            throw new Error('No valid material data found in the file.');
        }

        await updateMaterialRequestsWithUploadId(uploadId);

        const fifoResult = await calculationService.calculateFIFO(uploadId);
        if (fifoResult.insufficientStock && fifoResult.insufficientStock.length > 0) {
            return res.status(400).json({
                message: 'การสั่งเบิกบางรายการไม่สำเร็จเนื่องจากยอดวัตถุดิบไม่เพียงพอ',
                insufficientMaterials: fifoResult.insufficientStock,
            });
        }

        await calculationService.checkTask(uploadId);

        await updateTotalQuantity(uploadId);

        // Log user action if user ID exists
        const userId = req.user ? req.user.userId : null;
        if (userId) {
            await logUserAction(userId, `upload_${file.name}`);
        } else {
            console.error('User ID not found in request');
            res.status(400).send('User ID not found in request');
        }
        return res.status(200).json({ message: 'การสั่งเบิกเสร็จสิ้นและกำลังอยู่ระหว่างการตรวจสอบ' });

    } catch (error) {
        console.error('Error handling file upload:', error);
        if (uploadId) {
            await rollbackData(client, uploadId);
        }

        if (error.statusCode && error.message) {
            // ส่งกลับ error ที่มีการกำหนดเอง
            res.status(error.statusCode).json({ message: error.message });
        } else {
            // กรณี error อื่น ๆ
            res.status(500).send('Internal Server Error');
        }
    } finally {
        if (client) {
            client.release(); // ปล่อย connection
        }
    }
};

const rollbackData = async (client, uploadId) => {
    try {
        await client.query('BEGIN');
        await client.query('DELETE FROM materialrequests WHERE upload_id = $1', [uploadId]);
        await client.query('DELETE FROM operationstatuses WHERE upload_id = $1', [uploadId]);
        await client.query('DELETE FROM uploads WHERE upload_id = $1', [uploadId]);
        await client.query('COMMIT');
        console.log(`Rolled back data for uploadId: ${uploadId}`);
        console.log(`Deleted from materialrequests for uploadId: ${uploadId}`);
        console.log(`Deleted from operationstatuses for uploadId: ${uploadId}`);
        console.log(`Deleted from uploads for uploadId: ${uploadId}`);
    } catch (err) {
        await client.query('ROLLBACK');
        console.error('Error during rollback:', err);
        throw err;
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
            throw new Error(`ไม่พบชีตที่ชื่อ ${sheetName}.`);
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
        console.error("Error processing file:", error.message);
        throw { message: error.message, statusCode: 400 };
    }
};

// ฟังก์ชันนี้จะอัปเดต uploadId หลังจากที่มันถูกบันทึกลง uploads แล้ว
const updateMaterialRequestsWithUploadId = async (uploadId) => {
    try {
        await pool1.query(
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
    const result = await pool1.query(query, [`${modifiedMatunit}%`]); // ใช้ LIKE เพื่อให้ตรงกันแม้จะมีข้อความหลัง matunit
    return result.rows[0];
};

// บันทึกข้อมูลการสั่งเบิกวัตถุดิบในฐานข้อมูล
const insertmaterialrequests = async (materialId, uploadId, date, quantity) => {
    try {
        await pool1.query(
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
        const result = await pool1.query(
            'INSERT INTO uploads (user_id, filename, upload_date, material_type, approved_date, current_status, last_status_update ) VALUES ($1, $2, NOW(), $3, $4, $5, NOW()) RETURNING upload_id',
            [userId, fileName, materialType, approvedDate, 'รอรับงาน']
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
        await pool1.query(
            'INSERT INTO operationstatuses (upload_id, status, timestamp) VALUES ($1, $2, NOW())',
            [uploadId, status]
        );

    } catch (error) {
        console.error('Error recording operation status:', error);
        throw error;
    }
};

// ตัวอย่างการคำนวณยอดรวมและอัปเดตใน uploads
const updateTotalQuantity = async (uploadId) => {
    try {
        // คำนวณยอดรวมจาก materialrequests
        const result = await pool1.query(
            'SELECT SUM(quantity) as total FROM materialrequests WHERE upload_id = $1',
            [uploadId]
        );

        const totalQuantity = result.rows[0].total || 0;

        // อัปเดต total_quantity ใน uploads
        await pool1.query(
            'UPDATE uploads SET total_quantity = $1 WHERE upload_id = $2',
            [totalQuantity, uploadId]
        );
    } catch (error) {
        console.error('Error updating total quantity:', error);
        throw error;
    }
};

// ตรวจสอบยอดคงเหลือของวัตถุดิบก่อนการบันทึกคำสั่งเบิก
const checkMaterialBalance = async (materialId, quantityRequested) => {
    const result = await pool1.query(
        'SELECT remaining_quantity FROM materialbalances WHERE material_id = $1',
        [materialId]
    );
    const remainingQuantity = result.rows[0]?.remaining_quantity || 0;
    return remainingQuantity >= quantityRequested;
};


module.exports = {
    handleFileUpload,
    getMaterial,
    insertmaterialrequests
};





