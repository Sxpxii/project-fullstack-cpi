// src/pages1/supervisorClerk/Details.jsx
import React, { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { Table, Button, Card } from "antd";
import axios from "axios";
import MainLayout from "../../components/LayoutSupervisorClerk";
import "../../styles1/Details.css"; // นำเข้าไฟล์ CSS
import config from "../../configAPI";
import dayjs from "dayjs";
import utc from "dayjs/plugin/utc";
import timezone from "dayjs/plugin/timezone";

dayjs.extend(utc);
dayjs.extend(timezone);

const DetailsSupClerk = () => {
  const [username, setUsername] = useState("");
  const [data, setData] = useState({ balances: [] });
  const { upload_id } = useParams();
  const [totalRequested, setTotalRequested] = useState(0);
  const [inventoryId, setInventoryId] = useState(null);
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
        `${config.API_URL}/supClerkdashboard/details-SupClerk/${upload_id}`,
        {
          headers: { Authorization: `Bearer ${token}` },
        }
      );
      console.log("Fetched data:", response.data);
      setData(Array.isArray(response.data) ? response.data : []);
      setInventoryId(response.data[0].inventory_id || null);
    } catch (err) {
      console.error("Failed to fetch data:", err.response?.data || err.message);
    }
  };

  useEffect(() => {
    const storedUsername = sessionStorage.getItem("username");
    if (storedUsername) {
      setUsername(storedUsername);
    }
    console.log(`Upload ID: ${upload_id}`);
    fetchData();
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
      width: 70,
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
      title: "จำนวนที่ต้องจ่าย",
      dataIndex: "quantity",
      key: "quantity",
      width: 150,
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
      title: "จำนวนจ่ายจริง",
      dataIndex: "actual_quantity",
      key: "actual_quantity",
      width: 150,
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
      title: "จำนวนคงเหลือในโปรแกรม",
      dataIndex: "remaining_quantity",
      key: "remaining_quantity",
      width: 150,
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
      title: "จำนวนคงเหลือจริง",
      dataIndex: "counted_quantity",
      key: "counted_quantity",
      width: 150,
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
      title: "คงเหลือรวมทุกล็อต",
      dataIndex: "total_quantity",
      key: "total_quantity",
      width: 150,
      onHeaderCell: () => ({
        style: {
          backgroundColor: "#00152a", // สีพื้นหลังของหัวคอลัมน์
          fontWeight: "bold", // ความหนาของตัวอักษร
          fontSize: "14px", // ขนาดตัวอักษร
          color: "#ffffff", // สีตัวอักษร
        },
      }),
      render: (text) => (text === 0 ? "-" : formatNumber(text)),
      align: "center",
    },
    {
      title: "เหตุผลจนท.(จ่ายจริง)",
      dataIndex: "employee_reason",
      key: "employee_reason",
      onHeaderCell: () => ({
        style: {
          backgroundColor: "#00152a", // สีพื้นหลังของหัวคอลัมน์
          fontWeight: "bold", // ความหนาของตัวอักษร
          fontSize: "14px", // ขนาดตัวอักษร
          color: "#ffffff", // สีตัวอักษร
        },
      }),
      align: "center",
    },
    {
      title: "เหตุผลจนท.(คงเหลือ)",
      dataIndex: "employee_reason_remaining",
      key: "employee_reason_remaining",
      onHeaderCell: () => ({
        style: {
          backgroundColor: "#00152a", // สีพื้นหลังของหัวคอลัมน์
          fontWeight: "bold", // ความหนาของตัวอักษร
          fontSize: "14px", // ขนาดตัวอักษร
          color: "#ffffff", // สีตัวอักษร
        },
      }),
      align: "center",
    },
    {
      title: "เหตุผลหัวหน้า(จ่ายจริง)",
      dataIndex: "manager_reason",
      key: "manager_reason",
      onHeaderCell: () => ({
        style: {
          backgroundColor: "#00152a", // สีพื้นหลังของหัวคอลัมน์
          fontWeight: "bold", // ความหนาของตัวอักษร
          fontSize: "14px", // ขนาดตัวอักษร
          color: "#ffffff", // สีตัวอักษร
        },
      }),
      align: "center",
    },
    {
      title: "เหตุผลหัวหน้า(คงเหลือ)",
      dataIndex: "manager_reason_remaining",
      key: "manager_reason_remaining",
      onHeaderCell: () => ({
        style: {
          backgroundColor: "#00152a", // สีพื้นหลังของหัวคอลัมน์
          fontWeight: "bold", // ความหนาของตัวอักษร
          fontSize: "14px", // ขนาดตัวอักษร
          color: "#ffffff", // สีตัวอักษร
        },
      }),
      align: "center",
    },
    {
      title: "เวลา",
      dataIndex: "selected_time",
      key: "selected_time",
      render: (text) =>
              text
                ? dayjs.utc(text).tz("Asia/Bangkok").format("YYYY-MM-DD HH:mm:ss")
                : "-",
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
      align: "center",
    },
  ];

  const handleBackClick = () => {
    navigate("/SupClerkDashboardAnalysis");
  };

  return (
    <MainLayout>
      <div style={{ padding: "0 48px" }}>
        <div style={{ flex: 1 }}></div> {/* เว้นฝั่งซ้ายให้พอมีระยะ */}
        <div
          className="dashboard-title sarabun-bold"
          style={{
            fontSize: "30px",
            textAlign: "center",
            flex: 1,
            marginTop:"30px",
            marginBottom:"30px"
          }}
        >
          ใบสั่งงานเลขที่ : {inventoryId ? inventoryId : "N/A"}
        </div>
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
            รายละเอียด :
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

          <div
            style={{
              display: "flex",
              justifyContent: "center",
              marginTop: "20px",
              marginBottom: "20px",
            }}
          >
            <button
              className="sarabun-light"
              style={{
                color: "#5755FE",
                backgroundColor: "#f0f0f0",
                borderColor: "#5755FE",
                padding: "8px 16px",
                borderRadius: "8px",
                cursor: "pointer",
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

export default DetailsSupClerk;
