// src/pages1/clerk/Details.jsx
import React, { useState, useEffect } from "react";
import { useParams, Link } from "react-router-dom";
import { Table, Button, Card } from "antd";
import axios from "axios";
import MainLayout from "../../components/LayoutClerk";
import "../../styles1/Details.css"; // นำเข้าไฟล์ CSS
import config from "../../configAPI";

const Details = () => {
  const [username, setUsername] = useState("");
  const [data, setData] = useState({ balances: [] });
  const { id, upload_id } = useParams();
  const [totalRequested, setTotalRequested] = useState(0);

  const fetchData = async () => {
    try {
      const token = sessionStorage.getItem("token");
      const response = await axios.get(
        `${config.API_URL}/dashboard/details/${id}`,
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
      const token = sessionStorage.getItem("token");
      const response = await axios.get(
        `${config.API_URL}/dashboard/details/${id}/total-requested-quantity`,
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
        m.details.map((d, index) => ({
          ...d,
          mat_unit: m.mat_unit,
          mat_name: m.mat_name,
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
          borderTopLeftRadius: "10px", // มุมโค้งด้านซ้ายบน
          borderBottomLeftRadius: "10px", // มุมโค้งด้านซ้ายล่าง
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
            <Link to="/Dashboard">
              <button
                className="sarabun-light"
                style={{
                  color: "#5755FE ",
                  backgroundColor: "#f0f0f0",
                  borderColor: "#5755FE",
                  marginRight: "5px",
                }}
              >
                ย้อนกลับ
              </button>
            </Link>
          </div>
        </Card>
      </div>
    </MainLayout>
  );
};

export default Details;
