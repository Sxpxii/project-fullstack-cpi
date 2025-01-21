// src/pages1/UploadItemRequest.jsx
import React, { useState, useRef } from "react";
import axios from "axios";
import MainLayout from "../../components/LayoutClerk";
import config from "../../configAPI";
import { Breadcrumb, Steps, Button, Card, DatePicker } from "antd";
import { useNavigate } from "react-router-dom";
import Swal from "sweetalert2";

const { Step } = Steps;

const UploadPage = () => {
  const [file, setFile] = useState(null);
  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = useRef(null);
  const [currentStep, setCurrentStep] = useState(0);
  const [materialType, setMaterialType] = useState("");
  const [approvedDate, setApprovedDate] = useState(null);

  const navigate = useNavigate();

  const handleFileChange = (e) => {
    setFile(e.target.files[0]);
  };

  const handleDrop = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);

    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      setFile(e.dataTransfer.files[0]);
      e.dataTransfer.clearData();
    }
  };

  const handleDragOver = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
  };

  const handleDragLeave = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  };

  const handleUpload = async () => {
    if (!file || !materialType || !approvedDate) {
      Swal.fire({
        icon: "warning",
        title: "กรุณาเลือกข้อมูลให้ครบถ้วน",
        text: "กรุณาเลือกไฟล์ วัตถุดิบ และวันที่สั่งเบิก",
        customClass: {
          title: "sarabun-bold", // ใส่คลาสให้กับ title
          text: "sarabun-bold", // ใส่คลาสให้กับข้อความ
        },
      });
      return;
    }
    const formData = new FormData();
    formData.append("file", file);
    formData.append("materialType", materialType);
    formData.append("approvedDate", approvedDate);
    console.log("Sending data to server:", materialType, file, approvedDate);

    try {
      const token = sessionStorage.getItem("token");

      await axios.post(`${config.API_URL}/itemrequests/upload`, formData, {
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "multipart/form-data",
        },
      });
      Swal.fire({
        icon: "success",
        title: "อัปโหลดสำเร็จ",
        html: '<span class="sarabun-light">ไฟล์ของคุณถูกอัปโหลดเรียบร้อยแล้ว</span>',
        customClass: {
          title: "sarabun-bold", // ใส่คลาสให้กับ title
        },
      }).then(() => {
        navigate("/dashboardClerk"); // นำทางไปยัง /dashboard
      });
      setFile(null); // รีเซ็ตไฟล์หลังอัปโหลดสำเร็จ
      fileInputRef.current.value = ""; // รีเซ็ต input
    } catch (error) {
      console.error("Error uploading file:", error);
      Swal.fire({
        icon: "error",
        title: "เกิดข้อผิดพลาด",
        html: '<span class="sarabun-bold">กรุณาเลือกไฟล์ วัตถุดิบ และวันที่สั่งเบิก</span>',
        customClass: {
          title: "sarabun-bold", // ใส่คลาสให้กับ title
        },
      });
    }
  };

  const handleCancel = () => {
    setFile(null); // ยกเลิกไฟล์ที่เลือก
    fileInputRef.current.value = ""; // รีเซ็ต input
  };

  const nextStep = () => {
    if (currentStep < 2) {
      setCurrentStep(currentStep + 1);
    }
  };

  const prevStep = () => {
    if (currentStep > 0) {
      setCurrentStep(currentStep - 1);
    }
  };

  const handleMaterialTypeChange = (event) => {
    setMaterialType(event.target.value);
  };

  const handleDateChange = (date) => {
    setApprovedDate(date ? date.format("YYYY-MM-DD") : null); // เก็บวันที่ในรูปแบบที่ต้องการ
  };

  return (
    <MainLayout>
      <div style={{ padding: "0 48px" }}>
        <Card style={{
                marginTop:"40px"
              }}>
            <div
              className="dashboard-title sarabun-bold"
              style={{
                fontSize: "25px",
                padding: "10px",
                marginBottom: "30px",
              }}
            >
              บันทึกข้อมูลการสั่งเบิกวัตถุดิบ :
            </div>
          
          <div>
            <Steps
              current={currentStep}
              style={{ marginBottom: "20px" }}
              className="sarabun-light"
            >
              <Step title="เลือกวัตถุดิบ" />
              <Step title="เลือกวันที่สั่งจ่าย" />
              <Step title="อัปโหลดไฟล์" />
            </Steps>

            {currentStep === 0 && (
              <div
                style={{
                  display: "flex",
                  flexDirection: "column",
                  alignItems: "center",
                  justifyContent: "center",
                  minHeight: "300px", // กำหนดความสูงเพื่อให้อยู่ตรงกลาง
                }}
              >
                <select
                  value={materialType}
                  onChange={handleMaterialTypeChange}
                  className="sarabun-light"
                  style={{
                    width: "300px",
                    height: "50px",
                    marginTop: "20px",
                    marginBottom: "20px",
                    fontSize: "16px",
                    borderRadius: "10px",
                    padding: "10px",
                    borderColor: "#5755FE",
                    backgroundColor: "#f0f0f0",
                    boxShadow: "0 4px 8px rgba(0, 0, 0, 0.2)",
                  }}
                >
                  <option value="">เลือกวัตถุดิบ</option>
                  <option value="PK_DIS">กล่องดิส/ใบแนบ/สติ๊กเกอร์</option>
                  <option value="PK_shoe">กล่องก้าม/ใบแนบ/สติ๊กเกอร์</option>
                  <option value="WD">กิ๊ฟล๊อค/แผ่นชิม</option>
                  <option value="PIN">สลัก/ตะขอ</option>
                  <option value="BP">แผ่นเหล็ก</option>
                  <option value="CHEMICAL">เคมี</option>
                </select>
                <Button
                  type="primary"
                  onClick={nextStep}
                  style={{
                    color: "#f0f0f0",
                    backgroundColor: "#5755FE",
                    borderColor: "#5755FE",
                    marginTop:"60px"
                  }}
                >
                  ถัดไป
                </Button>
              </div>
            )}

            {currentStep === 1 && (
              <div
                style={{
                  display: "flex",
                  flexDirection: "column",
                  alignItems: "center",
                  justifyContent: "center",
                  minHeight: "300px",
                }}
              >
                <DatePicker
                  onChange={handleDateChange}
                  format="YYYY-MM-DD"
                  style={{
                    width: "300px",
                    height: "50px",
                    padding: "12px 20px",
                    marginTop: "20px",
                    marginBottom: "20px",
                    fontSize: "16px",
                    borderRadius: "10px",
                    borderColor: "#5755FE",
                    backgroundColor: "#f0f0f0",
                    boxShadow: "0 4px 8px rgba(0, 0, 0, 0.2)",
                  }}
                  placeholder="เลือกวันที่สั่งจ่าย"
                  className="sarabun-light"
                />
                <div>
                  <Button
                    onClick={prevStep}
                    style={{
                      color: "#5755FE",
                      backgroundColor: "#f0f0f0",
                      borderColor: "#5755FE",
                      marginRight: "20px",
                      marginTop:"60px"
                    }}
                  >
                    ย้อนกลับ
                  </Button>
                  <Button
                    type="primary"
                    onClick={nextStep}
                    style={{
                      color: "#f0f0f0",
                      backgroundColor: "#5755FE",
                      borderColor: "#5755FE",
                      marginRight: "5px",
                      marginTop:"60px"
                    }}
                  >
                    ถัดไป
                  </Button>
                </div>
              </div>
            )}

            {currentStep === 2 && (
              <div
                style={{
                  display: "flex",
                  flexDirection: "column",
                  alignItems: "center",
                  justifyContent: "center",
                  minHeight: "400px",
                }}
              >
                <div
                  onDrop={handleDrop}
                  onDragOver={handleDragOver}
                  onDragLeave={handleDragLeave}
                  style={{
                    border: isDragging
                      ? "2px dashed #4caf50"
                      : "2px dashed #ccc",
                    borderRadius: "10px",
                    padding: "20px",
                    textAlign: "center",
                    marginBottom: "20px",
                    position: "relative",
                    width: "500px",
                    minHeight: "200px",
                    display: "flex", // Make the container a flexbox
                    alignItems: "center", // Vertically center the content
                    justifyContent: "center",
                  }}
                >
                  <input
                    type="file"
                    onChange={handleFileChange}
                    ref={fileInputRef}
                    style={{
                      position: "absolute",
                      top: 0,
                      left: 0,
                      width: "100%",
                      height: "100%",
                      opacity: 0,
                      cursor: "pointer",
                    }}
                  />
                  <p className="sarabun-light" style={{ margin: 0 }}>
                    {file
                      ? "ไฟล์ถูกเลือกแล้ว"
                      : "ลากและวางไฟล์ที่นี่ หรือคลิกเพื่อเลือกไฟล์"}
                  </p>
                </div>
                {file && (
                  <div
                    style={{
                      display: "flex",
                      alignItems: "center",
                      marginBottom: "10px",
                    }}
                  >
                    <p style={{ margin: 0, marginRight: "10px" }}>
                      {file.name}
                    </p>
                    <button
                      onClick={handleCancel}
                      style={{
                        background: "none",
                        border: "none",
                        color: "#ff4d4f",
                        cursor: "pointer",
                        fontSize: "16px",
                      }}
                    >
                      ✖
                    </button>
                  </div>
                )}
                <div>
                  <Button
                    onClick={prevStep}
                    style={{
                      color: "#5755FE",
                      backgroundColor: "#f0f0f0",
                      borderColor: "#5755FE",
                      marginRight: "20px",
                      marginTop:"60px"
                    }}
                  >
                    ย้อนกลับ
                  </Button>
                  <Button
                    type="primary"
                    onClick={handleUpload}
                    disabled={!file}
                    style={{
                      color: "#f0f0f0",
                      backgroundColor: "#5755FE",
                      borderColor: "#5755FE",
                      marginRight: "5px",
                      marginTop:"60px"
                    }}
                  >
                    อัปโหลด
                  </Button>
                </div>
              </div>
            )}
          </div>
        </Card>
      </div>
    </MainLayout>
  );
};

export default UploadPage;
