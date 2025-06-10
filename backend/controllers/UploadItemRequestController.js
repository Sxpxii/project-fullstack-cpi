const fs = require('fs'); 
const XLSX = require('xlsx');
const path = require('path');
const { pool1 } = require('../config/db');
const iconv = require('iconv-lite');

// บันทึกการอัปโหลดไฟล์
const recordFileUpload = async (userId, fileName, materialType, approvedDate, isUrgent) => {
    try {
        const result = await pool1.query(
            'INSERT INTO uploads (user_id, filename, upload_date, material_type, approved_date, current_status, last_status_update, isUrgent ) VALUES ($1, $2, NOW(), $3, $4, $5, NOW(), $6) RETURNING upload_id',
            [userId, fileName, materialType, approvedDate, 'รอรับงาน', isUrgent]
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
        return totalQuantity;
    } catch (error) {
        console.error('Error updating total quantity:', error);
        throw error;
    }
};

const rollbackData = async (uploadId) => {
    try {
        await pool1.query('DELETE FROM mat_requests WHERE upload_id = $1', [uploadId]);
        await pool1.query('DELETE FROM material_matunits WHERE upload_id = $1', [uploadId]);
        await pool1.query('DELETE FROM operationstatuses WHERE upload_id = $1', [uploadId]);
        await pool1.query('DELETE FROM uploads WHERE upload_id = $1', [uploadId]);
        await pool1.query('COMMIT');
        console.log(`Rolled back data for uploadId: ${uploadId}`);
    } catch (err) {
        console.error("Error", err);
        throw err; // เพิ่มการโยนข้อผิดพลาดกลับ
    }
};

const uploadFileAndConvert = (req, res) => {
    try {
        const { materialType, approvedDate, isUrgent } = req.body;

        if (!req.files || !req.files.file) {
            return res.status(400).json({ message: 'กรุณาอัปโหลดไฟล์' });
        }

        const { file } = req.files;
        const fileName = file.name;
        
        const filePath = path.join(__dirname, '..', 'temp', fileName);

        file.mv(filePath, async (err) => {
            if (err) {
                console.error(err);
                return res.status(500).send(err);
            }

            const userId = req.user.userId; // สมมติว่า req.user.id มีข้อมูล userId
            const uploadId = await recordFileUpload(userId, fileName, materialType, approvedDate, isUrgent);
            await recordOperationStatus(uploadId, 'รอรับงาน');

            /*const workbook = XLSX.readFile(filePath, { cellDates: false, raw: true });
            const sheetName = workbook.SheetNames[0];
            const worksheet = workbook.Sheets[sheetName];
            const range = XLSX.utils.decode_range(worksheet['!ref']);*/

            let workbook;
            try {
                // ลองอ่านไฟล์ด้วย .xls/.xlsx
                workbook = XLSX.readFile(filePath, { type: 'binary', cellDates: false, raw: true, codepage: 874});
            } catch (error) {
                return res.status(500).json({ message: 'ไม่สามารถเปิดไฟล์ Excel ได้' });
            }

            const sheetName = workbook.SheetNames[0];
            const worksheet = workbook.Sheets[sheetName];
            const range = XLSX.utils.decode_range(worksheet['!ref']);

            const groupedData = []; // ใช้เก็บข้อมูลที่จัดกลุ่ม
            let currentMatUnit = null;
            let isCS = false;

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
                            rowData[XLSX.utils.encode_col(col)] = cell.v ;  // เก็บค่าปกติ
                        }
                    } else {
                        rowData[XLSX.utils.encode_col(col)] = ''; // ค่าว่างถ้าไม่มีข้อมูล
                    }
                }
                console.log(`Row ${row}:`, rowData);

                // ตรวจสอบว่าข้อมูลในคอลัมน์ B เป็น MatUnit หรือ matLot
                const columnB = rowData.B || '';

                // ตรวจสอบรูปแบบของ MatUnit
                const matUnitRegex1 = /^R\d{6}-\d{5}-\d{4}/;  // เดิม
                const matUnitRegex2 = /^P\d{6}-\d{5} \(.*?\)/; // ใหม่ (แบบ "P210201-05220 (ใบ)")
                const matUnitRegex3 = /^R\d{6}-\d{5}-\d{4} \(.*?\)/;
                const matUnitRegex4 = /^R\d{6}-\d{5}-\d{4} \(.*?\) \(.*?\)/;
                const matUnitRegex5 = /^[-\w/()]+(?:-\w+)? \([\wก-๙]+\):/;

                if (matUnitRegex1.test(columnB) || matUnitRegex2.test(columnB) || matUnitRegex3.test(columnB) || matUnitRegex4.test(columnB)|| matUnitRegex5.test(columnB)) {
                    isCS = false;
                    // เป็น MatUnit
                    const [matUnit, mat_name] = columnB.split(':').map((s) => s.trim());
                    if (materialType === 'WD' && mat_name.includes('(CS)')) {
                        isCS = true;
                    }
                    
                    currentMatUnit = {
                        matUnit,
                        mat_name,
                        isCS,
                        matLots: [],
                        
                    };
                    groupedData.push(currentMatUnit);
                } else if (/^\d{2}\/\d{2}\/\d{2,4}/.test(columnB) && currentMatUnit) {
                    // เป็น matLot (อ่านข้อมูลแบบเต็ม โดยไม่มีข้อมูล Lot ด้านหลัง เช่น 01/01/2024, 15/05/23)
                    const matLot = {
                        matLot: columnB.trim(),
                        loc: rowData.C || '',
                        quantity: parseFloat((rowData.D || 0).toString().replace(/,/g, '')),
                        remainingQuantity: parseFloat((rowData.E || 0).toString().replace(/,/g, '')),
                        totalQuantity: parseFloat((rowData.F || 0).toString().replace(/,/g, '')),
                    };
                    currentMatUnit.matLots.push(matLot);
                } else if (/^\d{2}-\d{2}-\d{2,4}/.test(columnB) && currentMatUnit) {
                    // เป็น matLot ในรูปแบบ dd-mm-yy หรือ dd/mm/yyyy (แยก lotInfo หลังวันที่ด้วย space) เช่น 01-01-2024 LOT123, 15-05-23 A1
                    const matLot = columnB.trim();
                    const date = matLot.split(' ')[0]; // แยกวันที่ออกจากข้อมูล
                    const lotInfo = matLot.split(' ')[1] || ''; // ข้อมูล Lot ที่เหลือ

                    const matLotData = {
                        matLot: `${date} ${lotInfo}`,
                        loc: rowData.C || '',
                        quantity: parseFloat((rowData.D || 0).toString().replace(/,/g, '')),
                        remainingQuantity: parseFloat((rowData.E || 0).toString().replace(/,/g, '')),
                        totalQuantity: parseFloat((rowData.F || 0).toString().replace(/,/g, '')),
                    };
                    currentMatUnit.matLots.push(matLotData);
                } else if (/^\d{4}PRC\d{6}$/.test(columnB) && currentMatUnit) {
                    // รหัส Lot แบบพิเศษ เช่น 2024PRC000123, 2023PRC123456
                    const matLot = columnB.trim();
                    const date = matLot.split(' ')[0]; // แยกวันที่ออกจากข้อมูล
                    const lotInfo = matLot.split(' ')[1] || ''; // ข้อมูล Lot ที่เหลือ

                    const matLotData = {
                        matLot: `${date} ${lotInfo}`,
                        loc: rowData.C || '',
                        quantity: parseFloat((rowData.D || 0).toString().replace(/,/g, '')),
                        remainingQuantity: parseFloat((rowData.E || 0).toString().replace(/,/g, '')),
                        totalQuantity: parseFloat((rowData.F || 0).toString().replace(/,/g, '')),
                    };
                    currentMatUnit.matLots.push(matLotData);
                } else if (/^\d{2}[./-]\d{2}[./-]\d{2,4}( .*)?$/.test(columnB) && currentMatUnit) {
                    // รองรับทั้ง dd-mm-yyyy, dd/mm/yyyy, dd.mm.yyyy พร้อม lot ด้านหลัง เช่น 01-01-2024 BATCH01, 15/05/2023 A1, 31.12.22 ZL
                    const parts = columnB.trim().split(' ');
                    const datePart = parts[0];
                    const lotInfo = parts.slice(1).join(' ') || '';
                    const matLotData = {
                        matLot: `${datePart} ${lotInfo}`.trim(),
                        loc: rowData.C || '',
                        quantity: parseFloat((rowData.D || 0).toString().replace(/,/g, '')),
                        remainingQuantity: parseFloat((rowData.E || 0).toString().replace(/,/g, '')),
                        totalQuantity: parseFloat((rowData.F || 0).toString().replace(/,/g, '')),
                    };
                    currentMatUnit.matLots.push(matLotData);
                } else if (/^C\d{6}-\d{4};\d{2}\/\d{2}\/\d{4}-[A-Z]$/.test(columnB) && currentMatUnit) {
                    // รูปแบบ C240828-0922;29/08/2024-F, C240101-0001;01/01/2024-A
                    const [lotId, dateCode] = columnB.split(';');
                    
                    const matLotData = {
                        matLot: `${lotId.trim()} ${dateCode.trim()}`,
                        loc: rowData.C || '',
                        quantity: parseFloat((rowData.D || 0).toString().replace(/,/g, '')),
                        remainingQuantity: parseFloat((rowData.E || 0).toString().replace(/,/g, '')),
                        totalQuantity: parseFloat((rowData.F || 0).toString().replace(/,/g, '')),
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
            try {
                await saveDataToDatabase(groupedData, uploadId);
                const totalQuantity = await updateTotalQuantity(uploadId);
                await checkForDuplicateRequests(uploadId, approvedDate, materialType);
                const savedData = await getUploadedData(uploadId);
                res.status(200).json({ message: 'ประมวลผลไฟล์สำเร็จ', data: savedData, uploadId: uploadId, totalQuantity: totalQuantity, });
            } catch (dbError) {
                console.error('Database error:', dbError);
                await rollbackData(uploadId); // Rollback in case of database error
                res.status(500).json({ message: 'เกิดข้อผิดพลาดในการบันทึกข้อมูล' });
            }
        });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'เกิดข้อผิดพลาดในการประมวลผลไฟล์' });
    }
};

const getUploadedData = async (uploadId) => {
    try {
        const query = `
            SELECT 
                m.id,
                m.mat_name,
                m.mat_unit,
                JSON_AGG(
                    JSON_BUILD_OBJECT(
                        'id', r.id,
                        'mat_unit_id', r.mat_unit_id,
                        'mat_lot', r.mat_lot,
                        'loc', r.loc,
                        'quantity', r.quantity,
                        'remainingQuantity',r.remaining_quantity,
                        'total_quantity', r.total_quantity
                    )
                    ORDER BY r.id
                ) AS details
            FROM material_matunits m
            JOIN mat_requests r ON m.id = r.mat_unit_id
            WHERE r.upload_id = $1
            GROUP BY m.id, m.mat_name, m.mat_unit
            ORDER BY m.id;
        `;
        const { rows } = await pool1.query(query, [uploadId]);

        if (!rows || rows.length === 0) {
            throw new Error('ไม่พบข้อมูล');
        }

        const resultWithSequence = rows.map((row, index) => ({
            sequence: index + 1,
            ...row,
        }));

        console.log("Result with Sequence:", JSON.stringify(resultWithSequence, null, 2));
        return resultWithSequence;
    } catch (err) {
        console.error("Error fetching task details", err);
        throw err; // เพิ่มการโยนข้อผิดพลาดกลับ
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
                    'INSERT INTO mat_requests (mat_unit_id, mat_lot, loc, quantity, remaining_quantity, total_quantity, upload_id, is_cs) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)',
                    [matUnitId, matLot.matLot, matLot.loc, matLot.quantity, matLot.remainingQuantity, matLot.totalQuantity, uploadId, matUnitData.isCS || false,]
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

const ReturnData = async (req, res) => {
    const { uploadId } = req.body;
  
    // Validate input
    if (!uploadId) {
      return res.status(400).json({
        message: "Upload ID is required.",
      });
    }
  
    const client = await pool1.connect(); // Connect to the database
    try {
      // Begin transaction
      await client.query("BEGIN");
  
      // Delete data from mat_requests
      await client.query("DELETE FROM mat_requests WHERE upload_id = $1", [uploadId]);
  
      // Delete data from material_matunits
      await client.query("DELETE FROM material_matunits WHERE upload_id = $1", [uploadId]);
  
      // Delete data from operationstatuses
      await client.query("DELETE FROM operationstatuses WHERE upload_id = $1", [uploadId]);
  
      // Delete data from uploads
      await client.query("DELETE FROM uploads WHERE upload_id = $1", [uploadId]);
  
      // Commit transaction
      await client.query("COMMIT");
  
      // Send success response
      return res.status(200).json({
        message: "Data successfully rolled back.",
      });
    } catch (error) {
      // Rollback transaction in case of error
      await client.query("ROLLBACK");
      console.error("Error during ReturnData:", error);
  
      return res.status(500).json({
        message: "An error occurred while rolling back data.",
        error: error.message,
      });
    } finally {
      client.release(); // Release the database client
    }
  };

const checkForDuplicateRequests = async (uploadId, approvedDate, materialType) => {
    try {
      // 1. หา upload อื่น ๆ ที่ approved_date และ material_type เดียวกัน
      const { rows: relatedUploads } = await pool1.query(
        `SELECT upload_id FROM uploads
         WHERE approved_date = $1 AND material_type = $2 AND upload_id != $3`,
        [approvedDate, materialType, uploadId]
      );
  
      if (relatedUploads.length === 0) return;
  
      // 2. ดึง mat_unit และ mat_name จาก upload ปัจจุบัน
    const { rows: currentMaterials } = await pool1.query(
        `SELECT mm.id AS mat_unit_id, mm.mat_name, mr.id AS request_id
         FROM material_matunits mm
         JOIN mat_requests mr ON mm.id = mr.mat_unit_id
         WHERE mm.upload_id = $1 AND mr.upload_id = $1`,
        [uploadId]
      );
  
      for (const upload of relatedUploads) {
        const otherUploadId = upload.upload_id;
  
        // 3. ดึง mat_unit และ mat_name ของ upload ที่มีวันที่และประเภทเดียวกัน
        const { rows: otherMaterials } = await pool1.query(
          `SELECT mm.id AS mat_unit_id, mm.mat_name, mr.id AS request_id
           FROM material_matunits mm
           JOIN mat_requests mr ON mm.id = mr.mat_unit_id
           WHERE mm.upload_id = $1 AND mr.upload_id = $1`,
          [otherUploadId]
        );
  
        // 4. เปรียบเทียบ mat_name
        for (const current of currentMaterials) {
          for (const other of otherMaterials) {
            if (current.mat_name === other.mat_name) {
              // 5. ถ้า mat_name ซ้ำกัน ให้ update is_duplicate = true
              await pool1.query(
                `UPDATE mat_requests SET is_duplicate = true WHERE id = $1`,
                [current.request_id]
              );
              await pool1.query(
                `UPDATE mat_requests SET is_duplicate = true WHERE id = $1`,
                [other.request_id]
              );
            }
          }
        }
      }
  
      console.log('✅ ตรวจสอบข้อมูลซ้ำเสร็จสิ้น');
    } catch (error) {
      console.error('❌ เกิดข้อผิดพลาดในการตรวจสอบข้อมูลซ้ำ:', error);
    }
  };

module.exports = {
    uploadFileAndConvert,
    ReturnData
};
