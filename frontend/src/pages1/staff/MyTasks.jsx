// src/pages1/staff/MyTasks.jsx
import React, { useState, useEffect } from "react";
import { useMediaQuery } from "react-responsive";
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
import "../../styles1/MyTasks.css";
import config from "../../configAPI";
import { MdAssignmentReturn } from "react-icons/md";
import { IoMdArrowDropright } from "react-icons/io";
import { IoMdArrowDropleft } from "react-icons/io";
import ChatApp from "../../components/ChatApp";

const MyTasks = () => {
  const [username, setUsername] = useState("");
  const [myTasks, setMyTasks] = useState([]);
  const [currentDateTime, setCurrentDateTime] = useState("");
  const [isModalVisible, setIsModalVisible] = useState(false); // สำหรับการเปิด/ปิด Modal
  const [taskToReturn, setTaskToReturn] = useState(null);
  const navigate = useNavigate();
  const isTabletOrMobile = useMediaQuery({ query: "(max-width: 1024px)" });
  const [showCompletedTasks, setShowCompletedTasks] = useState(true);

  const fetchMyTasks = async () => {
    try {
      const token = sessionStorage.getItem("token");
      const response = await axios.get(`${config.API_URL}/tasks/mytasks`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });
      // จัดเรียงข้อมูลให้แสดงรายการล่าสุดก่อน
      const sortedTasks = response.data.sort(
        (a, b) => b.inventory_id - a.inventory_id
      );
      console.log("ข้อมูลรายการ", response.data);
      console.log("ข้อมูลรายการหลังเรียง", sortedTasks);
      setMyTasks(sortedTasks);
    } catch (err) {
      console.error("Failed to fetch my tasks:", err);
    }
  };

  useEffect(() => {
    const storedUsername = sessionStorage.getItem("username");
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
      const token = sessionStorage.getItem("token");
      await axios.post(
        `${config.API_URL}/tasks/return/${taskToReturn}`, // ใช้ taskToReturn แทน upload_id
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

  const handleViewDetails = (record) => {
    // เช็คสถานะของรายการ
    if (record.current_status === "กำลังดำเนินการ") {
      navigate(`/taskdetails/${record.upload_id}`);
    } else if (record.current_status === "รอดำเนินการต่อ") {
      navigate(`/PendingTaskDetails/${record.upload_id}`);
    } else if (record.current_status === "รอดำเนินการต่อ") {
      navigate(`/TaskDetailsFinished/${record.upload_id}`);
    } else {
      navigate(`/TaskDetailsFinished/${record.upload_id}`);
    }
  };

  const columns = [
    {
      title: "",
      key: "action",
      render: (_, record) => (
        <div>
          {record.current_status === "กำลังดำเนินการ" && (
            <Button
              className="sarabun-light"
              style={{
                color: "#f0f0f0",
                backgroundColor: "#cf1322",
                borderColor: "#cf1322",
              }}
              icon={<MdAssignmentReturn />}
              onClick={() => showReturnTaskConfirm(record.upload_id)}
            ></Button>
          )}
        </div>
      ),
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
        },
      }),
      render: (inventory_id) => (
        <div className="table-data">{inventory_id}</div>
      ),
    },{
      title: "วันที่",
      dataIndex: "approved_date",
      key: "approved_date",
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
      title: "วัตถุดิบ",
      dataIndex: "material_type",
      key: "material_type",
      className: "table-data",
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
      title: "สถานะ",
      dataIndex: "current_status",
      key: "current_status",
      onHeaderCell: () => ({
        style: {
          backgroundColor: "#00152a", // สีพื้นหลังของหัวคอลัมน์
          fontWeight: "bold", // ความหนาของตัวอักษร
          fontSize: "14px", // ขนาดตัวอักษร
          color: "#ffffff", // สีตัวอักษร
        },
      }),
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
          case "รอดำเนินการต่อ":
            color = "purple";
            break;
        }
        return (
          <Tag className="table-data sarabun-light" color={color}>
            {status}
          </Tag>
        );
      },
      align: "center",
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
        <div>
          <Button
            className="table-data sarabun-light"
            style={{
              fontSize: isTabletOrMobile ? "12px" : "14px", // ลดขนาดฟอนต์ในปุ่มเมื่อหน้าจอเล็กลง
              padding: isTabletOrMobile ? "2px 6px" : "4px 12px", // ลดขนาด padding ของปุ่ม
              color: "#f0f0f0",
              backgroundColor: "#5755FE",
              borderColor: "#5755FE",
              marginRight: "10px",
            }}
            onClick={() => handleViewDetails(record)}
          >
            ดูรายละเอียด
          </Button>
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
    setFilteredDate(date ? date.toDate() : null);
  };

  return (
    <MainLayout>
      <div style={{ padding: "0 48px" }}>
        <div>
          <Breadcrumb className="sarabun-light" style={{ margin: "16px 0" }}>
            <Breadcrumb.Item>
              <Link to="/OperationsDashboard">รายการเบิกจ่ายทั้งหมด</Link>
            </Breadcrumb.Item>
            <Breadcrumb.Item>รายการเบิกจ่ายของฉัน</Breadcrumb.Item>
          </Breadcrumb>
        </div>

        <Row>
          <Col span={24} style={{ marginBottom: "20px" }}>
            <Button
              onClick={() => setShowCompletedTasks(!showCompletedTasks)}
              style={{
                display: "flex", // ใช้ flexbox เพื่อจัดเรียง
                alignItems: "center", // จัดให้แนวกลางในแนวตั้ง
                justifyContent: "center", // จัดให้แนวกลางในแนวนอน
                fontSize: isTabletOrMobile ? "14px" : "15px",
                backgroundColor: showCompletedTasks ? "#006400" : "#FFA500",
                color: showCompletedTasks ? "#fff" : "#000",
                borderRadius: "12px",
                border: "none",
                float: "right",
                height:"50px"
              }}
            >
              {showCompletedTasks ? (
                <>
                  ดูงานที่ดำเนินการเรียบร้อย{" "}
                  <IoMdArrowDropright
                    style={{ fontSize: "20px", verticalAlign: "middle" }}
                  />
                </>
              ) : (
                <>
                  <IoMdArrowDropleft
                    style={{ fontSize: "20px", verticalAlign: "middle" }}
                  />{" "}
                  ดูงานที่ต้องดำเนินการ
                </>
              )}
            </Button>
          </Col>

          <Col span={24}>
            <Card
              style={{
                borderRadius: "15px",
                overflowX: "auto",
                height: "60vh",
              }}
            >
              {showCompletedTasks ? (
                <div>
                  <div
                    className="sarabun-bold"
                    style={{ fontSize: "20px", marginBottom: "10px" }}
                  >
                    งานที่ต้องดำเนินการ
                  </div>
                  <div style={{ maxHeight: "500px", overflowY: "auto" }}>
                    <Table
                      columns={columns}
                      dataSource={ongoingTasks}
                      pagination={false}
                      className="custom-table"
                    />
                  </div>
                </div>
              ) : (
                <div>
                  <div
                    className="sarabun-bold"
                    style={{ fontSize: "20px", marginBottom: "10px" }}
                  >
                    งานที่ดำเนินการเรียบร้อย
                  </div>
                  <div style={{ maxHeight: "450px", overflowY: "auto" }}>
                    <Table
                      columns={columns}
                      dataSource={completedTasks}
                      pagination={false}
                      className="custom-table"
                    />
                  </div>
                </div>
              )}
            </Card>
          </Col>
        </Row>

        <Modal
          title="ยืนยันการคืนงาน"
          visible={isModalVisible}
          onCancel={() => setIsModalVisible(false)}
          width={isTabletOrMobile ? 300 : 600}
          style={{
            top: "50%", // ตั้งค่าตำแหน่งแนวดิ่ง
            transform: "translateY(-50%)", // เลื่อนขึ้นครึ่งหนึ่งของความสูงของ modal
          }}
          footer={[
            <Button
              key="cancel"
              onClick={() => setIsModalVisible(false)}
              style={{
                color: "#f0f0f0",
                backgroundColor: "#5755FE",
                borderColor: "#5755FE",
                fontSize: isTabletOrMobile ? "10px" : "14px",
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
                fontSize: isTabletOrMobile ? "10px" : "14px",
              }}
            >
              ยืนยัน
            </Button>,
          ]}
        >
          <p style={{ fontSize: isTabletOrMobile ? "12px" : "16px" }}>
            คุณแน่ใจหรือไม่ว่าต้องการคืนงานนี้?
          </p>
        </Modal>
      </div>
    </MainLayout>
  );
};

export default MyTasks;
