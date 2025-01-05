import React, { useState, useEffect, useCallback, useRef } from "react";
import { io } from "socket.io-client";
import config from "../configAPI";
import { FaComments } from "react-icons/fa";
import Swal from "sweetalert2";

function ChatApp() {
  const [message, setMessage] = useState(""); // เก็บข้อความที่กำลังพิมพ์
  const [messages, setMessages] = useState([]); // เก็บข้อความในห้องแชทที่เลือก
  const [isChatOpen, setIsChatOpen] = useState(false); // ควบคุมการเปิด/ปิดหน้าแชท
  const [users, setUsers] = useState([]); // เก็บรายชื่อผู้ใช้งาน
  const [recipient, setRecipient] = useState(""); // เก็บผู้รับที่เลือก
  const [chatHistory, setChatHistory] = useState([]); // เก็บประวัติแชท
  const [currentChatId, setCurrentChatId] = useState(null); // เก็บรหัสห้องแชทปัจจุบัน
  const [currentUserId, setCurrentUserId] = useState(null); // เก็บ user ID ของผู้ใช้ปัจจุบัน
  const [chatTitle, setChatTitle] = useState(""); // เก็บชื่อห้องแชท
  const [isSelectingUser, setIsSelectingUser] = useState(true);
  const [selectedChat, setSelectedChat] = useState(null);
  const [socket, setSocket] = useState(null);
  const messagesEndRef = useRef(null);

  // ดึงข้อมูลผู้ใช้งานและประวัติแชทเมื่อโหลดหน้า
  useEffect(() => {
    const token = sessionStorage.getItem("token");

    if (!token) {
      console.error("Token is missing");
      return;
    }

    // Decode token เพื่อดึง user ID (สมมติว่า token มีข้อมูล userId)
    const decodedToken = JSON.parse(atob(token.split(".")[1]));
    const userId = decodedToken.userId; // รับ userId จาก token
    setCurrentUserId(userId);
    //console.log("Current user ID:", userId);

    // การตั้งค่า Socket.IO เพียงครั้งเดียว
    const newSocket = io(`${config.API_URL}`, { transports: ["websocket"] });
    setSocket(newSocket); // เก็บ socket ใน state

    newSocket.on("connect", () => console.log("Connected to socket server"));

    // ฟังก์ชันดึงข้อมูลผู้ใช้งานและประวัติแชทจาก Socket.IO
    newSocket.emit("getUsersCurrent", { userId }, (usersData) => {
      //console.log("Received users data:", usersData);
      if (!usersData) {
        console.error("Failed to fetch users");
        return;
      }
      setUsers(usersData || []);
    });

    newSocket.emit("getChatHistory", { userId }, (chatHistoryData) => {
      //console.log("Received chat history:", chatHistoryData); // ตรวจสอบข้อมูลที่ได้รับจาก Server
      setChatHistory(chatHistoryData || []);
    });

    // รับข้อความใหม่
    newSocket.on("receiveMessage", (newMessage) => {
      //console.log("Received new message:", newMessage);

      // ถ้าแชทยังไม่เปิด ให้แสดงแจ้งเตือน
      if (!isChatOpen) {
        Swal.fire({
          title: "คุณมีข้อความใหม่!",
          text: newMessage.message, // แสดงข้อความที่ได้รับ
          icon: "info", // ใช้ไอคอนแจ้งเตือน
          confirmButtonText: "ตกลง",
        });
      }

      // อัปเดตข้อความใหม่ใน UI
      setMessages((prevMessages) => {
        if (
          !prevMessages.find((msg) => msg.timestamp === newMessage.timestamp)
        ) {
          return [...prevMessages, newMessage];
        }
        return prevMessages;
      });

      // หากแชทเปิดอยู่แล้ว, อัปเดตข้อความใหม่ทันที
      if (isChatOpen && currentChatId === newMessage.chatId) {
        setMessages((prevMessages) => [...prevMessages, newMessage]);
      }
    });

    newSocket.on("disconnect", () => {
      console.log("Disconnected from socket server");
    });

    return () => {
      newSocket.off("receiveMessage");
      newSocket.disconnect();
    };
  }, [isChatOpen, currentChatId]);

  useEffect(() => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: "smooth" });
    }
  }, [messages]);

  useEffect(() => {
    if (isChatOpen && currentChatId) {
      // ตรวจสอบว่าเมื่อเปิดห้องแชทจะต้องแสดงข้อความล่าสุดเสมอ
      socket.emit(
        "getChatMessages",
        { chatId: currentChatId },
        (chatMessages) => {
          if (chatMessages) {
            setMessages(chatMessages); // อัปเดตข้อความใน UI
          }
        }
      );
    }
  }, [currentChatId, isChatOpen]); // เมื่อ currentChatId หรือ isChatOpen เปลี่ยนแปลง

  const selectUser = (recipient) => {
    if (!recipient || !currentUserId) {
      console.error("Recipient or sender is missing");
      return;
    }

    setRecipient(recipient);
    setIsSelectingUser(false);
    const selectedUser = users.find((user) => user.user_id === recipient);
    setChatTitle(selectedUser ? selectedUser.username : "การสนทนา");

    socket.emit(
      "createRoom",
      { sender_id: currentUserId, recipient_id: recipient },
      (chatId) => {
        setCurrentChatId(chatId);
        socket.emit("getChatHistory", { chatId }, (chatMessages) => {
          setMessages(chatMessages || []);
        });
      }
    );
  };

  const selectChat = (chat) => {
    setSelectedChat(chat);
    setCurrentChatId(chat.chat_id);

    socket.emit("getChatMessages", { chatId: chat.chat_id }, (chatMessages) => {
      console.log("Received chat Messages:", chatMessages);
      if (!chatMessages) {
        console.error("Failed to fetch chat messages");
        return;
      }
      setMessages(chatMessages || []);
      setChatTitle(
        chat.name || chat.name_in_view || chat.username || "ห้องสนทนา"
      );
      setIsSelectingUser(false);
    });
  };

  // ส่งข้อความไปยังห้องแชทที่เลือก
  const sendMessage = () => {
    console.log("Current User ID:", currentUserId);
    console.log("Sending message:", {
      sender_id: currentUserId,
      message,
      chatId: currentChatId,
    });
    // ตรวจสอบว่าทุกค่ามีข้อมูลที่ถูกต้อง
    if (message.trim() && currentChatId && currentUserId && socket) {
      const newMessage = {
        sender_id: currentUserId, // ตรวจสอบว่า currentUserId ไม่เป็น null
        message,
        chatId: currentChatId,
        timestamp: new Date().toISOString(),
      };

      console.log("New message to be added:", newMessage);

      socket.emit("sendMessage", newMessage, (confirmation) => {
        console.log("newMessage:", newMessage);
        if (confirmation.success) {
          console.log("Message sent successfully");
          // เมื่อข้อความถูกส่งสำเร็จ, ส่งข้อความให้กับทุกห้องแชทที่เกี่ยวข้อง
          socket.emit("receiveMessage", newMessage); // ส่งข้อความไปหาผู้รับ

          // เมื่อเซิร์ฟเวอร์บันทึกข้อมูลแล้ว ให้ดึงข้อมูลที่บันทึกแล้วมาแสดง
          socket.emit(
            "getChatMessages",
            { chatId: currentChatId },
            (chatMessages) => {
              if (chatMessages) {
                setMessages(chatMessages); // อัปเดตข้อความใน UI
              }
            }
          );

          setMessage(""); // เคลียร์ข้อความที่กำลังพิมพ์
        } else {
          console.error("Failed to send message");
        }
      });
    } else {
      alert("Please select a chat room and type a message.");
    }
  };

  const goBackToUserSelection = () => {
    setIsSelectingUser(true);
    setMessages([]);
    setChatTitle("");
    setRecipient("");
    setCurrentChatId(null);
  };

  // สลับเปิด/ปิดหน้าแชท
  const toggleChat = useCallback(() => {
    setIsChatOpen((prevState) => !prevState);
  }, []);

  const closeChat = () => {
    setIsChatOpen(false);
    setMessages([]);
  };

  // ฟังก์ชันแปลง timestamp เป็นวันที่
  const formatDate = (timestamp) => {
    const date = new Date(timestamp);
    const options = { day: "2-digit", month: "2-digit", year: "numeric" };
    return date.toLocaleDateString("th-TH", options); // แสดงวันที่ในรูปแบบ วัน/เดือน/ปี
  };

  // ฟังก์ชันแปลง timestamp เป็นเวลา
  const formatTime = (timestamp) => {
    const date = new Date(timestamp);
    console.log("formatTime timestamp:", timestamp);
    if (isNaN(date)) {
      return "Invalid Time"; // ตรวจสอบกรณี invalid time
    }
    return date.toLocaleTimeString("th-TH", {
      hour: "2-digit",
      minute: "2-digit",
    }); // แสดงเวลาในรูปแบบที่ต้องการ เช่น "12:30 PM"
  };

  return (
    <div>
      <button
        onClick={toggleChat}
        style={{
          fontSize: "30px",
          background: "#111d42",
          border: "none",
          padding: "12px",
          borderRadius: "50%",
          zIndex: 1000,
          position: "fixed",
          bottom: "20px",
          right: "20px",
          boxShadow: "0 4px 10px rgba(0, 0, 0, 0.1)",
          cursor: "pointer",
          width: "60px", // กำหนดความกว้าง
          height: "60px", // กำหนดความสูง
        }}
      >
        <FaComments style={{ color: "#f1f1f1" }} />
      </button>

      {isChatOpen && (
        <div
          style={{
            position: "fixed",
            bottom: "20px",
            right: "20px",
            width: "320px",
            height: "450px",
            border: "none",
            borderRadius: "12px",
            backgroundColor: "#f1f1f1",
            boxShadow: "0 4px 15px rgba(0, 0, 0, 0.2)",
            display: "flex",
            flexDirection: "column",
            zIndex: 9999,
            padding: "15px",
          }}
        >
          <button
            onClick={closeChat}
            style={{
              position: "absolute",
              top: "10px",
              right: "10px",
              background: "transparent",
              border: "none",
              fontSize: "20px",
              color: "#111d42",
              cursor: "pointer",
            }}
          >
            ✖
          </button>
          {isSelectingUser ? (
            <>
              <h3
                className="sarabun-bold"
                style={{
                  textAlign: "center",
                  color: "#111d42",
                  margin: "20px 0",
                }}
              >
                แชท
              </h3>
              <select
                className="sarabun-light"
                value={recipient}
                onChange={(e) => selectUser(e.target.value)}
                style={{
                  padding: "12px",
                  borderRadius: "12px",
                  border: "1px solid #ddd",
                  marginBottom: "20px",
                  width: "100%",
                  fontSize: "16px",
                  backgroundColor: "#f9f9f9",
                }}
              >
                <option value="">Select a user</option>
                {users?.length > 0 ? (
                  users.map((user) => (
                    <option key={user.user_id} value={user.user_id}>
                      {user.username}
                    </option>
                  ))
                ) : (
                  <option disabled>ไม่พบผู้ใช้</option>
                )}
              </select>
              <div>
                <ul
                  className="sarabun-light"
                  style={{
                    listStyleType: "none",
                    padding: "0",
                    overflowY: "auto",
                    maxHeight: "220px",
                  }}
                >
                  {chatHistory && chatHistory.length > 0 ? (
                    chatHistory.map((chat) => (
                      <li
                        key={chat.chatId}
                        onClick={() => selectChat(chat)} // เลือกห้องแชทที่คลิก
                        style={{
                          padding: "10px",
                          color: "#ffffff",
                          backgroundColor: "#111d42",
                          borderRadius: "8px",
                          margin: "5px 0",
                          cursor: "pointer",
                        }}
                      >
                        {chat.name_in_view || chat.name || chat.username}
                      </li>
                    ))
                  ) : (
                    <li>ไม่มีประวัติแชท</li> // กรณีไม่มีประวัติแชท
                  )}
                </ul>
              </div>
            </>
          ) : (
            <>
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between", // จัดตำแหน่งระหว่างซ้ายและขวา
                  alignItems: "center", // จัดแนวตั้งให้อยู่กลาง
                  marginBottom: "10px",
                }}
              >
                <button
                  onClick={goBackToUserSelection}
                  style={{
                    background: "transparent",
                    border: "none",
                    fontSize: "18px",
                    color: "#111d42",
                    marginRight: "0px", // เว้นระยะจากปุ่มไปชื่อ
                  }}
                >
                  ⬅️
                </button>

                <div
                  className="sarabun-bold"
                  style={{
                    textAlign: "center",
                    fontWeight: "bold",
                    color: "#111d42",
                    flex: 1, // เพื่อให้ชื่อแชทสามารถขยายตัวได้
                  }}
                >
                  <span>{chatTitle}</span>
                </div>
              </div>

              <div
                style={{
                  flex: 1,
                  overflowY: "auto",
                  marginBottom: "15px",
                  padding: "12px",
                  borderRadius: "12px",
                  backgroundColor: "#f9f9f9",
                }}
              >
                {messages && messages.length > 0 ? (
                  messages.map((chatData, index) => (
                    <div key={index}>
                      {/* วันที่ */}
                      <h4
                        className="sarabun-bold"
                        style={{
                          textAlign: "center",
                          color: "#333",
                          marginTop: "15px",
                        }}
                      >
                        {formatDate(chatData.date)}
                      </h4>
                      {/* รายการข้อความ */}
                      {chatData.messages.map((msg, idx) => (
                        <div
                          className="sarabun-light"
                          key={idx}
                          style={{
                            display: "flex",
                            justifyContent:
                              msg.sender_id === currentUserId
                                ? "flex-end"
                                : "flex-start",
                            marginBottom: "10px",
                          }}
                        >
                          <div
                            style={{
                              maxWidth: "70%",
                              padding: "10px",
                              borderRadius: "12px",
                              backgroundColor:
                                msg.sender_id === currentUserId
                                  ? "#DCF8C6"
                                  : "#ffffff",
                              boxShadow: "0px 1px 3px rgba(0, 0, 0, 0.2)",
                              textAlign: "left",
                            }}
                          >
                            <p style={{ margin: "5px 0" }}>{msg.message}</p>
                            <span
                              style={{
                                display: "block",
                                fontSize: "12px",
                                color: "#999",
                                textAlign: "right",
                                marginTop: "5px",
                              }}
                            >
                              {formatTime(msg.created_at)}
                            </span>
                          </div>
                        </div>
                      ))}
                    </div>
                  ))
                ) : (
                  <p>ไม่มีข้อความ</p>
                )}
                <div ref={messagesEndRef} />
              </div>

              <div className="sarabun-bold" style={{ display: "flex" }}>
                <input
                  type="text"
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  placeholder="พิมพ์ข้อความ..."
                  className="sarabun-light"
                  style={{
                    padding: "10px",
                    flex: 1,
                    borderRadius: "20px",
                    border: "1px solid #ddd",
                    fontSize: "16px",
                    marginRight: "10px",
                  }}
                />
                <button
                  className="sarabun-light"
                  onClick={sendMessage}
                  style={{
                    backgroundColor: "#007bff",
                    color: "white",
                    border: "none",
                    padding: "10px 20px",
                    borderRadius: "20px",
                    fontSize: "16px",
                    cursor: "pointer",
                  }}
                >
                  ส่ง
                </button>
              </div>
            </>
          )}
        </div>
      )}
    </div>
  );
}

export default ChatApp;
