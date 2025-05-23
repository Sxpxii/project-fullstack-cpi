// src/pages1/staff/Dashboard.jsx
import React, { useState, useEffect, useMemo } from "react";
import { useMediaQuery } from "react-responsive";
import { useNavigate } from "react-router-dom";
import {
  Table,
  Button,
  Modal,
  DatePicker,
  Tag,
  Card,
  Checkbox,
  Row,
  Col,
} from "antd";
import axios from "axios";
import MainLayout from "../../components/LayoutStaff";
import "../../styles/OperationDashboard.css";
import config from "../../configAPI";
import Swal from "sweetalert2";
import moment from "moment";

const OperationsDashboard = () => {
  const [username, setUsername] = useState("");
  const [tasks, setTasks] = useState([]);
  const [mytasks, setMyTasks] = useState([]);
  const [selectedTask, setSelectedTask] = useState(null);
  const [selectedMaterialTypes, setSelectedMaterialTypes] = useState([]);
  const navigate = useNavigate();
  const isTabletOrMobile = useMediaQuery({ query: "(max-width: 1024px)" });
  const [isUserActive, setIsUserActive] = useState(true);
  const [selectedDate, setSelectedDate] = useState(
    new Date().toISOString().split("T")[0]
  );

  const fetchTasks = async () => {
    try {
      const token = sessionStorage.getItem("token");
      const response = await axios.get(`${config.API_URL}/tasks`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });
      console.log("data:", response.data);
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
    console.log("Selected Material Types (Before):", checkedValues);

    if (!Array.isArray(checkedValues)) {
      console.error("Expected an array but got:", checkedValues);
      return;
    }

    setSelectedMaterialTypes(checkedValues);
    console.log("Updated Selected Material Types:", checkedValues);
  };

  // กรองข้อมูลก่อนแสดงผลตามประเภทวัตถุดิบที่เลือก
  const filteredTasks = useMemo(() => {
    console.log("All Tasks before filter:", tasks);
    console.log("Selected Material Types:", selectedMaterialTypes);

    const result = tasks
      .filter((task) =>
        selectedMaterialTypes.length > 0
          ? selectedMaterialTypes.includes(task.material_type)
          : true
      )
      .sort((a, b) => new Date(b.upload_date) - new Date(a.upload_date));

    console.log("Filtered Tasks:", result);
    return result;
  }, [tasks, selectedMaterialTypes]);

  const filteredByDateTasks = useMemo(() => {
    return filteredTasks.filter((task) => {
      const taskDate = new Date(task.approved_date).toISOString().split("T")[0];
      return taskDate <= selectedDate;
    });
  }, [filteredTasks, selectedDate]);

  const finalFilteredTasks = useMemo(() => {
    return filteredByDateTasks.filter((task) =>
      selectedMaterialTypes.length > 0
        ? selectedMaterialTypes.includes(task.material_type)
        : true
    );
  }, [filteredByDateTasks, selectedMaterialTypes]);

  const getCurrentDate = () => {
    return new Date().toISOString().split("T")[0]; // คืนค่าปัจจุบันในรูปแบบ YYYY-MM-DD
  };  

  useEffect(() => {
    console.log("Updated Selected Material Types:", selectedMaterialTypes);
  }, [selectedMaterialTypes]);

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
    console.log("Record Selected:", record);
    setSelectedTask(record);
    Swal.fire({
      title: "ยืนยันการรับงาน",
      html: '<span class="sarabun-light">คุณต้องการรับงานนี้หรือไม่?</span>',
      icon: "question",
      showCancelButton: true,
      confirmButtonColor: "#5755FE",
      confirmButtonText: "รับงาน",
      cancelButtonText: "ยกเลิก",
      customClass: {
        title: "sarabun-bold", // ใส่คลาสให้กับ title
        confirmButton: "sarabun-light", // ใส่คลาสให้กับปุ่ม confirm
        cancelButton: "sarabun-light", // ใส่คลาสให้กับปุ่ม cancel
      },
    }).then((result) => {
      if (result.isConfirmed) {
        handleConfirmTask(record);
      }
    });
  };

  const handleConfirmTask = async (record) => {
    console.log("Selected Task:", record);
    if (!record) {
      Swal.fire({
        title: "เกิดข้อผิดพลาด",
        text: "กรุณาเลือกงานที่ต้องการรับ",
        html: '<span class="sarabun-light">กรุณาเลือกงานที่ต้องการรับ!!</span>',
        icon: "error",
        customClass: {
          title: "sarabun-bold",
        },
      });
      return;
    }

    try {
      const token = sessionStorage.getItem("token");
      await axios.post(
        `${config.API_URL}/tasks/accept/${record.upload_id}`,
        { username },
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );
      Swal.fire({
        title: "สำเร็จ",
        text: "รับงานเรียบร้อยแล้ว",
        html: '<span class="sarabun-light">รับงานเรียบร้อยแล้ว</span>',
        icon: "success",
        customClass: {
          title: "sarabun-bold",
        },
        timer: 1000, // ปิดหน้าต่างแจ้งเตือนหลังจาก 2 วินาที
        showConfirmButton: false, // ไม่ให้แสดงปุ่ม OK
      });
      fetchTasks(); // อัปเดตรายการงานทั้งหมด
      fetchMyTasks(); // อัปเดตรายการงานของฉัน
    } catch (error) {
      console.error("เกิดข้อผิดพลาดในการรับงาน:", error);
      Swal.fire({
        title: "เกิดข้อผิดพลาด",
        text: "ไม่สามารถรับงานได้ในขณะนี้",
        icon: "error",
        customClass: {
          title: "sarabun-bold",
          content: "sarabun-light",
        },
      });
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
      title: "สถานะ",
      key: "current_status",
      render: (record) => {
        const currentDate = getCurrentDate();
        const isOverdue =
          new Date(record.approved_date).toISOString().split("T")[0] <
          currentDate;

          if (record.isurgent) {
            return (
              <Tag className="sarabun-bold" color="#c41411">
                งานด่วน
              </Tag>
            );
          }

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
          onClick={() => {
            console.log("Button Clicked:", record);
            handleSelectTask(record);
          }}
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
              marginTop: "30px",
              marginBottom: "30px",
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
        >
          <Checkbox.Group
            value={selectedMaterialTypes}
            onChange={handleMaterialTypeChange}
            style={{
              display: "flex",
              flexDirection: "column", // ใช้ flex-direction: column เพื่อแสดงแนวตั้ง
            }}
          >
            {[
              { label: "กล่องดิส/ใบแนบ/สติ๊กเกอร์", value: "PK_DIS" },
              { label: "กล่องก้าม/ใบแนบ/สติ๊กเกอร์", value: "PK_shoe" },
              { label: "กิ๊ฟล๊อค/แผ่นชิม", value: "WD" },
              { label: "สลัก/ตะขอ", value: "PIN" },
              { label: "แผ่นเหล็ก", value: "BP" },
              { label: "เคมี", value: "CHEMICAL" },
            ].map((item) => (
              <Checkbox
                key={item.value}
                value={item.value}
                className="sarabun-light"
                style={{
                  fontSize: "13px", // ปรับขนาดตัวอักษรให้ใหญ่ขึ้น
                  marginBottom: "10px", // เพิ่มระยะห่างระหว่างตัวเลือก
                  transform: "scale(1.5)", // ขยายขนาด checkbox
                  padding: "5px",
                  marginLeft: "40px",
                }}
              >
                {item.label}
              </Checkbox>
            ))}
          </Checkbox.Group>
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
                marginTop: "10px",
                marginBottom: "30px",
              }}
              className="sarabun-bold"
            >
              <span>ทั้งหมด</span>
              <span className="ms-2"> {tasks.length} </span>
              <span className="ms-2">รายการ :</span>
            </div>

            <div
              style={{
                display: "flex",
                justifyContent: "flex-end",
                alignItems: "center",
                gap: "10px",
                marginBottom: "20px",
              }}
            >
              {/* ตัวเลือกวันที่ */}
              <label
                htmlFor="datePicker"
                className="sarabun-bold"
                style={{
                  fontSize: "16px",
                  marginRight: "10px",
                }}
              >
                เลือกวันที่:{" "}
              </label>
              <input
                id="datePicker"
                type="date"
                value={selectedDate}
                onChange={(e) => setSelectedDate(e.target.value)}
                className="sarabun-light"
                style={{
                  padding: "8px",
                  fontSize: "16px",
                  borderRadius: "10px",
                  border: "1px solid #ccc",
                  cursor: "pointer",
                }}
              />

              <Button
                className="sarabun-light"
                onClick={() =>
                  setSelectedDate(new Date().toISOString().split("T")[0])
                }
                style={{
                  padding: "8px 12px",
                  fontSize: "15px",
                  backgroundColor: "#00152a",
                  color: "white",
                  border: "none",
                  borderRadius: "9px",
                }}
              >
                รีเซ็ต
              </Button>
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
                dataSource={finalFilteredTasks}
                pagination={false}
                className="custom-table"
              />
            </div>
          </Card>
        </div>
      </div>
    </MainLayout>
  );
};

export default OperationsDashboard;
