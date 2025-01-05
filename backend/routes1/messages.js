// routes/messages.js
const express = require('express');
const router = express.Router();
//const { sendMessage, getChatRooms, getMessages, checkNewMessages, markMessagesAsRead  } = require('../controllers1/messagesController');
const { getUsersCurrent, createChatRoom, getChatHistory, getChatMessages, sendMessage } = require('../controllers1/messagesController'); 
const { authenticateToken } = require('../controllers1/loginController1');

/*router.post('/send', authenticateToken, sendMessage );
router.get('/rooms', authenticateToken, getChatRooms);
router.get('/messages/:userId', authenticateToken , getMessages);
router.get('/check', authenticateToken, checkNewMessages);
router.get('/mark-read', authenticateToken, markMessagesAsRead);*/
router.get("/users",authenticateToken, getUsersCurrent);
router.get("/history", authenticateToken, getChatHistory);
router.get("/messages", authenticateToken, getChatMessages);
router.post('/createRoom', createChatRoom);
router.post('/sendMessage', authenticateToken, sendMessage);

module.exports = router;
