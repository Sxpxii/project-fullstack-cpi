// src/pages/UploadBalance.jsx
import React, { useState } from "react";
import axios from "axios";
import { Link, useNavigate } from "react-router-dom";
import { Spin, message, Card, Breadcrumb, Table, Button } from "antd";
import MainLayout from "../../components/LayoutClerk";
import "../../styles1/UploadBalance.css"; // นำเข้า CSS
import config from '../../configAPI';

function UploadBalance() {
  const [selectedFile, setSelectedFile] = useState(null);
  const [loading, setLoading] = useState(false);
  const [uploadMessage, setUploadMessage] = useState("");
  const [errors, setErrors] = useState([]);
  const [isSaveVisible, setIsSaveVisible] = useState(true);
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
      const token = sessionStorage.getItem("token");

      const response = await axios.post(
        `${config.API_URL}/balance`,
        formData,
        {
          headers: {
            "Content-Type": "multipart/form-data",
            Authorization: `Bearer ${token}`,
          },
        }
      );
      console.log("Response from server:", response.data);

      const { errors = [] } = response.data;
      if (errors.length > 0) {
        setErrors(errors); // เก็บ errors ลงใน state
        message.error("บันทึกไม่สำเร็จ กรุณาลองใหม่");
      } else {
        message.success("บันทึกข้อมูลสำเร็จ");
        setIsSaveVisible(false); 
      }
    } catch (error) {
      console.error("Error uploading file:", error);
      message.error("บันทึกไม่สำเร็จ กรุณาลองใหม่");
    } finally {
      setLoading(false); // จบการโหลด
    }
  };

  const columns = [
    {
      title: "ลำดับ",
      key: "index",
      render: (text, record, index) => index + 1,
      align: "center",
    },
    {
      title: "Matunit",
      dataIndex: "matunit",
      key: "matunit",
      align: "left",
    },
    {
      title: "Matname",
      dataIndex: "matname",
      key: "matname",
      align: "left",
    },
  ];

  // ฟังก์ชันสำหรับคัดลอกข้อมูล errors ไปยัง clipboard
  const handleCopyErrors = () => {
    // กำหนดหัวข้อของตาราง
    const header = "matunit\tmat_name";

    // สร้างข้อความของข้อมูลโดยมีหัวข้อรวมอยู่ด้วย
    const errorText = [header] // เพิ่มหัวข้อเป็นบรรทัดแรก
      .concat(errors.map((error) => `${error.matunit}\t${error.matname}`)) // ข้อมูลที่ตามมา
      .join("\n"); // เชื่อมแต่ละบรรทัดด้วย '\n'

    navigator.clipboard
      .writeText(errorText)
      .then(() => {
        message.success("คัดลอกข้อมูลเรียบร้อยแล้ว");
      })
      .catch((err) => {
        console.error("Error copying to clipboard:", err);
        message.error("คัดลอกข้อมูลไม่สำเร็จ");
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
            {isSaveVisible && ( // แสดงปุ่มบันทึกถ้า isSaveVisible เป็น true
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
            )}
          </div>
        </div>

        {/* แสดง Errors เป็นตารางพร้อมลำดับ */}
        {errors.length > 0 && (
          <div style={{ marginTop: "20px", color: "red" }}>
            <div
              className="dashboard-title sarabun-bold"
              style={{
                fontSize: "20px",
                padding: "10px",
              }}
            >
              รายการที่ไม่มี Material ID:
            </div>
            <div
            style={{
              display: "flex",
              justifyContent: "flex-end",
              marginBottom: "10px",
            }}
          >
            <Button
              onClick={handleCopyErrors}
              style={{
                backgroundColor: "#5755FE",
                color: "#fff",
              }}
            >
              คัดลอกข้อมูล
            </Button>
          </div>
            <Table
              columns={columns}
              dataSource={errors.map((error, index) => ({
                key: index,
                ...error,
              }))}
              pagination={false}
              bordered
              size="middle"
            />
          </div>
        )}
      </Card>
    </MainLayout>
  );
}

export default UploadBalance;
