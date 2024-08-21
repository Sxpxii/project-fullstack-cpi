// src/pages1/staff/TaskDetails.jsx
import React, { useState, useEffect } from "react";
import { useParams, Link } from "react-router-dom";
import {
  Table,
  Button,
  message,
  Checkbox,
  Modal,
  InputNumber,
  Card,
  Breadcrumb,
} from "antd";
import axios from "axios";
import MainLayout from "../../components/LayoutStaff";
import "../../styles1/TaskDetails.css";

const TaskDetails = () => {
  const { upload_id } = useParams();
  const [username, setUsername] = useState("");
  const [data, setData] = useState({ balances: [], status: "" });
  const [isModalVisible, setIsModalVisible] = useState(false);
  const [checkDetails, setCheckDetails] = useState([]); // กำหนดให้เป็นข้อมูลที่ดึงมาจาก API
  const [filteredData, setFilteredData] = useState([]);
  const [isTaskCompleted, setIsTaskCompleted] = useState(false);

  const fetchTaskDetails = async () => {
    try {
      const token = localStorage.getItem("token");
      const response = await axios.get(
        `http://localhost:3001/tasks/detail/${upload_id}`,
        {
          headers: { Authorization: `Bearer ${token}` },
        }
      );

      // จัดรูปแบบข้อมูลที่ได้รับ
      const groupedData = response.data.reduce((acc, item) => {
        if (!acc[item.material_id]) {
          acc[item.material_id] = { ...item, details: [] };
        }
        acc[item.material_id].details.push({
          lot: item.lot,
          location: item.location,
          used_quantity: item.used_quantity,
          remaining_quantity: item.remaining_quantity,
        });
        return acc;
      }, {});

      setData({
        balances: Object.values(groupedData),
        status: response.data.status,
      });
    } catch (err) {
      console.error("Failed to fetch task details:", err);
    }
  };

  const fetchCheckDetails = async () => {
    try {
      const token = localStorage.getItem("token");
      const response = await axios.get(
        `http://localhost:3001/tasks/detail/${upload_id}/check`,
        {
          headers: { Authorization: `Bearer ${token}` },
        }
      );
      setCheckDetails(Array.isArray(response.data) ? response.data : []);
    } catch (err) {
      console.error("Failed to fetch check details:", err);
    }
  };

  const handleSaveCountedQuantities = async () => {
    try {
      const token = localStorage.getItem("token");

      const countedQuantities = data.balances.reduce((acc, item) => {
        acc[item.id] =
          item.counted_quantity !== undefined
            ? item.counted_quantity
            : item.remaining_quantity;
        return acc;
      }, {});

      console.log(countedQuantities);

      await axios.post(
        `http://localhost:3001/tasks/save-counted-quantities/${upload_id}`,
        countedQuantities,
        {
          headers: { Authorization: `Bearer ${token}` },
        }
      );
      message.success("บันทึกการเบิกจ่ายเรียบร้อย");
      await completeTask();
    } catch (err) {
      console.error("Failed to save counted quantities:", err);
      message.error("Failed to save counted quantities");
    }
  };

  const completeTask = async () => {
    try {
      const token = localStorage.getItem("token");
      await axios.post(
        `http://localhost:3001/tasks/complete/${upload_id}`,
        {},
        {
          headers: { Authorization: `Bearer ${token}` },
        }
      );
      message.success("Task marked as completed");
      fetchTaskDetails();
    } catch (err) {
      console.error("Failed to complete task:", err);
      message.error("Failed to update task status");
    }
  };

  useEffect(() => {
    const storedUsername = localStorage.getItem("username");
    if (storedUsername) {
      setUsername(storedUsername);
    }
    fetchTaskDetails();
    fetchCheckDetails(); // เพิ่มการเรียกใช้งานฟังก์ชันนี้ที่นี่
  }, [upload_id]);

  useEffect(() => {
    const completedStatuses = ["ดำเนินการเรียบร้อย", "รอตรวจสอบ"];
    setIsTaskCompleted(completedStatuses.includes(data.status));
  }, [data]);

  const handleQuantityChange = (value, id) => {
    if (!isTaskCompleted) {
      setData((prevData) => ({
        ...prevData,
        balances: prevData.balances.map((item) =>
          item.id === id ? { ...item, counted_quantity: value } : item
        ),
      }));
    }
  };

  const handleRowClick = (record) => {
    // กรองข้อมูลตาม mat_name ที่เลือก
    const filtered = checkDetails.filter(
      (item) => item.mat_name === record.mat_name
    );

    // ตั้งค่า filteredData ให้เป็นข้อมูลที่กรองมา
    setFilteredData(filtered);

    // แสดง Modal
    setIsModalVisible(true);
  };

  // เพิ่มฟังก์ชันสำหรับการไฮไลท์แถว
  const rowClassName = (record) => {
    return record.remaining_quantity !== record.counted_quantity
      ? "highlight-row"
      : "";
  };

  const columns = [
    {
      title: "ลำดับ",
      key: "index",
      render: (text, record, index) => index + 1,
      align: "left",
    },
    {
      title: "รหัส",
      dataIndex: "matunit",
      key: "matunit",
      align: "left",
    },
    {
      title: "รายการ",
      dataIndex: "mat_name",
      key: "mat_name",
      render: (text, record) => (
        <a onClick={() => handleRowClick(record)}>{text}</a>
      ),
      align: "left",
    },
    {
      title: "จำนวนที่สั่งเบิก",
      dataIndex: "quantity",
      key: "quantity",
      align: "center",
    },
    {
      title: "ล็อต",
      dataIndex: "lot",
      key: "lot",
      render: (details) =>
        Array.isArray(details) && details.length > 0
          ? details.map((detail, index) => <div key={index}>{detail.lot}</div>)
          : null,
      align: "left",
    },
    {
      title: "ตำแหน่ง",
      dataIndex: "location",
      key: "location",
      render: (details) =>
        Array.isArray(details) && details.length > 0
          ? details.map((detail, index) => (
              <div key={index}>{detail.location}</div>
            ))
          : null,
      align: "left",
    },
    {
      title: "จำนวนที่ต้องหยิบ",
      dataIndex: "used_quantity",
      key: "used_quantity",
      render: (details) =>
        Array.isArray(details) && details.length > 0
          ? details.map((detail, index) => (
              <div key={index}>{detail.used_quantity}</div>
            ))
          : null,
      align: "center",
    },
    {
      title: "จำนวนคงเหลือ",
      dataIndex: "remaining_quantity",
      key: "remaining_quantity",
      render: (details) =>
        Array.isArray(details) && details.length > 0
          ? details.map((detail, index) => (
              <div key={index}>{detail.remaining_quantity}</div>
            ))
          : null,
      align: "center",
    },
    {
      title: "นับจริง",
      dataIndex: "counted_quantity",
      render: (_, record) =>
        isTaskCompleted ? (
          <span>{record.counted_quantity}</span>
        ) : (
          <InputNumber
            defaultValue={record.remaining_quantity}
            onChange={(value) => handleQuantityChange(value, record.id)}
          />
        ),
      align: "center",
    },
    {
      title: "เรียบร้อย",
      key: "selection",
      render: (_, record) => (
        <Checkbox
          onChange={(e) => handleCheckboxChange(record.key, e.target.checked)}
          disabled={isTaskCompleted}
        />
      ),
    },
  ];

  const modalColumns = [
    {
      title: "ลำดับ",
      key: "index",
      render: (text, record, index) => index + 1,
    },
    {
      title: "รหัส",
      dataIndex: "matunit",
      key: "matunit",
    },
    {
      title: "รายการ",
      dataIndex: "mat_name",
      key: "mat_name",
    },
    {
      title: "ล็อต",
      dataIndex: "lot",
      key: "lot",
    },
    {
      title: "ตำแหน่ง",
      dataIndex: "location",
      key: "location",
    },
    {
      title: "จำนวนคงเหลือ",
      dataIndex: "display_quantity",
      key: "display_quantity",
    },
  ];

  const handleCheckboxChange = (key, checked) => {
    setData((prevData) => ({
      ...prevData,
      balances: prevData.balances.map((item) =>
        item.key === key ? { ...item, selected: checked } : item
      ),
    }));
  };

  const handleModalOk = () => {
    setIsModalVisible(false);
  };

  const handleModalCancel = () => {
    setIsModalVisible(false);
  };

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
            รายละเอียดการเบิก-จ่ายวัตถุดิบ
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
          <Breadcrumb.Item>
            <Link to="//OperationsDashboard">รายการเบิก-จ่ายทั้งหมด</Link>
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
          <div className="table-buttons">
            <Link to="/MyTasks">
              <Button
                className="back-button"
                type="default"
                style={{
                  color: "#f0f0f0",
                  backgroundColor: "#5755FE",
                  borderColor: "#5755FE",
                }}
              >
                ย้อนกลับ
              </Button>
            </Link>
          </div>
          <Table
            columns={columns}
            dataSource={data.balances}
            pagination={false}
            rowKey={(record) => `${record.id}`|| `${record.matunit}-${record.lot}`}
            scroll={{ x: "max-content" }} // ทำให้ตารางเลื่อนไปข้างๆ ได้หากข้อมูลกว้าง
          />
          {!isTaskCompleted && (
            <div
              style={{
                display: "flex",
                justifyContent: "center",
                marginTop: "10px",
              }}
            >
              <Button
                className="complete-button"
                onClick={handleSaveCountedQuantities}
                type="primary"
                style={{
                  color: "#f0f0f0",
                  backgroundColor: "#5755FE",
                  borderColor: "#5755FE",
                }}
              >
                เสร็จสิ้น
              </Button>
            </div>
          )}
        </div>
      </Card>

      <Modal
        className="sarabun-light"
        title="ตรวจสอบสถานะการตัด"
        visible={isModalVisible}
        onOk={handleModalOk}
        onCancel={handleModalCancel}
        footer={null} // ซ่อนปุ่ม Footer ของ Modal
      >
        <Table
          className="sarabun-light"
          columns={modalColumns}
          dataSource={filteredData}
          pagination={false}
          rowKey={(record) => `${record.material_id}-${record.lot}`}
          scroll={{ x: "max-content" }} // ทำให้ตารางเลื่อนไปข้างๆ ได้หากข้อมูลกว้าง
          rowClassName={rowClassName}
        />
      </Modal>
    </MainLayout>
  );
};

export default TaskDetails;
