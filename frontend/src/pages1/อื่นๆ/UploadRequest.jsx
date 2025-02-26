// src/pages1/UploadRequest.jsx
import React, { useState, useEffect } from "react";
import axios from "axios";
import { Link, useNavigate } from "react-router-dom";
import {
  Spin,
  message,
  Card,
  Breadcrumb,
  DatePicker,
  Button,
  Steps,
  Upload,
  Select,
} from "antd";
import MainLayout from "../../components/LayoutClerk";
import "../../styles1/UploadRequest.css";
import config from "../../configAPI";
import Swal from "sweetalert2";

const { Step } = Steps;
const { Option } = Select;

const UploadRequest = () => {
  const [currentStep, setCurrentStep] = useState(0);
  const [selectedFile, setSelectedFile] = useState(null);
  const [materialType, setMaterialType] = useState("");
  const [approvedDate, setApprovedDate] = useState(null);
  const [loading, setLoading] = useState(false);
  const [uploadMessage, setUploadMessage] = useState("");
  const navigate = useNavigate(); // สร้างฟังก์ชัน navigate โดยใช้ useNavigate

  const handleNext = () => {
    if (currentStep < 3) {
      setCurrentStep(currentStep + 1);
    }
  };

  const handlePrev = () => {
    if (currentStep > 0) {
      setCurrentStep(currentStep - 1);
    }
  };

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
      Swal.fire({
        icon: "error",
        title: "ข้อมูลไม่ครบถ้วน",
        text: "กรุณาเลือกไฟล์ วัตถุดิบ และวันที่สั่งเบิก",
      });
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
        console.log("Response from server:", response);
        // Call the handleUploadResponse function
        handleUploadResponse(response);
      })
      .catch((error) => {
        if (error.response) {
          const status = error.response.status;
          const errorMessage = error.response.data.message;
          if (status === 400) {
            if (errorMessage.includes("ไม่พบชีตที่ชื่อ")) {
              Swal.fire({
                icon: "error",
                title: "ไม่พบชีตที่ชื่อตรงกับวัตถุดิบที่เลือก",
                text: "กรุณาตรวจสอบไฟล์และลองใหม่อีกครั้ง",
              });
            }
          } else if (error.response.data.insufficientMaterials) {
            // ใช้ข้อมูลที่ได้จาก insufficientMaterials
            const insufficientMaterials =
              error.response.data.insufficientMaterials;
            console.log("Insufficient Materials:", insufficientMaterials);

            // เรียก showInsufficientStockAlert เพื่อแสดงการแจ้งเตือน
            if (insufficientMaterials && insufficientMaterials.length > 0) {
              showInsufficientStockAlert(insufficientMaterials);
            }
          }
        } else if (status === 500) {
          Swal.fire({
            icon: "error",
            title: "ข้อผิดพลาดภายในเซิร์ฟเวอร์",
            text: "กรุณาติดต่อผู้ดูแลระบบ",
          });
        } else {
          console.error("Unexpected Error:", error.message);
          Swal.fire({
            icon: "error",
            title: "เกิดข้อผิดพลาดที่ไม่คาดคิด",
            text: "โปรดลองใหม่อีกครั้ง",
          });
        }
      })
      .finally(() => {
        setLoading(false); // ปิดการโหลด
      });
  };

  const handleFetchAndAddMaterials = async () => {
    setLoading(true);
    try {
      const token = sessionStorage.getItem("token");
      const response = await axios.get(
        `${config.API_URL}/materials/fetch-materials-db2`,
        {
          headers: { Authorization: `Bearer ${token}` },
        }
      );

      message.success("เพิ่มข้อมูลวัตถุดิบเรียบร้อยแล้ว");
    } catch (error) {
      console.error("Error fetching and adding materials:", error);
      message.error("เกิดข้อผิดพลาดในการเพิ่มข้อมูลวัสดุ");
    } finally {
      setLoading(false);
    }
  };

  // ฟังก์ชันสำหรับแสดงการแจ้งเตือนกรณีวัตถุดิบไม่เพียงพอ
  const showInsufficientStockAlert = (materials) => {
    const materialList = materials
      .map((material) => `<li>${material.material_name}</li>`)
      .join("");

    Swal.fire({
      icon: "error",
      title: "บันทึกการสั่งเบิกไม่ได้",
      html: `<p>รายการวัตถุดิบดังต่อไปนี้ไม่เพียงพอ:</p><ul>${materialList}</ul>`,
      confirmButtonText: "ตกลง",
    }).then((result) => {
      if (result.isConfirmed) {
        // เมื่อผู้ใช้กด "ตกลง" ให้ทำการ navigate(0) เพื่อรีเฟรชหน้า
        navigate(0);
      }
    });
  };

  // ฟังก์ชันที่รับข้อมูลจาก API หลังจากที่ทำการอัปโหลดไฟล์
  const handleUploadResponse = (response) => {
    console.log("ข้อมูลที่ได้รับจาก Backend:", response);
    if (response.status === 400 && response.data.insufficientMaterials) {
      console.log(
        "Insufficient materials:",
        response.data.insufficientMaterials
      );
      // เรียกใช้งานฟังก์ชัน showInsufficientStockAlert เมื่อมีวัตถุดิบไม่เพียงพอ
      showInsufficientStockAlert(response.data.insufficientMaterials);
    } else if (response.status === 500) {
      message.error("เกิดข้อผิดพลาดจากเซิร์ฟเวอร์ โปรดลองใหม่อีกครั้ง");
    } else {
      // แสดงข้อความแจ้งเตือนกรณีสำเร็จ
      if (response.status === 200) {
        Swal.fire({
          icon: "success",
          title: "บันทึกการสั่งเบิกสำเร็จ",
          confirmButtonText: "ตกลง",
        }).then((result) => {
          if (result.isConfirmed) {
            // เมื่อผู้ใช้กด "ตกลง" ให้ทำการ navigate
            navigate(0);
          }
        });
      }
    }
  };

  return (
    <MainLayout username="User">
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
        <Steps current={currentStep} className="sarabun-light">
          <Step title="ดึงข้อมูลวัตถุดิบ" />
          <Step title="เลือกวัตถุดิบ" />
          <Step title="เลือกวันที่สั่งจ่าย" />
          <Step title="อัปโหลดไฟล์" />
        </Steps>

        {currentStep === 0 && (
          <div
            style={{
              display: "flex",
              justifyContent: "center",
              alignItems: "center",
            }}
          >
            <Button
              type="primary"
              onClick={handleFetchAndAddMaterials}
              loading={loading}
              style={{
                marginTop: "100px",
                color: "#fff",
                backgroundColor: "#006400", // สีที่เด่นกว่าปุ่มอื่น ๆ
                borderColor: "#006400",
                fontSize: "18px", // ขนาดใหญ่ขึ้น
                padding: "16px 32px", // ขยายขนาดของปุ่ม
                boxShadow: "0 4px 8px rgba(0, 0, 0, 0.2)", // เพิ่มเงาให้ปุ่ม
                marginBottom: "100px",
              }}
            >
              ดึงข้อมูลวัตถุดิบ
            </Button>
          </div>
        )}

        <div className="content-container">
          <div
            className="material-selector"
            style={{
              display: "flex",
              justifyContent: "space-between",
            }}
          >
            {currentStep === 1 && (
              <div>
                <select
                  value={materialType}
                  onChange={handleMaterialTypeChange}
                  className="sarabun-light"
                  style={{
                    width: "300px", // เพิ่มขนาดให้ใหญ่ขึ้น
                    height: "50px", // เพิ่มความสูงเพื่อความชัดเจน
                    marginTop: "100px",
                    marginBottom: "100px",
                    fontSize: "16px", // เพิ่มขนาดตัวอักษร
                    borderRadius: "10px", // ทำให้มุมมน
                    padding: "10px", // เพิ่ม padding เพื่อให้ดูดีขึ้น
                    borderColor: "#5755FE", // ใช้สีที่เด่นขึ้น
                    backgroundColor: "#f0f0f0", // พื้นหลังสว่างขึ้น
                    boxShadow: "0 4px 8px rgba(0, 0, 0, 0.2)", // เพิ่มเงาให้เด่นขึ้น
                  }}
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
            )}

            {currentStep === 2 && (
              <div>
                <DatePicker
                  onChange={handleDateChange}
                  format="YYYY-MM-DD"
                  style={{
                    width: "300px", // เพิ่มขนาดให้ใหญ่ขึ้น
                    height: "50px", // เพิ่มความสูงเพื่อความชัดเจน
                    padding: "12px 20px", // เพิ่ม padding ให้ชัดเจน
                    marginTop: "100px",
                    marginBottom: "100px",
                    fontSize: "16px", // ขยายขนาดตัวอักษร
                    borderRadius: "10px", // เพิ่มมุมมน
                    borderColor: "#5755FE", // ใช้สีเดียวกับ select เพื่อความสอดคล้อง
                    backgroundColor: "#f0f0f0", // เพิ่มพื้นหลังที่สว่างขึ้น
                    boxShadow: "0 4px 8px rgba(0, 0, 0, 0.2)", // เพิ่มเงาให้ดูเด่น
                  }}
                  placeholder="เลือกวันที่สั่งจ่าย"
                  className="sarabun-light"
                />
              </div>
            )}
          </div>

          {currentStep === 3 && (
            <div
              className="upload-box"
              style={{
                marginTop: "20px",
                marginBottom: "60px",
              }}
            >
              <input
                type="file"
                onChange={handleFileChange}
                className="sarabun-light"
              />
              {loading && <Spin />} {/* แสดง Spin ถ้า loading เป็น true */}
              {uploadMessage && <p>{uploadMessage}</p>}
            </div>
          )}

          <div>
            {currentStep > 0 && (
              <Button
                onClick={handlePrev}
                className="sarabun-light"
                style={{
                  color: "#5755FE",
                  backgroundColor: "#f0f0f0",
                  borderColor: "#5755FE",
                  marginRight: "20px",
                }}
              >
                ย้อนกลับ
              </Button>
            )}
            {currentStep < 3 && (
              <Button
                type="primary"
                onClick={handleNext}
                className="sarabun-light"
                style={{
                  color: "#f0f0f0",
                  backgroundColor: "#5755FE",
                  borderColor: "#5755FE",
                  marginRight: "5px",
                }}
              >
                ถัดไป
              </Button>
            )}
            {currentStep === 3 && (
              <Button
                type="primary"
                onClick={handleSave}
                loading={loading}
                className="sarabun-light"
                style={{
                  color: "#f0f0f0",
                  backgroundColor: "#5755FE",
                  borderColor: "#5755FE",
                  marginRight: "5px",
                }}
              >
                บันทึก
              </Button>
            )}
          </div>
        </div>
      </Card>
    </MainLayout>
  );
};

export default UploadRequest;
