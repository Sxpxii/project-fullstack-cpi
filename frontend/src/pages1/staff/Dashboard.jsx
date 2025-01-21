// src/pages1/staff/Dashboard.jsx
import React, { useState, useEffect } from "react";
import { useMediaQuery } from "react-responsive";
import { useNavigate } from "react-router-dom";
import { Table, Button, Modal, message, Tag, Card, Checkbox, Row, Col,} from "antd";
import axios from "axios";
import MainLayout from "../../components/LayoutStaff";
import "../../styles1/OperationDashboard.css";
import config from "../../configAPI";

const OperationsDashboard = () => {
  const [username, setUsername] = useState("");
  const [tasks, setTasks] = useState([]);
  const [mytasks, setMyTasks] = useState([]);
  const [selectedTask, setSelectedTask] = useState(null);
  const [modalVisible, setModalVisible] = useState(false);
  const [selectedMaterialTypes, setSelectedMaterialTypes] = useState([]);
  const navigate = useNavigate();
  const isTabletOrMobile = useMediaQuery({ query: "(max-width: 1024px)" });
  const [isUserActive, setIsUserActive] = useState(true);

  const fetchTasks = async () => {
    try {
      const token = sessionStorage.getItem("token");
      const response = await axios.get(`${config.API_URL}/tasks`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });
      setTasks(response.data);
    } catch (err) {
      console.error("Failed to fetch tasks:", err);
    }
  };

  const fetchMyTasks = async () => {
    try {
      const token = sessionStorage.getItem("token");
      const response = await axios.get(`${config.API_URL}/tasks/mytasks`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });
      setMyTasks(response.data);
    } catch (err) {
      console.error("Failed to fetch my tasks:", err);
    }
  };

  const handleMaterialTypeChange = (checkedValues) => {
    setSelectedMaterialTypes(checkedValues); // อัปเดตประเภทวัตถุดิบที่เลือก
  };

  // กรองข้อมูลก่อนแสดงผลตามประเภทวัตถุดิบที่เลือก
  const filteredTasks = tasks
    .filter((task) =>
      selectedMaterialTypes.length > 0
        ? selectedMaterialTypes.includes(task.material_type)
        : true
    )
    .sort((a, b) => new Date(b.upload_date) - new Date(a.upload_date));

  const getCurrentDate = () => {
    return new Date().toISOString().split("T")[0]; // คืนค่าปัจจุบันในรูปแบบ YYYY-MM-DD
  };

  useEffect(() => {
    const storedUsername = sessionStorage.getItem("username");
    if (storedUsername) {
      setUsername(storedUsername);
    }
    fetchTasks();
    fetchMyTasks();
    // Set up activity listener
    const handleUserActivity = () => setIsUserActive(true);
    window.addEventListener("mousemove", handleUserActivity);
    window.addEventListener("keydown", handleUserActivity);

    // Auto-refresh if user is inactive
    const interval = setInterval(() => {
      if (!isUserActive) {
        fetchTasks();
        fetchMyTasks();
      }
      setIsUserActive(false); // Reset user activity status
    }, 60000); // 1 minute interval

    return () => {
      clearInterval(interval);
      window.removeEventListener("mousemove", handleUserActivity);
      window.removeEventListener("keydown", handleUserActivity);
    };
  }, [isUserActive]);

  const handleSelectTask = (record) => {
    setSelectedTask(record);
    setModalVisible(true);
  };

  const handleConfirmTask = async () => {
    if (!selectedTask) {
      message.error("กรุณาเลือกงานที่ต้องการรับ");
      return;
    }

    try {
      const token = sessionStorage.getItem("token");
      await axios.post(
        `${config.API_URL}/tasks/accept/${selectedTask.upload_id}`,
        { username },
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );
      message.success("รับงานเรียบร้อยแล้ว");
      setModalVisible(false);
      fetchTasks(); // อัปเดตรายการงานทั้งหมด
      fetchMyTasks(); // อัปเดตรายการงานของฉัน
    } catch (error) {
      console.error("เกิดข้อผิดพลาดในการรับงาน:", error);
      message.error("เกิดข้อผิดพลาดในการรับงาน");
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
      onHeaderCell: () => ({
        style: {
          backgroundColor: "#00152a", // สีพื้นหลังของหัวคอลัมน์
          fontWeight: "bold", // ความหนาของตัวอักษร
          fontSize: "14px", // ขนาดตัวอักษร
          color: "#ffffff", // สีตัวอักษร
        },
      }),
      render: (materialType) => {
        switch (materialType) {
          case "PK_DIS":
            return "กล่องดิส/ใบแนบ/สติ๊กเกอร์";
          case "PK_shoe":
            return "กล่องก้าม/ใบแนบ/สติ๊กเกอร์";
          case "WD":
            return "กิ๊ฟล๊อค/แผ่นชิม";
          case "PIN":
            return "สลัก/ตะขอ";
          case "BP":
            return "แผ่นเหล็ก";
          case "CHEMICAL":
            return "เคมี";
          default:
            return materialType; // หรือแสดงเป็นค่าเริ่มต้นหากไม่มีค่าที่ตรงกัน
        }
      },
      align: "left",
    },
    {
      title: "วันที่",
      dataIndex: "upload_date",
      key: "upload_date",
      render: (date) => new Date(date).toLocaleDateString(),
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
      title: "สถานะ",
      key: "overdue",
      render: (record) => {
        const currentDate = getCurrentDate();
        const isOverdue =
          new Date(record.upload_date).toISOString().split("T")[0] <
          currentDate;
        return isOverdue ? (
          <Tag className="sarabun-light" color="red">
            เกินกำหนด
          </Tag>
        ) : (
          <Tag className="sarabun-light" color="blue">
            รอรับงาน
          </Tag>
        );
      },
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
      title: "",
      key: "action",
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
        <Button
          className="sarabun-light"
          style={{
            color: "#f0f0f0",
            backgroundColor: "#5755FE",
            borderColor: "#5755FE",
          }}
          onClick={() => handleSelectTask(record)}
          disabled={record.assigned_to}
        >
          รับงาน
        </Button>
      ),
    },
  ];

  return (
    <MainLayout>
      <div style={{ padding: "0 48px" }}>
        <Row>
          <div
            className="dashboard-title sarabun-bold"
            style={{
              fontSize: isTabletOrMobile ? "28px" : "30px",
              textAlign: isTabletOrMobile ? "center" : "left",
              marginLeft: isTabletOrMobile ? "0px" : "10px",
              marginTop:"30px",
              marginBottom:"30px",
            }}
          >
            รายการเบิกจ่ายวัตถุดิบ
          </div>
        </Row>

        {/* Checkbox สำหรับกรองประเภทวัตถุดิบ */}
        <Card
          style={{
            display: "flex",
            flexDirection: "column",
            backgroundColor: "#dbbc8c",
            borderRadius: "24px",
            border: "1px solid #ddd",
            marginBottom: "30px",
            fontSize: "18px",
            width: "300px",
            alignSelf: "flex-end",
            boxShadow: "0 2px 5px rgba(0, 0, 0, 0.1)", // เพิ่มเงาให้ดูมีมิติ
          }}
          className="sarabun-light"
          onChange={handleMaterialTypeChange}
        >
          {[
            { label: "กล่องดิส/ใบแนบ/สติ๊กเกอร์", value: "PK_DIS" },
            { label: "กล่องก้าม/ใบแนบ/สติ๊กเกอร์", value: "PK_shoe" },
            { label: "กิ๊ฟล๊อค/แผ่นชิม", value: "WD" },
            { label: "สลัก/ตะขอ", value: "PIN" },
            { label: "แผ่นเหล็ก", value: "BP" },
            { label: "เคมี", value: "CHEMICAL" },
          ].map((option) => (
            <div
              key={option.value}
              style={{
                display: "flex",
                alignItems: "center",
                marginBottom: "10px",
              }}
            >
              <Checkbox
                value={option.value}
                style={{
                  width: "30px", // ขนาดของ Checkbox
                  height: "30px", // ขนาดของ Checkbox
                  transform: "scale(1.5)",
                  marginLeft: "15px",
                }}
              />
              <span
                style={{ marginLeft: "10px", fontSize: "15px", color: "black" }}
              >
                {option.label}
              </span>{" "}
              {/* ขนาดข้อความ */}
            </div>
          ))}
        </Card>

        <div>
          <Card
            style={{
              borderRadius: "24px",
              height: "60vh",
            }}
          >
            <div
              style={{
                fontSize: "22px",
                marginBottom: "10px",
              }}
              className="sarabun-bold"
            >
              <span>ทั้งหมด</span>
              <span className="ms-2"> {tasks.length} </span>
              <span className="ms-2">รายการ :</span>
            </div>

            <div
              style={{
                height: "350px", // กำหนดความสูงของตาราง
                overflowY: "auto", // ทำให้เลื่อนขึ้นลงได้
              }}
              className="table-responsive"
            >
              <Table
                columns={columns}
                dataSource={filteredTasks}
                pagination={false}
                className="custom-table"
              />
            </div>
          </Card>
        </div>

        <Modal
          title="ยืนยันการรับงาน"
          className="sarabun-light"
          visible={modalVisible}
          onCancel={() => setModalVisible(false)}
          footer={[
            <Button
              key="cancel"
              onClick={() => setModalVisible(false)}
              style={{
                color: "#f0f0f0",
                backgroundColor: "#5755FE",
                borderColor: "#5755FE",
              }}
            >
              ยกเลิก
            </Button>,
            <Button
              key="confirm"
              onClick={handleConfirmTask}
              style={{
                color: "#f0f0f0",
                backgroundColor: "#5755FE",
                borderColor: "#5755FE",
              }}
            >
              ยืนยัน
            </Button>,
          ]}
        >
          <p className="sarabun-light">คุณต้องการรับงานนี้หรือไม่?</p>
        </Modal>
      </div>
    </MainLayout>
  );
};

export default OperationsDashboard;
