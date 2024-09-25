// src/pages1/staff/Dashboard.jsx
import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import {
  Table,
  Button,
  Modal,
  message,
  Tag,
  Card,
  Checkbox,
  Row,
  Col,
} from "antd";
import axios from "axios";
import MainLayout from "../../components/LayoutStaff";
import "../../styles1/OperationDashboard.css";
import config from '../../configAPI';

const OperationsDashboard = () => {
  const [username, setUsername] = useState("");
  const [tasks, setTasks] = useState([]);
  const [mytasks, setMyTasks] = useState([]);
  const [selectedTask, setSelectedTask] = useState(null);
  const [modalVisible, setModalVisible] = useState(false);
  const [selectedMaterialTypes, setSelectedMaterialTypes] = useState([]);
  const navigate = useNavigate();

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
  const filteredTasks = tasks.filter((task) =>
    selectedMaterialTypes.length > 0
      ? selectedMaterialTypes.includes(task.material_type)
      : true
  )
  .sort((a, b) => new Date(b.upload_date) - new Date(a.upload_date));
  
  const getCurrentDate = () => {
    return new Date().toISOString().split('T')[0]; // คืนค่าปัจจุบันในรูปแบบ YYYY-MM-DD
  };


  useEffect(() => {
    const storedUsername = sessionStorage.getItem("username");
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
    /*{
      title: "สถานะ",
      dataIndex: "current_status",
      key: "current_status",
      render: (status) => {
        let color;
        if (status === "ดำเนินการเรียบร้อย") {
          color = "green";
        } else if (status === "กำลังดำเนินการ") {
          color = "orange";
        } else if (status === "รอตรวจสอบ") {
          color = "red";
        }
        return (
          <Tag className="sarabun-light" color={color}>
            {status}
          </Tag>
        );
      },
      align: "center",
    },*/
    {
      title: "สถานะ",
      key: "overdue",
      render: (record) => {
        const currentDate = getCurrentDate();
        const isOverdue = new Date(record.upload_date).toISOString().split('T')[0] < currentDate;
        return isOverdue ? <Tag color="red">เกินกำหนด</Tag> : null;
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

          {/* Checkbox สำหรับกรองประเภทวัตถุดิบ */}
          <Checkbox.Group
            style={{ 
              marginBottom: "20px",
              fontSize: "18px", 
              fontFamily: "Sarabun-Light", 
            }}
            onChange={handleMaterialTypeChange}
            options={[
              { label: "กล่องดิส/ใบแนบ/สติ๊กเกอร์", value: "PK_DIS" },
              { label: "กล่องก้าม/ใบแนบ/สติ๊กเกอร์", value: "PK_shoe" },
              { label: "กิ๊ฟล๊อค/แผ่นชิม", value: "WD" },
              { label: "สลัก/ตะขอ", value: "PIN" },
              { label: "แผ่นเหล็ก", value: "BP" },
              { label: "เคมี", value: "CHEMICAL" },
            ]}
          />

          <div className="table-responsive">
            <Table 
            columns={columns} 
            dataSource={filteredTasks} 
            pagination={false} 
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
    </MainLayout>
  );
};

export default OperationsDashboard;
