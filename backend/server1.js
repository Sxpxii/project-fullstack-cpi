const express = require('express');
const cors = require('cors');
const fileUpload = require('express-fileupload');
const loginRouter = require('./routes1/login');
const requestsRouter = require('./routes1/requests');
const balanceRouter = require('./routes1/balance');
const dashboardRouter = require('./routes1/dashboard');
const taskRouter = require('./routes1/task')
const uploadMaterialRouter = require('./routes1/uploadMaterial');
const supervisorDashboardRouter = require('./routes1/supervisorDashboard');
const UserManagementRoutes = require('./routes1/UserManagement')

const app = express();
const PORT = process.env.PORT || 3001;

// Middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cors());
app.use(fileUpload({
    useTempFiles: true, // ใช้ temp files สำหรับการอัพโหลด
    tempFileDir: '/tmp/' // ตั้งค่า temp directory
}));

app.use((req, res, next) => {
    console.log(`${req.method} ${req.url}`);
    next();
});

app.use((err, req, res, next) => {
    console.error('Unhandled error:', err);
    res.status(500).send('Internal Server Error');
});

// Routes
app.use('/api', loginRouter);
app.use('/requests', requestsRouter);
app.use('/balance', balanceRouter);
app.use('/dashboard', dashboardRouter);
app.use('/tasks', taskRouter);
app.use('/materials', uploadMaterialRouter);
app.use('/supervisorDashboard', supervisorDashboardRouter);
app.use('/UserManagement', UserManagementRoutes);

// Additional GET routes if needed
app.get('/', (req, res) => {
    res.send('GET request received for root');
});

app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
});
