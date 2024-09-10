// src/pages1/clerk/Details.jsx
import React, { useState, useEffect } from "react";
import { useParams, Link } from "react-router-dom";
import { Table, Button, Card } from "antd";
import axios from "axios";
import MainLayout from "../../components/LayoutClerk";
import "../../styles1/Details.css"; // นำเข้าไฟล์ CSS

const Details = () => {
  const [username, setUsername] = useState("");
  const [data, setData] = useState({ balances: [] });
  const { id, upload_id } = useParams();
  const [totalRequested, setTotalRequested] = useState(0);

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
      //console.log("Fetched data:", response.data);
      setData(Array.isArray(response.data) ? response.data : []);
    } catch (err) {
      console.error("Failed to fetch data:", err);
    }
  };

  const fetchTotalRequested = async () => {
    try {
      console.log(`Fetching total requested quantity for upload_id: ${id}`);
      const token = localStorage.getItem("token");
      const response = await axios.get(
        `http://localhost:3001/dashboard/details/${id}/total-requested-quantity`,
        {
          headers: { Authorization: `Bearer ${token}` },
        }
      );
      console.log("Fetched Total Requested Quantity:", response.data);
      setTotalRequested(response.data.totalRequested || 0);
    } catch (err) {
      console.error("Failed to fetch total requested quantity:", err);
    }
  };

  useEffect(() => {
    const storedUsername = localStorage.getItem("username");
    if (storedUsername) {
      setUsername(storedUsername);
    }
    console.log(`Upload ID in useEffect: ${id}`);
    fetchData();
    if (id) {
      fetchTotalRequested(id);
    }
  }, [id, upload_id]);
  

  // ฟังก์ชันสำหรับจัดรูปแบบตัวเลข
  const formatNumber = (number) => {
    return new Intl.NumberFormat().format(number);
  };

  // แปลงข้อมูลเพื่อแสดงคำถามแต่ละข้อเป็นแถว
  const formattedData = Array.isArray(data)
    ? data.flatMap((m) =>
        m.details
          .sort((a, b) => a.matin.localeCompare(b.matin))
          .map((d, index) => ({
            ...d,
            matunit: m.matunit,
            mat_name: m.mat_name,
            quantity: m.quantity,
            material_index: index + 1,
            rowSpanMatunit: index === 0 ? m.details.length : 0,
            rowSpanMatName: index === 0 ? m.details.length : 0,
            rowSpanQuantity: index === 0 ? m.details.length : 0,
            rowSpanMaterialId: index === 0 ? m.details.length : 0,
          }))
      )
    : [];

  //console.log("Formatted Data:", formattedData);

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
      render: (text, record, index) => ({
        children: text,
        props: { rowSpan: record.rowSpanMatunit },
      }),
      align: "left",
    },
    {
      title: "รายการ",
      dataIndex: "mat_name",
      key: "mat_name",
      render: (text, record, index) => ({
        children: text,
        props: { rowSpan: record.rowSpanMatName },
      }),
      align: "left",
    },
    {
      title: "จำนวนที่สั่งเบิก",
      dataIndex: "quantity",
      key: "quantity",
      render: (text, record, index) => ({
        children: formatNumber(text), // แสดงค่าเฉพาะในแถวแรกที่มีค่าเท่านั้น
        props: { rowSpan: record.rowSpanQuantity },
      }),
      align: "center",
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
      title: "จำนวนคงเหลือ",
      dataIndex: "remaining_quantity",
      key: "remaining_quantity",
      render: (text) => formatNumber(text),
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
            dataSource={formattedData}
            pagination={false}
            rowKey={(record) => record.id}
          />
        </div>
        <div className="total-quantity sarabun-bold">
          <p style={{ fontSize: "18px", marginLeft: "20px", padding: "10px" }}>
            <strong>รวมจำนวนที่สั่งเบิก:</strong> {formatNumber(totalRequested)}
          </p>
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
