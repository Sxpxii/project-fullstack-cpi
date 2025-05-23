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
  Select,
} from "antd";
import axios from "axios";
import MainLayout from "../../components/LayoutClerk";
import "../../styles/Dashboard.css";
import { FaCheck, FaTrashCan } from "react-icons/fa6";
import { FaEdit, FaTimes } from "react-icons/fa";
import config from "../../configAPI";
import { debounce } from "lodash";
import Swal from 'sweetalert2';

const materialTypeMap = {
  PK_DIS: "กล่องดิส/ใบแนบ/สติ๊กเกอร์",
  PK_shoe: "กล่องก้าม/ใบแนบ/สติ๊กเกอร์",
  WD: "กิ๊ฟล๊อค/แผ่นชิม",
  PIN: "สลัก/ตะขอ",
  BP: "แผ่นเหล็ก",
  CHEMICAL: "เคมี",
};
const { Option } = Select;

const Dashboardclerk = () => {
  const [username, setUsername] = useState("");
  const [data, setData] = useState([]);
  const [selectedUploadId, setSelectedUploadId] = useState(null);
  const [idStatus, setIdStatus] = useState(1);
  const [inputValues, setInputValues] = useState({});
  const [isInputHidden, setIsInputHidden] = useState({});
  const [isButtonHidden, setIsButtonHidden] = useState({});
  const [lastInteractionTime, setLastInteractionTime] = useState(Date.now());
  const [filterDate, setFilterDate] = useState(""); // State for date filter
  const [filterMaterial, setFilterMaterial] = useState(""); // State for material filter
  const [filterInventoryId, setFilterInventoryId] = useState("");
  const [isEditing, setIsEditing] = useState({}); // State ตรวจสอบว่ากำลังแก้ไขแถวไหน

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
      Swal.fire({
        icon: 'success',
        title: 'ลบรายการสำเร็จ',
        showConfirmButton: false,
        timer: 1500,
        customClass: {
          title: "sarabun-bold", // ใส่คลาสให้กับ title
        },
      });
      fetchData();
    } catch (err) {
      console.error("Failed to return task:", err);
      Swal.fire({
        icon: 'error',
        title: 'ลบรายการไม่สำเร็จ',
        html: '<span class="sarabun-light">กรุณาลองใหม่!!</span>',
        customClass: {
          title: "sarabun-bold", // ใส่คลาสให้กับ title
        },
      });
    }
  };

  const handleDeleteClick = (uploadId) => {
    console.log("Attempting to delete upload with ID:", uploadId);
    if (uploadId) {
      Swal.fire({
        title: 'ยืนยันการลบ',
        html: '<span class="sarabun-light">คุณแน่ใจหรือไม่ว่าต้องการลบรายการนี้?</span>',
        icon: 'warning',
        showCancelButton: true,
        confirmButtonText: 'ยืนยัน',
        cancelButtonText: 'ยกเลิก',
        customClass: {
          title: "sarabun-bold", // ใส่คลาสให้กับ title
          confirmButton: "sarabun-light",
          cancelButton: "sarabun-light",
        },
      }).then((result) => {
        if (result.isConfirmed) {
          confirmDelete(uploadId);
        }
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
      console.log("Token being sent:", token);

      await axios.post(
        `${config.API_URL}/dashboardClerk/save-inventory-id`,
        { upload_id: uploadId, inventory_id: inventoryId },
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );
      Swal.fire({
        icon: 'success',
        title: 'บันทึก Inventory ID สำเร็จ',
        showConfirmButton: false,
        timer: 1000,
        customClass: {
          title: "sarabun-bold", // ใส่คลาสให้กับ title
        },
      });

      // ซ่อนช่องกรอกและปุ่มบันทึกหลังจากบันทึกสำเร็จ
      setIsInputHidden((prev) => ({ ...prev, [uploadId]: true }));
      setIsButtonHidden((prev) => ({ ...prev, [uploadId]: true }));

      fetchData();
    } catch (err) {
      console.error("Failed to save inventory ID:", err);
      Swal.fire({
        icon: 'error',
        title: 'บันทึก Inventory ID ล้มเหลว',
        html: '<span class="sarabun-light">กรุณาลองใหม่!!</span>',
        customClass: {
          title: "sarabun-bold", // ใส่คลาสให้กับ title
        },
      });
    }
  };

  const handleResetFilters = () => {
    setFilterDate(null);
    setFilterMaterial("");
    setFilterInventoryId("");
  };

  // Filter function for the table
  const filteredData = data.filter((item) => {
    const matchesMaterial = filterMaterial
      ? item.material_type.includes(filterMaterial)
      : true;

    const matchesInventoryId = filterInventoryId
      ? item.inventory_id.includes(filterInventoryId)
      : true;
    console.log("Filter Dates:", filterDate);

    return matchesMaterial && matchesInventoryId;
  });

  const columns = [
    {
      title: "Inventory ID",
      dataIndex: "inventory_id",
      key: "inventory_id",
      align: "center",
      width: 400,
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
        const isEditingRow = isEditing[record.upload_id];
        const hasInventoryId = record.inventory_id && record.inventory_id.trim() !== "";
    
        return (
          <Space size="middle">
            {isEditingRow ? (
              <>
                <Input
                  style={{ marginRight: 8 }}
                  value={inputValues[record.upload_id] ?? record.inventory_id ?? ""}
                  onChange={(e) =>
                    handleInventoryIdChange(record.upload_id, e.target.value)
                  }
                />
                <Button
                  icon={<FaCheck />}
                  onClick={() => {
                    saveInventoryId(record.upload_id);
                    setIsEditing((prev) => ({ ...prev, [record.upload_id]: false }));
                  }}
                  disabled={!inputValues[record.upload_id]}
                  style={{ background: "green", color: "white", border: "1px solid white" }}
                />
                {hasInventoryId && (
                  <Button
                    icon={<FaTimes />} // ปุ่มยกเลิก
                    onClick={() => {
                      setInputValues((prev) => ({
                        ...prev,
                        [record.upload_id]: record.inventory_id,
                      }));
                      setIsEditing((prev) => ({ ...prev, [record.upload_id]: false }));
                    }}
                    style={{ backgroundColor: "#ff4d4f", borderColor: "#ff4d4f" }}
                  />
                )}
              </>
            ) : (
              <>
                {hasInventoryId ? (
                  <>
                    <span>{text}</span>
                    <Button
                      icon={<FaEdit />} // ปุ่มแก้ไข
                      onClick={() => setIsEditing((prev) => ({ ...prev, [record.upload_id]: true }))}
                      style={{ backgroundColor: "#9e9e9e", borderColor: " #9e9e9e", color: "white" }}
                    />
                  </>
                ) : (
                  <>
                    <Input
                      style={{ marginRight: 8 }}
                      value={inputValues[record.upload_id] ?? ""}
                      onChange={(e) =>
                        handleInventoryIdChange(record.upload_id, e.target.value)
                      }
                    />
                    <Button
                      icon={<FaCheck />}
                      onClick={() => {
                        saveInventoryId(record.upload_id);
                        setIsEditing((prev) => ({ ...prev, [record.upload_id]: false }));
                      }}
                      disabled={!inputValues[record.upload_id]}
                      style={{ background: "green", color: "white", border: "1px solid white" }}
                    />
                  </>
                )}
              </>
            )}
          </Space>
        );
      },
      /*render: (text, record) => {
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
      },*/
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
      dataIndex: "approved_date",
      key: "approved_date",
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
              ></Button>
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
                  color: "#000000",
                  backgroundColor: "#D2B48C",
                  borderColor: "#D2B48C",
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
                  color: "#000000",
                  backgroundColor: "#D2B48C",
                  borderColor: "#D2B48C",
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
                  color: "#000000",
                  backgroundColor: "#D2B48C",
                  borderColor: "#D2B48C",
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
              //item.status === "รอรับงาน" && isToday(item.last_status_update)
            item.status === "รอรับงาน" && isToday(item.approved_date)
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
              //item.status === "กำลังดำเนินการ" && isToday(item.last_status_update)
            item.status === "กำลังดำเนินการ" && isToday(item.approved_date)
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
              //item.status === "รอตรวจสอบ" && isToday(item.last_status_update)
            item.status === "รอตรวจสอบ" && isToday(item.approved_date)
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
              //item.status === "ดำเนินการเรียบร้อย" && isToday(item.last_status_update)
            item.status === "ดำเนินการเรียบร้อย" && isToday(item.approved_date)
          ).length
        : 0,
      color: "#b7eb8f",
    },
  ];

  return (
    <MainLayout>
      <div style={{ padding: "0 48px" }}>
        <Row gutter={24}>
          <div
            className="dashboard-title sarabun-bold"
            style={{
              fontSize: "20px",
              marginLeft: "20px",
              marginBottom: "20px",
              marginTop: "20px",
              color: "#000000E0",
            }}
          >
            สถานะการเบิกจ่ายวัตถุดิบรายวัน :
          </div>
        </Row>

        <Row gutter={24} style={{ marginTop: 10 }}>
          {dataStatus && dataStatus.length > 0 ? (
            dataStatus.map((d) => (
              <Col
                className="gutter-row"
                span={6}
                key={d.id}
                onClick={() => setIdStatus(d.id)}
              >
                <Card
                  style={{
                    background: idStatus === d.id ? d.color : "#E8E8E8",
                    padding: "8px 0",
                    borderRadius: "24px",
                    marginBottom: "15px",
                    cursor: "pointer",
                    boxShadow: "0 4px 6px rgba(0, 0, 0, 0.1)",
                  }}
                >
                  <div
                    className="sarabun-bold"
                    style={{
                      display: "flex",
                      justifyContent: "center",
                      fontSize: "22px",
                      color: idStatus === d.id ? "#000" : "#828282",
                      fontWeight: idStatus === d.id ? "bold" : "normal",
                      opacity: idStatus === d.id ? 1 : 0.5,
                    }}
                  >
                    {d.statusName}
                  </div>
                  <div
                    className="sarabun-bold"
                    style={{
                      display: "flex",
                      justifyContent: "center",
                      fontSize: "22px",
                      color: idStatus === d.id ? "#000" : "#828282",
                      fontWeight: idStatus === d.id ? "bold" : "normal",
                      opacity: idStatus === d.id ? 1 : 0.5,
                    }}
                  >
                    {d.total}
                  </div>
                </Card>
              </Col>
            ))
          ) : (
            <></>
          )}
        </Row>

        <Row gutter={24} style={{ marginTop: 30 }}>
          <Card
            style={{
              borderRadius: "15px",
              height: "calc(90vh - 100px)", // กำหนดความสูงของ Card ให้เต็มหน้าจอ ลบด้วย header (หรือ margin)
              overflow: "hidden",
            }}
          >
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
                  height:60,
                  borderRadius:12,
                  width:150
                }}
              >
                อัปโหลดไฟล์
              </Button>
            </div>
            <div
              className="dashboard-title sarabun-bold"
              style={{
                fontSize: "20px",
                marginBottom: "20px",
                color: "#000000E0",
              }}
            >
              รายการเบิกจ่ายวัตถุดิบทั้งหมด :
            </div>

            <Row
              gutter={16}
              style={{
                marginBottom: "20px",
                display: "flex",
              }}
            >
              <Col span={6}>
                <Select
                  className="sarabun-light"
                  placeholder="กรองวัตถุดิบ"
                  value={filterMaterial}
                  onChange={setFilterMaterial}
                  style={{ width: "100%" }}
                >
                  <Option className="sarabun-bold" value="">
                    กรองวัตถุดิบ
                  </Option>
                  {/* Add options dynamically here */}
                  <Option className="sarabun-light" value="PK_DIS">
                    กล่องดิส/ใบแนบ/สติ๊กเกอร์
                  </Option>
                  <Option className="sarabun-light" value="PK_shoe">
                    กล่องก้าม/ใบแนบ/สติ๊กเกอร์
                  </Option>
                  <Option className="sarabun-light" value="WD">
                    กิ๊ฟล๊อค/แผ่นชิม
                  </Option>
                  <Option className="sarabun-light" value="PIN">
                    สลัก/ตะขอ
                  </Option>
                  <Option className="sarabun-light" value="BP">
                    แผ่นเหล็ก
                  </Option>
                  <Option className="sarabun-light" value="CHEMICAL">
                    เคมี
                  </Option>
                </Select>
              </Col>
              <Col span={6}>
                <Input
                  className="sarabun-light"
                  placeholder="กรอง Inventory ID"
                  value={filterInventoryId}
                  onChange={(e) => setFilterInventoryId(e.target.value)}
                />
              </Col>
              <Col span={8}>
                <Button
                  onClick={handleResetFilters}
                  style={{
                    marginRight: 8,
                    color: "#f0f0f0",
                    backgroundColor: "#00152a",
                    borderColor: "#00152a",
                  }}
                >
                  รีเซ็ต
                </Button>
              </Col>
            </Row>

            {idStatus && idStatus === 1 ? (
              <Table
                columns={columns}
                dataSource={filteredData.filter(
                  (item) => item.status === "รอรับงาน"
                )}
                pagination={false}
                scroll={{ y: "calc(70vh - 250px)" }} // กำหนดการเลื่อนภายในตาราง
                className="custom-table"
              />
            ) : idStatus === 2 ? (
              <Table
                columns={columns}
                dataSource={filteredData.filter(
                  (item) => item.status === "กำลังดำเนินการ"
                )}
                pagination={false}
                scroll={{ y: "calc(70vh - 250px)" }} // กำหนดการเลื่อนภายในตาราง
                className="custom-table"
              />
            ) : idStatus === 3 ? (
              <Table
                columns={columns}
                dataSource={filteredData.filter(
                  (item) => item.status === "รอตรวจสอบ"
                )}
                pagination={false}
                scroll={{ y: "calc(70vh - 250px)" }} // กำหนดการเลื่อนภายในตาราง
                className="custom-table"
              />
            ) : (
              <Table
                columns={columns}
                dataSource={filteredData.filter(
                  (item) => item.status === "ดำเนินการเรียบร้อย"
                )}
                pagination={false}
                scroll={{ y: "calc(70vh - 250px)" }} // กำหนดการเลื่อนภายในตาราง
                className="custom-table"
              />
            )}
          </Card>
        </Row>
      </div>
    </MainLayout>
  );
};

export default Dashboardclerk;
