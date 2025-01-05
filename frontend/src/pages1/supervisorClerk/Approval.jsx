import React, { useState, useEffect } from "react";
import { Table, Button, Space, Tag, message, Row, Col, Card } from "antd";
import axios from "axios";
import { useNavigate } from "react-router-dom";
import config from "../../configAPI";
import MainLayout from "../../components/LayoutSupervisorClerk";

const materialTypeMap = {
  PK_DIS: "กล่องดิส/ใบแนบ/สติ๊กเกอร์",
  PK_shoe: "กล่องก้าม/ใบแนบ/สติ๊กเกอร์",
  WD: "กิ๊ฟล๊อค/แผ่นชิม",
  PIN: "สลัก/ตะขอ",
  BP: "แผ่นเหล็ก",
  CHEMICAL: "เคมี",
};

const Approval = () => {
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(false);
  const [selectedTab, setSelectedTab] = useState("pendingReview"); // Default to pending review

  const fetchData = async (statusFilter) => {
    try {
      setLoading(true);
      const token = sessionStorage.getItem("token");
      const response = await axios.get(`${config.API_URL}/dashboard`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });
      const filteredData = response.data.filter(
        (item) => item.status === statusFilter
      );

      // เรียงข้อมูลจากวันที่ล่าสุดให้อยู่บนสุด
      const sortedData = filteredData.sort((a, b) => {
        const dateA = new Date(a.date);
        const dateB = new Date(b.date);
        return dateB - dateA; // เรียงจากวันที่ล่าสุด (ใหม่สุด) ไปหาน้อยสุด
      });

      setData(sortedData);
    } catch (err) {
      console.error("Failed to fetch data:", err);
    } finally {
      setLoading(false);
    }
  };

  const navigate = useNavigate();

  useEffect(() => {
    fetchData("รอดำเนินการต่อ"); // Fetch pending review data on initial load
  }, []);

  const handleTabChange = (tabKey) => {
    setSelectedTab(tabKey);
    const statusFilter =
      tabKey === "pendingReview" ? "รอดำเนินการต่อ" : "รอตรวจสอบ";
    fetchData(statusFilter);
  };

  // ฟังก์ชันที่เพิ่มมาจากหน้า DashboardSupervisorClerk
  const handleEditClick = async (record) => {
    // ตรวจสอบสถานะและทำการ navigate ไปยัง URL ที่แตกต่างกัน
    if (record.status === "รอดำเนินการต่อ") {
      navigate(`/Sup-Edit/${record.upload_id}`, { state: { record } });
    } else if (record.status === "รอตรวจสอบ") {
      navigate(`/Edit-Remaining/${record.upload_id}`, { state: { record } });
    }
  };
  

  const columns = [
    {
      title: "Inventory ID",
      dataIndex: "inventory_id",
      key: "inventory_id",
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
      title: "วัตถุดิบ",
      dataIndex: "material_type",
      key: "material_type",
      align: "left",
      render: (matType) => materialTypeMap[matType] || matType,
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
      title: "วันที่",
      dataIndex: "date",
      key: "date",
      align: "center",
      render: (date) => (date ? new Date(date).toLocaleDateString() : "N/A"),
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
      title: "สถานะ",
      dataIndex: "status",
      key: "status",
      align: "center",
      render: (status) => (
        <Tag
          className="sarabun-light"
          color={status === "รอตรวจสอบ" ? "red" : "purple"}
        >
          {status}
        </Tag>
      ),
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
      title: "การดำเนินการ",
      key: "action",
      align: "center",
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
      render: (_, record) => (
        <Space size="middle">
          <Button
            style={{
              color: "#f0f0f0",
              backgroundColor: "red",
              borderColor: "red",
            }}
            onClick={() => handleEditClick(record)} // เพิ่มฟังก์ชันตรวจสอบ
          >
            ตรวจสอบ
          </Button>
        </Space>
      ),
    },
  ];

  return (
    <MainLayout>
      <Row gutter={16}>
        <Col className="gutter-row" span={12}>
          <Card
            hoverable
            onClick={() => handleTabChange("pendingReview")}
            style={{
              textAlign: "center",
              backgroundColor:
                selectedTab === "pendingReview" ? "#ffd591" : "#fff",
              borderRadius: "24px", // กรอบมน
              boxShadow: "0 4px 6px rgba(0, 0, 0, 0.1)",
            }}
          >
            <h3 className="sarabun-bold">ตรวจสอบการจ่ายจริง</h3>
          </Card>
        </Col>
        <Col className="gutter-row" span={12}>
          <Card
            hoverable
            onClick={() => handleTabChange("pendingApproval")}
            style={{
              textAlign: "center",
              backgroundColor:
                selectedTab === "pendingApproval" ? "#ffa5a1" : "#fff",
              borderRadius: "24px", // กรอบมน
              boxShadow: "0 4px 6px rgba(0, 0, 0, 0.1)",
            }}
          >
            <h3 className="sarabun-bold">ตรวจสอบยอดคงเหลือ</h3>
          </Card>
        </Col>
      </Row>

      <Table
        dataSource={data}
        columns={columns}
        loading={loading}
        rowKey="upload_id"
        style={{ marginTop: 16 }}
        className="custom-table"
        pagination={false}
      />
    </MainLayout>
  );
};

export default Approval;
