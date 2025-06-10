import React, { useState, useEffect } from "react";
import { Layout, Menu, Avatar, Dropdown, message, Space  } from "antd";
import { UserOutlined, LogoutOutlined } from "@ant-design/icons";
import { useNavigate, useLocation } from "react-router-dom";
import axios from "axios";
import { TbBuildingWarehouse } from "react-icons/tb";
import config from "../configAPI";
import Swal from "sweetalert2";

const { Header, Content, Footer } = Layout;
const EXPIRATION_TIME = 8 * 60 * 60 * 1000; // 8 ชั่วโมง (หน่วยเป็นมิลลิวินาที)

const items = [
  { key: "/UserManagement", label: "User Management" },
];

const MainLayout = ({ children }) => {
  const navigate = useNavigate();
  const location = useLocation(); // ใช้ useLocation เพื่อดึง URL ปัจจุบัน
  const [selectedKey, setSelectedKey] = useState(location.pathname); // ตั้งค่า selectedKey จาก URL
  const username = sessionStorage.getItem("username");

  useEffect(() => {
    setSelectedKey(location.pathname); // อัปเดต selectedKey เมื่อ URL เปลี่ยน
  }, [location.pathname]);

  const handleMenuClick = (e) => {
    navigate(e.key);
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
        </Space>
      </Header>
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
