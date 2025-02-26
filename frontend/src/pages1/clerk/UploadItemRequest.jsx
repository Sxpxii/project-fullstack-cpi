// src/pages1/UploadItemRequest.jsx
import React, { useState, useRef, useEffect } from "react";
import axios from "axios";
import MainLayout from "../../components/LayoutClerk";
import config from "../../configAPI";
import { Table, Steps, Button, Card, DatePicker } from "antd";
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
  const [data, setData] = useState([]);
  const [isUploading, setIsUploading] = useState(false);
  const [formattedData, setFormattedData] = useState([]);
  const [uploadId, setUploadId] = useState(null);
  const [totalQuantity, setTotalQuantity] = useState(null);

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

      const response = await axios.post(
        `${config.API_URL}/itemrequests/upload`,
        formData,
        {
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "multipart/form-data",
          },
        }
      );

      setData(response.data.data); // ตั้งค่า data ที่ได้รับจาก API
      setIsUploading(false); // เสร็จสิ้นการอัปโหลด
      setUploadId(response.data.uploadId); // เก็บ uploadId
      setTotalQuantity(response.data.totalQuantity);
      console.log("Upload ID:", response.data.uploadId);
      console.log("Response from server:", response.data);
    } catch (error) {
      setIsUploading(false);
      console.error("Error uploading file:", error);
      Swal.fire({
        icon: "error",
        title: "เกิดข้อผิดพลาด",
        html: '<span class="sarabun-light">กรุณาลองใหม่อีกครั้ง</span>',
        customClass: {
          title: "sarabun-bold",
        },
      });
    }
  };

  const handleSave = async () => {
    Swal.fire({
      icon: "question",
      title: "ยืนยันการบันทึกข้อมูล",
      html: '<span class="sarabun-light">คุณต้องการบันทึกข้อมูลใช่หรือไม่?</span>',
      showCancelButton: true,
      confirmButtonText: "ใช่, บันทึกข้อมูล",
      cancelButtonText: "ยกเลิก",
      confirmButtonColor: "green",
      customClass: {
        title: "sarabun-bold",
        confirmButton: "sarabun-light",
        cancelButton: "sarabun-light",
      },
    }).then(async (result) => {
      if (result.isConfirmed) {
        try {
          // ทำการบันทึกข้อมูลที่แสดงใน Table
          Swal.fire({
            icon: "success",
            title: "บันทึกข้อมูลสำเร็จ",
            html: '<span class="sarabun-light">ข้อมูลถูกบันทึกเรียบร้อยแล้ว</span>',
            customClass: {
              title: "sarabun-bold",
            },
          }).then(() => {
            // หลังจากที่ผู้ใช้กดปุ่ม OK ใน Swal แล้วให้ navigate ไปที่ /dashboardClerk
            navigate("/dashboardClerk");
          });
        } catch (error) {
          console.error("Error saving data:", error);
          Swal.fire({
            icon: "error",
            title: "เกิดข้อผิดพลาดในการบันทึก",
            html: '<span class="sarabun-light">กรุณาลองใหม่อีกครั้ง</span>',
            customClass: {
              title: "sarabun-bold",
            },
          });
        }
      }
    });
  };

  const handleReturnData = async () => {
    if (!uploadId) {
      Swal.fire({
        icon: "error",
        title: "ไม่พบข้อมูล",
        html: '<span class="sarabun-light">ไม่สามารถยกเลิกข้อมูลได้</span>',
      });
      return;
    }

    // แสดงการยืนยันก่อนดำเนินการ
    const confirmation = await Swal.fire({
      title: "ยืนยันการยกเลิกการบันทึก",
      html: '<span class="sarabun-light">คุณต้องการยกเลิกการบันทึกนี้หรือไม่?</span>',
      icon: "warning",
      showCancelButton: true,
      confirmButtonColor: "#d33 ",
      confirmButtonText: "ยืนยัน",
      cancelButtonText: "ยกเลิก",
      customClass: {
        title: "sarabun-bold",
        confirmButton: "sarabun-light",
        cancelButton: "sarabun-light",
      },
    });

    if (!confirmation.isConfirmed) {
      return; // ผู้ใช้กดยกเลิก
    }

    try {
      const token = sessionStorage.getItem("token");
      const response = await axios.post(
        `${config.API_URL}/itemrequests/ReturnData`,
        { uploadId },
        {
          headers: {
            Authorization: `Bearer ${token}`, // Add the token to the headers
          },
        }
      );

      if (response.status === 200) {
        Swal.fire({
          icon: "success",
          title: "ยกเลิกข้อมูลสำเร็จ",
          html: '<span class="sarabun-light">ข้อมูลถูกยกเลิกเรียบร้อยแล้ว</span>',
          customClass: {
            title: "sarabun-bold",
          },
        }).then(() => {
          navigate("/dashboardClerk"); // รีเซ็ตข้อมูลหรือไปยังหน้าที่ต้องการหลังจากยกเลิก
        });
      }
    } catch (error) {
      console.error("Error rolling back data:", error);
      Swal.fire({
        icon: "error",
        title: "เกิดข้อผิดพลาด",
        html: '<span class="sarabun-light">ไม่สามารถยกเลิกข้อมูลได้</span>',
        customClass: {
          title: "sarabun-bold",
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

  // ฟังก์ชันสำหรับจัดรูปแบบตัวเลข
  const formatNumber = (number) => {
    return new Intl.NumberFormat().format(number);
  };

  useEffect(() => {
    // แปลงข้อมูลเพื่อแสดงคำถามแต่ละข้อเป็นแถว
    const formattedData = Array.isArray(data)
      ? data.flatMap((m) =>
          m.details.map((d, index) => {
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
            };
          })
        )
      : [];

    setFormattedData(formattedData); // อัปเดตข้อมูลใน formattedData
  }, [data]); // คำนวณใหม่เมื่อข้อมูลเหล่านี้เปลี่ยนแปลง

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
        children: <span>{`${record.mat_unit} : ${record.mat_name}`}</span>,
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
      title: "จำนวนสั่งเบิก",
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
      title: "คงเหลือ",
      dataIndex: "remainingQuantity",
      key: "remainingQuantity",
      onHeaderCell: () => ({
        style: {
          backgroundColor: "#00152a", // สีพื้นหลังของหัวคอลัมน์
          fontWeight: "bold", // ความหนาของตัวอักษร
          fontSize: "14px", // ขนาดตัวอักษร
          color: "#ffffff", // สีตัวอักษร
        },
      }),
      render: (text) => (text === 0 ? "0" : formatNumber(text)),
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
          borderTopRightRadius: "10px", // มุมโค้งด้านขวาบน
          borderBottomRightRadius: "10px", // มุมโค้งด้านขวาล่าง
        },
      }),
      render: (text) => (text === 0 ? "-" : formatNumber(text)),
      align: "center",
    },
  ];

  return (
    <MainLayout>
      <div style={{ padding: "0 48px" }}>
        <Card
          style={{
            marginTop: "40px",
          }}
        >
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
                  <option value="MRO">MRO</option>
                  <option value="rimweb">rimweb</option>
                  <option value="shoe">ก้ามเปล่า</option>
                  <option value="DIS">ดิสกึ่ง</option>
                  <option value="BRAKES">ผ้าเบรก</option>
                  <option value="pallet">พาเลท</option>
                </select>
                <Button
                  type="primary"
                  onClick={nextStep}
                  style={{
                    color: "#f0f0f0",
                    backgroundColor: "#5755FE",
                    borderColor: "#5755FE",
                    marginTop: "60px",
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
                      marginTop: "60px",
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
                      marginTop: "60px",
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
                <div
                  style={{
                    display: "flex",
                    justifyContent: "center",
                  }}
                >
                  <Button
                    onClick={prevStep}
                    style={{
                      color: "#5755FE",
                      backgroundColor: "#f0f0f0",
                      borderColor: "#5755FE",
                      marginRight: "20px",
                      marginTop: "60px",
                    }}
                  >
                    ย้อนกลับ
                  </Button>
                  <Button
                    type="primary"
                    onClick={handleUpload}
                    loading={isUploading}
                    disabled={!file}
                    style={{
                      color: "#f0f0f0",
                      backgroundColor: "#5755FE",
                      borderColor: "#5755FE",
                      marginRight: "5px",
                      marginTop: "60px",
                    }}
                  >
                    อัปโหลด
                  </Button>
                </div>
                {data.length > 0 && (
                  <div style={{ marginTop: "60px" }}>
                    <Table
                      columns={columns}
                      dataSource={formattedData}
                      rowKey="mat_lot"
                      pagination={false}
                    />
                    {totalQuantity !== null && (
                      <div
                        className="sarabun-bold"
                        style={{
                          marginTop: "20px",
                          fontSize: "20px",
                          color: "#5755FE",
                          textAlign: "right",
                        }}
                      >
                        <strong>ยอดรวมเบิกทั้งหมด : </strong>{formatNumber(totalQuantity)}
                      </div>
                    )}
                    <div
                      style={{
                        display: "flex",
                        justifyContent: "center",
                        marginTop: "40px",
                      }}
                    >
                      <Button
                        onClick={handleReturnData}
                        type="default"
                        style={{
                          color: "#ff4d4f",
                          backgroundColor: "#f0f0f0",
                          borderColor: "#ff4d4f",
                          marginRight: "20px",
                        }}
                      >
                        ยกเลิกการบันทึก
                      </Button>
                      <Button
                        onClick={handleSave}
                        type="primary"
                        style={{
                          color: "#f0f0f0",
                          backgroundColor: "green",
                          borderColor: "green",
                        }}
                      >
                        บันทึกข้อมูล
                      </Button>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        </Card>
      </div>
    </MainLayout>
  );
};

export default UploadPage;
