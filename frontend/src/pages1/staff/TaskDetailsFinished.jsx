// src/pages1/staff/TaskDetailsFinished.jsx
import React, { useState, useEffect } from "react";
import { useParams, Link } from "react-router-dom";
import { Table, Breadcrumb, Card, message } from "antd";
import axios from "axios";
import MainLayout from "../../components/LayoutStaff";
import "../../styles1/Details.css"; // นำเข้าไฟล์ CSS
import config from "../../configAPI";

const TaskDetailsFinished = () => {
  const { upload_id } = useParams();
  const [data, setData] = useState({ balances: [], status: "" });
  const [totalRequestedQuantity, setTotalRequestedQuantity] = useState(0);

  const fetchTaskDetails = async () => {
    try {
      const token = sessionStorage.getItem("token");
      const response = await axios.get(
        `${config.API_URL}/tasks/detail/${upload_id}`,
        {
          headers: { Authorization: `Bearer ${token}` },
        }
      );
      console.log(response.data);
      setData(Array.isArray(response.data) ? response.data : []);
    } catch (err) {
      console.error("Failed to fetch task details:", err);
      message.error("ไม่สามารถดึงข้อมูลรายละเอียดงาน");
    }
  };

  useEffect(() => {
    fetchTaskDetails();
    fetchTotalRequestedQuantity();
  }, [upload_id]);

  const fetchTotalRequestedQuantity = async () => {
    try {
      const token = sessionStorage.getItem("token");
      const response = await axios.get(
        `${config.API_URL}/tasks/detail/${upload_id}/total-requested-quantity`,
        {
          headers: { Authorization: `Bearer ${token}` },
        }
      );
      setTotalRequestedQuantity(response.data.totalRequestedQuantity || 0);
    } catch (err) {
      console.error("Failed to fetch total requested quantity:", err);
    }
  };

  const columns = [
    {
      title: "รายการ",
      dataIndex: "mat_name",
      key: "mat_name",
      render: (text, record, index) => ({
        children: (
          <span>{text}</span>
        ),
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
      title: "จำนวนที่สั่งเบิก",
      dataIndex: "quantity",
      key: "quantity",
      render: (text, record, index) => ({
        children: formatNumber(text), // แสดงค่าเฉพาะในแถวแรกที่มีค่าเท่านั้น
        props: { rowSpan: record.rowSpanQuantity },
      }),
      align: "center",
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
      dataIndex: "lot",
      key: "lot",
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
      dataIndex: "location",
      key: "location",
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
      title: "จำนวนที่ต้องหยิบ",
      dataIndex: "used_quantity",
      key: "used_quantity",
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
      title: "จ่ายจริง",
      dataIndex: "actual_quantity",
      key: "actual_quantity",
      render: (text) => formatNumber(text),
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
      title: "จำนวนคงเหลือ",
      dataIndex: "remaining_quantity",
      key: "remaining_quantity",
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
      title: "นับจริง",
      dataIndex: "counted_quantity",
      render: (text) => formatNumber(text),
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
      title: "แก้ไข",
      dataIndex: "manager_reason",
      key: "manager_reason",
      align: "center",
      render: (text, record) => {
        return text || "-"; // แสดงค่า text ถ้ามีค่า, ถ้าไม่มีให้แสดง "-"
      },
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
    },
  ];

  const getCurrentDateTime = () => {
    const now = new Date();
    return now.toLocaleString();
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
            rowSpanMatunit: index === 0 ? m.details.length : 0,
            rowSpanMatName: index === 0 ? m.details.length : 0, // แสดง mat_name ในทุกแถวที่เกี่ยวข้อง
            rowSpanQuantity: index === 0 ? m.details.length : 0,
            counted_quantity: d.counted_quantity || d.remaining_quantity, // ใช้ counted_quantity ถ้ามี หรือ remaining_quantity ถ้าไม่มี
            actual_quantity: d.actual_quantity, // ใช้ข้อมูลจาก d (แต่ละแถวใน details)
            employee_reason: d.employee_reason, // เหตุผลจาก d (แต่ละแถวใน details)
          }))
      )
    : [];

  // ฟังก์ชันสำหรับจัดรูปแบบตัวเลข
  const formatNumber = (number) => {
    return new Intl.NumberFormat().format(number);
  };
  
  
  return (
    <MainLayout>
      <div
        style={{
          backgroundColor: " #DCDCDC",
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
              padding: "20px",
            }}
          >
            รายละเอียดการเบิก-จ่ายวัตถุดิบ
          </div>
        </div>
      </div>

      <div>
        <Breadcrumb className="sarabun-light" style={{ margin: "16px 0" }}>
          <Breadcrumb.Item>
            <Link to="/OperationsDashboard">รายการเบิก-จ่ายทั้งหมด</Link>
          </Breadcrumb.Item>
          <Breadcrumb.Item>
            <Link to="/MyTasks">รายการเบิก-จ่ายของฉัน</Link>
          </Breadcrumb.Item>
          <Breadcrumb.Item>รายละเอียดการเบิก-จ่าย</Breadcrumb.Item>
        </Breadcrumb>
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
            scroll={{ x: "max-content" }}
            className="custom-table"
          />
        </div>
        <div
          className="total-quantity sarabun-bold"
          style={{
            backgroundColor: " #DCDCDC",
            marginBottom: "20px",
            borderRadius: "8px",
          }}
        >
          <p style={{ fontSize: "18px", marginLeft: "20px", padding: "10px" }}>
            <strong>รวมจำนวนที่สั่งเบิก:</strong>{" "}
            {formatNumber(totalRequestedQuantity)}
          </p>
        </div>
        <div className="button-container">
          <Link to="/MyTasks">
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
    </MainLayout>
  );
};

export default TaskDetailsFinished;
