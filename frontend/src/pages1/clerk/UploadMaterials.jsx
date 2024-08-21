// src/pages/UploadMaterial.jsx
import React, { useState } from "react";
import axios from "axios";
import { useNavigate } from "react-router-dom";
import { Spin, message } from "antd";
//import Layout from '../../components/Layout';
import MainLayout from "../../components/LayoutClerk";
import "../../styles1/UploadMaterial.css"; // นำเข้า CSS

function UploadMaterials() {
  const [selectedFile, setSelectedFile] = useState(null);
  const [loading, setLoading] = useState(false);
  const [uploadMessage, setUploadMessage] = useState("");
  const navigate = useNavigate();

  const handleFileChange = (event) => {
    setSelectedFile(event.target.files[0]);
  };

  const handleSaveClick = async () => {
    if (!selectedFile) {
      alert("กรุณาเลือกไฟล์.");
      return;
    }

    setLoading(true);

    const formData = new FormData();
    formData.append("file", selectedFile);

    try {
      const token = localStorage.getItem("token");

      const response = await axios.post(
        "http://localhost:3001/materials",
        formData,
        {
          headers: {
            "Content-Type": "multipart/form-data",
            Authorization: `Bearer ${token}`,
          },
        }
      );
      console.log("File uploaded successfully:", response.data);
      setUploadMessage("บันทึกข้อมูลเรียบร้อยแล้ว");

      setTimeout(() => {
        navigate("/Dashboard"); // เปลี่ยนหน้าหลังจาก 2 วินาที
      }, 2000);
    } catch (error) {
      console.error("Error uploading file:", error);
      alert("เกิดข้อผิดพลาดในการอัปโหลดไฟล์ กรุณาลองใหม่อีกครั้ง.");
    } finally {
      setLoading(false);
    }
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
            บันทึกข้อมูลวัตถุดิบ
          </div>
        </div>
      </div>
      <Card
        style={{
          borderRadius: "15px",
        }}
      >
        <div className="upload-container">
          <div className="upload-box">
            <input
              type="file"
              onChange={handleFileChange}
              className="upload-input"
            />
            {loading && <p>กำลังอัปโหลด...</p>}
            {uploadMessage && <p>{uploadMessage}</p>}
          </div>
          <div className="upload-buttons">
            <button onClick={handleSaveClick}>บันทึก</button>
          </div>
        </div>
      </Card>
    </MainLayout>
  );
}

export default UploadMaterials;
