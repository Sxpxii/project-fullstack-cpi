// controllers/MessageController.js
const { pool1 } = require('../config/db');

module.exports = (io) => {
    io.on('connection', (socket) => {
        console.log('A user connected:', socket.id);

        // ฟังก์ชันดึงรายชื่อผู้ใช้งานยกเว้นผู้ที่ล็อกอิน
        socket.on("getUsersCurrent", (data, callback) => {
            const { currentUserId } = data;
            pool1.query(
                "SELECT user_id, username FROM users1 WHERE user_id != $1",
                [currentUserId]
            ).then((result) => {
                callback(result.rows);
            }).catch((error) => {
                console.error("Error fetching users:", error);
                callback({ error: "Internal server error" });
            });
        });

        // ฟังก์ชันสำหรับสร้างห้องแชท
        socket.on('createRoom', (data, callback) => {
            const { sender_id, recipient_id } = data;

            pool1.query(
                'SELECT username FROM users1 WHERE user_id = $1',
                [recipient_id]
            ).then((result) => {
                if (result.rows.length === 0) {
                    callback({ error: "Recipient not found" });
                    return;
                }

                const recipientUsername = result.rows[0].username;
                pool1.query(
                    'SELECT * FROM chats WHERE (sender_id = $1 AND recipient_id = $2) OR (sender_id = $2 AND recipient_id = $1)',
                    [sender_id, recipient_id]
                ).then((result) => {
                    if (result.rows.length > 0) {
                        callback(result.rows[0].chat_id);
                    } else {
                        pool1.query(
                            'INSERT INTO chats (sender_id, recipient_id, name) VALUES ($1, $2, $3) RETURNING chat_id',
                            [sender_id, recipient_id, recipientUsername]
                        ).then((result) => {
                            callback(result.rows[0].chat_id);
                        }).catch((err) => {
                            callback({ error: "Error creating chat room" });
                        });
                    }
                }).catch((err) => {
                    callback({ error: "Error checking chat room" });
                });
            }).catch((err) => {
                callback({ error: "Error fetching recipient username" });
            });
        });

        socket.on("getChatHistory", (data, callback) => {
            const { userId } = data;
            pool1.query(
                "SELECT * FROM chats WHERE sender_id = $1 ORDER BY created_at DESC",
                [userId]
            ).then((result) => {
                callback(result.rows);
            }).catch((error) => {
                console.error("Error fetching chat history:", error);
                callback({ error: "Internal server error" });
            });
        });

        socket.on("getChatMessages", (data, callback) => {
            const { chatId } = data;
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
                callback(result.rows);
            }).catch((error) => {
                console.error("Error fetching chat messages:", error);
                callback({ error: "Internal server error" });
            });
        });

        socket.on("sendMessage", (data, callback) => {
            const { message, recipient, chatId, senderId } = data;

            pool1.query(
                "INSERT INTO messages (sender_id, recipient_id, message, chat_id, status) VALUES ($1, $2, $3, $4, 'sent')",
                [senderId, recipient, message, chatId]
            ).then(() => {
                io.to(chatId).emit("receiveMessage", { message, sender_id: senderId });
                callback({ success: true });
            }).catch((err) => {
                console.error("Error sending message:", err);
                callback({ success: false });
            });
        });

        socket.on('disconnect', () => {
            console.log('A user disconnected:', socket.id);
        });
    });
};

// ส่งออกฟังก์ชัน
/*module.exports = {
    getUsersCurrent,
    sendMessage,
    getChatHistory,
    getChatMessages,
    createChatRoom,
  };*/