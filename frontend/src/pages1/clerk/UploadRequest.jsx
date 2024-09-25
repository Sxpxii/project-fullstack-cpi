// src/pages1/UploadRequest.jsx
import React, { useState } from "react";
import axios from "axios";
import { Link, useNavigate } from "react-router-dom";
import { Spin, message, Card, Breadcrumb, DatePicker } from "antd";
import MainLayout from "../../components/LayoutClerk";
import "../../styles1/UploadRequest.css";
import config from '../../configAPI';

const UploadRequest = () => {
  const [selectedFile, setSelectedFile] = useState(null);
  const [materialType, setMaterialType] = useState("");
  const [approvedDate, setApprovedDate] = useState(null);
  const [loading, setLoading] = useState(false);
  const [uploadMessage, setUploadMessage] = useState("");
  const navigate = useNavigate(); // สร้างฟังก์ชัน navigate โดยใช้ useNavigate

  const handleFileChange = (event) => {
    setSelectedFile(event.target.files[0]);
  };

  const handleMaterialTypeChange = (event) => {
    setMaterialType(event.target.value);
  };

  const handleDateChange = (date) => {
    setApprovedDate(date ? date.format("YYYY-MM-DD") : null); // เก็บวันที่ในรูปแบบที่ต้องการ
  };

  const handleSave = () => {
    if (!selectedFile || !materialType || !approvedDate) {
      console.error("File, material type, or approved date is missing");
      return;
    }

    setLoading(true);

    const formData = new FormData();
    formData.append("file", selectedFile);
    formData.append("materialType", materialType);
    formData.append("approvedDate", approvedDate);
    console.log(
      "Sending data to server:",
      materialType,
      selectedFile,
      approvedDate
    );

    const token = sessionStorage.getItem("token");
    if (!token) {
      console.error("Token is missing");
      return;
    }

    axios
      .post(`${config.API_URL}/requests`, formData, {
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "multipart/form-data",
        },
      })
      .then((response) => {
        // ดำเนินการดาวน์โหลดไฟล์ text ที่สร้างขึ้น
        const downloadLink = document.createElement("a");
        downloadLink.href = window.URL.createObjectURL(
          new Blob([response.data])
        );
        downloadLink.setAttribute("download", "IPMU.txt");
        document.body.appendChild(downloadLink);
        downloadLink.click();
      })
      .then(() => {
        navigate("/Dashboard"); // เปลี่ยนเส้นทางไปยังหน้าที่ต้องการไป
      })
      .catch((error) => {
        // หากมีข้อผิดพลาดในการส่งคำขอหรือการประมวลผลที่เซิร์ฟเวอร์
        console.error("Error:", error);
      });
  };

  return (
    <MainLayout username="User">
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
            บันทึกข้อมูลการสั่งเบิกวัตถุดิบ
          </div>
        </div>
      </div>

      <div>
        <Breadcrumb className="sarabun-light" style={{ margin: "16px 0" }}>
          <Breadcrumb.Item>
            <Link to="/dashboard">ติดตามสถานะการเบิก-จ่าย</Link>
          </Breadcrumb.Item>
          <Breadcrumb.Item>
            <Link to="/UploadBalance">อัปโหลดยอดคงเหลือรายวัน</Link>
          </Breadcrumb.Item>
          <Breadcrumb.Item>อัปโหลดไฟล์สั่งเบิก</Breadcrumb.Item>
        </Breadcrumb>
      </div>

      <Card
        style={{
          borderRadius: "15px",
        }}
      >
        <div className="content-container">
          <div
            className="material-selector"
            style={{
              display: "flex",
              justifyContent: "space-between",
            }}
          >
            <div>
              <select
                value={materialType}
                onChange={handleMaterialTypeChange}
                className="sarabun-light"
              >
                <option value="">เลือกวัตถุดิบ</option>
                {/*<option value="PK_DIS">กล่องดิส/ใบแนบ/สติ๊กเกอร์</option>
              <option value="PK_shoe">กล่องก้าม/ใบแนบ/สติ๊กเกอร์</option>*/}
                <option value="WD">กิ๊ฟล๊อค/แผ่นชิม</option>
                <option value="PIN">สลัก/ตะขอ</option>
                <option value="BP">แผ่นเหล็ก</option>
                <option value="CHEMICAL">เคมี</option>
              </select>
            </div>
            <div>
            <DatePicker
              onChange={handleDateChange}
              format="YYYY-MM-DD"
              style={{ padding: "12px 12px 8px"}}
            />
            </div>
          </div>

          <div className="upload-box">
            <input
              type="file"
              onChange={handleFileChange}
              className="sarabun-light"
            />
            {loading && <Spin />} {/* แสดง Spin ถ้า loading เป็น true */}
            {uploadMessage && <p>{uploadMessage}</p>}
          </div>
          <div className="d-flex">
            <Link to="/UploadBalance">
              <button
                className="sarabun-light"
                style={{
                  color: "#f0f0f0",
                  backgroundColor: "#5755FE",
                  borderColor: "#5755FE",
                  marginRight: "5px",
                }}
              >
                ย้อนกลับ
              </button>
            </Link>
            <button
              onClick={handleSave}
              className="sarabun-light"
              style={{
                color: "#f0f0f0",
                backgroundColor: "#5755FE",
                borderColor: "#5755FE",
                marginRight: "5px",
              }}
            >
              บันทึก
            </button>
          </div>
        </div>
      </Card>
    </MainLayout>
  );
};

export default UploadRequest;
