// controllers/selectionController.js
const XLSX = require('xlsx');
const fs = require('fs');
const iconv = require('iconv-lite');
const pool = require('../config/db');

const logUserAction = async (userId, action) => {
    try {
        await pool.query('INSERT INTO user_activity_log (user_id, action) VALUES ($1, $2)', [userId, action]);
    } catch (err) {
        console.error('Error logging user action:', err);
        throw err;
    }
};

async function dashboardStatus(materialType) {
    try {
        const query = {
            text: 'INSERT INTO dashboard_status (mat_type) VALUES ($1) RETURNING id',
            values: [materialType]
        };

        const result = await pool.query(query);
        return result.rows[0].id;
    } catch (error) {
        console.error('Error inserting material type into dashboard_status:', error);
        throw error;
    }
}

async function insertDataIntoTable(materialType, matunit, quantity, dashboardStatusId) {
    try {
        let tableName;
        switch (materialType) {
            case 'PK_DIS':
                tableName = 'pk_dis';
                break;
            case 'PK_shoe':
                tableName = 'pk_shoe';
                break;
            case 'WD':
                tableName = 'wd';
                break;
            case 'PIN':
                tableName = 'pin';
                break;
            case 'BP':
                tableName = 'bp';
                break;
            case 'CHEMICAL':
                tableName = 'chemical';
                break;
            default:
                console.error('Invalid material type:', materialType);
                return;
        }

        const query = {
            text: `INSERT INTO ${tableName} (matunit, quantity, dashboard_status_id) VALUES ($1, $2, $3)`,
            values: [matunit, quantity, dashboardStatusId]
        };

        await pool.query(query);
    } catch (error) {
        console.error('Error inserting data into table:', error);
    }
}

const readFileAndProcess = async (filePath, materialType, sheetName, dashboardStatusId) => {
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
            console.error(`Sheet ${sheetName} not found in the workbook.`);
            throw new Error(`Sheet ${sheetName} not found in the workbook.`);
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

        const promises = insertions.map(record => insertDataIntoTable(materialType, record.matunit, record.quantity, dashboardStatusId));
        await Promise.all(promises);

        return filteredDataWithoutZeroMATUnit;
    } catch (error) {
        console.error('Error processing file:', error);
        throw error;
    }
};

const handleFileUpload = async (req, res, materialType, sheetName) => {
    try {
        if (!req.files || Object.keys(req.files).length === 0) {
            console.error('No files were uploaded.');
            return res.status(400).send('No files were uploaded.');
        }

        const file = req.files.file;

        console.log('Uploaded file info:', file);

        const fileExtension = file.name.split('.').pop();
        if (fileExtension !== 'xlsx') {
            console.error('Invalid file format. Only .xlsx files are allowed.');
            return res.status(400).json({ message: 'Invalid file format. Only .xlsx files are allowed.' });
        }

        await fs.promises.access(file.tempFilePath, fs.constants.R_OK);

        // Create dashboard status and get the ID
        const dashboardStatusId = await dashboardStatus(materialType);

        // Process file and get data
        const filteredDataWithoutZeroMATUnit = await readFileAndProcess(file.tempFilePath, materialType, sheetName, dashboardStatusId);

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

module.exports = {
    handleFileUpload
};


