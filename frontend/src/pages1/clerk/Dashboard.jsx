import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import {
  Input,
  Table,
  Tag,
  Space,
  Button,
  List,
  Modal,
  Row,
  Col,
  Card,
  message,
} from "antd";
import axios from "axios";
import MainLayout from "../../components/LayoutClerk";
import "../../styles1/Dashboard.css";
import { FaCheck, FaTrashCan } from "react-icons/fa6";
import config from "../../configAPI";
import ChatApp from "../../components/ChatApp";
import { debounce } from "lodash";

const materialTypeMap = {
  PK_DIS: "กล่องดิส/ใบแนบ/สติ๊กเกอร์",
  PK_shoe: "กล่องก้าม/ใบแนบ/สติ๊กเกอร์",
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
  const [confirmModalVisible, setConfirmModalVisible] = useState(false);
  const [confirmUploadId, setConfirmUploadId] = useState(null);
  const [idStatus, setIdStatus] = useState(1);
  const [inputValues, setInputValues] = useState({});
  const [isInputHidden, setIsInputHidden] = useState({});
  const [isButtonHidden, setIsButtonHidden] = useState({});
  const [editModalVisible, setEditModalVisible] = useState(false);
  const [materialRequests, setMaterialRequests] = useState([]);
  const [editedRows, setEditedRows] = useState({});
  const [editMode, setEditMode] = useState({});
  const [previewModalVisible, setPreviewModalVisible] = useState(false);
  const [summaryActions, setSummaryActions] = useState([]);
  const [pinModalVisible, setPinModalVisible] = useState(false);
  const [pin, setPin] = useState("");
  const [pinError, setPinError] = useState(null);
  const [lastInteractionTime, setLastInteractionTime] = useState(Date.now());

  const navigate = useNavigate();

  const correctPin = "1234";

  const handlePinSubmit = () => {
    if (pin === correctPin) {
      // PIN ถูกต้อง ทำการบันทึกการแก้ไข
      handleSaveAllChanges();
      setPinModalVisible(false);
    } else {
      // PIN ไม่ถูกต้อง แสดงข้อความผิดพลาด
      setPinError("PIN ไม่ถูกต้อง กรุณาลองใหม่");
    }
  };

  const fetchData = async () => {
    try {
      const token = sessionStorage.getItem("token");
      const response = await axios.get(`${config.API_URL}/dashboard`, {
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

  // ฟังก์ชันสำหรับดึงข้อมูล material requests
  const fetchMaterialRequests = async (uploadId) => {
    try {
      const token = sessionStorage.getItem("token");
      const response = await axios.get(
        `${config.API_URL}/dashboard/materialrequests/${uploadId}`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );
      console.log("Material Requests Data: ", response.data); // ตรวจสอบข้อมูล
      setMaterialRequests(response.data);
    } catch (err) {
      console.error("Failed to fetch material requests:", err);
    }
  };

  // ฟังก์ชันเรียกเมื่อคลิกปุ่มแก้ไข
  const handleEditDetailClick = async (record) => {
    setSelectedUploadId(record.upload_id);

    try {
      await fetchMaterialRequests(record.upload_id);
      console.log("Successfully fetched material requests.");
      setEditModalVisible(true); // เปิด Modal
    } catch (err) {
      console.error("Failed to fetch material requests:", err);
    }
  };

  useEffect(() => {
    const storedUsername = sessionStorage.getItem("username");
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

  const handleConfirm = async () => {
    try {
      const token = sessionStorage.getItem("token");
      await axios.post(
        `${config.API_URL}/dashboard/confirm/${confirmUploadId}`,
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
      const token = sessionStorage.getItem("token");
      await axios.delete(
        `${config.API_URL}/dashboard/delete-uploads/${confirmUploadId}`,
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

  /*const handleDeleteClick = (uploadId) => {
    if (uploadId) {
      setConfirmUploadId(uploadId);
      setModalVisible(true);
    } else {
      console.error("Invalid uploadId:", uploadId);
    }
  };*/

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
        `${config.API_URL}/dashboard/save-inventory-id`,
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
                  color: "#000000",
                  backgroundColor: "#ffd591",
                  borderColor: "#ffd591",
                  marginRight: "40px",
                }}
                //icon={<FaTrashCan />}
                //onClick={() => handleDeleteClick(record.upload_id)}
                onClick={() => handleEditDetailClick(record)}
              >
                แก้ไข
              </Button>

              <Button
                style={{
                  display: "none",
                  color: "#f0f0f0",
                  backgroundColor: "green",
                  borderColor: "green",
                }}
                type="primary"
                //icon={<FaCheck />}
                onClick={() => {
                  setConfirmUploadId(record.upload_id);
                  setConfirmModalVisible(true);
                }}
              >
                ยืนยัน
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
                  color: "#000000",
                  backgroundColor: "#ffd591",
                  borderColor: "#ffd591",
                  marginRight: "40px",
                }}
                onClick={() => handleEditDetailClick(record)}
              >
                แก้ไข
              </Button>
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
                  backgroundColor: "red",
                  borderColor: "red",
                }}
                //icon={<HiMiniPencilSquare />}
                onClick={() => handleEditClick(record)}
              >
                ตรวจสอบ
              </Button>
            </Space>
          );
        } else {
          return null;
        }
      },
    },
  ];

  // ฟังก์ชันสำหรับการแก้ไขแต่ละแถว
  const handleEditChange = (request_id, field, value) => {
    setEditedRows((prev) => ({
      ...prev,
      [request_id]: {
        ...prev[request_id],
        [field]: value,
        isEditing: true,
        original_value: materialRequests.find(
          (row) => row.request_id === request_id
        )?.[field],
      },
    }));
  };

  // ฟังก์ชันเพื่อรวบรวมข้อมูลที่ถูกแก้ไข เพิ่ม หรือ ลบ
  const getSummaryActions = () => {
    const actions = [];

    Object.keys(editedRows).forEach((request_id) => {
      const editedData = editedRows[request_id];

      if (editedData && editedData.action === "delete") {
        actions.push({
          action_type: "delete",
          request_id: request_id,
          matunit: editedData.matunit,
          mat_name: editedData.mat_name,
          quantity: parseFloat(editedData.quantity),
        });
      } else if (!request_id || request_id === "undefined") {
        actions.push({
          action_type: "add",
          data: editedData,
        });
      } else if (editedData && editedData.isEditing) {
        actions.push({
          action_type: "update",
          request_id: request_id,
          matunit: editedData.matunit,
          mat_name: editedData.mat_name,
          original_quantity: editedData.original_quantity,
          quantity: parseFloat(editedData.quantity),
        });
      }
    });

    return actions;
  };

  // ฟังก์ชันเพื่อแสดง Modal ให้ผู้ใช้ตรวจสอบข้อมูล
  const handlePreviewChanges = () => {
    const actions = getSummaryActions();
    console.log("Summary Actions:", actions);
    setSummaryActions(actions);
    setPreviewModalVisible(true); // เปิด Modal แสดงรายการที่ถูกแก้ไข
  };

  // ฟังก์ชันสำหรับบันทึกข้อมูลการแก้ไขทั้งหมด
  const handleSaveAllChanges = async () => {
    setPreviewModalVisible(false);
    try {
      const token = sessionStorage.getItem("token");

      const payload = {
        upload_id: selectedUploadId,
        //actions: actions,
        actions: summaryActions,
      };
      console.log("Payload to be sent:", JSON.stringify(payload, null, 2));

      // เพิ่มการพิมพ์ข้อมูลที่ผู้ใช้แก้ไข
      console.log(
        "Temporary changes before saving:",
        JSON.stringify(summaryActions, null, 2)
      );

      // ส่งข้อมูลไปยัง backend
      await axios.put(
        `${config.API_URL}/dashboard/materialrequests/edit`,
        payload,
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

      message.success("บันทึกการแก้ไขสำเร็จ");
      // อาจจะมีการคำนวณ FIFO ที่นี่หรือส่งไปยัง backend เพื่อให้คำนวณ FIFO
    } catch (err) {
      message.error("บันทึกการแก้ไขล้มเหลว");
    }
  };

  // ฟังก์ชันสำหรับเพิ่มแถวใหม่ที่ด้านบนสุดของตาราง
  const handleAddRow = () => {
    const newRow = {
      request_id: undefined,
      matunit: "",
      mat_name: "",
      quantity: "",
      isEditing: true,
    };
    setMaterialRequests([newRow, ...materialRequests]); // เพิ่มแถวใหม่ที่ด้านบนสุด

    /*console.log("Material Requests after adding row:", [
      newRow,
      ...materialRequests,
    ]);*/

    setEditedRows((prev) => ({ ...prev, [newRow.request_id]: newRow }));
    setEditMode((prev) => ({ ...prev, [newRow.request_id]: true }));
  };

  // ฟังก์ชันสำหรับลบแถว โดยบันทึกสถานะการลบไว้ใน editedRows และ materialRequests
  const handleDeleteRow = (request_id) => {
    Modal.confirm({
      title: "ยืนยันการลบ",
      content: "คุณต้องการลบแถวนี้จริงๆ ใช่ไหม?",
      okText: "ยืนยัน",
      cancelText: "ยกเลิก",
      onOk: () => {
        const rowToDelete = materialRequests.find(
          (row) => row.request_id === request_id
        );
        if (rowToDelete) {
          // เพิ่มสถานะ isDeleted ใน materialRequests
          setMaterialRequests((prev) =>
            prev.map((row) =>
              row.request_id === request_id ? { ...row, isDeleted: true } : row
            )
          );

          // เพิ่มการลบแถวใน editedRows ด้วย action delete
          setEditedRows((prev) => ({
            ...prev,
            [request_id]: {
              ...prev[request_id],
              isDeleted: true,
              action: "delete",
              matunit: rowToDelete.matunit, // ระบุค่า matunit จาก rowToDelete
              mat_name: rowToDelete.mat_name, // ระบุค่า mat_name จาก rowToDelete
              quantity: rowToDelete.quantity,
            },
          }));
        }
      },
    });
  };

  // กรองแถวที่ถูกลบออกก่อนที่จะทำการแสดงผลในตาราง
  const visibleMaterialRequests = materialRequests.filter(
    (row) => !row.isDeleted
  );

  const toggleEditRow = (request_id) => {
    setEditMode((prev) => ({
      ...prev,
      [request_id]: !prev[request_id], // สลับสถานะ editMode ของแถวที่เลือก
    }));

    // ถ้าเป็นการเริ่มแก้ไข จะเก็บข้อมูลของแถวไว้ใน editedRows
    if (!editMode[request_id]) {
      const rowToEdit = materialRequests.find(
        (row) => row.request_id === request_id
      );
      setEditedRows((prev) => ({
        ...prev,
        [request_id]: {
          ...rowToEdit,
          original_quantity: rowToEdit.quantity, // เก็บจำนวนเดิม
          isEditing: true,
        },
      }));
    }
  };

  // ฟังก์ชันสำหรับยกเลิกการแก้ไขแถว
  const cancelEditRow = (request_id) => {
    // ปิดสถานะแก้ไขของแถวนั้นๆ
    setEditMode((prev) => ({
      ...prev,
      [request_id]: false,
    }));

    // ลบการแก้ไขที่เกิดขึ้นในแถวนี้ออกจาก editedRows
    setEditedRows((prev) => {
      const newEditedRows = { ...prev };
      delete newEditedRows[request_id];
      return newEditedRows;
    });
  };

  const saveRowChanges = (request_id) => {
    // เมื่อบันทึกข้อมูลเรียบร้อยแล้ว จะปิดสถานะแก้ไข
    setEditMode((prev) => ({
      ...prev,
      [request_id]: false,
    }));

    // เพิ่มข้อมูลใหม่เข้าสู่ materialRequests
    const updatedRow = editedRows[request_id];
    setMaterialRequests((prev) =>
      prev.map((row) => (row.request_id === request_id ? updatedRow : row))
    );
  };

  /*useEffect(() => {
    console.log("Edited Rows:", editedRows);
  }, [editedRows]);

  useEffect(() => {
    console.log("Updated Material Requests:", materialRequests);
  }, [materialRequests]);*/

  // Columns ของตารางใน Modal
  const materialRequestColumns = [
    {
      title: "",
      key: "action",
      align: "center",
      onHeaderCell: () => ({
        style: {
          backgroundColor: "#DCDCDC",
          fontWeight: "bold",
          fontSize: "16px",
          color: "#000000E0",
          borderTopLeftRadius: "10px", // มุมโค้งด้านซ้ายบน
          borderBottomLeftRadius: "10px", // มุมโค้งด้านซ้ายล่าง
        },
      }),
      render: (_, record) => (
        <Space
          style={{
            display: "flex",
            justifyContent: "center", // จัดให้อยู่ตรงกลางในคอนเทนเนอร์
            alignItems: "center",
            width: "100%", // ทำให้คอนเทนเนอร์กว้างเต็มที่
            textAlign: "center",
          }}
        >
          <Button
            style={{
              color: "#f0f0f0",
              backgroundColor: "red",
              borderColor: "red",
            }}
            type="link"
            icon={<FaTrashCan />}
            onClick={() => handleDeleteRow(record.request_id)}
          ></Button>
        </Space>
      ),
    },
    {
      title: "รหัส",
      dataIndex: "matunit",
      key: "matunit",
      align: "left",
      onHeaderCell: () => ({
        style: {
          backgroundColor: "#DCDCDC",
          fontWeight: "bold",
          fontSize: "16px",
          color: "#000000E0",
          //border: "1px solid #d9d9d9",
        },
      }),
      sorter: (a, b) => a.matunit.localeCompare(b.matunit), // เพิ่มการเรียงลำดับอัตโนมัติ
      defaultSortOrder: "ascend", // กำหนดเรียงจากน้อยไปมาก (ascend) เริ่มต้น
      render: (text, record) =>
        !record.request_id || editMode[record.request_id] ? (
          <Input
            value={editedRows[record.request_id]?.matunit || text}
            onChange={(e) =>
              handleEditChange(record.request_id, "matunit", e.target.value)
            }
            disabled={!!record.request_id} // ปิดการแก้ไขถ้าเป็นแถวที่มี request_id แล้ว
          />
        ) : (
          text
        ),
    },
    {
      title: "รายการ",
      dataIndex: "mat_name",
      key: "mat_name",
      align: "left",
      onHeaderCell: () => ({
        style: {
          backgroundColor: "#DCDCDC",
          fontWeight: "bold",
          fontSize: "16px",
          color: "#000000E0",
          //border: "1px solid #d9d9d9",
        },
      }),
      render: (text, record) =>
        !record.request_id || editMode[record.request_id] ? (
          <Input
            value={editedRows[record.request_id]?.mat_name || text}
            onChange={(e) =>
              handleEditChange(record.request_id, "mat_name", e.target.value)
            }
            disabled={!!record.request_id} // ปิดการแก้ไขถ้าเป็นแถวที่มี request_id แล้ว
          />
        ) : (
          text
        ),
    },
    {
      title: "จำนวน",
      dataIndex: "quantity",
      key: "quantity",
      align: "center",
      onHeaderCell: () => ({
        style: {
          backgroundColor: "#DCDCDC",
          fontWeight: "bold",
          fontSize: "16px",
          color: "#000000E0",
        },
      }),
      render: (text, record) =>
        editMode[record.request_id] ? (
          <Input
            value={editedRows[record.request_id]?.quantity || text}
            onChange={(e) =>
              handleEditChange(record.request_id, "quantity", e.target.value)
            }
          />
        ) : (
          text
        ),
    },
    {
      title: "",
      key: "action",
      align: "center",
      onHeaderCell: () => ({
        style: {
          backgroundColor: "#DCDCDC",
          fontWeight: "bold",
          fontSize: "16px",
          color: "#000000E0",
          borderTopRightRadius: "10px", // มุมโค้งด้านขวาบน
          borderBottomRightRadius: "10px", // มุมโค้งด้านขวาล่าง
        },
      }),
      render: (_, record) => (
        <Space
          style={{
            display: "flex",
            justifyContent: "center", // จัดให้อยู่ตรงกลางในคอนเทนเนอร์
            alignItems: "center",
            width: "100%", // ทำให้คอนเทนเนอร์กว้างเต็มที่
            textAlign: "center",
          }}
        >
          {editMode[record.request_id] ? (
            <>
              <Button
                type="primary"
                style={{
                  color: "#f0f0f0",
                  backgroundColor: "green",
                  borderColor: "green",
                  marginRight: "10px",
                }}
                onClick={() => saveRowChanges(record.request_id)}
              >
                บันทึก
              </Button>
              <Button
                style={{
                  color: "#f0f0f0",
                  backgroundColor: "#5755FE",
                  borderColor: "#5755FE",
                }}
                onClick={() => cancelEditRow(record.request_id)}
                //icon={<MdCancel />}
              >
                ปิด
              </Button>
            </>
          ) : (
            <Button
              style={{
                color: "#000000",
                backgroundColor: "#ffd591",
                borderColor: "#ffd591",
              }}
              onClick={() => toggleEditRow(record.request_id)}
            >
              แก้ไข
            </Button>
          )}
        </Space>
      ),
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

  const handleCancelModal = () => {
    Modal.confirm({
      title: "ยืนยันการละทิ้งการแก้ไข",
      content: "คุณต้องการละทิ้งการแก้ไขทั้งหมดใช่หรือไม่?",
      okText: "ยืนยัน",
      cancelText: "ยกเลิก",
      onOk: () => {
        setEditModalVisible(false); // ปิด Modal หากผู้ใช้งานยืนยัน
      },
      // กำหนดสไตล์ให้กับปุ่มยืนยัน
      okButtonProps: {
        style: {
          color: "#f0f0f0",
          backgroundColor: "#5755FE",
          borderColor: "#5755FE",
        },
      },
      // กำหนดสไตล์ให้กับปุ่มยกเลิก
      cancelButtonProps: {
        style: {
          color: "#5755FE",
          backgroundColor: "#f0f0f0",
          borderColor: "#5755FE",
        },
      },
    });
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

  // ฟังก์ชันสำหรับจัดรูปแบบตัวเลข
  const formatNumber = (number) => {
    return new Intl.NumberFormat().format(number);
  };

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

      <Card
        style={{
          borderRadius: "15px",
          height: "calc(80vh - 150px)", // กำหนดความสูงของ Card ให้เต็มหน้าจอ ลบด้วย header (หรือ margin)
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

      {/* Modal สำหรับการแก้ไข */}
      <Modal
        title={<span style={{ fontSize: "22px" }}>รายการสั่งเบิก</span>}
        open={editModalVisible}
        onCancel={handleCancelModal} // ปิด Modal เมื่อกดปุ่มปิด
        footer={null} // ไม่ต้องมีปุ่ม footer
        width={800}
      >
        <div>
          <Button
            type="primary"
            style={{
              color: "#f0f0f0",
              backgroundColor: "#5755FE",
              borderColor: "#5755FE",
              marginBottom: 16,
            }}
            onClick={handleAddRow}
          >
            เพิ่มรายการ
          </Button>
          {/* ตารางแสดงข้อมูล material requests */}
          <div style={{ maxHeight: "400px", overflowY: "auto" }}>
            {" "}
            {/* กำหนดความสูงและการเลื่อน */}
            <Table
              columns={materialRequestColumns}
              dataSource={visibleMaterialRequests}
              rowKey="request_id"
              pagination={false} // กำหนดจำนวนรายการต่อหน้า
              className="custom-table"
            />
          </div>
          {Object.keys(editedRows).length > 0 && (
            <div
              style={{
                display: "flex",
                justifyContent: "center",
                marginTop: 16,
              }}
            >
              <Button
                onClick={handlePreviewChanges}
                style={{
                  color: "#f0f0f0",
                  backgroundColor: "#5755FE",
                  borderColor: "#5755FE",
                  marginBottom: 16,
                }}
              >
                ตรวจสอบการแก้ไข
              </Button>
            </div>
          )}
        </div>
      </Modal>

      <Modal
        title={<span style={{ fontSize: "22px" }}>ตรวจสอบการแก้ไข</span>}
        open={previewModalVisible}
        onCancel={() => setPreviewModalVisible(false)}
        footer={null}
        style={{
          top: "50%",
          transform: "translateY(-50%)",
          maxWidth: "600px", // ความกว้างสูงสุด
          width: "80%", // ความกว้างตามต้องการ
        }}
      >
        <div>
          {/* รายการที่ถูกเพิ่ม */}
          {summaryActions.some((action) => action.action_type === "add") && (
            <>
              <h3 style={{ color: "green" }}>เพิ่มรายการ</h3>
              <List
                bordered
                dataSource={summaryActions.filter(
                  (action) => action.action_type === "add"
                )}
                renderItem={(action) => (
                  <List.Item>
                    <span className="sarabun-light">
                      {action.data.matunit} : {action.data.mat_name}{" "}
                      {action.data.quantity}
                    </span>
                  </List.Item>
                )}
              />
            </>
          )}

          {/* รายการที่ถูกลบ */}
          {summaryActions.some((action) => action.action_type === "delete") && (
            <>
              <h3 style={{ color: "red" }}>ลบรายการ</h3>
              <List
                bordered
                dataSource={summaryActions.filter(
                  (action) => action.action_type === "delete"
                )}
                renderItem={(action) => (
                  <List.Item>
                    <span className="sarabun-light">
                      {action.matunit} : {action.mat_name} {action.quantity}
                    </span>
                  </List.Item>
                )}
              />
            </>
          )}

          {/* รายการที่ถูกแก้ไข */}
          {summaryActions.some((action) => action.action_type === "update") && (
            <>
              <h3 style={{ color: "orange" }}>แก้ไขรายการ</h3>
              <List
                bordered
                dataSource={summaryActions.filter(
                  (action) => action.action_type === "update"
                )}
                renderItem={(action) => (
                  <List.Item>
                    <span className="sarabun-light">
                      {action.matunit} : {action.mat_name} จำนวนเดิม :{" "}
                      {action.original_quantity}, ปริมาณใหม่: {action.quantity}
                    </span>
                  </List.Item>
                )}
              />
            </>
          )}
        </div>
        <div
          style={{
            display: "flex",
            justifyContent: "center",
            marginTop: 16,
          }}
        >
          <Button
            type="primary"
            style={{
              color: "#f0f0f0",
              backgroundColor: "#5755FE",
              borderColor: "#5755FE",
              marginTop: 16,
              marginBottom: 16,
            }}
            onClick={() => setPinModalVisible(true)}
          >
            บันทึกการแก้ไข
          </Button>
        </div>
      </Modal>

      <Modal
        title={
          <span style={{ fontSize: "18px" }}>กรอก PIN เพื่อยืนยันการแก้ไข</span>
        }
        open={pinModalVisible}
        onCancel={() => setPinModalVisible(false)}
        footer={null}
        width={400}
        style={{
          top: "50%",
          transform: "translateY(-50%)",
        }}
      >
        <div>
          <Input.Password
            placeholder="กรอก PIN"
            value={pin}
            onChange={(e) => setPin(e.target.value)}
          />
          {pinError && <p style={{ color: "red" }}>{pinError}</p>}
          <Button
            type="primary"
            style={{
              marginTop: 16,
              color: "#f0f0f0",
              backgroundColor: "green",
              borderColor: "green",
            }}
            onClick={handlePinSubmit} // ตรวจสอบ PIN
          >
            ยืนยัน
          </Button>
        </div>
      </Modal>

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
    </MainLayout>
  );
};

export default Dashboard;
