require('dotenv').config();
const { Pool } = require('pg');

/*const pool = new Pool({
    user: process.env.DB_USER,
    host: process.env.DB_HOST,
    database: process.env.DB_NAME,
    password: process.env.DB_PASSWORD,
    port: process.env.DB_PORT,
});

module.exports = pool;*/

// เชื่อมต่อฐานข้อมูล 1
const pool1 = new Pool({
    user: process.env.DB_USER,
    host: process.env.DB_HOST,
    database: process.env.DB_NAME,
    password: process.env.DB_PASSWORD,
    port: process.env.DB_PORT,
});

// เชื่อมต่อฐานข้อมูล 2
const pool2 = new Pool({
    user: process.env.DB2_USER,
    host: process.env.DB2_HOST,
    database: process.env.DB2_NAME,
    password: process.env.DB2_PASSWORD,
    port: process.env.DB2_PORT,
});

console.log('DB_USER:', process.env.DB_USER);
console.log('DB_USER:', process.env.DB_HOST);
console.log('DB_USER:', process.env.DB_NAME);
console.log('DB_USER:', process.env.DB_PASSWORD);
console.log('DB_USER:', process.env.DB_PORT);

console.log('DB2_USER:', process.env.DB2_USER);


module.exports = { pool1, pool2 };