module.exports = {
  apps: [
    {
      name: 'backend', // ตั้งชื่อแอป
      script: './backend/server1.js',              // ไฟล์หลักที่ใช้รันเซิร์ฟเวอร์
      watch: true,   
      autorestart: true, // Ensures the app restarts on crash
      max_memory_restart: "1000M",                   // จะ restart app เมื่อมีการแก้ไขไฟล์
      env_production: {
        NODE_ENV: 'production',         // ENV สำหรับ production
        PORT: 3002
      }
    }
  ]
};
