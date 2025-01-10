// src/pages1/staff/PendingTaskDetails.jsx
import React, { useState, useEffect } from "react";
import { useParams, Link, useNavigate } from "react-router-dom";
import {
  Table,
  Button,
  message,
  Checkbox,
  Modal,
  InputNumber,
  Card,
  Breadcrumb,
  Radio,
  Input,
} from "antd";
import axios from "axios";
import MainLayout from "../../components/LayoutStaff";
import "../../styles1/TaskDetails.css";
import config from "../../configAPI";
import Swal from "sweetalert2";

const PendingTaskDetails = () => {
  const { upload_id } = useParams();
  const [username, setUsername] = useState("");
  const [data, setData] = useState({ balances: [], status: "" });
  const [isModalVisible, setIsModalVisible] = useState(false);
  const [checkDetails, setCheckDetails] = useState([]);
  const [filteredData, setFilteredData] = useState([]);
  const [isTaskCompleted, setIsTaskCompleted] = useState(false);
  const [totalRequestedQuantity, setTotalRequestedQuantity] = useState(0);
  const [formattedData, setFormattedData] = useState([]);
  const [countedQuantities, setCountedQuantities] = useState({});
  const [selectedRows, setSelectedRows] = useState([]);
  const [temporaryData, setTemporaryData] = useState({});
  const [isDataChanged, setIsDataChanged] = useState(false);
  const [isReasonModalVisible, setIsReasonModalVisible] = useState(false);
  const [selectedReason, setSelectedReason] = useState("");
  const [otherReason, setOtherReason] = useState("");
  const [currentRecordId, setCurrentRecordId] = useState(null);
  const [buttonType, setButtonType] = useState("savePartial");
  const [isCompleteButtonClicked, setIsCompleteButtonClicked] = useState(false);

  const navigate = useNavigate();

  const fetchPendingDetails = async () => {
    try {
      const token = sessionStorage.getItem("token");
      const response = await axios.get(
        `${config.API_URL}/tasks/pending-detail/${upload_id}`,
        {
          headers: { Authorization: `Bearer ${token}` },
        }
      );
      console.log(response.data);
      setData(Array.isArray(response.data) ? response.data : []);
    } catch (err) {
      console.error("Failed to fetch task details:", err);
      message.error("ไม่สามารถดึงข้อมูลรายละเอียดงาน");
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
      //console.log(response.data);
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

      await fetchPendingDetails();

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
    fetchPendingDetails();
    fetchCheckDetails();
    fetchTotalRequestedQuantity();
    fetchUploadStatus();
  }, [upload_id]);

  const handleSaveCountedQuantities = async () => {
    try {
      const token = sessionStorage.getItem("token");
      console.log("Temporary Data ปกติ:", temporaryData);

      const payload = Object.entries(temporaryData).map(([id, details]) => ({
        id: parseInt(id, 10),
        counted_quantity: details.counted_quantity,
        actual_quantity: details.actual_quantity,
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
      navigate("/MyTasks");
    } catch (err) {
      console.error("Failed to save counted quantities:", err);
      message.error("Failed to save counted quantities");
    }
  };

  const handleSavePartial = async () => {
    try {
      const token = sessionStorage.getItem("token");
      console.log("Temporary Data สำหรับบันทึกชั่วคราว:", temporaryData);

      const payload = Object.entries(temporaryData).map(([id, details]) => ({
        id: parseInt(id, 10),
        counted_quantity: details.counted_quantity,
        actual_quantity: details.actual_quantity,
        selected_time: details.timestamp,
      }));

      console.log("Payload to send:", payload);

      const response = await axios.post(
        `${config.API_URL}/tasks/save-partial/${upload_id}`,
        payload,
        {
          headers: { Authorization: `Bearer ${token}` },
        }
      );

      console.log("Successfully saved partial quantities:", response.data);
      message.success("บันทึกจำนวนบางส่วนเรียบร้อย");

      await handleUpdateStatus(upload_id);
      navigate("/MyTasks");
    } catch (err) {
      console.error("Failed to save partial quantities:", err);
      message.error("Failed to save partial quantities");
    }
  };

  const handleUpdateStatus = async () => {
    try {
      const token = sessionStorage.getItem("token");

      const response = await axios.post(
        `${config.API_URL}/tasks/update-status/${upload_id}`,
        {
          status: "รอดำเนินการต่อ",
        },
        {
          headers: { Authorization: `Bearer ${token}` },
        }
      );

      console.log("Successfully updated status:", response.data);
      message.success("สถานะถูกบันทึกชั่วคราวเรียบร้อยแล้ว");
    } catch (err) {
      console.error("Failed to update status:", err);
      message.error("ไม่สามารถบันทึกสถานะชั่วคราวได้");
    }
  };

  const handleSavePartialCountedQuantities = async () => {
    try {
      const token = sessionStorage.getItem("token");
      console.log("Temporary Data รายงานปัญหา:", temporaryData);

      const payload = Object.entries(temporaryData).map(([id, details]) => ({
        id: parseInt(id, 10),
        counted_quantity: details.counted_quantity,
        actual_quantity: details.actual_quantity,
        quantity: temporaryData[id]?.quantity,
        selected_time: details.timestamp,
        employee_reason: details.employee_reason || "",
      }));

      console.log("Payload to send (คลาดเคลื่อน):", payload);

      const response = await axios.post(
        `${config.API_URL}/tasks/save-partial-counted-quantities/${upload_id}`,
        payload,
        {
          headers: { Authorization: `Bearer ${token}` },
        }
      );

      console.log("Successfully Save:", response.data);
      message.success("บันทึกการเบิกจ่ายชั่วคราวเรียบร้อย");
      await handleUpdateStatus(upload_id);

      // ตรวจสอบข้อมูลที่ต้องแจ้งเตือน
      const mismatchItems = payload.filter(
        (item) => item.actual_quantity !== item.quantity // เปลี่ยนเงื่อนไขที่นี่
      );

      if (mismatchItems.length > 0) {
        handleNotifyManager(upload_id); // เรียกฟังก์ชันการแจ้งเตือนแยกต่างหาก
      }
    } catch (err) {
      console.error("ไม่สามารถบันทึกการเบิกจ่ายชั่วคราวได้:", err);
      message.error("ไม่สามารถบันทึกการเบิกจ่ายชั่วคราวได้");
    }
  };

  // ฟังก์ชันการแจ้งเตือน
  const handleNotifyManager = (upload_id) => {
    if (!upload_id) {
      // ตรวจสอบว่า upload_id มีค่าหรือไม่
      message.error("ไม่พบข้อมูล upload_id");
      return;
    }
    Swal.fire({
      title: "แจ้งเตือนหัวหน้าตรวจสอบ",
      text: "มีวัตถุดิบบางรายการไม่เพียงพอ",
      icon: "warning",
      confirmButtonText: "ตกลง",
      customClass: {
        title: "sarabun-bold", // เพิ่มคลาสสำหรับ title
        htmlContainer: "sarabun-light", // เพิ่มคลาสสำหรับข้อความ text
      },
    }).then(() => {
      // เมื่อกด "ตกลง" ใน SweetAlert2 ให้ทำการ navigate ไปที่หน้า /Approval
      navigate("/MyTasks");
    });
  };

  const handleActualQuantityChange = (value, id) => {
    if (!isTaskCompleted) {
      setTemporaryData((prevData) => {
        const newData = { ...prevData }; // สร้างสำเนาของข้อมูลที่มีอยู่
        if (value === null || value === undefined) {
          delete newData[id]; // ลบข้อมูลถ้า value เป็น null หรือ undefined
        } else {
          if (!newData[id]) {
            newData[id] = {}; // สร้าง object ใหม่ถ้า id ไม่มีอยู่
          }
          newData[id].actual_quantity = value;
        }
        console.log("Updated Actual Data:", newData);
        return newData;
      });

      setIsDataChanged(true);
    }
  };

  const handleQuantityChange = (value, id) => {
    if (!isTaskCompleted) {
      setCountedQuantities((prevQuantities) => ({
        ...prevQuantities,
        [id]: value,
      }));
      console.log("Updated Counted Quantities:", countedQuantities);
      setIsDataChanged(true);
    }
  };

  // อัปเดตเหตุผลใน temporaryData
  const handleReasonChange = (value, id) => {
    setTemporaryData((prevData) => {
      const newData = { ...prevData };
      if (newData[id]) {
        newData[id].employee_reason = value; // เพิ่มเหตุผล
      } else {
        newData[id] = { employee_reason: value }; // ถ้าไม่มีข้อมูลให้สร้างใหม่
      }
      return newData;
    });
    setIsDataChanged(true);
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

      // ตรวจสอบ is_temporary และเลือกใช้ค่า
      const countedQuantity = item.is_temporary
        ? temporaryData[id]?.counted_quantity !== undefined
          ? temporaryData[id]?.counted_quantity
          : item.counted_quantity // ถ้าเป็น true ใช้ counted_quantity
        : temporaryData[id]?.counted_quantity !== undefined
        ? temporaryData[id]?.counted_quantity
        : item.remaining_quantity; // ถ้าเป็น false ใช้ remaining_quantity

      const actualQuantity = item.is_temporary
        ? temporaryData[id]?.actual_quantity !== undefined
          ? temporaryData[id]?.actual_quantity
          : item.actual_quantity // ถ้าเป็น true ใช้ actual_quantity
        : temporaryData[id]?.actual_quantity !== undefined
        ? temporaryData[id]?.actual_quantity
        : item.quantity; // ถ้าเป็น false ใช้ quantity

      const usedQuantity =
        temporaryData[id]?.quantity !== undefined
          ? temporaryData[id].quantity
          : item.quantity;

      const employeeReason = temporaryData[id]?.employee_reason || "";

      setTemporaryData((prevData) => {
        const newData = { ...prevData };
        if (checked) {
          // เก็บข้อมูล id, counted_quantity, และ timestamp
          newData[id] = {
            counted_quantity: countedQuantity,
            actual_quantity: actualQuantity,
            quantity: usedQuantity,
            timestamp: currentTime,
            employee_reason: employeeReason,
          };
        } else {
          // ลบข้อมูลถ้า unchecked
          delete newData[id];
          newData[id] = {
            ...item, // คืนค่า `actual_quantity` และค่าอื่น ๆ เป็นค่าเดิม
            counted_quantity: item.remaining_quantity,
            actual_quantity: item.quantity,
          };
        }

        console.log("Temporary Data :", newData);

        // ตรวจสอบเงื่อนไข actual_quantity และ quantity
        if (
          checked &&
          newData[id]?.actual_quantity !== newData[id]?.quantity
        ) {
          setIsReasonModalVisible(true); // แสดงปุ่ม Reason
          setCurrentRecordId(id); // เก็บ ID ปัจจุบัน
        } else {
          setIsReasonModalVisible(false); // ซ่อนปุ่ม Reason หากเงื่อนไขไม่ถูกต้อง
          setCurrentRecordId(null);
        }

        return newData;
      });

      setSelectedRows((prevSelectedRows) => {
        const updatedRows = checked
          ? [...prevSelectedRows, id]
          : prevSelectedRows.filter((rowId) => rowId !== id);
        console.log("Selected Rows:", updatedRows);
        return updatedRows;
      });
      setIsDataChanged(true);
    }
  };

  const handleReasonButtonClick = (id) => {
    setCurrentRecordId(id); // เก็บ ID ของรายการที่เลือก
    setIsReasonModalVisible(true); // เปิด Modal
  };

  const handleReasonOk = () => {
    if (selectedReason === "อื่นๆ" && otherReason.trim() === "") {
      message.error("กรุณากรอกเหตุผลในช่องอื่นๆ");
      return;
    }
    const finalReason =
      selectedReason === "อื่นๆ" ? otherReason.trim() : selectedReason;

    if (currentRecordId) {
      handleReasonChange(finalReason, currentRecordId);
    }
    setIsReasonModalVisible(false);
    setSelectedReason("");
    setOtherReason("");
  };

  const handleReasonCancel = () => {
    setIsReasonModalVisible(false);
    setSelectedReason("");
    setOtherReason("");
  };

  const handleModalOk = () => {
    setIsModalVisible(false);
  };

  const handleModalCancel = () => {
    setIsModalVisible(false);
  };

  // ฟังก์ชันสำหรับการนำทางกลับ
  const handleBack = () => {
    if (isDataChanged) {
      Modal.confirm({
        title: "ยืนยันการย้อนกลับ",
        content: "คุณต้องการละทิ้งการบันทึกการเบิกจ่ายใช่ไหม?",
        okText: "ยืนยัน",
        cancelText: "ยกเลิก",
        okButtonProps: {
          style: {
            color: "#f0f0f0",
            backgroundColor: "#5755FE",
            borderColor: "#5755FE",
          },
        },
        cancelButtonProps: {
          style: {
            color: "#5755FE",
            backgroundColor: "#f0f0f0",
            borderColor: "#5755FE",
          },
        },
        onOk: () => {
          navigate("/MyTasks"); // นำทางกลับไปยัง MyTasks
        },
      });
    } else {
      navigate("/MyTasks"); // ถ้าไม่มีการเปลี่ยนแปลงข้อมูล นำทางกลับทันที
    }
  };

  useEffect(() => {
    // แปลงข้อมูลเพื่อแสดงคำถามแต่ละข้อเป็นแถว
    const formattedData = Array.isArray(data)
      ? data.flatMap((m) =>
          m.details
            .map((d, index) => {
              return {
                ...d,
                mat_unit: m.mat_unit,
                mat_name: m.mat_name,
                material_index: index + 1,
                rowSpanMatunit: index === 0 ? m.details.length : 0,
                rowSpanMatName: index === 0 ? m.details.length : 0,
                rowSpanQuantity: index === 0 ? m.details.length : 0,
                rowSpanMaterialId: index === 0 ? m.details.length : 0,
                is_temporary: d.is_temporary,
              };
            })
        )
      : [];
    setFormattedData(formattedData);
  }, [data, temporaryData]);

  //console.log(JSON.stringify(formattedData, null, 2)); // แปลงเป็นสตริงและจัดรูปแบบให้อ่านง่าย

  const handleCompleteTask = async () => {
    try {
      const token = sessionStorage.getItem("token");

      const payload = Object.entries(temporaryData).map(([id, details]) => ({
        id: parseInt(id, 10),
        counted_quantity: details.counted_quantity,
        actual_quantity: details.actual_quantity,
        selected_time: details.timestamp,
        employee_reason: details.employee_reason || "",
      }));

      console.log("Payload being sent:", payload);

      // ส่ง temporaryData ไปอัปเดตตาราง material_temporary
      const updateResponse = await axios.post(
        `${config.API_URL}/tasks/update-material-temporary/${upload_id}`,
        { payload }, // ส่ง payload ในรูปแบบของ object
        { headers: { Authorization: `Bearer ${token}` } }
      );
      console.log("Update temporary data response:", updateResponse.data);

      // บันทึกข้อมูลทั้งหมดจาก material_temporary ไปยัง material_usage
      const saveResponse = await axios.post(
        `${config.API_URL}/tasks/save-material-usage/${upload_id}`,
        {},
        { headers: { Authorization: `Bearer ${token}` } }
      );
      console.log("Save material usage response:", saveResponse.data);

      message.success("ปิดงานเรียบร้อย");
      await completeTask();
      navigate("/MyTasks");

      setIsTaskCompleted(true);
      setIsCompleteButtonClicked(true);
    } catch (error) {
      console.error("Error completing task:", error);
      message.error("ไม่สามารถปิดงานได้");
    }
  };

  // คำนวณจำนวน id ทั้งหมด และ id ที่ is_temporary === true
  const isCompleteButtonEnabled = () => {
    const totalIds = formattedData.length;
    const temporaryTrueCount = formattedData.filter(
      (item) => temporaryData[item.id]?.is_temporary === true
    ).length;

    console.log("Total IDs in formattedData:", totalIds);
    console.log("IDs with is_temporary === true:", temporaryTrueCount);

    // ปุ่มจะเปิดใช้งานได้เมื่อจำนวน id ที่ is_temporary === true เท่ากับจำนวนทั้งหมด
    return totalIds > 0 && totalIds === temporaryTrueCount;
  };

  const checkButtonType = () => {
    if (!formattedData || formattedData.length === 0) return; // ตรวจสอบว่า formattedData มีค่าหรือไม่

    const allChecked = selectedRows.length === formattedData.length;

    const mismatchItems = formattedData.some(
      (item) =>
        temporaryData[item.id]?.actual_quantity !==
        temporaryData[item.id]?.quantity
    );

    if (allChecked && !mismatchItems) {
      setButtonType("complete");
    } else if (mismatchItems) {
      setButtonType("reportIssue");
    } else {
      setButtonType("savePartial");
    }
  };

  useEffect(() => {
    if (formattedData.length > 0) {
      checkButtonType();
    }
  }, [formattedData, selectedRows, temporaryData]);

  const handleButtonClick = () => {
    if (buttonType === "savePartial") {
      handleSavePartial(); // เรียกฟังก์ชันบันทึกชั่วคราว
    } else if (buttonType === "reportIssue") {
      handleSavePartialCountedQuantities(); // เรียกฟังก์ชันรายงานปัญหา
    } else if (buttonType === "complete") {
      handleSaveCountedQuantities(); // เรียกฟังก์ชันเสร็จสิ้น
    }
  };

  // ฟังก์ชันสำหรับจัดรูปแบบตัวเลข
  const formatNumber = (number) => {
    return new Intl.NumberFormat().format(number);
  };

  const getRowClassName = (record) => {
    if (
      record.is_temporary &&
      record.actual_quantity !== record.quantity
    ) {
      return "highlight-row"; // เพิ่มคลาสไฮไลท์แถว
    }
    return "";
  };

  const columns = [
    {
      title: "รายการ",
      dataIndex: "mat_name",
      key: "mat_name",
      render: (text, record, index) => ({
        children: (
          <span>
            {text}
          </span>
        ),
        props: { rowSpan: record.rowSpanMatName },
      }),
      align: "left",
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
      title: "ล็อต",
      dataIndex: "mat_lot",
      key: "mat_lot",
      align: "left",
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
      title: "ตำแหน่ง",
      dataIndex: "loc",
      key: "loc",
      align: "left",
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
      title: "จำนวนที่ต้องหยิบ",
      dataIndex: "quantity",
      key: "quantity",
      onHeaderCell: () => ({
        style: {
          backgroundColor: "#00152a", // สีพื้นหลังของหัวคอลัมน์
          fontWeight: "bold", // ความหนาของตัวอักษร
          fontSize: "14px", // ขนาดตัวอักษร
          color: "#ffffff", // สีตัวอักษร
        },
      }),
      render: (text) => formatNumber(text),
      align: "center",
    },
    {
      title: "จ่ายจริง",
      dataIndex: "actual_quantity",
      key: "actual_quantity",
      onHeaderCell: () => ({
        style: {
          backgroundColor: "#00152a", // สีพื้นหลังของหัวคอลัมน์
          fontWeight: "bold", // ความหนาของตัวอักษร
          fontSize: "14px", // ขนาดตัวอักษร
          color: "#ffffff", // สีตัวอักษร
        },
      }),
      render: (_, record) =>
        isTaskCompleted ? (
          <span
            style={{
              fontWeight: "bold",
              color: "#9400D3",
            }}
          >
            {formatNumber(record.actual_quantity)}
          </span>
        ) : (
          <InputNumber
            defaultValue={
              record.is_temporary
                ? temporaryData[record.id]?.actual_quantity ||
                  record.actual_quantity
                : record.quantity
            }
            formatter={(value) =>
              `${value}`.replace(/\B(?=(\d{3})+(?!\d))/g, ",")
            }
            parser={(value) => value.replace(/,/g, "")}
            onChange={(value) => handleActualQuantityChange(value, record.id)}
            disabled={isTaskCompleted}
            style={{
              backgroundColor: record.is_temporary
                ? "#DFF2BF" // สีเขียวสำหรับ is_temporary
                : selectedRows.includes(record.id)
                ? "#DFF2BF"
                : "#E6E6FA",
              fontWeight: "bold",
              color: selectedRows.includes(record.id) ? "#4F8A10" : "#9400D3",
              borderColor: record.is_temporary // ขอบสีเขียวสำหรับ is_temporary
                ? "#4F8A10"
                : selectedRows.includes(record.id)
                ? "#4F8A10"
                : "#9400D3",
              textAlign: "center",
            }}
          />
        ),
      align: "center",
    },
    {
      title: "จำนวนคงเหลือ",
      dataIndex: "remaining_quantity",
      key: "remaining_quantity",
      onHeaderCell: () => ({
        style: {
          backgroundColor: "#00152a", // สีพื้นหลังของหัวคอลัมน์
          fontWeight: "bold", // ความหนาของตัวอักษร
          fontSize: "14px", // ขนาดตัวอักษร
          color: "#ffffff", // สีตัวอักษร
        },
      }),
      render: (text) => formatNumber(text),
      align: "center",
    },
    {
      title: "นับจริง",
      dataIndex: "counted_quantity",
      onHeaderCell: () => ({
        style: {
          backgroundColor: "#00152a", // สีพื้นหลังของหัวคอลัมน์
          fontWeight: "bold", // ความหนาของตัวอักษร
          fontSize: "14px", // ขนาดตัวอักษร
          color: "#ffffff", // สีตัวอักษร
        },
      }),
      render: (_, record) =>
        isTaskCompleted ? (
          <span
            style={{
              fontWeight: "bold",
              color: "#9400D3",
            }}
          >
            {formatNumber(record.counted_quantity)}
          </span>
        ) : (
          <InputNumber
            defaultValue={
              record.is_temporary
                ? temporaryData[record.id]?.counted_quantity ||
                  record.counted_quantity
                : record.remaining_quantity
            }
            formatter={(value) =>
              `${value}`.replace(/\B(?=(\d{3})+(?!\d))/g, ",")
            }
            parser={(value) => value.replace(/,/g, "")}
            onChange={(value) => handleQuantityChange(value, record.id)}
            disabled={isTaskCompleted}
            style={{
              backgroundColor: record.is_temporary
                ? "#DFF2BF" // สีเขียวสำหรับ is_temporary
                : selectedRows.includes(record.id)
                ? "#DFF2BF"
                : "#E6E6FA",
              fontWeight: "bold",
              color: selectedRows.includes(record.id) ? "#4F8A10" : "#9400D3",
              borderColor: record.is_temporary // ขอบสีเขียวสำหรับ is_temporary
                ? "#4F8A10"
                : selectedRows.includes(record.id)
                ? "#4F8A10"
                : "#9400D3",
              textAlign: "center",
            }}
          />
        ),
      align: "center",
    },
    {
      title: "คงเหลือรวม",
      dataIndex: "total_quantity",
      key: "total_quantity",
      onHeaderCell: () => ({
        style: {
          backgroundColor: "#00152a", // สีพื้นหลังของหัวคอลัมน์
          fontWeight: "bold", // ความหนาของตัวอักษร
          fontSize: "14px", // ขนาดตัวอักษร
          color: "#ffffff", // สีตัวอักษร
        },
      }),
      render: (text) => (text === 0 ? "" : formatNumber(text)),
      align: "center",
    },
    {
      title: "เรียบร้อย",
      key: "selection",
      align: "center", // การจัดกึ่งกลาง
      onHeaderCell: () => ({
        style: {
          backgroundColor: "#00152a", // สีพื้นหลังของหัวคอลัมน์
          fontWeight: "bold", // ความหนาของตัวอักษร
          fontSize: "14px", // ขนาดตัวอักษร
          color: "#ffffff", // สีตัวอักษร
        },
      }),
      render: (_, record) => {
        return (
          <div
            style={{
              display: "flex",
              justifyContent: "center",
              alignItems: "center",
              height: "100%",
            }}
          >
            <Checkbox
              checked={selectedRows.includes(record.id)}
              onChange={(e) =>
                handleCheckboxChange(record.id, e.target.checked)
              }
              disabled={isTaskCompleted}
              style={{
                width: "30px", // ขนาดของ Checkbox
                height: "30px", // ขนาดของ Checkbox
                transform: "scale(1.5)", // เพิ่มขนาดให้ใหญ่ขึ้น
                margin: "0 10px", // ระยะห่างจากข้อความ
              }}
            />
            {/* แสดงข้อความเพิ่มเติมถ้าต้องการ */}
            <span style={{ fontSize: "15px" }}>{record.name}</span>
          </div>
        );
      },
    },
    {
      title: "เหตุผล",
      dataIndex: "employee_reason",
      key: "employee_reason",
      align: "center",
      render: (_, record) => {
        // ตรวจสอบว่าเหตุผลถูกตั้งค่าหรือไม่
        const reason =
          temporaryData[record.id]?.employee_reason ||
          record.employee_reason ||
          "-";
        if (record.is_temporary) {
          return reason;
        } else {
          if (isReasonModalVisible && currentRecordId === record.id) {
            return (
              <Button
                type="primary"
                onClick={() => handleReasonButtonClick(record.id)}
              >
                เลือกเหตุผล
              </Button>
            );
          }
          return reason;
        }
      },
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
      title: "แก้ไข",
      dataIndex: "manager_reason",
      key: "manager_reason",
      align: "center",
      render: (text, record) => {
        return text || "-"; // แสดงค่า text ถ้ามีค่า, ถ้าไม่มีให้แสดง "-"
      },
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
    },
  ];

  return (
    <MainLayout>
      <div
        style={{
          backgroundColor: " #DCDCDC",
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
              padding: "20px",
            }}
          >
            รายละเอียดการเบิกวัตถุดิบ Pending
          </div>
        </div>
      </div>

      <div>
        <Breadcrumb className="sarabun-light" style={{ margin: "16px 0" }}>
          <Breadcrumb.Item>
            <Link to="/OperationsDashboard">รายการเบิก-จ่ายทั้งหมด</Link>
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
            rowClassName={getRowClassName}
            scroll={{ x: "max-content" }} // ทำให้ตารางเลื่อนไปข้างๆ ได้หากข้อมูลกว้าง
            className="custom-table"
          />
          <div
            className="total-quantity sarabun-bold"
            style={{
              backgroundColor: " #DCDCDC",
              marginBottom: "20px",
              borderRadius: "8px",
            }}
          >
            <p
              style={{ fontSize: "18px", marginLeft: "20px", padding: "10px" }}
            >
              <strong>รวมจำนวนที่สั่งเบิก:</strong>{" "}
              {formatNumber(totalRequestedQuantity)}
            </p>
            <Modal
              title="เลือกเหตุผล"
              visible={isReasonModalVisible}
              onOk={handleReasonOk}
              onCancel={handleReasonCancel}
            >
              <div>
                <Radio.Group
                  onChange={(e) => setSelectedReason(e.target.value)}
                  value={selectedReason}
                  style={{ display: "flex", flexDirection: "column" }}
                >
                  <Radio value="วัตถุดิบหมด">วัตถุดิบหมด</Radio>
                  <Radio value="จ่ายผิดพลาด">จ่ายผิดพลาด</Radio>
                  <Radio value="อื่นๆ">อื่นๆ</Radio>
                </Radio.Group>
                {selectedReason === "อื่นๆ" && (
                  <Input
                    style={{ marginTop: 10 }}
                    placeholder="กรุณากรอกเหตุผล"
                    value={otherReason}
                    onChange={(e) => setOtherReason(e.target.value)}
                  />
                )}
              </div>
            </Modal>
          </div>

          <div
            style={{
              display: "flex",
              justifyContent: "space-between", // ทำให้ปุ่มอยู่ห่างกันและจัดตำแหน่งปุ่มแรกไปทางซ้ายและปุ่มที่สองไปทางขวา
              marginTop: "60px",
            }}
          >
            <Button
              className="back-button"
              onClick={handleBack}
              type="default"
              style={{
                color: "#5755FE ",
                backgroundColor: "#f0f0f0",
                borderColor: "#5755FE",
              }}
            >
              ย้อนกลับ
            </Button>

            <Button
              onClick={handleButtonClick}
              style={{
                backgroundColor:
                  buttonType === "savePartial"
                    ? "#5755FE" // สีสำหรับบันทึกชั่วคราว
                    : buttonType === "reportIssue"
                    ? "#FFD700" // สีสำหรับรายงานปัญหา
                    : buttonType === "complete"
                    ? "green" // สีสำหรับเสร็จสิ้น
                    : "default", // กำหนดสีเริ่มต้นหากไม่มีประเภทปุ่ม
                borderColor:
                  buttonType === "savePartial"
                    ? "#5755FE" // สีสำหรับบันทึกชั่วคราว
                    : buttonType === "reportIssue"
                    ? "#FFD700" // สีสำหรับรายงานปัญหา
                    : buttonType === "complete"
                    ? "green" // สีสำหรับเสร็จสิ้น
                    : "default", // กำหนดสีเริ่มต้นหากไม่มีประเภทปุ่ม
                color:
                  buttonType === "reportIssue"
                    ? "black" // ข้อความสีดำสำหรับรายงานปัญหา
                    : "white", // ข้อความสีขาวสำหรับปุ่มอื่น ๆ
              }}
              disabled={isCompleteButtonClicked || isCompleteButtonEnabled()}
            >
              {buttonType === "savePartial" && "บันทึกชั่วคราว"}
              {buttonType === "reportIssue" && "รายงานปัญหา"}
              {buttonType === "complete" && "เสร็จสิ้น"}
            </Button>

            <Button
              type="primary"
              style={{
                backgroundColor: "green", // ปรับให้ปุ่ม "ปิดงาน" เป็นสีเขียว
                borderColor: "green", // ขอบของปุ่มเป็นสีเขียว
              }}
              disabled={!isCompleteButtonEnabled}
              onClick={handleCompleteTask}
            >
              ปิดงาน
            </Button>
          </div>
        </div>
      </Card>

    </MainLayout>
  );
};

export default PendingTaskDetails;
