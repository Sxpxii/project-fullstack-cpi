// src/pages1/supervisorClerk/Dashboard.jsx
import React, { useState, useEffect } from "react";
import {
  Input,
  Table,
  Tag,
  Space,
  Button,
  Modal,
  Row,
  Col,
  Card,
  message,
  Drawer,
} from "antd";
import axios from "axios";
import MainLayout from "../../components/LayoutSupervisorClerk";
import { FaCheck } from "react-icons/fa6";
import config from "../../configAPI";
import Swal from "sweetalert2";
import { useNavigate } from "react-router-dom";
import ChatApp from "../../components/ChatApp";

const materialTypeMap = {
  PK_DIS: "กล่องดิส/ใบแนบ/สติ๊กเกอร์",
  PK_shoe: "กล่องก้าม/ใบแนบ/สติ๊กเกอร์",
  WD: "กิ๊ฟล๊อค/แผ่นชิม",
  PIN: "สลัก/ตะขอ",
  BP: "แผ่นเหล็ก",
  CHEMICAL: "เคมี",
};

const DashboardSupervisorClerk = () => {
  const [username, setUsername] = useState("");
  const [data, setData] = useState([]);
  const [modalVisible, setModalVisible] = useState(false);
  const [selectedUploadId, setSelectedUploadId] = useState(null);
  const [confirmUploadId, setConfirmUploadId] = useState(null);
  const [idStatus, setIdStatus] = useState(0);
  const [approveModalVisible, setApproveModalVisible] = useState(false);
  const [inputValues, setInputValues] = useState({});
  const [isInputHidden, setIsInputHidden] = useState({});
  const [isButtonHidden, setIsButtonHidden] = useState({});
  const [materialRequests, setMaterialRequests] = useState([]);

  const navigate = useNavigate();

  const fetchData = async () => {
    try {
      const token = sessionStorage.getItem("token");
      const response = await axios.get(`${config.API_URL}/supClerkdashboard`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (Array.isArray(response.data)) {
        const sortedData = response.data.sort(
          (a, b) => new Date(a.date) - new Date(b.date)
        );
        setData(sortedData);
      } else {
        console.error("Invalid data format");
      }
    } catch (err) {
      console.error("Failed to fetch data:", err);
    }
  };

  useEffect(() => {
    const storedUsername = sessionStorage.getItem("username");
    if (storedUsername) {
      setUsername(storedUsername);
    }
    fetchData();
  }, []);

  /*// เพิ่มโค้ดเพื่อเช็คข้อความใหม่ทุก 10 วินาที
  useEffect(() => {
    const interval = setInterval(checkNewMessages, 10000);
    return () => clearInterval(interval);
  }, []);*/

  const handleEditClick = async (record) => {
    // Navigate to editDetails page with record information
    navigate(`/edit-details/${record.upload_id}`, { state: { record } });
  };

  const handleViewDetailsClick = async (record) => {
    setSelectedUploadId(record.upload_id);
    navigate(`/details/${record.upload_id}`); // เปลี่ยนไปยังหน้า Details
  };

  const handleApprove = (uploadId) => {
    setConfirmUploadId(uploadId);
    setApproveModalVisible(true);
  };

  const handleApproveConfirm = async () => {
    try {
      const token = sessionStorage.getItem("token");
      await axios.post(
        `${config.API_URL}/supClerkdashboard/approve/${confirmUploadId}`,
        {},
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );
      message.success("อนุมัติรายการเบิกจ่ายสำเร็จ");
      fetchData();
      setApproveModalVisible(false);
    } catch (err) {
      console.error("Failed to approve upload:", err);
      message.error("อนุมัติรายการเบิกจ่ายล้มเหลว");
    }
  };

  // ฟังก์ชันตรวจสอบข้อความใหม่
  /*const checkNewMessages = async () => {
    try {
      const token = sessionStorage.getItem("token");
      const response = await axios.get(`${config.API_URL}/chat/check`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (response.data.hasNewMessages) {
        Swal.fire({
          title: "ข้อความใหม่!",
          text: "คุณมีข้อความใหม่ กรุณาตรวจสอบ",
          icon: "info",
          confirmButtonText: "ตกลง",
        });

        if (result.isConfirmed) {
          setIsChatVisible(true); // แสดงแชท
          markMessagesAsRead(); // ส่งข้อมูลไปยังเซิร์ฟเวอร์ว่าผู้ใช้ได้อ่านข้อความแล้ว
        }
      }
    } catch (error) {
      console.error("Error checking new messages:", error);
    }
  };*/

  useEffect(() => {
    const storedUsername = sessionStorage.getItem("username");
    if (storedUsername) {
      setUsername(storedUsername);
    }
    fetchData();

    /*// เรียกใช้ฟังก์ชันตรวจสอบข้อความใหม่ทุกๆ 10 วินาที
    const interval = setInterval(checkNewMessages, 10000);
    return () => clearInterval(interval); // ล้าง interval เมื่อ component ถูก unmount*/
  }, []);

  const columns = [
    {
      title: "Inventory ID",
      dataIndex: "inventory_id",
      key: "inventory_id",
      align: "left",
      onHeaderCell: () => ({
        style: {
          backgroundColor: "#DCDCDC", // สีพื้นหลังของหัวคอลัมน์
          fontWeight: "bold", // ความหนาของตัวอักษร
          fontSize: "14px", // ขนาดตัวอักษร
          color: "#000000E0", // สีตัวอักษร
        },
      }),
      render: (text, record) => {
        // ถ้า inventory_id เป็น null แสดงช่องกรอกและปุ่มบันทึก
        if (text === null) {
          return (
            <Space>
              {!isInputHidden[record.upload_id] && (
                <Input
                  value={inputValues[record.upload_id] || ""}
                  onChange={(e) =>
                    handleInventoryIdChange(record.upload_id, e.target.value)
                  }
                />
              )}
              {!isButtonHidden[record.upload_id] && (
                <Button
                  style={{
                    color: "green",
                    backgroundColor: "#f0f0f0",
                    borderColor: "#f0f0f0",
                  }}
                  icon={<FaCheck />}
                  onClick={() => saveInventoryId(record.upload_id)}
                  disabled={!inputValues[record.upload_id]}
                />
              )}
            </Space>
          );
        } else {
          return text;
        }
      },
    },
    {
      title: "วัตถุดิบ",
      dataIndex: "material_type",
      key: "material_type",
      align: "left",
      onHeaderCell: () => ({
        style: {
          backgroundColor: "#DCDCDC",
          fontWeight: "bold",
          fontSize: "14px",
          color: "#000000E0",
        },
      }),
      render: (matType) => materialTypeMap[matType] || matType,
    },
    {
      title: "วันที่",
      dataIndex: "date",
      key: "date",
      align: "center",
      onHeaderCell: () => ({
        style: {
          backgroundColor: "#DCDCDC",
          fontWeight: "bold",
          fontSize: "14px",
          color: "#000000E0",
        },
      }),
      sorter: (a, b) => new Date(a.date) - new Date(b.date), // เพิ่มการจัดเรียง
      render: (date) => (date ? new Date(date).toLocaleDateString() : "N/A"),
    },
    {
      title: "สถานะ",
      dataIndex: "status",
      key: "status",
      align: "center",
      onHeaderCell: () => ({
        style: {
          backgroundColor: "#DCDCDC",
          fontWeight: "bold",
          fontSize: "14px",
          color: "#000000E0",
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
          case "รอยืนยัน":
            color = "blue";
            break;
          default:
            color = "grey";
        }
        return (
          <Tag className="sarabun-light" color={color}>
            {status}
          </Tag>
        );
      },
    },
    {
      title: "การดำเนินการ",
      key: "action",
      align: "center",
      onHeaderCell: () => ({
        style: {
          backgroundColor: "#DCDCDC",
          fontWeight: "bold",
          fontSize: "14px",
          color: "#000000E0",
        },
      }),
      render: (_, record) => {
        if (record.status === "กำลังดำเนินการ") {
          return (
            <Space
              size="middle"
              style={{
                display: "flex",
                justifyContent: "center", // จัดให้อยู่ตรงกลางในคอนเทนเนอร์
                alignItems: "center",
                width: "100%", // ทำให้คอนเทนเนอร์กว้างเต็มที่
              }}
            >
              <Button
                style={{
                  color: "#f0f0f0",
                  backgroundColor: "#5755FE",
                  borderColor: "#5755FE",
                }}
                onClick={() => handleViewDetailsClick(record)}
              >
                ดูรายละเอียด
              </Button>
            </Space>
          );
        } else if (record.status === "ดำเนินการเรียบร้อย") {
          // แสดงเฉพาะปุ่มดูรายละเอียดสำหรับสถานะดำเนินการเรียบร้อย
          return (
            <Space size="middle">
              <Button
                style={{
                  color: "#f0f0f0",
                  backgroundColor: "#5755FE",
                  borderColor: "#5755FE",
                }}
                onClick={() => handleViewDetailsClick(record)}
              >
                ดูรายละเอียด
              </Button>
            </Space>
          );
        } else if (["รอตรวจสอบ"].includes(record.status)) {
          return (
            <Space size="middle">
              <Button
                style={{
                  color: "#f0f0f0",
                  backgroundColor: "red",
                  borderColor: "red",
                  marginRight: "50px",
                }}
                onClick={() => handleEditClick(record)}
              >
                ตรวจสอบ
              </Button>
              <Button
                style={{
                  color: "#f0f0f0",
                  backgroundColor: "green",
                  borderColor: "green",
                }}
                onClick={() => handleApprove(record.upload_id)}
              >
                อนุมัติ
              </Button>
            </Space>
          );
        } else {
          return null;
        }
      },
    },
  ];

  const isToday = (dateString) => {
    const today = new Date();
    const date = new Date(dateString);
    return (
      date.getDate() === today.getDate() &&
      date.getMonth() === today.getMonth() &&
      date.getFullYear() === today.getFullYear()
    );
  };

  const dataStatus = [
    {
      id: 1,
      statusName: "ทั้งหมด",
      total: data
        ? data.filter((item) => isToday(item.date)).length // นับทุกสถานะ แต่กรองเฉพาะงานของวันนั้น
        : 0,
      color: "#CC99FF",
    },
    {
      id: 2,
      statusName: "กำลังดำเนินการ",
      total: data
        ? data.filter(
            (item) => item.status === "กำลังดำเนินการ" && isToday(item.date)
          ).length
        : 0,
      color: "#ffd591",
    },
    {
      id: 3,
      statusName: "รอตรวจสอบ",
      total: data
        ? data.filter(
            (item) => item.status === "รอตรวจสอบ" && isToday(item.date)
          ).length
        : 0,
      color: "#ffa5a1",
    },
    {
      id: 4,
      statusName: "ดำเนินการเรียบร้อย",
      total: data
        ? data.filter(
            (item) => item.status === "ดำเนินการเรียบร้อย" && isToday(item.date)
          ).length
        : 0,
      color: "#b7eb8f",
    },
  ];

  return (
    <MainLayout>
      <div
        className="header"
        style={{
          backgroundColor: "#ffffff", // พื้นหลังสี #001529
          padding: "10px", // เพิ่ม padding สำหรับ header
          display: "block",
        }}
      >
        <div
          className="dashboard-title sarabun-bold"
          style={{
            fontSize: "20px",
            marginLeft: "20px",
            color: "#000000E0",
          }}
        >
          สถานะการเบิกจ่ายวัตถุดิบรายวัน
        </div>
        <div style={{ marginTop: "20px" }}>
          <Row gutter={16}>
            {dataStatus && dataStatus.length > 0 ? (
              dataStatus.map((d, i) => (
                <>
                  <Col
                    className="gutter-row"
                    span={6}
                    onClick={() => setIdStatus(d.id)}
                  >
                    <div
                      style={{
                        background: idStatus === d.id ? d.color : "#E8E8E8",
                        padding: "8px 0",
                        borderRadius: "15px",
                        marginBottom: "15px",
                        cursor: "pointer",
                        boxShadow:
                          idStatus === d.id
                            ? "0px 4px 8px rgba(0, 0, 0, 0.5)" // เงาเมื่อถูกเลือก
                            : "0px 4px 8px rgba(0, 0, 0, 0.1)", // เงาปกติ
                      }}
                    >
                      <div className="sarabun-bold">
                        <div
                          style={{
                            display: "flex",
                            justifyContent: "center",
                            fontSize: "18px",
                            color: idStatus === d.id ? "#000" : "#828282", // เปลี่ยนสีตัวอักษรเมื่อถูกเลือก
                            fontWeight: idStatus === d.id ? "bold" : "normal", // เปลี่ยนเป็นตัวหนาเมื่อถูกเลือก
                            opacity: idStatus === d.id ? 1 : 0.5,
                          }}
                        >
                          {d.statusName}
                        </div>
                        <div
                          style={{
                            display: "flex",
                            justifyContent: "center",
                            fontSize: "28px",
                            color: idStatus === d.id ? "#000" : "#828282", // เปลี่ยนสีตัวอักษรเมื่อถูกเลือก
                            fontWeight: idStatus === d.id ? "bold" : "normal", // เปลี่ยนเป็นตัวหนาเมื่อถูกเลือก
                            opacity: idStatus === d.id ? 1 : 0.5, // ทำให้สีจางลงถ้าไม่ได้เลือก
                          }}
                        >
                          {d.total}
                        </div>
                      </div>
                    </div>
                  </Col>
                </>
              ))
            ) : (
              <></>
            )}
          </Row>
        </div>
      </div>

      <Card
        style={{
          borderRadius: "15px",
          height: "calc(70vh - 150px)", // กำหนดความสูงของ Card ให้เต็มหน้าจอ ลบด้วย header (หรือ margin)
        }}
      >
        <div
          style={{
            position: "fixed",
            bottom: "10px",
            right: "10px",
            zIndex: 1000,
          }}
        >
          <ChatApp />
        </div>

        <div
          className="dashboard-title sarabun-bold"
          style={{
            fontSize: "20px",
            padding: "10px",
            color: "#000000E0",
          }}
        >
          รายการเบิกจ่ายวัตถุดิบทั้งหมด
        </div>

        {idStatus && idStatus === 1 ? (
          <Table
            columns={columns}
            dataSource={data}
            pagination={false}
            scroll={{ y: "calc(70vh - 250px)" }} // กำหนดการเลื่อนภายในตาราง
            className="custom-table"
          />
        ) : idStatus === 2 ? (
          <Table
            columns={columns}
            dataSource={data.filter((item) => item.status === "กำลังดำเนินการ")}
            pagination={false}
            scroll={{ y: "calc(70vh - 250px)" }} // กำหนดการเลื่อนภายในตาราง
            className="custom-table"
          />
        ) : idStatus === 3 ? (
          <Table
            columns={columns}
            dataSource={data.filter((item) => item.status === "รอตรวจสอบ")}
            pagination={false}
            scroll={{ y: "calc(70vh - 250px)" }} // กำหนดการเลื่อนภายในตาราง
            className="custom-table"
          />
        ) : (
          <Table
            columns={columns}
            dataSource={data.filter(
              (item) => item.status === "ดำเนินการเรียบร้อย"
            )}
            pagination={false}
            scroll={{ y: "calc(70vh - 250px)" }} // กำหนดการเลื่อนภายในตาราง
            className="custom-table"
          />
        )}
      </Card>

      <Modal
        title="ยืนยันการอนุมัติ"
        open={approveModalVisible}
        onCancel={() => setApproveModalVisible(false)}
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
            onClick={handleApproveConfirm}
            style={{
              color: "#f0f0f0",
              backgroundColor: "#5755FE",
              borderColor: "#5755FE",
            }}
          >
            อนุมัติ
          </Button>,
        ]}
      >
        <p>คุณแน่ใจว่าต้องการอนุมัติรายการนี้หรือไม่?</p>
      </Modal>
    </MainLayout>
  );
};

export default DashboardSupervisorClerk;
