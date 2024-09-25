import React, { useState, useEffect } from "react";
import { Layout, Menu, Avatar, Dropdown, message } from "antd";
import {
  UserOutlined,
  LogoutOutlined,
} from "@ant-design/icons";
import { useNavigate, useLocation  } from "react-router-dom";
import axios from "axios";
import { TbBuildingWarehouse } from "react-icons/tb";
import config from '../configAPI';

const { Header, Content, Footer } = Layout;

const items = [
  { key: "/UserManagement", label: "User Management" },
  { key: "/UploadMaterials", label: "Material Management" },
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
        <Dropdown overlay={menu} trigger={["click"]}>
          <Avatar icon={<UserOutlined />} style={{ cursor: "pointer" }} />
        </Dropdown>
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
