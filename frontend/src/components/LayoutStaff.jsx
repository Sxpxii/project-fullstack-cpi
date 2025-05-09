import React, { useState, useEffect } from "react";
import {
  Layout,
  Menu,
  Avatar,
  Dropdown,
  message,
  Space,
  Drawer,
  Badge,
} from "antd";
import { UserOutlined, LogoutOutlined } from "@ant-design/icons";
import { useNavigate, useLocation } from "react-router-dom";
import axios from "axios";
import { TbBuildingWarehouse } from "react-icons/tb";
import { BiSolidBellRing } from "react-icons/bi";
import config from "../configAPI";
import { io } from "socket.io-client";
import Swal from "sweetalert2";

const { Header, Content, Footer } = Layout;
const EXPIRATION_TIME = 8 * 60 * 60 * 1000; // 8 ชั่วโมง (หน่วยเป็นมิลลิวินาที)

const items = [
  { key: "/OperationsDashboard", label: "รายการเบิก-จ่ายทั้งหมด" },
  { key: "/MyTasks", label: "รายการเบิกจ่ายของฉัน" },
];

const MainLayout = ({ children }) => {
  const [selectedKey, setSelectedKey] = useState("/");
  const navigate = useNavigate();
  const location = useLocation(); // ใช้ useLocation เพื่อตรวจสอบ URL ปัจจุบัน
  const username = sessionStorage.getItem("username");
  const [notifications, setNotifications] = useState([]);
  const [drawerVisible, setDrawerVisible] = useState(false);

  useEffect(() => {
    const socket = io(`${config.API_URL}`, {
      transports: ["polling", "websocket"], // ตั้งค่าให้ใช้ WebSocket เท่านั้น
    });

    // ฟังเหตุการณ์การแจ้งเตือนจาก Backend
    socket.on("respondnotification", (data) => {
      console.log("การแจ้งเตือนที่ได้รับ:", data);

      // ปรับข้อความเพื่อแสดงข้อมูลที่ต้องการ
      const titleMessage = `แจ้งเตือนจาก ${data.userName}`;
      const message = `รายการเลขที่ ${data.inventoryId} : ${data.message} `;

      // แสดงการแจ้งเตือนใหม่ด้วย SweetAlert2
      Swal.fire({
        title: titleMessage,
        text: message,
        icon: "info",
        confirmButtonText: "ตกลง",
        allowOutsideClick: false, // ป้องกันการคลิกนอกเพื่อปิด
        allowEscapeKey: false, // ป้องกันการกด Escape เพื่อปิด
        customClass: {
          title: "sarabun-bold", // เพิ่มคลาสให้กับ title
          htmlContainer: "sarabun-light", // เพิ่มคลาสให้กับข้อความ
          confirmButton: "sarabun-light",
        },
        willClose: () => {
          // อัปเดต State เมื่อผู้ใช้กดตกลง
          setNotifications((prevNotifications) => [
            ...prevNotifications,
            {
              userName: data.userName,
              inventoryId: data.inventoryId,
              message: data.message,
              type: data.type,
              createdAt: data.createdAt,
            },
          ]);
        },
      });
    });

    // ทำความสะอาด Socket เมื่อ Component ถูกยกเลิก
    return () => {
      socket.disconnect();
    };
  }, [setNotifications, navigate]);

  useEffect(() => {
    const socket = io(`${config.API_URL}`, {
      transports: ["polling", "websocket"], // ตั้งค่าให้ใช้ WebSocket เท่านั้น
    });

    // ฟังเหตุการณ์การแจ้งเตือนจาก Backend
    socket.on("approvenotification", (data) => {
      console.log("การแจ้งเตือนที่ได้รับ:", data);

      // ปรับข้อความเพื่อแสดงข้อมูลที่ต้องการ
      const titleMessage = `แจ้งเตือนจาก ${data.userName}`;
      const message = `รายการเลขที่ ${data.inventoryId} : ${data.message} `;

      // แสดงการแจ้งเตือนใหม่ด้วย SweetAlert2
      Swal.fire({
        title: titleMessage,
        text: message,
        icon: "info",
        confirmButtonText: "ตกลง",
        allowOutsideClick: false, // ป้องกันการคลิกนอกเพื่อปิด
        allowEscapeKey: false, // ป้องกันการกด Escape เพื่อปิด
        customClass: {
          title: "sarabun-bold", // เพิ่มคลาสให้กับ title
          htmlContainer: "sarabun-light", // เพิ่มคลาสให้กับข้อความ
          confirmButton: "sarabun-light",
        },
        willClose: () => {
          // อัปเดต State เมื่อผู้ใช้กดตกลง
          setNotifications((prevNotifications) => [
            ...prevNotifications,
            {
              userName: data.userName,
              inventoryId: data.inventoryId,
              message: data.message,
              type: data.type,
              createdAt: data.createdAt,
            },
          ]);
        },
      });
    });

    // ทำความสะอาด Socket เมื่อ Component ถูกยกเลิก
    return () => {
      socket.disconnect();
    };
  }, [setNotifications, navigate]);

  useEffect(() => {
    const socket = io(`${config.API_URL}`, {
      transports: ["polling", "websocket"], // ตั้งค่าให้ใช้ WebSocket เท่านั้น
    });

    // ฟังเหตุการณ์การแจ้งเตือนจาก Backend
    socket.on("notificationUrgent", (data) => {
      console.log("การแจ้งเตือนที่ได้รับ:", data);

      // ปรับข้อความเพื่อแสดงข้อมูลที่ต้องการ
      const titleMessage = `แจ้งเตือนด่วน!`;
      const message = `รายการเลขที่ ${data.inventoryId} : ${data.message} `;

      // แสดงการแจ้งเตือนใหม่ด้วย SweetAlert2
      Swal.fire({
        title: titleMessage,
        text: message,
        icon: "warning",
        confirmButtonText: "ตกลง",
        allowOutsideClick: false, // ป้องกันการคลิกนอกเพื่อปิด
        allowEscapeKey: false, // ป้องกันการกด Escape เพื่อปิด
        customClass: {
          title: "sarabun-bold", // เพิ่มคลาสให้กับ title
          htmlContainer: "sarabun-light", // เพิ่มคลาสให้กับข้อความ
          confirmButton: "sarabun-light",
        },
        willClose: () => {
          // อัปเดต State เมื่อผู้ใช้กดตกลง
          setNotifications((prevNotifications) => [
            ...prevNotifications,
            {
              userName: data.userName,
              inventoryId: data.inventoryId,
              message: data.message,
              type: data.type,
              createdAt: data.createdAt,
            },
          ]);
        },
      });
    });

    // ทำความสะอาด Socket เมื่อ Component ถูกยกเลิก
    return () => {
      socket.disconnect();
    };
  }, [setNotifications, navigate]);

  useEffect(() => {
    setSelectedKey(location.pathname); // อัปเดต selectedKey ตาม URL ปัจจุบัน
  }, [location.pathname]);

  const handleMenuClick = (e) => {
    navigate(e.key);
  };

  useEffect(() => {
    // ดึงข้อมูลการแจ้งเตือนจาก API
    const fetchNotifications = async () => {
      const token = sessionStorage.getItem("token"); // ดึง token จาก sessionStorage
      if (!token) {
        console.error("Token not found");
        return; // ถ้าไม่มี token ให้หยุดการทำงาน
      }
      try {
        const response = await axios.get(
          `${config.API_URL}/alert/notifications`,
          {
            headers: { Authorization: `Bearer ${token}` },
          }
        );
        setNotifications(response.data); // อัปเดตข้อมูลการแจ้งเตือน
      } catch (error) {
        console.error("ไม่สามารถดึงการแจ้งเตือน:", error);
      }
    };
    fetchNotifications();
  }, []);

  const handleNotificationClick = async (notification) => {
    // อัพเดตสถานะการแจ้งเตือนในฐานข้อมูล
    const token = sessionStorage.getItem("token");
    if (!token) {
      console.error("Token not found");
      return;
    }

    try {
      // เรียก API เพื่ออัพเดตสถานะเป็น "read"
      await axios.post(
        `${config.API_URL}/supClerkTasks/update-status/${notification.id}`,
        {},
        {
          headers: { Authorization: `Bearer ${token}` },
        }
      );

      // เปลี่ยนสถานะการแจ้งเตือนใน state ให้เป็น "read"
      setNotifications((prevNotifications) =>
        prevNotifications.map((notif) =>
          notif.id === notification.id ? { ...notif, status: "read" } : notif
        )
      );
    } catch (error) {
      console.error("ไม่สามารถอัพเดตสถานะการแจ้งเตือน:", error);
    }
  };

  useEffect(() => {
    const sessionStartTime = sessionStorage.getItem("sessionStartTime");

    if (!sessionStartTime) {
      // ถ้ายังไม่มี ให้ตั้งค่า sessionStartTime เป็นเวลาปัจจุบัน
      sessionStorage.setItem("sessionStartTime", Date.now());
    } else {
      const elapsedTime = Date.now() - Number(sessionStartTime);
      if (elapsedTime >= EXPIRATION_TIME) {
        handleLogout();
      } else {
        // ตั้ง timeout ให้ Logout อัตโนมัติเมื่อครบ 8 ชั่วโมง
        const remainingTime = EXPIRATION_TIME - elapsedTime;
        const warningTime = remainingTime - 60 * 1000; // แจ้งเตือนก่อน 1 นาที

        // ตั้งเวลาแจ้งเตือนก่อนหมดอายุ 1 นาที
        const warningTimer = setTimeout(() => {
          Swal.fire({
            title: "Session Expiring!",
            html: '<span class="sarabun-light">ระบบกำลังจะหมดเวลาในอีก 1 นาที!!!</span>',
            customClass: {
              title: "sarabun-bold",
              confirmButton: "sarabun-light",
            },
            icon: "warning",
            confirmButtonText: "ปิด",
            allowOutsideClick: false, // ไม่ให้ปิดโดยคลิกข้างนอก
            allowEscapeKey: false, // ไม่ให้กด ESC ปิด
          });
        }, warningTime);

        // ตั้งเวลา Logout อัตโนมัติ
        const logoutTimer = setTimeout(handleLogout, remainingTime);

        return () => {
          clearTimeout(warningTimer);
          clearTimeout(logoutTimer);
        };
      }
    }
  }, []);

  const handleLogout = async () => {
    try {
      await axios.post(
        `${config.API_URL}/api/logout`,
        {},
        {
          headers: {
            Authorization: `Bearer ${sessionStorage.getItem("token")}`,
          },
        }
      );
      // ลบข้อมูลจาก localStorage
      sessionStorage.removeItem("token");
      sessionStorage.removeItem("refreshToken");
      sessionStorage.removeItem("username");
      sessionStorage.removeItem("role");

      message.success("Logout successful");
      navigate("/"); // เปลี่ยนเส้นทางไปที่หน้า login
    } catch (error) {
      console.error("Logout failed:", error);
      message.error("Logout failed");
    }
  };

  const menu = (
    <Menu>
      <Menu.Item key="1">
        <span>{username}</span>
      </Menu.Item>
      <Menu.Item key="2" icon={<LogoutOutlined />} onClick={handleLogout}>
        Logout
      </Menu.Item>
    </Menu>
  );

  const toggleDrawer = () => {
    setDrawerVisible(!drawerVisible);
  };

  // Filter unread notifications
  const unreadNotifications = notifications.filter(
    (notification) => notification.status === "unread"
  );
  console.log("Unread Notifications:", unreadNotifications);

  return (
    <Layout style={{ minHeight: "100vh", marginBottom: "15px" }}>
      <Header
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          marginBottom: "15px",
        }}
      >
        <TbBuildingWarehouse
          size={40}
          style={{ color: "white", marginRight: "10px" }}
        />
        <Menu
          theme="dark"
          mode="horizontal"
          selectedKeys={[selectedKey]}
          items={items}
          onClick={handleMenuClick}
          style={{ flex: 1, minWidth: 0 }}
        />
        <Space>
          <span style={{ color: "white", marginRight: "10px" }}>
            {username} {/* แสดงชื่อผู้ใช้งานถัดจาก Avatar */}
          </span>
          <Dropdown overlay={menu} trigger={["click"]}>
            <Avatar
              icon={<UserOutlined />}
              style={{
                cursor: "pointer",
                backgroundColor: "#5755FE",
                width: "40px",
                height: "40px",
              }}
            />
          </Dropdown>
          {/* เพิ่มไอคอน Bell พร้อม Badge */}
          <Badge count={unreadNotifications.length} offset={[0, 5]}>
            <BiSolidBellRing
              style={{
                fontSize: "20px",
                color: "white",
                cursor: "pointer",
                marginLeft: "15px", // เพิ่มระยะห่างจาก Avatar
                verticalAlign: "middle",
              }}
              onClick={toggleDrawer}
            />
          </Badge>
        </Space>
      </Header>
      {/* Drawer สำหรับแสดง Notifications */}
      <Drawer
        title={
          <span className="sarabun-bold" style={{ fontSize: "16px" }}>
            การแจ้งเตือน
          </span>
        }
        placement="right"
        onClose={toggleDrawer}
        visible={drawerVisible}
      >
        {notifications.length > 0 ? (
          notifications.map((notification) => (
            <div
              key={notification.id}
              style={{
                marginBottom: "10px",
                padding: "10px",
                borderBottom: "1px solid #f0f0f0",
                backgroundColor:
                  notification.status === "unread" ? "#e6f7ff" : "white", // ไฮไลต์พื้นหลังสำหรับ unread
                cursor: "pointer",
              }}
              onClick={() => {
                handleNotificationClick(notification);
              }}
            >
              <strong className="sarabun-bold" style={{ fontSize: "16px" }}>
                {notification.sender_username}
              </strong>
              <p className="sarabun-light" style={{ fontSize: "14px" }}>
                {`รายการเลขที่ ${notification.inventory_id}`}{" "}
                {notification.message}
              </p>
              <p
                className="sarabun-light"
                style={{ fontSize: "12px", color: "gray" }}
              >
                {new Date(notification.created_at).toLocaleString()}
              </p>
            </div>
          ))
        ) : (
          <p className="sarabun-light">ไม่มีการแจ้งเตือน</p>
        )}
      </Drawer>

      <Content style={{ padding: "0 48px" }}>
        {children} {/* This will render the content passed from other pages */}
      </Content>
      <Footer style={{ textAlign: "center" }}>
        Raw Material Warehouse ©{new Date().getFullYear()}
      </Footer>
    </Layout>
  );
};

export default MainLayout;
