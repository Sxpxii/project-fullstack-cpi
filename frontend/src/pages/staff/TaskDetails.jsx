// src/pages1/staff/TaskDetails.jsx
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
  Radio,
  Input,
} from "antd";
import axios from "axios";
import MainLayout from "../../components/LayoutStaff";
import "../../styles/TaskDetails.css";
import config from "../../configAPI";
import Swal from "sweetalert2";
import {
  PushpinFilled,
  CloseOutlined,
  PlusCircleFilled,
} from "@ant-design/icons";

const TaskDetails = () => {
  const { upload_id } = useParams();
  const [username, setUsername] = useState("");
  const [data, setData] = useState({ balances: [], status: "" });
  const [isTaskCompleted, setIsTaskCompleted] = useState(false);
  const [totalRequestedQuantity, setTotalRequestedQuantity] = useState(0);
  const [formattedData, setFormattedData] = useState([]);
  const [countedQuantities, setCountedQuantities] = useState({});
  const [actualQuantities, setactualQuantities] = useState({});
  const [selectedRows, setSelectedRows] = useState([]);
  const [temporaryData, setTemporaryData] = useState({});
  const [isDataChanged, setIsDataChanged] = useState(false);
  const [isReasonModalVisible, setIsReasonModalVisible] = useState(false);
  const [selectedReason, setSelectedReason] = useState("");
  const [otherReason, setOtherReason] = useState("");
  const [currentRecordId, setCurrentRecordId] = useState(null);
  const [buttonType, setButtonType] = useState("savePartial");
  const [inventoryId, setInventoryId] = useState(null);
  const [RemainingReasonModal, setRemainingReasonModal] = useState(false);
  const [selectedRemainingReason, setSelectedRemainingReason] = useState(null);
  const [otherRemainingReason, setOtherRemainingReason] = useState("");

  const navigate = useNavigate();
  console.log("useParams:", useParams());

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
      setInventoryId(response.data[0].inventory_id || null);
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
    fetchTotalRequestedQuantity();
    fetchUploadStatus();
  }, [upload_id]);

  const handleSaveCountedQuantities = async () => {
    try {
      // ยืนยันการบันทึกข้อมูลก่อน
      const result = await Swal.fire({
        title: "ยืนยันการบันทึกข้อมูล",
        html: '<span class="sarabun-light">คุณต้องการบันทึกข้อมูลการเบิกจ่ายใช่ไหม?</span>',
        icon: "warning",
        showCancelButton: true,
        confirmButtonText: "ใช่, บันทึก",
        cancelButtonText: "ยกเลิก",
        confirmButtonColor: "green",
        customClass: {
          title: "sarabun-bold",
          confirmButton: "sarabun-light",
          cancelButton: "sarabun-light",
        },
      });

      // ถ้าผู้ใช้เลือก "ใช่, บันทึก"
      if (result.isConfirmed) {
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

        // แสดง Swal แจ้งว่าบันทึกสำเร็จ
        Swal.fire({
          icon: "success",
          title: "บันทึกข้อมูลสำเร็จ",
          html: '<span class="sarabun-light">ข้อมูลการเบิกจ่ายได้ถูกบันทึกเรียบร้อยแล้ว</span>',
          customClass: {
            title: "sarabun-bold",
          },
        });

        await completeTask();
        navigate("/MyTasks");
      } else {
        // ถ้าผู้ใช้เลือก "ยกเลิก"
        console.log("User canceled the save operation");
      }
    } catch (err) {
      console.error("Failed to save counted quantities:", err);
      Swal.fire({
        icon: "error",
        title: "เกิดข้อผิดพลาด",
        html: '<span class="sarabun-light">ไม่สามารถบันทึกข้อมูลได้, กรุณาลองใหม่อีกครั้ง</span>',
        confirmButtonText: "ตกลง",
      });
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
        employee_reason: details.employee_reason || "",
        employee_reason_remaining: details.employee_reason_remaining || "",
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
        used_quantity: temporaryData[id]?.quantity,
        selected_time: details.timestamp,
        employee_reason: details.employee_reason || "",
        employee_reason_remaining: details.employee_reason_remaining || "",
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
      setactualQuantities((prevQuantities) => ({
        ...prevQuantities,
        [id]: value || prevQuantities[id],
      }));
      console.log("Updated Counted Quantities:", actualQuantities);
      setIsDataChanged(true);
    }
  };

  const handleQuantityChange = (value, id) => {
    if (!isTaskCompleted) {
      setCountedQuantities((prevQuantities) => ({
        ...prevQuantities,
        [id]: value || prevQuantities[id],
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

  // อัปเดตเหตุผลใน temporaryData
  const handleReasonRemainingChange = (value, id) => {
    setTemporaryData((prevData) => {
      const newData = { ...prevData };
      if (newData[id]) {
        newData[id].employee_reason_remaining = value; // เพิ่มเหตุผล
      } else {
        newData[id] = { employee_reason_remaining: value }; // ถ้าไม่มีข้อมูลให้สร้างใหม่
      }
      return newData;
    });
    setIsDataChanged(true);
  };

  const handleCheckboxChange = (id, checked) => {
    if (!isTaskCompleted) {
      const currentTime = new Date().toISOString(); // เก็บเวลาปัจจุบัน
      const item = formattedData.find((item) => item.id === id);
      const countedQuantity =
        countedQuantities[item.id] !== undefined
          ? countedQuantities[item.id]
          : item.remaining_quantity;

      const actualQuantity =
        actualQuantities[item.id] !== undefined
          ? actualQuantities[item.id]
          : item.quantity;

      const usedQuantity =
        temporaryData[id]?.quantity !== undefined
          ? temporaryData[id].quantity
          : item.quantity;

      const employeeReason =
        temporaryData[id]?.employee_reason !== undefined
          ? temporaryData[id].employee_reason
          : "";

      const employeeReasonRemain =
        temporaryData[id]?.employee_reason_remaining !== undefined
          ? temporaryData[id].employee_reason_remaining
          : "";

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
            employee_reason_remaining: employeeReasonRemain,
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

        // ตรวจสอบเงื่อนไข actual_quantity และ used_quantity
        if (checked && newData[id]?.actual_quantity !== newData[id]?.quantity) {
          setIsReasonModalVisible(true); // แสดงปุ่ม Reason
          setCurrentRecordId(id); // เก็บ ID ปัจจุบัน
        } else {
          setIsReasonModalVisible(false); // ซ่อนปุ่ม Reason หากเงื่อนไขไม่ถูกต้อง
          setCurrentRecordId(null);
        }

        // ตรวจสอบเงื่อนไข remaining_quantity และ counted_quantity
        if (checked && item.remaining_quantity !== countedQuantity) {
          setRemainingReasonModal(true); // แสดง Modal เลือกเหตุผล (คงเหลือ)
          setCurrentRecordId(id);
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

  useEffect(() => {
    console.log("Temporary Data updated:", temporaryData);
  }, [temporaryData]);

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

  const handleRemainingReasonButtonClick = (recordId) => {
    setCurrentRecordId(recordId);
    setRemainingReasonModal(true);
  };

  const handleRemainingReasonOk = () => {
    if (
      selectedRemainingReason === "อื่นๆ" &&
      otherRemainingReason.trim() === ""
    ) {
      message.error("กรุณากรอกเลขที่ใบสั่งเบิก");
      return;
    }
    const finalReason =
      selectedRemainingReason === "อื่นๆ"
        ? otherRemainingReason.trim()
        : selectedRemainingReason;

    if (currentRecordId) {
      handleReasonRemainingChange(finalReason, currentRecordId);
    }
    setRemainingReasonModal(false);
    setSelectedRemainingReason("");
    setOtherRemainingReason("");
  };

  const handleRemainingReasonCancel = () => {
    setRemainingReasonModal(false);
    setSelectedRemainingReason("");
    setOtherRemainingReason("");
  };

  // เพิ่มฟังก์ชันสำหรับการไฮไลท์แถว
  const rowClassName = (record) => {
    return selectedRows.includes(record.id);
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
          m.details.map((d, index) => {
            const countedQuantity = countedQuantities[d.id];
            const actualQuantity = actualQuantities[d.id];
            return {
              ...d,
              sequence: m.sequence,
              mat_unit: m.mat_unit,
              mat_name: m.mat_name,
              material_index: index + 1,
              rowSpansequence: index === 0 ? m.details.length : 0,
              rowSpanMatunit: index === 0 ? m.details.length : 0,
              rowSpanMatName: index === 0 ? m.details.length : 0,
              rowSpanQuantity: index === 0 ? m.details.length : 0,
              rowSpanMaterialId: index === 0 ? m.details.length : 0,
              counted_quantity:
                countedQuantity !== undefined
                  ? countedQuantity
                  : d.remaining_quantity, // ใช้ counted_quantity ถ้ามี หรือ remaining_quantity ถ้าไม่มี
              actual_quantity:
                actualQuantity !== undefined ? actualQuantity : d.quantity,
            };
          })
        )
      : [];

    setFormattedData(formattedData); // อัปเดตข้อมูลใน formattedData
  }, [data, countedQuantities, actualQuantities, temporaryData]); // คำนวณใหม่เมื่อข้อมูลเหล่านี้เปลี่ยนแปลง

  //console.log("Formatted Data:", formattedData);

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

  const columns = [
    {
      title: "ลำดับ",
      dataIndex: "sequence",
      key: "sequence",
      render: (text, record) => ({
        children: <span>{text}</span>,
        props: { rowSpan: record.rowSpansequence }, // ใช้ rowSpan จากข้อมูลที่จัดรูปแบบ
      }),
      align: "center",
      width: 70,
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
      title: "รายการ",
      dataIndex: "mat_name",
      key: "mat_name",
      width: 300,
      render: (text, record, index) => {
        const backgroundColor = record.is_cs ? "yellow" : "transparent";
        return {
          children: (
            <span
              style={{
                backgroundColor,
                display: "block", // เพื่อให้ background เต็มเซลล์
                padding: "4px 8px", // ปรับ padding ให้ดูดีขึ้น
              }}
            >
              {text}
            </span>
          ),
          props: { rowSpan: record.rowSpanMatName },
        };
      },
      align: "left",
      onHeaderCell: () => ({
        style: {
          backgroundColor: "#00152a",
          fontWeight: "bold",
          fontSize: "14px",
          color: "#ffffff",
        },
      }),
    },
    {
      /*title: (
        <div
          style={{
            whiteSpace: "normal",
            wordBreak: "break-word",
            textAlign: "center",
            maxWidth: 80,
          }}
        >
          ซ้ำกัน 2 กะ
        </div>
      ),*/
      dataIndex: "is_duplicate",
      key: "is_duplicate",
      align: "center",
      width: 50,
      onHeaderCell: () => ({
        style: {
          backgroundColor: "#00152a", // สีพื้นหลังของหัวคอลัมน์
          fontWeight: "bold", // ความหนาของตัวอักษร
          fontSize: "14px", // ขนาดตัวอักษร
          color: "#ffffff", // สีตัวอักษร
        },
      }),
      /*render: (isDuplicate) =>
        isDuplicate ? (
          <PushpinFilled style={{ color: "red", fontSize: "15px" }} />
        ) : null,*/
      render: (isDuplicate) =>
        isDuplicate ? (
          <span style={{ position: "relative", display: "inline-block" }}>
            <PlusCircleFilled
              style={{
                color: "#1a237e",
                fontSize: "30px",
                position: "absolute",
                top: 0,
                left: 0,
              }}
            />
            <PlusCircleFilled
              style={{
                color: "#1a237e",
                fontSize: "30px",
              }}
            />
          </span>
        ) : null,
    },
    {
      title: "ล็อต",
      dataIndex: "mat_lot",
      key: "mat_lot",
      align: "left",
      width: 200,
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
      width: 200,
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
      title: "จำนวนที่ต้องจ่าย",
      dataIndex: "quantity",
      key: "quantity",
      width: 150,
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
      title: "จำนวนจ่ายจริง",
      dataIndex: "actual_quantity",
      key: "actual_quantity",
      width: 150,
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
            defaultValue={record.quantity}
            formatter={(value) =>
              `${value}`.replace(/\B(?=(\d{3})+(?!\d))/g, ",")
            }
            parser={(value) => value.replace(/,/g, "")}
            onChange={(value) => handleActualQuantityChange(value, record.id)}
            disabled={isTaskCompleted}
            style={{
              backgroundColor: selectedRows.includes(record.id)
                ? "#DFF2BF"
                : "#E6E6FA",
              fontWeight: "bold",
              color: selectedRows.includes(record.id) ? "#4F8A10" : "#9400D3",
              borderColor: selectedRows.includes(record.id)
                ? "#4F8A10"
                : "#9400D3",
            }}
          />
        ),
      align: "center",
    },
    {
      title: (
        <div
          style={{
            whiteSpace: "normal",
            wordBreak: "break-word",
            textAlign: "center",
            maxWidth: 100,
          }}
        >
          จำนวนคงเหลือในโปรแกรม
        </div>
      ),
      width: 150,
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
      title: (
        <div
          style={{
            whiteSpace: "normal",
            wordBreak: "break-word",
            textAlign: "center",
            maxWidth: 100,
          }}
        >
          จำนวนคงเหลือนับจริง
        </div>
      ),
      dataIndex: "counted_quantity",
      width: 150,
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
            defaultValue={record.remaining_quantity}
            formatter={(value) =>
              `${value}`.replace(/\B(?=(\d{3})+(?!\d))/g, ",")
            }
            parser={(value) => value.replace(/,/g, "")}
            onChange={(value) => handleQuantityChange(value, record.id)}
            disabled={isTaskCompleted}
            style={{
              backgroundColor: selectedRows.includes(record.id)
                ? "#DFF2BF"
                : "#E6E6FA",
              fontWeight: "bold",
              color: selectedRows.includes(record.id) ? "#4F8A10" : "#9400D3",
              borderColor: selectedRows.includes(record.id)
                ? "#4F8A10"
                : "#9400D3",
            }}
          />
        ),
      align: "center",
    },
    {
      title: "คงเหลือรวมทุกล็อต",
      dataIndex: "total_quantity",
      key: "total_quantity",
      width: 150,
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
      width: 100,
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
    ,
    {
      title: "เหตุผล (จ่ายจริง)",
      dataIndex: "employee_reason",
      key: "employee_reason",
      align: "center",
      width: 200,
      render: (_, record) => {
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
        return temporaryData[record.id]?.employee_reason || "-";
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
      title: "เหตุผล (คงเหลือ)",
      dataIndex: "employee_reason_remaining",
      key: "employee_reason_remaining",
      align: "center",
      width: 200,

      render: (_, record) => {
        if (RemainingReasonModal && currentRecordId === record.id) {
          return (
            <Button
              type="primary"
              onClick={() => handleRemainingReasonButtonClick(record.id)}
            >
              เลือกเหตุผล
            </Button>
          );
        }
        return temporaryData[record.id]?.employee_reason_remaining || "-";
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
      <div style={{ padding: "0 48px" }}>
        {/*<div style={{ marginTop: "20px", marginBottom: "20px" }}>
          <Breadcrumb className="sarabun-light" style={{ margin: "16px 0" }}>
            <Breadcrumb.Item>
              <Link to="/OperationsDashboard">รายการเบิก-จ่ายทั้งหมด</Link>
            </Breadcrumb.Item>
            <Breadcrumb.Item>
              <Link to="/MyTasks">รายการเบิก-จ่ายของฉัน</Link>
            </Breadcrumb.Item>
            <Breadcrumb.Item>รายละเอียดการเบิก-จ่าย</Breadcrumb.Item>
          </Breadcrumb>
        </div>*/}

        <div
          className="dashboard-title sarabun-bold"
          style={{
            fontSize: "30px",
            textAlign: "center", // จัดข้อความตรงกลาง
            display: "flex",
            justifyContent: "center", // จัดให้อยู่ตรงกลางแนวนอน
            alignItems: "center", // จัดให้อยู่ตรงกลางแนวตั้ง (ถ้าสูง)
            height: "50px", // ตั้งความสูงให้พอดี
            marginBottom: "30px",
            marginTop: "30px",
          }}
        >
          ใบสั่งงานเลขที่ : {inventoryId ? inventoryId : "N/A"}
        </div>

        <Card
          style={{
            borderRadius: "15px",
          }}
        >
          <div
            className="dashboard-title sarabun-bold"
            style={{
              fontSize: "20px",
              padding: "20px",
            }}
          >
            รายละเอียด : ใบสั่งงานเลขที่ {inventoryId ? inventoryId : "N/A"}
            {/* คำอธิบายสัญลักษณ์ */}
            <div
              style={{
                fontSize: "14px",
                marginTop: "20px",
                display: "flex",
                alignItems: "center",
                gap: "8px",
                backgroundColor: "#fff8c4", // สีเหลืองอ่อน
                padding: "8px 12px",
                borderRadius: "6px", // มุมโค้งเล็กน้อย
                border: "1px solid #ffe58f", // เส้นขอบให้ดูเด่นขึ้น
              }}
            >
              <PlusCircleFilled
                style={{ color: "#1a237e", fontSize: "25px" }}
              />
              <span>
                หมายถึง มีการสั่งเบิกวัตถุดิบรายการนั้นมากกว่า 1 กะ/วัน
              </span>
            </div>
          </div>

          <div className="table-container">
            <Table
              columns={columns}
              dataSource={formattedData}
              pagination={false}
              rowKey={(record) => record.id}
              rowClassName={rowClassName}
              //scroll={{ x: "max-content"}}
              scroll={{ x: "max-content", y: 500 }} // ทำให้ตารางเลื่อนไปข้างๆ ได้หากข้อมูลกว้าง
              className="custom-table "
            />
            <Card
              className="sarabun-bold"
              style={{
                backgroundColor: " #DCDCDC",
                borderRadius: "12px",
                fontSize: "18px",
                marginTop: "30px",
                marginBottom: "30px",
              }}
            >
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                }}
              >
                <div>ใบสั่งงานเลขที่ : {inventoryId ? inventoryId : "N/A"}</div>
                <div>
                  รวมจำนวนที่สั่งเบิก : {formatNumber(totalRequestedQuantity)}
                </div>
              </div>

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
                    <Radio className="sarabun-light" value="วัตถุดิบหมด">
                      วัตถุดิบหมด
                    </Radio>
                    <Radio className="sarabun-light" value="จ่ายผิดพลาด">
                      จ่ายผิดพลาด
                    </Radio>
                    <Radio className="sarabun-light" value="อื่นๆ">
                      อื่นๆ
                    </Radio>
                  </Radio.Group>
                  {selectedReason === "อื่นๆ" && (
                    <Input
                      className="sarabun-light"
                      style={{ marginTop: 10 }}
                      placeholder="กรุณากรอกเหตุผล"
                      value={otherReason}
                      onChange={(e) => setOtherReason(e.target.value)}
                    />
                  )}
                </div>
              </Modal>

              <Modal
                title="เลือกเหตุผล"
                visible={RemainingReasonModal}
                onOk={handleRemainingReasonOk}
                onCancel={handleRemainingReasonCancel}
              >
                <div>
                  <Radio.Group
                    onChange={(e) => setSelectedRemainingReason(e.target.value)}
                    value={selectedRemainingReason}
                    style={{ display: "flex", flexDirection: "column" }}
                  >
                    <Radio className="sarabun-light" value="ไม่ทราบสาเหตุ">
                      ไม่ทราบสาเหตุ
                    </Radio>
                    <Radio className="sarabun-light" value="อื่นๆ">
                      อื่นๆ
                    </Radio>
                  </Radio.Group>
                  {selectedRemainingReason === "อื่นๆ" && (
                    <Input
                      className="sarabun-light"
                      style={{ marginTop: 10 }}
                      placeholder="กรุณากรอกเหตุผล"
                      value={otherRemainingReason}
                      onChange={(e) => setOtherRemainingReason(e.target.value)}
                    />
                  )}
                </div>
              </Modal>
            </Card>
            <div className="table-buttons">
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
            </div>

            <div
              style={{
                display: "flex",
                justifyContent: "center",
                marginTop: "10px",
              }}
            >
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
              >
                {buttonType === "savePartial" && "บันทึกชั่วคราว"}
                {buttonType === "reportIssue" && "รายงานปัญหา"}
                {buttonType === "complete" && "เสร็จสิ้น"}
              </Button>
            </div>
          </div>
        </Card>
      </div>
    </MainLayout>
  );
};

export default TaskDetails;
