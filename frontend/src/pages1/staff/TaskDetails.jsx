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
  Breadcrumb,
  Radio,
  Input,
  Row,
  Col,
} from "antd";
import axios from "axios";
import MainLayout from "../../components/LayoutStaff";
import "../../styles1/TaskDetails.css";
import config from "../../configAPI";
import Swal from "sweetalert2";

const TaskDetails = () => {
  const { upload_id } = useParams();
  const [username, setUsername] = useState("");
  const [data, setData] = useState({ balances: [], status: "" });
  const [isModalVisible, setIsModalVisible] = useState(false);
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
  const [showReasonButton, setShowReasonButton] = useState(false);
  const [buttonType, setButtonType] = useState("savePartial");

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

  /*const handleRowClick = (record) => {
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
  };*/

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

        // ตรวจสอบเงื่อนไข actual_quantity และ used_quantity
        if (checked && newData[id]?.actual_quantity !== newData[id]?.quantity) {
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
      render: (text, record, index) => ({
        children: (
          <span
          //onClick={() => handleRowClick(record)}
          >
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
      title: "จำนวนที่ต้องจ่าย",
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
      title: "จำนวนจ่ายจริง",
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
    ,
    {
      title: "เหตุผล",
      dataIndex: "employee_reason",
      key: "employee_reason",
      align: "center",
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
          borderTopRightRadius: "10px", // มุมโค้งด้านขวาบน
          borderBottomRightRadius: "10px", // มุมโค้งด้านขวาล่าง
        },
      }),
    },
  ];

  return (
    <MainLayout>
      <div style={{ padding: "0 48px" }}>
        <div style={{ marginTop: "20px", marginBottom: "20px" }}>
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
          <div
            className="dashboard-title sarabun-bold"
            style={{
              fontSize: "20px",
              padding: "20px",
            }}
          >
            รายละเอียดการเบิกจ่ายวัตถุดิบ :
          </div>
          <div className="table-container">
            <Table
              columns={columns}
              dataSource={formattedData}
              pagination={false}
              rowKey={(record) => record.id}
              rowClassName={rowClassName}
              scroll={{ x: "max-content" }} // ทำให้ตารางเลื่อนไปข้างๆ ได้หากข้อมูลกว้าง
              className="custom-table"
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
              รวมจำนวนที่สั่งเบิก : {formatNumber(totalRequestedQuantity)}
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
