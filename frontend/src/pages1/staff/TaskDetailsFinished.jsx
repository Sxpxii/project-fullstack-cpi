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
  const [inventoryId, setInventoryId] = useState(null);

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
      setInventoryId(response.data[0].inventory_id || null);
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
      title: "จำนวนที่ต้องจ่าย",
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
      title: "จำนวนจ่ายจริง",
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
      title: (
        <div
          style={{
            whiteSpace: "normal",
            wordBreak: "break-word",
            textAlign: "center",
            maxWidth: 100,
          }}
        >
          จำนวนคงเหลือในโปรแกรม
        </div>
      ),
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
      title: (
        <div
          style={{
            whiteSpace: "normal",
            wordBreak: "break-word",
            textAlign: "center",
            maxWidth: 100,
          }}
        >
          จำนวนคงเหลือนับจริง
        </div>
      ),
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
      title: "วิธีแก้ไข",
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
        m.details.map((d, index) => ({
          ...d,
          sequence: m.sequence,
          mat_unit: m.mat_unit,
          mat_name: m.mat_name,
          rowSpansequence: index === 0 ? m.details.length : 0,
          rowSpanMatunit: index === 0 ? m.details.length : 0,
          rowSpanMatName: index === 0 ? m.details.length : 0, // แสดง mat_name ในทุกแถวที่เกี่ยวข้อง
          rowSpanQuantity: index === 0 ? m.details.length : 0,
          counted_quantity: d.counted_quantity || d.remaining_quantity, // ใช้ counted_quantity ถ้ามี หรือ remaining_quantity ถ้าไม่มี
          actual_quantity: d.actual_quantity, // ใช้ข้อมูลจาก d (แต่ละแถวใน details)
        }))
      )
    : [];

  // ฟังก์ชันสำหรับจัดรูปแบบตัวเลข
  const formatNumber = (number) => {
    return new Intl.NumberFormat().format(number);
  };

  return (
    <MainLayout>
      <div style={{ padding: "0 48px" }}>
        {/*<div style={{ marginTop: "20px", marginBottom: "20px" }}>
          <Breadcrumb className="sarabun-light" style={{ margin: "16px 0" }}>
            <Breadcrumb.Item>
              <Link to="/OperationsDashboard">รายการเบิก-จ่ายทั้งหมด</Link>
            </Breadcrumb.Item>
            <Breadcrumb.Item>
              <Link to="/MyTasks">รายการเบิก-จ่ายของฉัน</Link>
            </Breadcrumb.Item>
            <Breadcrumb.Item>รายละเอียดการเบิก-จ่าย</Breadcrumb.Item>
          </Breadcrumb>
        </div>*/}

        <div
          className="dashboard-title sarabun-bold"
          style={{
            fontSize: "30px",
            textAlign: "center", // จัดข้อความตรงกลาง
            display: "flex",
            justifyContent: "center", // จัดให้อยู่ตรงกลางแนวนอน
            alignItems: "center", // จัดให้อยู่ตรงกลางแนวตั้ง (ถ้าสูง)
            height: "50px", // ตั้งความสูงให้พอดี
            marginBottom: "30px",
            marginTop: "30px",
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
            รายละเอียด : ใบสั่งงานเลขที่ {inventoryId ? inventoryId : "N/A"}
          </div>
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
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
              }}
            >
              <div>ใบสั่งงานเลขที่ : {inventoryId ? inventoryId : "N/A"}</div>
              <div>
                รวมจำนวนที่สั่งเบิก : {formatNumber(totalRequestedQuantity)}
              </div>
            </div>
          </Card>
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
      </div>
    </MainLayout>
  );
};

export default TaskDetailsFinished;
