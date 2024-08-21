// src/pages/UploadBalance.jsx
import React, { useState } from "react";
import axios from "axios";
import { Link, useNavigate } from "react-router-dom";
import { Spin, message, Card, Breadcrumb } from "antd";
//import Layout from "../../components/Layout";
import MainLayout from "../../components/LayoutClerk";
import "../../styles1/UploadBalance.css"; // นำเข้า CSS

function UploadBalance() {
  const [selectedFile, setSelectedFile] = useState(null);
  const [loading, setLoading] = useState(false);
  const [uploadMessage, setUploadMessage] = useState("");
  const navigate = useNavigate();

  const handleFileChange = (event) => {
    setSelectedFile(event.target.files[0]);
  };

  const handleSaveClick = async () => {
    if (!selectedFile) {
      alert("Please select a file.");
      return;
    }

    setLoading(true);

    const formData = new FormData();
    formData.append("file", selectedFile);

    try {
      const token = localStorage.getItem("token");

      const response = await axios.post(
        "http://localhost:3001/balance",
        formData,
        {
          headers: {
            "Content-Type": "multipart/form-data",
            Authorization: `Bearer ${token}`,
          },
        }
      );
      console.log("File uploaded successfully:", response.data);
      message.success("บันทึกข้อมูลสำเร็จ");
    } catch (error) {
      console.error("Error uploading file:", error);
      message.error("บันทึกไม่สำเร็จ กรุณาลองใหม่");
    } finally {
      setLoading(false); // จบการโหลด
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
            บันทึกข้อมูลยอดคงเหลือรายวัน
          </div>
        </div>
      </div>
      <div>
        <Breadcrumb className="sarabun-light" style={{ margin: "16px 0" }}>
          <Breadcrumb.Item>
            <Link to="/dashboard">ติดตามสถานะการเบิก-จ่าย</Link>
          </Breadcrumb.Item>
          <Breadcrumb.Item>อัปโหลดยอดคงเหลือรายวัน</Breadcrumb.Item>
        </Breadcrumb>
      </div>
      <Card
        style={{
          borderRadius: "15px",
        }}
      >
        <div className="content-container d-flex justify-content-center">
          <div className="upload-box">
            <input
              type="file"
              onChange={handleFileChange}
              className="sarabun-light w-100"
            />
            {loading && <Spin />} {/* แสดง Spin ถ้า loading เป็น true */}
            {uploadMessage && <p>{uploadMessage}</p>}
          </div>

          <div className=" sarabun-light">
            <button
              onClick={handleSaveClick}
              style={{
                color: "#f0f0f0",
                backgroundColor: "#5755FE",
                borderColor: "#5755FE",
                marginRight: "5px",
              }}
            >
              บันทึก
            </button>

            <Link to="/UploadRequest" className="next-link">
              <button
                style={{
                  color: "#f0f0f0",
                  backgroundColor: "#5755FE",
                  borderColor: "#5755FE",
                }}
              >
                ถัดไป
              </button>
            </Link>
          </div>
        </div>
      </Card>
    </MainLayout>
  );
}

export default UploadBalance;
