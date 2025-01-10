const express = require('express');
const { pool1 } = require('./config/db');
const http = require('http');
const { Server } = require('socket.io');
const cors = require('cors');
const fileUpload = require('express-fileupload');
const setupSocket = require('./socket');
const loginRouter = require('./routes1/login');
const requestsRouter = require('./routes1/requests');
const balanceRouter = require('./routes1/balance');
const dashboardRouter = require('./routes1/dashboard');
const dashboardClerkRouter = require('./routes1/dashboardClerk')
const taskRouter = require('./routes1/task');
const uploadMaterialRouter = require('./routes1/uploadMaterial');
const supervisorDashboardRouter = require('./routes1/supervisorDashboard');
const supervisorAnalysisRouter = require('./routes1/supervisorAnalysis');
const UserManagementRouter = require('./routes1/UserManagement');
const supClerkdashboardRouter = require('./routes1/supClerkdashboard');
const notificationRouter = require('./routes1/notifications');
const supClerkRouter = require('./routes1/supClerk');
const UploadItemRequestRouter = require('./routes1/UploadItemRequest')

const app = express();
const host = '0.0.0.0'; 
const server = http.createServer(app); // สร้าง HTTP server จาก Express app
/*const io = new Server(server, {
    cors: {
        origin: '*', // หรือกำหนดให้ตรงกับแอปพลิเคชันของคุณ
        methods: ['GET', 'POST'], // สามารถเพิ่ม HTTP methods ที่ต้องการได้
    }
});*/


const PORT = process.env.PORT || 3002;

// Middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cors({
    origin: '*', // หรือกำหนดเป็น IP เครื่องที่คุณจะเข้าถึงได้ เช่น 'http://192.168.5.93:5173'
  }));
app.use(fileUpload({
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
app.use('/requests', requestsRouter);
app.use('/balance', balanceRouter);
app.use('/itemrequests', UploadItemRequestRouter);
app.use('/dashboard', dashboardRouter);
app.use('/dashboardClerk', dashboardClerkRouter);
app.use('/tasks', taskRouter);
app.use('/materials', uploadMaterialRouter);
app.use('/supervisorDashboard', supervisorDashboardRouter);
app.use('/supervisorAnalysis', supervisorAnalysisRouter);
app.use('/UserManagement', UserManagementRouter);
app.use('/supClerkdashboard', supClerkdashboardRouter);
app.use('/alert', notificationRouter);
app.use('/supClerkTasks', supClerkRouter);

// Additional GET routes if needed
app.get('/', (req, res) => {
    res.send('GET request received for root');
});

// Socket.IO event handling
/*io.on('connection', (socket) => {
    console.log('A user connected:', socket.id);

    // ฟังก์ชันดึงรายชื่อผู้ใช้งานยกเว้นผู้ที่ล็อกอิน
    socket.on("getUsersCurrent", (data, callback) => {
        const { userId } = data;
        console.log("Received getUsersCurrent request for userId:", userId);
        pool1.query(
            "SELECT user_id, username FROM users1 WHERE user_id != $1",
            [userId]
        ).then((result) => {
            console.log("Fetched users excluding current user:", result.rows);
            callback(result.rows);
        }).catch((error) => {
            console.error("Error fetching users:", error);
            callback({ error: "Internal server error" });
        });
    });

    // ฟังก์ชันสำหรับสร้างห้องแชท
    socket.on("createRoom", ({ sender_id, recipient_id }, callback) => {
        pool1.query(
            "INSERT INTO chats DEFAULT VALUES RETURNING chat_id",
            [],
            (err, result) => {
                if (err) return callback({ success: false, error: err });
                const chatId = result.rows[0].chat_id;
    
                // เพิ่มสมาชิกห้องแชท
                const members = [
                    { chat_id: chatId, user_id: sender_id },
                    { chat_id: chatId, user_id: recipient_id },
                ];
                const values = members
                    .map((member) => `(${member.chat_id}, ${member.user_id})`)
                    .join(",");
                pool1.query(
                    `INSERT INTO chat_members (chat_id, user_id) VALUES ${values} RETURNING id`,
                    [],
                    (err) => {
                        if (err) return callback({ success: false, error: err });
    
                        // ดึงชื่อผู้ใช้จากตาราง users1
                        pool1.query(
                            `SELECT user_id, username FROM users1 WHERE user_id IN ($1, $2)`,
                            [sender_id, recipient_id],
                            (err, result) => {
                                if (err) return callback({ success: false, error: err });
                                const users = result.rows;
    
                                // ตั้งค่า name_in_view สำหรับแต่ละสมาชิก
                                const nameUpdates = members.map((member) => {
                                    const otherUser = users.find(
                                        (user) => user.user_id !== member.user_id
                                    );
                                    return pool1.query(
                                        `UPDATE chat_members SET name_in_view = $1 WHERE chat_id = $2 AND user_id = $3`,
                                        [otherUser.username, member.chat_id, member.user_id]
                                    );
                                });
    
                                Promise.all(nameUpdates)
                                    .then(() => callback({ success: true, chatId }))
                                    .catch((err) => callback({ success: false, error: err }));
                            }
                        );
                    }
                );
            }
        );
    });   

     socket.on("getChatHistory", ({ userId }, callback) => {
        pool1.query(
            `SELECT c.chat_id, cm.name_in_view
             FROM chats c
             JOIN chat_members cm ON c.chat_id = cm.chat_id
             WHERE cm.user_id = $1`,
            [userId],
            (err, result) => {
                if (err) return callback([]); // ถ้ามีข้อผิดพลาดในการดึงข้อมูล
                callback(result.rows); // ส่งข้อมูลประวัติห้องแชทกลับไป
                console.log("Chat Room :", result.rows);
            }
        );
    });
    

    socket.on("getChatMessages", (data, callback) => {
        const { chatId } = data;
        console.log("Received getChatMessages request for chatId:", chatId);
        pool1.query(
            `
            SELECT 
                TO_CHAR(created_at, 'YYYY-MM-DD') AS date, 
                json_agg(
                    json_build_object(
                        'message_id', message_id, 
                        'chat_id', chat_id, 
                        'sender_id', sender_id, 
                        'recipient_id', recipient_id, 
                        'message', message, 
                        'created_at', created_at, 
                        'status', status
                    )
                ) AS messages
            FROM messages 
            WHERE chat_id = $1
            GROUP BY TO_CHAR(created_at, 'YYYY-MM-DD') 
            ORDER BY date ASC
            `,
            [chatId]
        ).then((result) => {
            console.log("Fetched chat messages:", result.rows);
            callback(result.rows);
        }).catch((error) => {
            console.error("Error fetching chat messages:", error);
            callback({ error: "Internal server error" });
        });
    });

    socket.on("sendMessage", (data, callback) => {
        const { sender_id, message,  chatId } = data;
    
        if (!sender_id  || !chatId || !message.trim()) {
            return callback({ success: false, message: "Missing required fields" });
        }
    
        pool1.query(
            "INSERT INTO messages (sender_id, message, chat_id, status) VALUES ($1, $2, $3, 'sent') RETURNING message_id",
            [sender_id, message, chatId],
            (err, result) => {
                if (err) {
                    console.error("Error sending message:", err);
                    return callback({ success: false, message: "Error sending message" });
                }
    
                const messageId = result.rows[0].message_id;
    
                // ส่งข้อความไปยังห้องแชท
                io.to(chatId).emit("receiveMessage", { message, sender_id, messageId });
    
                callback({ success: true, messageId });
            }
        );
    });    

    
      
    socket.on('disconnect', () => {
        console.log('A user disconnected:', socket.id);
    });
});*/

// ติดตั้ง Socket.IO
const io = setupSocket(server);

server.listen(PORT, () => {
    console.log(`Server is running on port http://${host}:${PORT}/`);
});
