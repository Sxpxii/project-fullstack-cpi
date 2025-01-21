const fs = require('fs'); 
const XLSX = require('xlsx');
const path = require('path');
const { pool1 } = require('../config/db');

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
        // คำนวณยอดรวมจาก mat_requests
        const result = await pool1.query(
            'SELECT SUM(quantity) as total FROM mat_requests WHERE upload_id = $1',
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

const uploadFileAndConvert = (req, res) => {
    try {
        const { materialType, approvedDate } = req.body;

        if (!req.files || !req.files.file) {
            return res.status(400).json({ message: 'กรุณาอัปโหลดไฟล์' });
        }

        const { file } = req.files;
        const fileName = file.name;
        // ตรวจสอบรูปแบบไฟล์
        if (path.extname(fileName).toLowerCase() !== '.xlsx') {
            return res.status(300).json({ message: 'ไฟล์ไม่ถูกต้อง กรุณาอัปโหลดไฟล์ .xlsx' });
        }
        const filePath = path.join(__dirname, '..', 'temp', fileName);

        file.mv(filePath, async (err) => {
            if (err) {
                console.error(err);
                return res.status(500).send(err);
            }

            const userId = req.user.userId; // สมมติว่า req.user.id มีข้อมูล userId
            const uploadId = await recordFileUpload(userId, fileName, materialType, approvedDate);
            await recordOperationStatus(uploadId, 'รอรับงาน');

            const workbook = XLSX.readFile(filePath, { cellDates: false, raw: true });
            const sheetName = workbook.SheetNames[0];
            const worksheet = workbook.Sheets[sheetName];
            const range = XLSX.utils.decode_range(worksheet['!ref']);

            const groupedData = []; // ใช้เก็บข้อมูลที่จัดกลุ่ม
            let currentMatUnit = null;

            for (let row = 3; row <= range.e.r; row++) { // เริ่มอ่านจากแถวที่ 4 (index 3)
                const rowData = {};
                for (let col = range.s.c; col <= range.e.c; col++) {
                    const cellAddress = { r: row, c: col };
                    const cell = worksheet[XLSX.utils.encode_cell(cellAddress)];
                    //rowData[XLSX.utils.encode_col(col)] = cell ? cell.v : '';
                    if (cell) {
                        if (cell.t === 'n' && cell.v > 30000) {
                            // ถ้าค่าคือวันที่ในรูปแบบตัวเลข (Excel stores dates as numbers)
                            const date = new Date((cell.v - (25567 + 2)) * 86400 * 1000); // แปลงวันที่
                            const day = String(date.getUTCDate()).padStart(2, '0');
                            const month = String(date.getUTCMonth() + 1).padStart(2, '0');
                            const year = String(date.getUTCFullYear()).slice(-2); // ปี 2 หลัก
                            const formattedDate = `${day}-${month}-${year}`; // รูปแบบ DD-MM-YY
                            rowData[XLSX.utils.encode_col(col)] = formattedDate;
                        } else {
                            rowData[XLSX.utils.encode_col(col)] = cell.v; // เก็บค่าปกติ
                        }
                    } else {
                        rowData[XLSX.utils.encode_col(col)] = ''; // ค่าว่างถ้าไม่มีข้อมูล
                    }
                }
                console.log(`Row ${row}:`, rowData);

                // ตรวจสอบว่าข้อมูลในคอลัมน์ B เป็น MatUnit หรือ matLot
                const columnB = rowData.B || '';
                if (/^R\d{6}-\d{5}-\d{4}/.test(columnB)) {
                    // เป็น MatUnit
                    const [matUnit, mat_name] = columnB.split(':').map((s) => s.trim());
                    currentMatUnit = {
                        matUnit,
                        mat_name,
                        matLots: [],
                    };
                    groupedData.push(currentMatUnit);
                } else if (/^\d{2}\/\d{2}\/\d{4}/.test(columnB) && currentMatUnit) {
                    // เป็น matLot (อ่านข้อมูลแบบเต็ม ไม่แยก date และ lotInfo)
                    const matLot = {
                        matLot: columnB.trim(),
                        loc: rowData.C || '',
                        quantity: parseFloat(rowData.D || 0),
                        remainingQuantity: parseFloat(rowData.E || 0),
                        totalQuantity: parseFloat(rowData.F || 0),
                    };
                    currentMatUnit.matLots.push(matLot);
                } else if (/^\d{2}-\d{2}-\d{2,4}/.test(columnB) && currentMatUnit) {
                    // เป็น matLot ในรูปแบบ dd-mm-yy หรือ dd/mm/yyyy
                    const matLot = columnB.trim();
                    const date = matLot.split(' ')[0]; // แยกวันที่ออกจากข้อมูล
                    const lotInfo = matLot.split(' ')[1] || ''; // ข้อมูล Lot ที่เหลือ

                    const matLotData = {
                        matLot: `${date} ${lotInfo}`,
                        loc: rowData.C || '',
                        quantity: parseFloat(rowData.D || 0),
                        remainingQuantity: parseFloat(rowData.E || 0),
                        totalQuantity: parseFloat(rowData.F || 0),
                    };
                    currentMatUnit.matLots.push(matLotData);
                }
            }

            console.log('Grouped Data:', JSON.stringify(groupedData, null, 2));

            // ลบไฟล์ชั่วคราวหลังการประมวลผล
            fs.unlink(filePath, (unlinkErr) => {
                if (unlinkErr) console.error('Error deleting temp file:', unlinkErr);
            });

            // เรียกใช้ฟังก์ชันเพื่อบันทึกข้อมูลในฐานข้อมูล
            await saveDataToDatabase(groupedData, uploadId);
            await updateTotalQuantity(uploadId);

            res.status(200).json({ message: 'ประมวลผลไฟล์สำเร็จ', data: groupedData });
        });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'เกิดข้อผิดพลาดในการประมวลผลไฟล์' });
    }
};

const saveDataToDatabase = async (groupedData, uploadId) => {
    try {
        // เริ่มต้นการเชื่อมต่อฐานข้อมูล
        const client = await pool1.connect();

        // ใช้ transaction เพื่อให้การเพิ่มข้อมูลทั้งหมดเสร็จสมบูรณ์หรือล้มเหลวพร้อมกัน
        await client.query('BEGIN');

        for (const matUnitData of groupedData) {
            // บันทึกข้อมูล matUnit ลงใน material_matunits โดยไม่ต้องตรวจสอบ
            const insertRes = await client.query(
                'INSERT INTO material_matunits (mat_unit, mat_name, upload_id) VALUES ($1, $2, $3) RETURNING id',
                [matUnitData.matUnit, matUnitData.mat_name, uploadId]
            );
            const matUnitId = insertRes.rows[0].id; // รับค่า id ที่ถูกบันทึกมา

            // เพิ่มข้อมูลใน mat_requests
            for (const matLot of matUnitData.matLots) {
                await client.query(
                    'INSERT INTO mat_requests (mat_unit_id, mat_lot, loc, quantity, remaining_quantity, total_quantity, upload_id) VALUES ($1, $2, $3, $4, $5, $6, $7)',
                    [matUnitId, matLot.matLot, matLot.loc, matLot.quantity, matLot.remainingQuantity, matLot.totalQuantity, uploadId]
                );
            }
        }

        // ยืนยันการทำงานของ transaction
        await client.query('COMMIT');
        client.release();
    } catch (error) {
        console.error('Error saving data to database:', error);
        throw error; // ส่งข้อผิดพลาดไปให้ผู้เรียกใช้งาน
    }
};

module.exports = {
    uploadFileAndConvert
};
