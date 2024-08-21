import React from "react";
import { Layout, Menu, Avatar, Dropdown, message } from "antd";
import {
  UserOutlined,
  LogoutOutlined,
} from "@ant-design/icons";
import { useNavigate } from "react-router-dom";
import axios from "axios";

const { Header, Content, Footer } = Layout;

const items = [
  { key: "1", label: "รายการเบิก-จ่ายทั้งหมด" },
  { key: "2", label: "รายการเบิกจ่ายของฉัน" },
];

const MainLayout = ({ children }) => {
  const navigate = useNavigate();
  const username = localStorage.getItem("username");

  const handleMenuClick = (e) => {
    if (e.key === "1") {
      navigate("/OperationsDashboard");
    } else if (e.key === "2") {
      navigate("/MyTasks");
    }
  };

  const handleLogout = async () => {
    try {
      await axios.post(
        "http://localhost:3001/api/logout",
        {},
        {
          headers: {
            Authorization: `Bearer ${localStorage.getItem("token")}`,
          },
        }
      );
      // ลบข้อมูลจาก localStorage
      localStorage.removeItem("token");
      localStorage.removeItem("refreshToken");
      localStorage.removeItem("username");
      localStorage.removeItem("role");

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
        <div className="demo-logo" />
        <Menu
          theme="dark"
          mode="horizontal"
          defaultSelectedKeys={["1"]}
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
        Ant Design ©{new Date().getFullYear()} Created by Ant UED
      </Footer>
    </Layout>
  );
};

export default MainLayout;
