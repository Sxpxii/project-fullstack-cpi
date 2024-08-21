// src/pages1/clerk/Details.jsx
import React, { useState, useEffect } from "react";
import { useParams, Link } from "react-router-dom";
import { Table, Button, Card } from "antd";
import axios from "axios";
import MainLayout from "../../components/LayoutClerk";
import "../../styles1/Details.css"; // นำเข้าไฟล์ CSS

const Details = () => {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [username, setUsername] = useState("");
  const [data, setData] = useState({ balances: [] });
  const { id } = useParams();

  const toggleSidebar = () => {
    setSidebarOpen(!sidebarOpen);
  };

  const fetchData = async () => {
    try {
      const token = localStorage.getItem("token");
      const response = await axios.get(
        `http://localhost:3001/dashboard/details/${id}`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );
      console.log("Fetched data:", response.data);
      setData(response.data);
    } catch (err) {
      console.error("Failed to fetch data:", err);
    }
  };

  useEffect(() => {
    const storedUsername = localStorage.getItem("username");
    if (storedUsername) {
      setUsername(storedUsername);
    }
    fetchData();
  }, [id]);

  const columns = [
    {
      title: "ลำดับ",
      key: "index",
      render: (text, record, index) => index + 1,
      align: "left",
    },
    {
      title: "รหัส",
      dataIndex: "matunit",
      key: "matunit",
      align: "left",
    },
    {
      title: "รายการ",
      dataIndex: "mat_name",
      key: "mat_name",
      align: "left",
    },
    {
      title: "ล็อต",
      dataIndex: "lot",
      key: "lot",
      align: "left",
    },
    {
      title: "ตำแหน่ง",
      dataIndex: "location",
      key: "location",
      align: "left",
    },
    {
      title: "จำนวน",
      dataIndex: "quantity",
      key: "quantity",
      align: "center",
    },
    {
      title: "จำนวนคงเหลือ",
      dataIndex: "remaining_quantity",
      key: "remaining_quantity",
      align: "center",
    },
    {
      title: "นับจริง",
      dataIndex: "counted_quantity",
      key: "counted_quantity",
      align: "center",
    },
  ];

  const getCurrentDateTime = () => {
    const now = new Date();
    return now.toLocaleString(); // ใช้วิธีการแสดงผลวันที่และเวลาที่คุณต้องการ
  };

  return (
    <MainLayout>
      <div
        style={{
          backgroundColor: " #ffffff",
          padding: "15px 30p",
          marginBottom: "20px",
          borderRadius: "15px",
          boxShadow: "0 4px 8px rgba(0, 0, 0, 0.2)",
        }}
      >
        <div style={{ margin: "10px" }}>
          <div
            className="dashboard-title sarabun-bold"
            style={{
              fontSize: "28px",
              marginLeft: "20px",
              padding: "10px",
            }}
          >
            รายละเอียดการเบิก-จ่ายวัตถุดิบ
          </div>
          <div
            className="sarabun-light"
            style={{
              fontSize: "14px",
              marginLeft: "20px",
              padding: "10px",
            }}
          >
            <span className="ms-2"> {getCurrentDateTime()}</span>
          </div>
        </div>
      </div>

      <Card
        style={{
          borderRadius: "15px",
        }}
      >
        <div className="table-container">
          <Table
            columns={columns}
            dataSource={data.balances}
            pagination={false}
            rowKey={(record) => record.id}
          />
        </div>
        <div className="button-container">
          <Link to="/Dashboard">
            <button
              className="sarabun-light"
              style={{
                color: "#f0f0f0",
                backgroundColor: "#5755FE",
                borderColor: "#5755FE",
                marginRight: "5px",
              }}
            >
              ย้อนกลับ
            </button>
          </Link>
        </div>
      </Card>
    </MainLayout>
  );
};

export default Details;
