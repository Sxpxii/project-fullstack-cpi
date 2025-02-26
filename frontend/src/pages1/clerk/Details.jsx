// src/pages1/clerk/Details.jsx
import React, { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { Table, Button, Card } from "antd";
import axios from "axios";
import MainLayout from "../../components/LayoutClerk";
import "../../styles1/Details.css"; // นำเข้าไฟล์ CSS
import config from "../../configAPI";

const Details = () => {
  const [username, setUsername] = useState("");
  const [data, setData] = useState({ balances: [] });
  const { upload_id } = useParams();
  const [totalRequested, setTotalRequested] = useState(0);
  const [formattedData, setFormattedData] = useState([]);
  const navigate = useNavigate();

  const fetchData = async () => {
    if (!upload_id) {
      console.error("upload_id is missing, cannot fetch data.");
      return;
    }
    try {
      const token = sessionStorage.getItem("token");
      if (!token) {
        console.error("No token found in sessionStorage");
        return;
      }

      const response = await axios.get(
        `${config.API_URL}/dashboardClerk/details/${upload_id}`,
        {
          headers: { Authorization: `Bearer ${token}` },
        }
      );
      console.log("Fetched data:", response.data);
      setData(Array.isArray(response.data) ? response.data : []);
    } catch (err) {
      console.error("Failed to fetch data:", err.response?.data || err.message);
    }
  };

  const fetchTotalRequested = async () => {
    if (!upload_id) {
      console.error("upload_id is missing, cannot fetch data.");
      return;
    }
    try {
      console.log(
        `Fetching total requested quantity for upload_id: ${upload_id}`
      );
      const token = sessionStorage.getItem("token");
      const response = await axios.get(
        `${config.API_URL}/dashboardClerk/details/${upload_id}/total-requested-quantity`,
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
    const storedUsername = sessionStorage.getItem("username");
    if (storedUsername) {
      setUsername(storedUsername);
    }
    console.log(`Upload ID: ${upload_id}`);
    fetchData();
    if (upload_id) {
      fetchTotalRequested(upload_id);
    }
  }, [upload_id]);

  // ฟังก์ชันสำหรับจัดรูปแบบตัวเลข
  const formatNumber = (number) => {
    return new Intl.NumberFormat().format(number);
  };

  useEffect(() => {
    // แปลงข้อมูลเพื่อแสดงคำถามแต่ละข้อเป็นแถว
    const formattedData = Array.isArray(data)
      ? data.flatMap((m) =>
          m.details.map((d, index) => {
            return {
              ...d,
              sequence: m.sequence,
              mat_unit: m.mat_unit,
              mat_name: m.mat_name,
              material_index: index + 1,
              rowSpansequence: index === 0 ? m.details.length : 0,
              rowSpanMatunit: index === 0 ? m.details.length : 0,
              rowSpanMatName: index === 0 ? m.details.length : 0,
              rowSpanQuantity: index === 0 ? m.details.length : 0,
              rowSpanMaterialId: index === 0 ? m.details.length : 0,
            };
          })
        )
      : [];

    setFormattedData(formattedData); // อัปเดตข้อมูลใน formattedData
  }, [data]); // คำนวณใหม่เมื่อข้อมูลเหล่านี้เปลี่ยนแปลง
  //console.log("Formatted Data:", formattedData);

  const columns = [
    {
      title: "ลำดับ",
      dataIndex: "sequence",
      key: "sequence",
      render: (text, record) => ({
        children: <span>{text}</span>,
        props: { rowSpan: record.rowSpansequence }, // ใช้ rowSpan จากข้อมูลที่จัดรูปแบบ
      }),
      align: "center",
      onHeaderCell: () => ({
        style: {
          backgroundColor: "#00152a", // สีพื้นหลังของหัวคอลัมน์
          fontWeight: "bold", // ความหนาของตัวอักษร
          fontSize: "14px", // ขนาดตัวอักษร
          color: "#ffffff", // สีตัวอักษร
          borderTopLeftRadius: "10px", // มุมโค้งด้านซ้ายบน
          borderBottomLeftRadius: "10px", // มุมโค้งด้านซ้ายล่าง
        },
      }),
    },
    {
      title: "รายการ",
      dataIndex: "mat_name",
      key: "mat_name",
      render: (text, record, index) => ({
        children: <span>{text}</span>,
        props: { rowSpan: record.rowSpanMatName },
      }),
      align: "left",
      onHeaderCell: () => ({
        style: {
          backgroundColor: "#00152a", // สีพื้นหลังของหัวคอลัมน์
          fontWeight: "bold", // ความหนาของตัวอักษร
          fontSize: "14px", // ขนาดตัวอักษร
          color: "#ffffff", // สีตัวอักษร
        },
      }),
    },
    {
      title: "ล็อต",
      dataIndex: "mat_lot",
      key: "mat_lot",
      align: "left",
      onHeaderCell: () => ({
        style: {
          backgroundColor: "#00152a", // สีพื้นหลังของหัวคอลัมน์
          fontWeight: "bold", // ความหนาของตัวอักษร
          fontSize: "14px", // ขนาดตัวอักษร
          color: "#ffffff", // สีตัวอักษร
        },
      }),
    },
    {
      title: "ตำแหน่ง",
      dataIndex: "loc",
      key: "loc",
      align: "left",
      onHeaderCell: () => ({
        style: {
          backgroundColor: "#00152a", // สีพื้นหลังของหัวคอลัมน์
          fontWeight: "bold", // ความหนาของตัวอักษร
          fontSize: "14px", // ขนาดตัวอักษร
          color: "#ffffff", // สีตัวอักษร
        },
      }),
    },
    {
      title: "จำนวนสั่งเบิก",
      dataIndex: "quantity",
      key: "quantity",
      onHeaderCell: () => ({
        style: {
          backgroundColor: "#00152a", // สีพื้นหลังของหัวคอลัมน์
          fontWeight: "bold", // ความหนาของตัวอักษร
          fontSize: "14px", // ขนาดตัวอักษร
          color: "#ffffff", // สีตัวอักษร
        },
      }),
      render: (text) => formatNumber(text),
      align: "center",
    },
    {
      title: "คงเหลือรวม",
      dataIndex: "total_quantity",
      key: "total_quantity",
      onHeaderCell: () => ({
        style: {
          backgroundColor: "#00152a", // สีพื้นหลังของหัวคอลัมน์
          fontWeight: "bold", // ความหนาของตัวอักษร
          fontSize: "14px", // ขนาดตัวอักษร
          color: "#ffffff", // สีตัวอักษร
          borderTopRightRadius: "10px", // มุมโค้งด้านขวาบน
          borderBottomRightRadius: "10px", // มุมโค้งด้านขวาล่าง
        },
      }),
      render: (text) => (text === 0 ? "-" : formatNumber(text)),
      align: "center",
    },
  ];

  const handleBackClick = () => {
    navigate("/dashboardClerk");
  };

  return (
    <MainLayout>
      <div style={{ padding: "0 48px" }}>
        <Card
          style={{
            borderRadius: "15px",
          }}
        >
          <div
            className="dashboard-title sarabun-bold"
            style={{
              fontSize: "20px",
              padding: "20px",
            }}
          >
            รายละเอียดการเบิกจ่ายวัตถุดิบ :
          </div>
          <div className="table-container">
            <Table
              columns={columns}
              dataSource={formattedData}
              pagination={false}
              rowKey={(record) => record.id}
              scroll={{ x: "max-content" }} // ทำให้ตารางเลื่อนไปข้างๆ ได้หากข้อมูลกว้าง
              className="custom-table"
            />
          </div>
          <Card
            className="sarabun-bold"
            style={{
              backgroundColor: " #DCDCDC",
              borderRadius: "12px",
              fontSize: "18px",
              marginTop: "30px",
              marginBottom: "30px",
            }}
          >
            รวมจำนวนที่สั่งเบิก : {formatNumber(totalRequested)}
          </Card>
          <div className="button-container">
            <button
              className="sarabun-light"
              style={{
                color: "#5755FE",
                backgroundColor: "#f0f0f0",
                borderColor: "#5755FE",
                marginRight: "5px",
              }}
              onClick={handleBackClick}
            >
              ย้อนกลับ
            </button>
          </div>
        </Card>
      </div>
    </MainLayout>
  );
};

export default Details;
