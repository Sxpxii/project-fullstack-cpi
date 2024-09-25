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
import config from '../../configAPI';

const TaskDetails = () => {
  const { upload_id } = useParams();
  const [username, setUsername] = useState("");
  const [data, setData] = useState({ balances: [], status: "" });
  const [isModalVisible, setIsModalVisible] = useState(false);
  const [checkDetails, setCheckDetails] = useState([]);
  const [filteredData, setFilteredData] = useState([]);
  const [isTaskCompleted, setIsTaskCompleted] = useState(false);
  const [totalRequestedQuantity, setTotalRequestedQuantity] = useState(0);
  const [countedQuantities, setCountedQuantities] = useState({});
  const [selectedRows, setSelectedRows] = useState([]);
  const [temporaryData, setTemporaryData] = useState({});

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
    }
  };

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

  const fetchCheckDetails = async () => {
    try {
      const token = sessionStorage.getItem("token");
      const response = await axios.get(
        `${config.API_URL}/tasks/detail/${upload_id}/check`,
        {
          headers: { Authorization: `Bearer ${token}` },
        }
      );
      console.log(response.data);

      setCheckDetails(Array.isArray(response.data) ? response.data : []);
    } catch (err) {
      console.error("Failed to fetch check details:", err);
    }
  };

  const completeTask = async () => {
    try {
      const token = sessionStorage.getItem("token");
      await axios.post(
        `${config.API_URL}/tasks/complete/${upload_id}`,
        {},
        {
          headers: { Authorization: `Bearer ${token}` },
        }
      );
      message.success("Task marked as completed");

      setIsTaskCompleted(true);
      console.log("isTaskCompleted after completeTask:", true);

      await fetchTaskDetails();

      fetchUploadStatus();
    } catch (err) {
      console.error("Failed to complete task:", err);
      message.error("Failed to update task status");
    }
  };

  const fetchUploadStatus = async () => {
    try {
      const token = sessionStorage.getItem("token");
      const response = await axios.get(
        `${config.API_URL}/tasks/status/${upload_id}`,
        {
          headers: { Authorization: `Bearer ${token}` },
        }
      );

      console.log("Data received from backend:", response.data);

      const completedStatuses = ["ดำเนินการเรียบร้อย", "รอตรวจสอบ"];
      setIsTaskCompleted(completedStatuses.includes(response.data.status));
    } catch (err) {
      console.error("Failed to fetch upload status:", err);
    }
  };

  useEffect(() => {
    const storedUsername = sessionStorage.getItem("username");
    if (storedUsername) {
      setUsername(storedUsername);
    }
    fetchTaskDetails();
    fetchCheckDetails();
    fetchTotalRequestedQuantity();
    fetchUploadStatus();
  }, [upload_id]);

  const handleSaveCountedQuantities = async () => {
    try {
      const token = sessionStorage.getItem("token");
      console.log("Temporary Data:", temporaryData);

      const payload = Object.entries(temporaryData).map(([id, details]) => ({
        id: parseInt(id, 10),
        counted_quantity: details.counted_quantity,
        selected_time: details.timestamp,
      }));

      console.log("Payload to send:", payload);

      const response = await axios.post(
        `${config.API_URL}/tasks/save-counted-quantities/${upload_id}`,
        payload,
        {
          headers: { Authorization: `Bearer ${token}` },
        }
      );

      console.log("Successfully updated:", response.data);
      message.success("บันทึกการเบิกจ่ายเรียบร้อย");
      
      await completeTask();
    } catch (err) {
      console.error("Failed to save counted quantities:", err);
      message.error("Failed to save counted quantities");
    }
  };

  const handleQuantityChange = (value, id) => {
    if (!isTaskCompleted) {
      setCountedQuantities((prevQuantities) => ({
        ...prevQuantities,
        [id]: value,
      }));
      console.log("Updated Counted Quantities:", countedQuantities);
    }
  };

  const handleRowClick = (record) => {
    console.log("Clicked record:", record);
    const filtered = checkDetails.filter(
      (item) => item.mat_name === record.mat_name
    );

    if (filtered.length > 0 && filtered[0].details) {
      console.log("Filtered details:", filtered[0].details);
      setFilteredData(
        filtered[0].details
          .map((detail) => ({
            ...detail,
            matunit: record.matunit,
            mat_name: record.mat_name,
          }))
          .sort((a, b) => a.matin.localeCompare(b.matin))
      );
    } else {
      setFilteredData([]);
    }

    setIsModalVisible(true);
  };

  const handleCheckboxChange = (id, checked) => {
    if (!isTaskCompleted) {
      const currentTime = new Date().toISOString(); // เก็บเวลาปัจจุบัน
      const item = formattedData.find((item) => item.id === id);
      const countedQuantity =
        countedQuantities[item.id] !== undefined
          ? countedQuantities[item.id]
          : item.remaining_quantity;

      setTemporaryData((prevData) => {
        const newData = { ...prevData };
        if (checked) {
          // เก็บข้อมูล id, counted_quantity, และ timestamp
          newData[id] = {
            counted_quantity: countedQuantity,
            timestamp: currentTime,
          };
        } else {
          // ลบข้อมูลถ้า unchecked
          delete newData[id];
        }

        // Log ข้อมูลที่ถูกเก็บชั่วคราว
        console.log("Temporary Data:", newData);

        return newData;
      });

      setSelectedRows((prevSelectedRows) =>
        checked
          ? [...prevSelectedRows, id]
          : prevSelectedRows.filter((rowId) => rowId !== id)
      );

      console.log(
        "Selected Rows:",
        checked
          ? [...selectedRows, id]
          : selectedRows.filter((rowId) => rowId !== id)
      );
    }
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

  // เพิ่มฟังก์ชันสำหรับการไฮไลท์แถว
  const rowClassName = (record) => {
    return selectedRows.includes(record.id);
  };

  // แปลงข้อมูลเพื่อแสดงคำถามแต่ละข้อเป็นแถว
  const formattedData = Array.isArray(data)
    ? data.flatMap((m) =>
        m.details
          .sort((a, b) => a.matin.localeCompare(b.matin))
          .map((d, index) => {
            const countedQuantity = countedQuantities[d.id];
            return {
              ...d,
              matunit: m.matunit,
              mat_name: m.mat_name,
              quantity: m.quantity,
              material_index: index + 1,
              rowSpanMatunit: index === 0 ? m.details.length : 0,
              rowSpanMatName: index === 0 ? m.details.length : 0,
              rowSpanQuantity: index === 0 ? m.details.length : 0,
              rowSpanMaterialId: index === 0 ? m.details.length : 0,
              counted_quantity:
                countedQuantity !== undefined
                  ? countedQuantity
                  : d.remaining_quantity, // ใช้ counted_quantity ถ้ามี หรือ remaining_quantity ถ้าไม่มี
            };
          })
      )
    : [];

  console.log("Formatted Data:", formattedData);

  // ฟังก์ชันสำหรับจัดรูปแบบตัวเลข
  const formatNumber = (number) => {
    return new Intl.NumberFormat().format(number);
  };

  const columns = [
    /*{
      title: "ลำดับ",
      key: "index",
      render: (text, record, index) =>
        record.rowSpanMaterialId > 0 ? index + 1 : null,
      align: "left",
    },*/
    {
      title: "รหัส",
      dataIndex: "matunit",
      key: "matunit",
      render: (text, record, index) => ({
        children: text,
        props: { rowSpan: record.rowSpanMatunit },
      }),
      align: "left",
    },
    {
      title: "รายการ",
      dataIndex: "mat_name",
      key: "mat_name",
      render: (text, record, index) => ({
        children: (
          <span
            onClick={() => handleRowClick(record)}
            style={{
              cursor: "pointer",
              color: "blue",
              textDecoration: "underline",
            }}
          >
            {text}
          </span>
        ),
        props: { rowSpan: record.rowSpanMatName },
      }),
      align: "left",
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
    },
    {
      title: "ล็อต",
      dataIndex: "lot",
      key: "lot",
      align: "left",
    },
    {
      title: "ตำแหน่ง",
      dataIndex: "location",
      key: "location",
      align: "left",
    },
    {
      title: "จำนวนที่ต้องหยิบ",
      dataIndex: "used_quantity",
      key: "used_quantity",
      render: (text) => formatNumber(text),
      align: "center",
    },
    {
      title: "จำนวนคงเหลือ",
      dataIndex: "remaining_quantity",
      key: "remaining_quantity",
      render: (text) => formatNumber(text),
      align: "center",
    },
    {
      title: "นับจริง",
      dataIndex: "counted_quantity",
      render: (_, record) =>
        isTaskCompleted ? (
          <span>{formatNumber(record.counted_quantity)}</span>
        ) : (
          <InputNumber
            defaultValue={record.remaining_quantity}
            onChange={(value) => handleQuantityChange(value, record.id)}
            disabled={isTaskCompleted}
          />
        ),
      align: "center",
    },
    {
      title: "เรียบร้อย",
      key: "selection",
      render: (_, record) => {
        return (
          <Checkbox
            checked={selectedRows.includes(record.id)}
            onChange={(e) => handleCheckboxChange(record.id, e.target.checked)}
            disabled={isTaskCompleted}
          />
        );
      },
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
      render: (text) => formatNumber(text),
    },
  ];

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
          <Table
            columns={columns}
            dataSource={formattedData}
            pagination={false}
            rowKey={(record) => record.material_id}
            rowClassName={rowClassName}
            scroll={{ x: "max-content" }} // ทำให้ตารางเลื่อนไปข้างๆ ได้หากข้อมูลกว้าง
          />
          <div className="total-quantity sarabun-bold">
            <p
              style={{ fontSize: "18px", marginLeft: "20px", padding: "10px" }}
            >
              <strong>รวมจำนวนที่สั่งเบิก:</strong>{" "}
              {formatNumber(totalRequestedQuantity)}
            </p>
          </div>
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
                disabled={selectedRows.length !== formattedData.length}
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
        open={isModalVisible}
        onOk={handleModalOk}
        onCancel={handleModalCancel}
        footer={null} // ซ่อนปุ่ม Footer ของ Modal
      >
        <Table
          className="sarabun-light"
          columns={modalColumns}
          dataSource={filteredData}
          pagination={false}
          rowKey={(record) => record.id}
          //scroll={{ x: "max-content" }} // ทำให้ตารางเลื่อนไปข้างๆ ได้หากข้อมูลกว้าง
          rowClassName={rowClassName}
        />
      </Modal>
    </MainLayout>
  );
};

export default TaskDetails;
