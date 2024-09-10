import React, { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import {
  Input,
  Table,
  Tag,
  Space,
  Button,
  Select,
  DatePicker,
  Modal,
  Row,
  Col,
  Card,
  message,
} from "antd";
import axios from "axios";
//import Sidebar from "../../components/Sidebar";
import MainLayout from "../../components/LayoutClerk";
import "../../styles1/Dashboard.css";
import { BsCheckCircleFill, BsSearch } from "react-icons/bs";
import { FaCheck, FaTrashCan } from "react-icons/fa6";
import { FaEye } from "react-icons/fa";
import { HiMiniPencilSquare } from "react-icons/hi2";

const { RangePicker } = DatePicker;
const { Option } = Select;

const materialTypeMap = {
  //PK_DIS: "กล่องดิส/ใบแนบ/สติ๊กเกอร์",
  //PK_shoe: "กล่องก้าม/ใบแนบ/สติ๊กเกอร์",
  WD: "กิ๊ฟล๊อค/แผ่นชิม",
  PIN: "สลัก/ตะขอ",
  BP: "แผ่นเหล็ก",
  CHEMICAL: "เคมี",
};

const Dashboard = () => {
  const [username, setUsername] = useState("");
  const [data, setData] = useState([]);
  const [modalVisible, setModalVisible] = useState(false);
  const [selectedUploadId, setSelectedUploadId] = useState(null);
  const [selectedMaterialType, setSelectedMaterialType] = useState("");
  const [confirmModalVisible, setConfirmModalVisible] = useState(false);
  const [confirmUploadId, setConfirmUploadId] = useState(null);
  const [idStatus, setIdStatus] = useState(1);
  const [approveModalVisible, setApproveModalVisible] = useState(false);
  const [inputValues, setInputValues] = useState({});
  const [isInputHidden, setIsInputHidden] = useState({});
  const [isButtonHidden, setIsButtonHidden] = useState({});

  const navigate = useNavigate();

  const fetchData = async () => {
    try {
      const token = localStorage.getItem("token");
      const response = await axios.get("http://localhost:3001/dashboard", {
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
    const storedUsername = localStorage.getItem("username");
    if (storedUsername) {
      setUsername(storedUsername);
    }
    fetchData();
  }, []);

  const handleEditClick = async (record) => {
    // Navigate to editDetails page with record information
    navigate(`/edit-details/${record.upload_id}`, { state: { record } });
  };

  const handleViewDetailsClick = async (record) => {
    setSelectedUploadId(record.upload_id);
    navigate(`/details/${record.upload_id}`); // เปลี่ยนไปยังหน้า Details
  };

  const handleMaterialTypeChange = (value) => {
    setSelectedMaterialType(value);
  };

  const handleConfirm = async () => {
    try {
      const token = localStorage.getItem("token");
      await axios.post(
        `http://localhost:3001/dashboard/confirm/${confirmUploadId}`,
        {},
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );
      message.success("ยืนยันรายการเบิกจ่ายสำเร็จ");
      fetchData();
      setConfirmModalVisible(false);
    } catch (err) {
      console.error("Failed to confirm upload:", err);
      message.error("ยืนยันรายการเบิกจ่ายล้มเหลว");
    }
  };

  const confirmDelete = async () => {
    if (!confirmUploadId) {
      console.error("upload_id is null or undefined.");
      return;
    }

    try {
      const token = localStorage.getItem("token");
      await axios.delete(
        `http://localhost:3001/dashboard/delete-uploads/${confirmUploadId}`,
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
    if (uploadId) {
      setConfirmUploadId(uploadId);
      setModalVisible(true);
    } else {
      console.error("Invalid uploadId:", uploadId);
    }
  };

  const handleApprove = (uploadId) => {
    setConfirmUploadId(uploadId);
    setApproveModalVisible(true);
  };

  const handleApproveConfirm = async () => {
    try {
      const token = localStorage.getItem("token");
      await axios.post(
        `http://localhost:3001/dashboard/approve/${confirmUploadId}`,
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

  // Utility function to check if the item date matches the current date
  const isCurrentDate = (dateString) => {
    const itemDate = new Date(dateString);
    const today = new Date();
    return (
      itemDate.getFullYear() === today.getFullYear() &&
      itemDate.getMonth() === today.getMonth() &&
      itemDate.getDate() === today.getDate()
    );
  };

  const filteredData = () => {
    switch (idStatus) {
      case 1:
        // สถานะ "รอยืนยัน" แสดงทั้งหมด
        return data.filter((item) => item.status === "รอยันยัน");
      case 2:
        // สถานะ "กำลังดำเนินการ" แสดงเฉพาะวันที่ปัจจุบัน
        return data.filter(
          (item) => item.status === "กำลังดำเนินการ" && isCurrentDate(item.date)
        );
      case 3:
        // สถานะ "รอตรวจสอบ" แสดงเฉพาะวันที่ปัจจุบัน
        return data.filter(
          (item) => item.status === "รอตรวจสอบ" && isCurrentDate(item.date)
        );
      case 4:
        // สถานะ "ดำเนินการเรียบร้อย" แสดงเฉพาะวันที่ปัจจุบัน
        return data.filter(
          (item) =>
            item.status === "ดำเนินการเรียบร้อย" && isCurrentDate(item.date)
        );
      default:
        return [];
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

      const token = localStorage.getItem("token");
      await axios.post(
        `http://localhost:3001/dashboard/save-inventory-id`,
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
      align: "left",
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
                    color: "#5755FE",
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
          // ถ้า inventory_id ไม่เป็น null แสดงค่า inventory_id ที่ถูกดึงมาจากหลังบ้าน
          return text;
        }
      },
    },
    {
      title: "วัตถุดิบ",
      dataIndex: "material_type",
      key: "material_type",
      align: "left",
      render: (matType) => materialTypeMap[matType] || matType,
    },
    {
      title: "วันที่",
      dataIndex: "date",
      key: "date",
      align: "left",
      sorter: (a, b) => new Date(a.date) - new Date(b.date), // เพิ่มการจัดเรียง
      render: (date) => (date ? new Date(date).toLocaleDateString() : "N/A"),
    },
    {
      title: "สถานะ",
      dataIndex: "status",
      key: "status",
      align: "center",
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
      render: (_, record) => {
        const isToday = isCurrentDate(record.date);

        if (record.status === "รอยืนยัน") {
          return (
            <Space size="middle">
              <Button
                style={{
                  color: "#5755FE",
                  backgroundColor: "#f0f0f0",
                  borderColor: "#f0f0f0",
                }}
                icon={<FaTrashCan />}
                onClick={() => handleDeleteClick(record.upload_id)}
              />

              {isToday && (
                <Button
                  style={{
                    color: "#5755FE",
                    backgroundColor: "#f0f0f0",
                    borderColor: "#f0f0f0",
                  }}
                  type="primary"
                  icon={<FaCheck />}
                  onClick={() => {
                    setConfirmUploadId(record.upload_id);
                    setConfirmModalVisible(true);
                  }}
                />
              )}
            </Space>
          );
        } else if (
          ["ดำเนินการเรียบร้อย", "กำลังดำเนินการ"].includes(record.status)
        ) {
          return (
            <Space size="middle">
              <Button
                style={{
                  color: "#5755FE",
                  backgroundColor: "#f0f0f0",
                  borderColor: "#f0f0f0",
                }}
                icon={<FaEye />}
                onClick={() => handleViewDetailsClick(record)}
              />
            </Space>
          );
        } else if (["รอตรวจสอบ"].includes(record.status)) {
          return (
            <Space size="middle">
              <Button
                style={{
                  color: "#5755FE",
                  backgroundColor: "#f0f0f0",
                  borderColor: "#f0f0f0",
                  display:"flex",
                  justifyContent:"space-between",
                }}
                icon={<HiMiniPencilSquare />}
                onClick={() => handleEditClick(record)}
              />
              <Button
                style={{
                  color: "#5755FE",
                  backgroundColor: "#f0f0f0",
                  borderColor: "#f0f0f0",
                }}
                icon={<FaCheck />}
                onClick={() => handleApprove(record.upload_id)}
              />
            </Space>
          );
        } else {
          return null;
        }
      },
    },
  ];

  const dataStatus = [
    {
      id: 1,
      statusName: "รอยืนยัน",
      total: data
        ? data.filter((item) => item.status === "รอยืนยัน").length
        : 0,
      color: "#91caff",
    },
    {
      id: 2,
      statusName: "กำลังดำเนินการ",
      total: data
        ? data.filter(
            (item) =>
              item.status === "กำลังดำเนินการ" && isCurrentDate(item.date)
          ).length
        : 0,
      color: "#ffd591",
    },
    {
      id: 3,
      statusName: "รอตรวจสอบ",
      total: data
        ? data.filter(
            (item) => item.status === "รอตรวจสอบ" && isCurrentDate(item.date)
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
              item.status === "ดำเนินการเรียบร้อย" && isCurrentDate(item.date)
          ).length
        : 0,
      color: "#b7eb8f",
    },
  ];

  return (
    <MainLayout>
      <div className="header">
        <div className="header-content">
          <div
            className="dashboard-title sarabun-bold"
            style={{
              fontSize: "28px",
              marginLeft: "20px",
              padding: "10px",
              color: "#000000E0",
            }}
          >
            การจัดการข้อมูลการเบิก-จ่ายวัตถุดิบ
          </div>
        </div>
        <div className=" sarabun-light ">
          <Link to="/UploadBalance">
            <button
              style={{
                color: "#f0f0f0",
                backgroundColor: "#5755FE",
                borderColor: "#5755FE",
                marginRight: "5px",
              }}
            >
              บันทึกข้อมูลการเบิก-จ่าย
            </button>
          </Link>
        </div>
      </div>

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
                    background: "#ffffff",
                    padding: "8px 0",
                    borderRadius: "15px",
                    marginBottom: "15px",
                    cursor: "pointer",
                    backgroundColor: d.color,
                  }}
                >
                  <div className="sarabun-bold">
                    <div
                      style={{
                        display: "flex",
                        justifyContent: "center",
                        fontSize: "18px",
                      }}
                    >
                      {d.statusName}
                    </div>
                    <div
                      style={{
                        display: "flex",
                        justifyContent: "center",
                        fontSize: "32px",
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

      <Card
        style={{
          borderRadius: "15px",
        }}
      >
        <div
          style={{
            marginBottom: "15px",
            display: "flex",
            justifyContent: "center",
          }}
        >
          <Select
            className="sarabun-light"
            placeholder="เลือกวัตถุดิบ"
            style={{ width: 200, marginRight: 10 }}
            onChange={handleMaterialTypeChange}
          >
            {Object.entries(materialTypeMap).map(([key, value]) => (
              <Option key={key} value={key}>
                {value}
              </Option>
            ))}
          </Select>
          <RangePicker style={{ marginRight: 10 }} />
          <Button
            className="sarabun-light"
            style={{
              color: "#5755FE",
              backgroundColor: "#f0f0f0",
              borderColor: "#f0f0f0",
            }}
          >
            <BsSearch />
          </Button>
        </div>
        {idStatus && idStatus === 1 ? (
          <Table
            columns={columns}
            dataSource={data.filter((item) => item.status === "รอยืนยัน")}
            pagination={false}
          />
        ) : idStatus === 2 ? (
          <Table
            columns={columns}
            dataSource={data.filter(
              (item) =>
                item.status === "กำลังดำเนินการ" && isCurrentDate(item.date)
            )}
            pagination={false}
          />
        ) : idStatus === 3 ? (
          <Table
            columns={columns}
            dataSource={data.filter(
              (item) => item.status === "รอตรวจสอบ" && isCurrentDate(item.date)
            )}
            pagination={false}
          />
        ) : (
          <Table
            columns={columns}
            dataSource={data.filter(
              (item) =>
                item.status === "ดำเนินการเรียบร้อย" && isCurrentDate(item.date)
            )}
            pagination={false}
          />
        )}
      </Card>

      <Modal
        className="sarabun-light"
        title="ยืนยันการลบ"
        open={modalVisible}
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
            onClick={confirmDelete}
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
        <p>คุณต้องการลบรายการนี้หรือไม่?</p>
      </Modal>

      <Modal
        className="sarabun-light"
        title="ยืนยันการดำเนินการ"
        open={confirmModalVisible}
        onCancel={() => setConfirmModalVisible(false)}
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
            onClick={handleConfirm}
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
        <p>คุณต้องการยืนยันการดำเนินการนี้หรือไม่?</p>
      </Modal>

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

export default Dashboard;
