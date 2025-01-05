const { Server } = require('socket.io');
const { pool1 } = require('./config/db');

function setupSocket(server) {
    const io = new Server(server, {
        cors: {
            origin: '*', 
            methods: ['GET', 'POST'],
        }
    });

    io.on('connection', (socket) => {
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
    });

    return io;
}

module.exports = setupSocket;
