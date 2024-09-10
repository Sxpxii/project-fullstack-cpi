// src/controllers/materialController.js
const fs = require('fs');
const path = require('path');
const XLSX = require('xlsx');
const pool = require('../config/db');

const logUserAction = async (userId, action) => {
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
};

// ฟังก์ชันเพิ่มข้อมูลวัตถุดิบ
const insertMaterial = async (row, skipDuplicateCheck = false) => {
    const client = await pool.connect();
    try {
        // ตรวจสอบว่ามีวัสดุนี้อยู่ในฐานข้อมูลแล้วหรือไม่
        const duplicateCheckQuery = `
            SELECT * FROM materials WHERE matunit = $1 AND mat_name = $2
        `;
        const duplicateCheckResult = await client.query(duplicateCheckQuery, [row.matunit, row.mat_name]);

        if (duplicateCheckResult.rows.length > 0 && !skipDuplicateCheck) {
            // หากมีข้อมูลวัสดุอยู่แล้วและไม่ได้ข้ามการตรวจสอบ ให้แจ้งเตือน
            return { success: false, message: 'ข้อมูลวัตถุดิบนี้มีอยู่แล้ว' };
        }

        // ถ้าไม่ซ้ำซ้อน ให้ทำการบันทึกข้อมูล
        const insertQuery = `
            INSERT INTO materials (matunit, mat_name)
            VALUES ($1, $2)
            ON CONFLICT (matunit, mat_name) DO NOTHING
        `;
        const values = [row.matunit, row.mat_name];
        await client.query(insertQuery, values);
        return { success: true, message: 'บันทึกข้อมูลวัสดุเรียบร้อยแล้ว' };
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
  
            if (columnIndex === 0) {
              rowData.matunit = cellValue;
            } else if (columnIndex === 1) {
              rowData.mat_name = cellValue;
            }
          }
  
          if (validRow) {
            try {
              await insertMaterial(rowData, true);
              data.push(rowData);
            } catch (error) {
              console.error('Error inserting row:', rowData, error);
              errors.push(rowData);
            }
          }
        }
  
        const userId = req.user ? req.user.userId : null;
        if (userId) {
          await logUserAction(userId, `เพิ่มวัตถุดิบใหม่_upload_${fileName}`);
        }
  
        res.json({ data, errors });
      });
    } catch (error) {
      console.error('Error:', error);
      res.status(500).send(error.message);
    }
  };
  

// ฟังก์ชันบันทึกข้อมูลวัสดุจากฟอร์ม
const insertMaterialFromForm = async (req, res) => {
    const { matunit, mat_name } = req.body;
  
    if (!matunit || !mat_name) {
      return res.status(400).json({ message: 'กรุณากรอกข้อมูลให้ครบถ้วน' });
    }
  
    try {
      const result = await insertMaterial({ matunit, mat_name });
  
      if (!result.success) {
        return res.status(400).json({ message: result.message });
      }
  
      res.status(201).json({ message: result.message });
  
      const userId = req.user ? req.user.userId : null;
      if (userId) {
        await logUserAction(userId, 'เพิ่มวัตถุดิบใหม่_form');
      }
  
    } catch (error) {
      console.error('Error inserting material from form:', error);
      res.status(500).json({ message: 'เกิดข้อผิดพลาดในการบันทึกข้อมูล' });
    }
  };
  

// ดึงข้อมูลวัสดุทั้งหมดจากตาราง materials
const getMaterials = async (req, res) => {
    try {
        const { matunit, mat_name } = req.query;
        let query = 'SELECT material_id, matunit, mat_name FROM materials';
        const queryParams = [];

        if (matunit || mat_name) {
            query += ' WHERE';
            if (matunit) {
                query += ' matunit ILIKE $1';
                queryParams.push(`%${matunit}%`);
            }
            if (mat_name) {
                if (queryParams.length > 0) {
                    query += ' AND';
                }
                query += ' mat_name ILIKE $2';
                queryParams.push(`%${mat_name}%`);
            }
        }

        const result = await pool.query(query, queryParams);
        res.json(result.rows);
    } catch (error) {
        console.error('Error fetching materials:', error);
        res.status(500).json({ message: 'เกิดข้อผิดพลาดในการดึงข้อมูล' });
    }
};

// ฟังก์ชันอัปเดตข้อมูลวัสดุ
const updateMaterial = async (req, res) => {
    const { matunit, mat_name } = req.body;
    const { material_id } = req.params;
    
    try {
      const updateQuery = `
        UPDATE materials
        SET matunit = $1, mat_name = $2
        WHERE material_id = $3
      `;
      const values = [matunit, mat_name, material_id];
      await pool.query(updateQuery, values);
      
      res.json({ success: true, message: 'ข้อมูลวัสดุถูกอัปเดตเรียบร้อยแล้ว' });
    } catch (error) {
      console.error('Error updating material:', error);
      res.status(500).send('เกิดข้อผิดพลาดในการอัปเดตข้อมูลวัสดุ');
    }
  };
  

const deleteMaterial = async (req, res) => {
    const { material_id } = req.params;
    try {
      await pool.query('DELETE FROM materials WHERE material_id = $1', [material_id]);
      res.status(200).json({ message: 'ลบข้อมูลเรียบร้อยแล้ว' });
    } catch (error) {
      console.error('Error deleting material:', error);
      res.status(500).json({ message: 'เกิดข้อผิดพลาดในการลบข้อมูล' });
    }
  };
  

module.exports = {
    handleUpload,
    insertMaterialFromForm, 
    getMaterials,
    deleteMaterial,
    updateMaterial, 
};
