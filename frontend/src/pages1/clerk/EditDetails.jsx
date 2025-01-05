import React, { useState, useEffect } from "react";
import { useParams, Link } from "react-router-dom";
import axios from "axios";
import { Button, Table, Radio, Card, Modal, Input, message } from "antd";
import MainLayout from "../../components/LayoutClerk";
import "../../styles1/EditDetails.css";
import { HiMiniPencilSquare } from "react-icons/hi2";
import config from "../../configAPI";

const EditDetails = () => {
  const [username, setUsername] = useState("");
  const [data, setData] = useState([]);
  const [editingRow, setEditingRow] = useState(null);
  const [isEditModalVisible, setIsEditModalVisible] = useState(false);
  const [currentRecord, setCurrentRecord] = useState({});
  const [additionalReason, setAdditionalReason] = useState("");
  const { upload_id } = useParams();
  const [totalRequested, setTotalRequested] = useState(0);
  const [approveModalVisible, setApproveModalVisible] = useState(false);
  const [confirmUploadId, setConfirmUploadId] = useState(null);


  const fetchData = async () => {
    if (!upload_id) {
      console.error("upload_id is undefined");
      return;
    }

    try {
      const token = sessionStorage.getItem("token");
      const response = await axios.get(
        `${config.API_URL}/dashboard/edit-details/${upload_id}`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

      if (response.data && Array.isArray(response.data)) {
        console.log("Fetched data:", response.data);
        // ตรวจสอบและเพิ่มปัญหา
        const updatedData = response.data.map((item) => ({
          ...item,
          hasIssue: item.remaining_quantity !== item.counted_quantity,
        }));
        setData(updatedData);
      } else {
        console.error("Unexpected data format:", response.data);
      }
    } catch (err) {
      console.error("Failed to fetch data:", err);
    }
  };

  const fetchTotalRequested = async () => {
    try {
      console.log(
        `Fetching total requested quantity for upload_id: ${upload_id}`
      );
      const token = sessionStorage.getItem("token");
      const response = await axios.get(
        `${config.API_URL}/dashboard/details/${upload_id}/total-requested-quantity`,
        {
          headers: { Authorization: `Bearer ${token}` },
        }
      );
      console.log("Fetched Total Requested Quantity:", response.data);
      setTotalRequested(response.data.totalRequested || 0);
    } catch (err) {
      console.error("Failed to fetch total requested quantity:", err);
    }
  };

  useEffect(() => {
    const storedUsername = sessionStorage.getItem("username");
    if (storedUsername) {
      setUsername(storedUsername);
    }
    if (upload_id) {
      fetchData();
      fetchTotalRequested();
    } else {
      console.error("upload_id is undefined");
    }
  }, [upload_id]);

  const handleEditRow = (record) => {
    setEditingRow(record.id);
    setCurrentRecord({ ...record });
    setAdditionalReason(
      record.reason === "อื่นๆ" ? record.additionalReason : ""
    );
    setIsEditModalVisible(true);
  };

  const handleSave = async () => {
    try {
      const reasonToSave =
        currentRecord.reason === "อื่นๆ"
          ? additionalReason
          : currentRecord.reason;

      await axios.post(
        `${config.API_URL}/dashboard/update-details/${upload_id}`,
        { ...currentRecord, reason: reasonToSave }
      );

      setData((prevData) =>
        prevData.map((item) =>
          item.id === currentRecord.id
            ? { ...item, reason: reasonToSave }
            : item
        )
      );
      setIsEditModalVisible(false);
      setEditingRow(null);
      setCurrentRecord({});
      setAdditionalReason("");
    } catch (err) {
      console.error("Failed to save data:", err);
    }
  };

  const handleCancel = () => {
    setIsEditModalVisible(false);
    setCurrentRecord({});
    setAdditionalReason("");
  };

  const handleReasonChange = (e) => {
    setCurrentRecord({
      ...currentRecord,
      reason: e.target.value,
    });
    if (e.target.value !== "อื่นๆ") {
      setAdditionalReason(""); // Clear additional reason if selected reason is not "อื่นๆ"
    }
  };

  const handleAdditionalReasonChange = (e) => {
    setAdditionalReason(e.target.value);
  };

  // ฟังก์ชันสำหรับจัดรูปแบบตัวเลข
  const formatNumber = (number) => {
    return new Intl.NumberFormat().format(number);
  };

  const handleApprove = (uploadId) => {
    // ตรวจสอบว่ามีรายการที่มีปัญหาและเหตุผลครบหรือไม่
    const issuesWithMissingReasons = data.filter(
      (item) => item.hasIssue && !item.reason
    );
    
    if (issuesWithMissingReasons.length > 0) {
      message.error("กรุณากรอกเหตุผลในรายการที่มีปัญหาก่อนอนุมัติ");
    } else {
      setConfirmUploadId(uploadId);
      setApproveModalVisible(true); // เปิด Modal ยืนยัน
    }
  };

  const handleApproveConfirm = async () => {
    try {
      const token = sessionStorage.getItem("token");
      await axios.post(
        `${config.API_URL}/dashboard/approve/${confirmUploadId}`,
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

  const columns = [
    /*{
      title: "ลำดับ",
      key: "index",
      render: (text, record, index) => index + 1,
      align: "left",
    },*/
    {
      title: "รหัส",
      dataIndex: "matunit",
      key: "matunit",
      align: "left",
      onHeaderCell: () => ({
        style: {
          backgroundColor: "#DCDCDC", // สีพื้นหลังของหัวคอลัมน์
          fontWeight: "bold", // ความหนาของตัวอักษร
          fontSize: "16px", // ขนาดตัวอักษร
          color: "#000000E0", // สีตัวอักษร
          //border: "1px solid #d9d9d9", // สีเส้นขอบของหัวคอลัมน์
        },
      }),
    },
    {
      title: "รายการ",
      dataIndex: "mat_name",
      key: "mat_name",
      align: "left",
      onHeaderCell: () => ({
        style: {
          backgroundColor: "#DCDCDC", // สีพื้นหลังของหัวคอลัมน์
          fontWeight: "bold", // ความหนาของตัวอักษร
          fontSize: "16px", // ขนาดตัวอักษร
          color: "#000000E0", // สีตัวอักษร
          //border: "1px solid #d9d9d9", // สีเส้นขอบของหัวคอลัมน์
        },
      }),
    },
    {
      title: "จำนวน",
      dataIndex: "quantity",
      key: "quantity",
      render: (text) => formatNumber(text),
      align: "center",
      onHeaderCell: () => ({
        style: {
          backgroundColor: "#DCDCDC", // สีพื้นหลังของหัวคอลัมน์
          fontWeight: "bold", // ความหนาของตัวอักษร
          fontSize: "16px", // ขนาดตัวอักษร
          color: "#000000E0", // สีตัวอักษร
          //border: "1px solid #d9d9d9", // สีเส้นขอบของหัวคอลัมน์
        },
      }),
    },
    {
      title: "จำนวนคงเหลือ",
      dataIndex: "remaining_quantity",
      key: "remaining_quantity",
      render: (text) => formatNumber(text),
      align: "center",
      onHeaderCell: () => ({
        style: {
          backgroundColor: "#DCDCDC", // สีพื้นหลังของหัวคอลัมน์
          fontWeight: "bold", // ความหนาของตัวอักษร
          fontSize: "16px", // ขนาดตัวอักษร
          color: "#000000E0", // สีตัวอักษร
          //border: "1px solid #d9d9d9", // สีเส้นขอบของหัวคอลัมน์
        },
      }),
    },
    {
      title: "นับจริง",
      dataIndex: "counted_quantity",
      key: "counted_quantity",
      render: (text) => formatNumber(text),
      align: "center",
      onHeaderCell: () => ({
        style: {
          backgroundColor: "#DCDCDC", // สีพื้นหลังของหัวคอลัมน์
          fontWeight: "bold", // ความหนาของตัวอักษร
          fontSize: "16px", // ขนาดตัวอักษร
          color: "#000000E0", // สีตัวอักษร
          //border: "1px solid #d9d9d9", // สีเส้นขอบของหัวคอลัมน์
        },
      }),
    },
    {
      title: "ตรวจสอบ",
      dataIndex: "",
      key: "",
      align: "center",
      onHeaderCell: () => ({
        style: {
          backgroundColor: "#DCDCDC", // สีพื้นหลังของหัวคอลัมน์
          fontWeight: "bold", // ความหนาของตัวอักษร
          fontSize: "16px", // ขนาดตัวอักษร
          color: "#000000E0", // สีตัวอักษร
          //border: "1px solid #d9d9d9", // สีเส้นขอบของหัวคอลัมน์
        },
      }),
      render: (_, record) =>
        record.hasIssue ? (
          <Button
            style={{
              color: "#f0f0f0",
              backgroundColor: "red",
              borderColor: "red",
            }}
            //icon={<HiMiniPencilSquare />}
            onClick={() => handleEditRow(record)}
          >
            ตรวจสอบ
          </Button>
        ) : null,
    },
    {
      title: "เหตุผล",
      dataIndex: "reason",
      key: "reason",
      align: "left",
      onHeaderCell: () => ({
        style: {
          backgroundColor: "#DCDCDC", // สีพื้นหลังของหัวคอลัมน์
          fontWeight: "bold", // ความหนาของตัวอักษร
          fontSize: "16px", // ขนาดตัวอักษร
          color: "#000000E0", // สีตัวอักษร
          //border: "1px solid #d9d9d9", // สีเส้นขอบของหัวคอลัมน์
        },
      }),
      render: (text, record) => {
        return record.id === editingRow ? (
          <span>
            {currentRecord.reason === "อื่นๆ"
              ? additionalReason
              : currentRecord.reason}
          </span>
        ) : (
          <span>{record.reason}</span>
        );
      },
    },
  ];

  const rowClassName = (record) => {
    return record.hasIssue ? "highlight-row" : "";
  };

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
            รายละเอียดการเบิก-จ่ายวัตถุดิบ
          </div>
        </div>
      </div>

      <div>
        <Card
          style={{
            borderRadius: "15px",
          }}
        >
          <div className="table-container ">
            <Table
              columns={columns}
              dataSource={data}
              pagination={false}
              rowKey={(record) => record.id}
              rowClassName={rowClassName}
              className="custom-table"
            />
          </div>
          <div className="summary-container sarabun-bold"
          style={{
            backgroundColor: " #DCDCDC",
            marginBottom: "20px",
            borderRadius: "8px",
          }}>
            <p
              style={{ fontSize: "18px", marginLeft: "20px", padding: "10px" }}
            >
              <strong>รวมจำนวนที่สั่งเบิก:</strong>{" "}
              {formatNumber(totalRequested)}
            </p>
          </div>
          <div
            className="button-container sarabun-light"
            style={{
              display: "flex",
              justifyContent: "center",
              marginTop: "10px",
            }}
          >
            <Link to="/Dashboard">
              <Button
                style={{
                  color: "#5755FE",
                  backgroundColor: "#f0f0f0",
                  borderColor: "#5755FE",
                  marginRight: "20px", 
                }}
              >
                ย้อนกลับ
              </Button>
            </Link>

            <Button
              style={{
                color: "#f0f0f0",
                backgroundColor: "green",
                borderColor: "green",
              }}
              onClick={() => handleApprove(upload_id)} // เรียกฟังก์ชัน handleApprove
            >
              อนุมัติ
            </Button>

          </div>
        </Card>
      </div>

      {/* Modal for Editing */}
      <Modal
        title="เลือกเหตุผล"
        open={isEditModalVisible}
        onCancel={handleCancel}
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
            onClick={handleSave}
            style={{
              color: "#f0f0f0",
              backgroundColor: "#5755FE",
              borderColor: "#5755FE",
            }}
          >
            บันทึก
          </Button>,
        ]}
      >
        <Radio.Group
          onChange={handleReasonChange}
          value={currentRecord.reason}
          style={{
            display: "flex",
            flexDirection: "column",
          }}
        >
          <Radio className="sarabun-light" value="เช็คยอดคงเหลือผิด">
            เช็คยอดคงเหลือผิด
          </Radio>
          <Radio className="sarabun-light" value="จ่ายไม่ครบ">
            จ่ายไม่ครบ
          </Radio>
          <Radio
            className="sarabun-light"
            value="ยังไม่ได้ Move ของไปจัดเก็บจริง"
          >
            ยังไม่ได้ Move ของไปจัดเก็บจริง
          </Radio>
          <Radio className="sarabun-light" value="อื่นๆ">
            อื่นๆ
          </Radio>
        </Radio.Group>
        {currentRecord.reason === "อื่นๆ" && (
          <Input
            className="sarabun-light"
            value={additionalReason}
            onChange={handleAdditionalReasonChange}
            placeholder="ระบุเหตุผล"
            style={{ marginTop: 10 }}
          />
        )}
      </Modal>

      {/* Modal ยืนยัน */}
      <Modal
        title="ยืนยันการอนุมัติ"
        open={approveModalVisible}
        onOk={handleApproveConfirm}
        onCancel={() => setApproveModalVisible(false)}
        okText="ยืนยัน"
        cancelText="ยกเลิก"
        okButtonProps={{
          style: {
            color: "#f0f0f0",
            backgroundColor: "#5755FE",
            borderColor: "#5755FE",
          },
        }}
        cancelButtonProps={{
          style: {
            color: "#5755FE",
            backgroundColor: "#f0f0f0 ",
            borderColor: "#5755FE",
          },
        }}
      >
        คุณต้องการอนุมัติรายการนี้ใช่หรือไม่?
      </Modal>

    </MainLayout>
  );
};

export default EditDetails;
