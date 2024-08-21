// src/pages1/staff/MyTasks.jsx
import React, { useState, useEffect } from "react";
import {
  Table,
  Button,
  Modal,
  message,
  Tag,
  DatePicker,
  Card,
  Col,
  Row,
  Breadcrumb,
} from "antd";
import { Link, useNavigate } from "react-router-dom";
import axios from "axios";
import MainLayout from "../../components/LayoutStaff";
//import Sidebar from "../../components/Sidebar";
import "../../styles1/MyTasks.css";

const MyTasks = () => {
  const [username, setUsername] = useState("");
  const [myTasks, setMyTasks] = useState([]);
  const [currentDateTime, setCurrentDateTime] = useState("");
  const [filteredDate, setFilteredDate] = useState(null);
  const [isModalVisible, setIsModalVisible] = useState(false); // สำหรับการเปิด/ปิด Modal
  const [taskToReturn, setTaskToReturn] = useState(null);
  const navigate = useNavigate();

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
    fetchMyTasks();
    // Update the current date and time every minute
    const intervalId = setInterval(
      () => setCurrentDateTime(new Date().toLocaleString()),
      60000
    );
    return () => clearInterval(intervalId); // Clean up interval on component unmount
  }, []);

  const showReturnTaskConfirm = (upload_id) => {
    setTaskToReturn(upload_id); // ตั้งค่า upload_id ที่ถูกต้อง
    setIsModalVisible(true);
  };

  const handleReturnTask = async () => {
    if (taskToReturn === null) return; // ตรวจสอบว่า taskToReturn มีค่าหรือไม่
    try {
      const token = localStorage.getItem("token");
      await axios.post(
        `http://localhost:3001/tasks/return/${taskToReturn}`, // ใช้ taskToReturn แทน upload_id
        {},
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );
      message.success("คืนงานสำเร็จ");
      fetchMyTasks();
      setIsModalVisible(false); // ปิด Modal หลังจากคืนงานเสร็จ
    } catch (error) {
      console.error("Failed to return task:", error);
      message.error("การคืนงานล้มเหลว");
    }
  };

  const columns = [
    {
      title: "ลำดับ",
      dataIndex: "upload_id",
      key: "upload_id",
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
      title: "สถานะ",
      dataIndex: "current_status",
      key: "current_status",
      render: (status) => {
        let color;
        switch (status) {
          case "ดำเนินการเรียบร้อย":
            color = "green";
            break;
          case "กำลังดำเนินการ":
            color = "orange";
            break;
          case "รอตรวจสอบ":
            color = "red";
            break;
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
        <div>
          <Button
            className="sarabun-light"
            style={{
              color: "#f0f0f0",
              backgroundColor: "#5755FE",
              borderColor: "#5755FE",
              marginRight: "10px",
            }}
            onClick={() => navigate(`/taskdetails/${record.upload_id}`)}
          >
            ดูรายละเอียด
          </Button>
          {record.current_status === "กำลังดำเนินการ" && (
            <Button
              className="sarabun-light"
              style={{
                color: "#f0f0f0",
                backgroundColor: "#cf1322",
                borderColor: "#cf1322",
              }}
              onClick={() => showReturnTaskConfirm(record.upload_id)}
            >
              คืนงาน
            </Button>
          )}
        </div>
      ),
      align: "center",
    },
  ];

  // แบ่งงานที่ต้องดำเนินการและงานที่ดำเนินการเสร็จแล้ว
  const ongoingTasks = myTasks.filter(
    (task) =>
      task.current_status !== "ดำเนินการเรียบร้อย" &&
      task.current_status !== "รอตรวจสอบ"
  );
  const completedTasks = myTasks.filter(
    (task) =>
      task.current_status === "ดำเนินการเรียบร้อย" ||
      task.current_status === "รอตรวจสอบ"
  );

  // การกรองงานที่ดำเนินการเสร็จแล้วตามวันที่
  const handleDateFilter = (date) => {
    setFilteredDate(date);
  };

  const filteredCompletedTasks = filteredDate
    ? completedTasks.filter(
        (task) =>
          new Date(task.approved_date).toDateString() ===
          filteredDate.toDate().toDateString()
      )
    : completedTasks;

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
            ภาระงานของฉัน
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
        <Breadcrumb className="sarabun-light" style={{ margin: "16px 0" }}>
          <Breadcrumb.Item >
            <Link to="/OperationsDashboard">รายการเบิก-จ่ายทั้งหมด</Link>
          </Breadcrumb.Item>
          <Breadcrumb.Item>รายการเบิก-จ่ายของฉัน</Breadcrumb.Item>
        </Breadcrumb>
      </div>

      <Row>
        <Col span={12} className="p-5">
          <Card
            style={{
              borderRadius: "15px",
            }}
          >
            <div
              className="sarabun-bold"
              style={{ fontSize: "22px", marginBottom: "10px" }}
            >
              งานที่ต้องดำเนินการ
            </div>
            <Table
              columns={columns}
              dataSource={ongoingTasks}
              pagination={false}
            />
          </Card>
        </Col>
        <Col span={12} className="p-5">
          <Card
            style={{
              borderRadius: "15px",
            }}
          >
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                marginBottom: "10px",
              }}
            >
              <div className="title sarabun-bold" style={{ fontSize: "22px" }}>
                งานที่ดำเนินการเรียบร้อย
              </div>
              <DatePicker onChange={handleDateFilter} />
            </div>

            <Table
              columns={columns}
              dataSource={filteredCompletedTasks}
              pagination={false}
            />
          </Card>
        </Col>
      </Row>

      <Modal
        title="ยืนยันการคืนงาน"
        visible={isModalVisible}
        onCancel={() => setIsModalVisible(false)}
        footer={[
          <Button
            key="cancel"
            onClick={() => setIsModalVisible(false)}
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
            onClick={handleReturnTask}
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
        <p>คุณแน่ใจหรือไม่ว่าต้องการคืนงานนี้?</p>
      </Modal>
    </MainLayout>
  );
};

export default MyTasks;
