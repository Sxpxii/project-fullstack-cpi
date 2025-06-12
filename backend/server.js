const express = require('express');
const { pool1 } = require('./config/db');
const http = require('http');
const { Server } = require('socket.io');
const cors = require('cors');
const fileUpload = require('express-fileupload');
const setupSocket = require('./socket');
const loginRouter = require('./routes/login');
const dashboardRouter = require('./routes/dashboard');
const dashboardClerkRouter = require('./routes/dashboardClerk');
const taskRouter = require('./routes/task');
const UserManagementRouter = require('./routes/UserManagement');
const supClerkdashboardRouter = require('./routes/supClerkdashboard');
const notificationRouter = require('./routes/notifications');
const supClerkRouter = require('./routes/supClerk');
const UploadItemRequestRouter = require('./routes/UploadItemRequest')
const supClerkReportRouter = require('./routes/supClerkReport')

const app = express();
const host = '0.0.0.0'; 
const server = http.createServer(app); // สร้าง HTTP server จาก Express app

const PORT = process.env.PORT || 3002;
//const PORT = process.env.PORT || 3003;

// Middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cors({
    origin: '*', // หรือกำหนดเป็น IP เครื่องที่คุณจะเข้าถึงได้ เช่น 'http://192.168.5.93:5173'
  }));
app.use(fileUpload({
    limits: { fileSize: 50 * 1024 * 1024 },
    useTempFiles: true, // ใช้ temp files สำหรับการอัพโหลด
    tempFileDir: '/tmp/' // ตั้งค่า temp directory
}));

app.use((req, res, next) => {
    console.log(`${req.method} ${req.url}`);
    next();
    req.io = io; // ใส่ io เข้าไปใน request object
});

app.use((err, req, res, next) => {
    console.error('Unhandled error:', err);
    res.status(500).send('Internal Server Error');
});

// Routes
app.use('/api', loginRouter);
app.use('/itemrequests', UploadItemRequestRouter);
app.use('/dashboard', dashboardRouter);
app.use('/dashboardClerk', dashboardClerkRouter);
app.use('/tasks', taskRouter);
app.use('/UserManagement', UserManagementRouter);
app.use('/supClerkdashboard', supClerkdashboardRouter);
app.use('/alert', notificationRouter);
app.use('/supClerkTasks', supClerkRouter);
app.use('/supClerkReports', supClerkReportRouter);

// Additional GET routes if needed
app.get('/', (req, res) => {
    res.send('GET request received for root');
});

// ติดตั้ง Socket.IO
const io = setupSocket(server);

server.listen(PORT, () => {
    console.log(`Server is running on port http://${host}:${PORT}/`);
});
