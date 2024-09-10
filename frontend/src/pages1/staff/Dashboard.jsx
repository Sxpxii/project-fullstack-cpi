// src/pages1/staff/Dashboard.jsx
import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Table, Button, Modal, message, Tag, Card, Breadcrumb } from "antd";
import axios from "axios";
import MainLayout from "../../components/LayoutStaff";
import "../../styles1/OperationDashboard.css";

const OperationsDashboard = () => {
  const [username, setUsername] = useState("");
  const [tasks, setTasks] = useState([]);
  const [mytasks, setMyTasks] = useState([]);
  const [selectedTask, setSelectedTask] = useState(null);
  const [modalVisible, setModalVisible] = useState(false);
  const navigate = useNavigate();

  const fetchTasks = async () => {
    try {
      const token = localStorage.getItem("token");
      const response = await axios.get("http://localhost:3001/tasks", {
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
      const token = localStorage.getItem("token");
      const response = await axios.get("http://localhost:3001/tasks/mytasks", {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });
      setMyTasks(response.data);
    } catch (err) {
      console.error("Failed to fetch my tasks:", err);
    }
  };

  useEffect(() => {
    const storedUsername = localStorage.getItem("username");
    if (storedUsername) {
      setUsername(storedUsername);
    }
    fetchTasks();
    fetchMyTasks();
  }, []);

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
      const token = localStorage.getItem("token");
      await axios.post(
        `http://localhost:3001/tasks/accept/${selectedTask.upload_id}`,
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
      align: "left",
    },
    {
      title: "วัตถุดิบ",
      dataIndex: "material_type",
      key: "material_type",
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
      align: "left",
    },
    {
      title: "สถานะ",
      dataIndex: "current_status",
      key: "current_status",
      render: (status) => {
        let color;
        if (status === "ดำเนินการเรียบร้อย") {
          color = "green";
        } else if (status === "กำลังดำเนินการ") {
          color = "orange";
        } else if (status === "ตรวจสอบ") {
          color = "red";
        }
        return (
          <Tag className="sarabun-light" color={color}>
            {status}
          </Tag>
        );
      },
      align: "center",
    },
    {
      title: "",
      key: "action",
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
            Operations Dashboard
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

      <div>
        {/* <div className="header">
          <div className="header-content">
    
            {/* <div className="header-info">
                            <p className="greeting sarabun-light">ยินดีต้อนรับ {username}</p>
                            <p className="date-time sarabun-light">{getCurrentDateTime()}</p>
                        </div> */}
        {/* <div>
                            <Button
                                className="sarabun-light"
                                type="primary"
                                onClick={() => navigate('/mytasks')}
                                style={{ 
                                    color: "#f0f0f0",
                                    backgroundColor: "#5755FE",
                                    borderColor: "#5755FE",
                                }}
                            >
                            ไปที่หน้าภาระงานของฉัน
                            </Button>
                        </div>     */}
        {/* </div> */}
        {/* </div> */}

        
        <Card
          style={{
            borderRadius: "15px",
          }}
        >
          <div
            style={{
              fontSize: "22px",
              marginBottom: "10px",
            }}
            className="sarabun-bold"
          >
            <span>รายการงานทั้งหมด</span>
            <span className="ms-2"> {tasks.length} </span>
            <span className="ms-2">รายการ</span>
          </div>
          <div className="table-responsive">
            <Table columns={columns} dataSource={tasks} pagination={false} />
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
    </MainLayout>
  );
};

export default OperationsDashboard;
