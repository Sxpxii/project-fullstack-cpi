import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import {
  Input,
  Table,
  Tag,
  Space,
  Button,
  Row,
  Col,
  Card,
  message,
  Modal
} from "antd";
import axios from "axios";
import MainLayout from "../../components/LayoutClerk";
import "../../styles1/Dashboard.css";
import { FaCheck, FaTrashCan } from "react-icons/fa6";
import config from "../../configAPI";
import { debounce } from "lodash";

const materialTypeMap = {
  PK_DIS: "กล่องดิส/ใบแนบ/สติ๊กเกอร์",
  PK_shoe: "กล่องก้าม/ใบแนบ/สติ๊กเกอร์",
  WD: "กิ๊ฟล๊อค/แผ่นชิม",
  PIN: "สลัก/ตะขอ",
  BP: "แผ่นเหล็ก",
  CHEMICAL: "เคมี",
};

const Dashboardclerk = () => {
  const [username, setUsername] = useState("");
  const [data, setData] = useState([]);
  const [modalVisible, setModalVisible] = useState(false);
  const [selectedUploadId, setSelectedUploadId] = useState(null);
  const [idStatus, setIdStatus] = useState(1);
  const [inputValues, setInputValues] = useState({});
  const [isInputHidden, setIsInputHidden] = useState({});
  const [isButtonHidden, setIsButtonHidden] = useState({});
  const [lastInteractionTime, setLastInteractionTime] = useState(Date.now());

  const navigate = useNavigate();

  const fetchData = async () => {
    try {
      const token = sessionStorage.getItem("token");
      const response = await axios.get(`${config.API_URL}/dashboardClerk`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (Array.isArray(response.data)) {
        const sortedData = response.data.sort((a, b) => {
            const dateComparison = new Date(b.date) - new Date(a.date);
            if (dateComparison === 0) {
              // ถ้าวันที่เท่ากัน ให้เรียงตาม Inventory ID จากมากไปน้อย
              return b.inventory_id - a.inventory_id;
            }
            return dateComparison; // เรียงวันที่จากน้อยไปมาก
          });
        setData(sortedData);
      } else {
        console.error("Invalid data format");
      }
    } catch (err) {
      console.error("Failed to fetch data:", err);
    }
  };

  // ตรวจจับการโต้ตอบของผู้ใช้
  const handleUserInteraction = debounce(() => {
    setLastInteractionTime(Date.now());
  }, 300);

  useEffect(() => {
    // เริ่มต้นดึงข้อมูล
    fetchData();

    // ตั้งค่าตัวตรวจจับการโต้ตอบ
    window.addEventListener("mousemove", handleUserInteraction);
    window.addEventListener("keydown", handleUserInteraction);

    // ตั้ง Auto Refresh
    const intervalId = setInterval(() => {
      if (Date.now() - lastInteractionTime >= 60000) {
        fetchData(); // รีเฟรชข้อมูลทุก 1 นาทีถ้าไม่มีการโต้ตอบ
      }
    }, 60000);

    // ล้างการตั้งค่าเมื่อคอมโพเนนต์ถูกลบ
    return () => {
      window.removeEventListener("mousemove", handleUserInteraction);
      window.removeEventListener("keydown", handleUserInteraction);
      clearInterval(intervalId);
    };
  }, [lastInteractionTime]);

  useEffect(() => {
    const storedUsername = sessionStorage.getItem("username");
    if (storedUsername) {
      setUsername(storedUsername);
    }
    fetchData();
  }, []);

  const handleViewDetailsClick = async (record) => {
    setSelectedUploadId(record.upload_id);
    navigate(`/details/${record.upload_id}`); // เปลี่ยนไปยังหน้า Details
  };

  const confirmDelete = async (uploadId) => {
    console.log("Deleting upload with ID:", uploadId);
    if (!uploadId) {
      console.error("upload_id is null or undefined.");
      return;
    }

    try {
      const token = sessionStorage.getItem("token");
      await axios.delete(
        `${config.API_URL}/dashboardClerk/delete-uploads/${uploadId}`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );
      message.success("ลบรายการสำเร็จ");
      fetchData();
      setModalVisible(false);
    } catch (err) {
      console.error("Failed to return task:", error);
      message.error("ลบรายการไม่สำเร็จ กรุณาลองใหม่!!");
    }
  };

  const handleDeleteClick = (uploadId) => {
    console.log("Attempting to delete upload with ID:", uploadId);
    if (uploadId) {
      Modal.confirm({
        title: "ยืนยันการลบ",
        content: "คุณแน่ใจหรือไม่ว่าต้องการลบรายการนี้?",
        okText: "ยืนยัน",
        cancelText: "ยกเลิก",
        onOk: () => {
          confirmDelete(uploadId);
        },
      });
    } else {
      console.error("Invalid uploadId:", uploadId);
    }
  };

  const handleInventoryIdChange = (uploadId, value) => {
    setInputValues((prevValues) => ({
      ...prevValues,
      [uploadId]: value,
    }));
  };

  // Function to save inventory ID to database (to be triggered on form submission or similar)
  const saveInventoryId = async (uploadId) => {
    try {
      const inventoryId = inputValues[uploadId];

      console.log("Data to save:", { uploadId, inventoryId });

      const token = sessionStorage.getItem("token");
      await axios.post(
        `${config.API_URL}/dashboardClerk/save-inventory-id`,
        { upload_id: uploadId, inventory_id: inventoryId },
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );
      message.success("บันทึก Inventory ID สำเร็จ");

      // ซ่อนช่องกรอกและปุ่มบันทึกหลังจากบันทึกสำเร็จ
      setIsInputHidden((prev) => ({ ...prev, [uploadId]: true }));
      setIsButtonHidden((prev) => ({ ...prev, [uploadId]: true }));

      fetchData();
    } catch (err) {
      console.error("Failed to save inventory ID:", err);
      message.error("บันทึก Inventory ID ล้มเหลว");
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
      render: (text, record) => {
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
          backgroundColor: "#00152a", // สีพื้นหลังของหัวคอลัมน์
          fontWeight: "bold", // ความหนาของตัวอักษร
          fontSize: "14px", // ขนาดตัวอักษร
          color: "#ffffff", // สีตัวอักษร
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
          backgroundColor: "#00152a", // สีพื้นหลังของหัวคอลัมน์
          fontWeight: "bold", // ความหนาของตัวอักษร
          fontSize: "14px", // ขนาดตัวอักษร
          color: "#ffffff", // สีตัวอักษร
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
          case "รอรับงาน":
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
          backgroundColor: "#00152a", // สีพื้นหลังของหัวคอลัมน์
          fontWeight: "bold", // ความหนาของตัวอักษร
          fontSize: "14px", // ขนาดตัวอักษร
          color: "#ffffff", // สีตัวอักษร
          borderTopRightRadius: "10px", // มุมโค้งด้านขวาบน
          borderBottomRightRadius: "10px", // มุมโค้งด้านขวาล่าง
        },
      }),
      render: (_, record) => {
        if (record.status === "รอรับงาน") {
          return (
            <Space size="large">
              <Button
                style={{
                  color: "#f0f0f0",
                  backgroundColor: "#cf1322",
                  borderColor: "#cf1322",
                }}
                icon={<FaTrashCan />}
                onClick={() => handleDeleteClick(record.upload_id)}
              >
              </Button>

            </Space>
          );
        } else if (record.status === "กำลังดำเนินการ") {
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
                //icon={<FaEye />}
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
                  backgroundColor: "#5755FE",
                  borderColor: "#5755FE",
                }}
                //icon={<FaEye />}
                onClick={() => handleViewDetailsClick(record)}
              >
                ดูรายละเอียด
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
      statusName: "รอรับงาน",
      total: data
        ? data.filter(
            (item) =>
              item.status === "รอรับงาน" && isToday(item.last_status_update)
          ).length
        : 0,
      color: "#91caff",
    },
    {
      id: 2,
      statusName: "กำลังดำเนินการ",
      total: data
        ? data.filter(
            (item) =>
              item.status === "กำลังดำเนินการ" &&
              isToday(item.last_status_update)
          ).length
        : 0,
      color: "#ffd591",
    },
    {
      id: 3,
      statusName: "รอตรวจสอบ",
      total: data
        ? data.filter(
            (item) =>
              item.status === "รอตรวจสอบ" && isToday(item.last_status_update)
          ).length
        : 0,
      color: "#ffa5a1",
    },
    {
      id: 4,
      statusName: "ดำเนินการเรียบร้อย",
      total: data
        ? data.filter(
            (item) =>
              item.status === "ดำเนินการเรียบร้อย" &&
              isToday(item.last_status_update)
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
            //padding: "10px",
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
                        //background: "#ffffff",
                        padding: "8px 0",
                        borderRadius: "15px",
                        marginBottom: "15px",
                        cursor: "pointer",
                        //backgroundColor: d.color,
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
          height: "calc(80vh - 100px)", // กำหนดความสูงของ Card ให้เต็มหน้าจอ ลบด้วย header (หรือ margin)
        }}
      >
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

        {/* ปุ่มอัปโหลดไฟล์ */}
        <div style={{ padding: "10px", textAlign: "right" }}>
          <Button
            type="primary"
            onClick={() => navigate("/UploadItemRequest")}
            style={{
              color: "#f0f0f0",
              backgroundColor: "#5755FE",
              borderColor: "#5755FE",
              marginBottom: 16,
            }}
          >
            อัปโหลดไฟล์
          </Button>
        </div>

        {idStatus && idStatus === 1 ? (
          <Table
            columns={columns}
            dataSource={data.filter((item) => item.status === "รอรับงาน")}
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
    </MainLayout>
  );
};

export default Dashboardclerk;
