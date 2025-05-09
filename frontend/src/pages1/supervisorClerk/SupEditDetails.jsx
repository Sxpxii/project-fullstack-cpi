import React, { useState, useEffect } from "react";
import { useParams, Link } from "react-router-dom";
import axios from "axios";
import { Button, Table, Radio, Card, Modal, Input, message } from "antd";
import MainLayout from "../../components/LayoutSupervisorClerk";
import "../../styles1/EditDetails.css";
import config from "../../configAPI";
import Swal from "sweetalert2";
import { useNavigate } from "react-router-dom";

const SupEditDetails = () => {
  const [username, setUsername] = useState("");
  const [data, setData] = useState([]);
  const { upload_id } = useParams();
  const [tempData, setTempData] = useState([]); // เก็บข้อมูลชั่วคราว
  const [totalRequested, setTotalRequested] = useState(0);
  const [formattedData, setFormattedData] = useState([]);
  const [isEditModalVisible, setIsEditModalVisible] = useState(false); // เพิ่มการจัดการ modal
  const [currentRecord, setCurrentRecord] = useState(null); // สำหรับเก็บ record ปัจจุบัน
  const [managerReason, setManagerReason] = useState(""); // สำหรับเก็บเหตุผลที่เลือก
  const [isOtherReason, setIsOtherReason] = useState(false); // ตรวจสอบว่าเหตุผลเป็น "อื่นๆ" หรือไม่
  const [inputReason, setInputReason] = useState("");

  const navigate = useNavigate();

  const fetchData = async () => {
    if (!upload_id) {
      console.error("upload_id is undefined");
      return;
    }

    try {
      const token = sessionStorage.getItem("token");
      const response = await axios.get(
        `${config.API_URL}/supClerkTasks/details/${upload_id}`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

      const formattedData = response.data.map((item) => ({
        ...item,
        manager_reason: item.manager_reason || "-",
      }));
      console.log("Fetched Data:", formattedData);
      setData(formattedData);
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
        `${config.API_URL}/supClerkTasks/total-requested-quantity/${upload_id}`,
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
    setCurrentRecord(record);
    setManagerReason(record.manager_reason || ""); // กำหนดเหตุผลปัจจุบันให้กับ modal
    setIsEditModalVisible(true);
  };

  const handleReasonChange = (e) => {
    const selectedReason = e.target.value;
    setManagerReason(selectedReason);
    if (selectedReason === "รอวัตถุดิบเข้า") {
      setIsOtherReason(true);
      setInputReason("");
    } else {
      setIsOtherReason(false);
    }
  };

  const handleSave = () => {
    if (currentRecord && managerReason) {
      // ตรวจสอบว่าเหตุผลเป็น "รอวัตถุดิบเข้า"
      if (managerReason === "รอวัตถุดิบเข้า") {
        // ตรวจสอบว่า inputReason ไม่ว่างเปล่า
        if (!inputReason) {
          Swal.fire({
            icon: "warning",
            title: "กรุณากรอกเหตุผล",
            html: '<span class="sarabun-light">กรุณากรอกเหตุผลในการรอวัตถุดิบ</span>',
            customClass: {
              title: "sarabun-bold", // ใส่คลาสให้กับ title
            },
          });
          return; // หยุดการบันทึกข้อมูล
        }
      }

      const reasonToSave =
        managerReason === "รอวัตถุดิบเข้า" && inputReason
          ? `${managerReason}: ${inputReason}`
          : managerReason;

      setTempData((prevTempData) => {
        const updatedTempData = [
          ...prevTempData.filter((item) => item.id !== currentRecord.id),
          { id: currentRecord.id, manager_reason: reasonToSave },
        ];
        console.log("Updated TempData:", updatedTempData); // เพิ่ม log ที่นี่
        return updatedTempData;
      });
      setIsEditModalVisible(false);
      setManagerReason("");
      setInputReason("");
    } else {
      Swal.fire({
        icon: "warning",
        title: "กรุณาเลือกเหตุผลก่อนบันทึก",
        text: "กรุณาเลือกเหตุผลเพื่อดำเนินการบันทึก",
        html: '<span class="sarabun-light">กรุณาเลือกเหตุผลเพื่อดำเนินการบันทึก</span>',
        customClass: {
          title: "sarabun-bold", // ใส่คลาสให้กับ title
        },
      });
    }
  };

  //ฟังก์ชันการบันทึกเหตุผลการแก้ไขของหัวหน้า
  const handleConfirmEdit = async () => {
    Modal.confirm({
      title: "ยืนยันการตรวจสอบ",
      content: "คุณต้องการบันทึกการตรวจสอบหรือไม่?",
      okText: "ยืนยัน",
      cancelText: "ยกเลิก",
      onOk: async () => {
        try {
          const token = sessionStorage.getItem("token");
          const response = await axios.post(
            `${config.API_URL}/supClerkTasks/confirm-edit/${upload_id}`,
            { tempData },
            {
              headers: { Authorization: `Bearer ${token}` },
            }
          );

          if (response.status === 200) {
            // แสดง SweetAlert2 เมื่อบันทึกสำเร็จ
            Swal.fire({
              icon: "success",
              title: "บันทึกการตรวจสอบสำเร็จ",
              html: '<span class="sarabun-light">การตรวจสอบของคุณได้รับการบันทึกเรียบร้อยแล้ว!</span>',
              confirmButtonText: "ตกลง",
              customClass: {
                title: "sarabun-bold", // ใส่คลาสให้กับ title
              },
            }).then(() => {
              // เมื่อกด "ตกลง" ใน SweetAlert2 ให้ทำการ navigate ไปที่หน้า /Approval
              fetchData(); // โหลดข้อมูลใหม่หลังจากบันทึกสำเร็จ
              navigate("/Approval");
            });
          } else {
            Swal.fire({
              icon: "error",
              title: "การบันทึกไม่สำเร็จ",
              html: '<span class="sarabun-light">เกิดข้อผิดพลาดในการบันทึกการตรวจสอบนี้!</span>',
              confirmButtonText: "ตกลง",
              customClass: {
                title: "sarabun-bold", // ใส่คลาสให้กับ title
              },
            });
          }
        } catch (error) {
          console.error("Error confirming edits:", error);
          message.error("ไม่สามารถบันทึกข้อมูลได้");
        }
      },
    });
  };

  const handleApprove = async () => {
    const result = await Swal.fire({
      title: "ยืนยันการอนุมัติ",
      html: "คุณต้องการอนุมัติรายการนี้หรือไม่?<br>หากยืนยันการอนุมัติจะไม่สามารถแก้ไขได้ในภายหลัง",
      icon: "question",
      showCancelButton: true,
      confirmButtonColor: "#5755FE",
      cancelButtonColor: "#f0f0f0",
      confirmButtonText: '<span style="color: #f0f0f0;">ใช่, อนุมัติ</span>',
      cancelButtonText: '<span style="color: #5755FE;">ยกเลิก</span>',
      customClass: {
        title: "sarabun-bold", // เพิ่มคลาสให้กับ title
        htmlContainer: "sarabun-light", // เพิ่มคลาสให้กับข้อความ
        confirmButton: "sarabun-light",
        cancelButton: "sarabun-light",
      },
    });
    if (result.isConfirmed) {
      try {
        console.log("Approving data:", tempData);
        const token = sessionStorage.getItem("token");
        const response = await axios.post(
          `${config.API_URL}/supClerkTasks/approve/${upload_id}`,
          { data: tempData },
          {
            headers: {
              Authorization: `Bearer ${token}`,
            },
          }
        );

        if (response.data.success) {
          // แสดง SweetAlert2 เมื่ออนุมัติสำเร็จ
          Swal.fire({
            icon: "success",
            title: "อนุมัติรายการสำเร็จ",
            html: '<span class="sarabun-light">คุณได้อนุมัติรายการเรียบร้อยแล้ว!</span>',
            timer: 1000, // ปิดหน้าต่างแจ้งเตือนหลังจาก 2 วินาที
        showConfirmButton: false, // ไม่ให้แสดงปุ่ม OK
            customClass: {
              title: "sarabun-bold", // ใส่คลาสให้กับ title
            },
          }).then(() => {
            // เมื่อกด "ตกลง" ใน SweetAlert2 ให้ทำการ navigate ไปที่หน้า /Approval
            navigate("/Approval");
          });
        } else {
          Swal.fire({
            icon: "error",
            title: "การอนุมัติไม่สำเร็จ",
            html: '<span class="sarabun-light">เกิดข้อผิดพลาดในการอนุมัติรายการนี้!</span>',
            confirmButtonText: "ตกลง",
            customClass: {
              title: "sarabun-bold", // ใส่คลาสให้กับ title
            },
          });
        }
      } catch (error) {
        Swal.fire({
          icon: "error",
          title:
            '<span style="font-family: Sarabun-Bold;">เกิดข้อผิดพลาด</span>',
          html: '<span style="font-family: Sarabun-Light;">เกิดข้อผิดพลาดในการอนุมัติ!</span>',
          confirmButtonText: "ตกลง",
        });
        console.error(error);
      }
    }
  };

  const columns = [
    {
      title: "รายการ",
      dataIndex: "mat_name",
      key: "mat_name",
      render: (text, record, index) => ({
        children: <span>{text}</span>,
        props: { rowSpan: record.rowSpanMatName },
      }),
      align: "left",
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
      title: "จำนวนที่ต้องหยิบ",
      dataIndex: "quantity",
      key: "quantity",
      render: (text, record) => <span>{formatNumber(text)}</span>,
      align: "center",
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
      title: "จำนวนจ่ายจริง",
      dataIndex: "actual_quantity",
      key: "actual_quantity",
      render: (text, record) => <span>{formatNumber(text)}</span>,
      onHeaderCell: () => ({
        style: {
          backgroundColor: "#00152a", // สีพื้นหลังของหัวคอลัมน์
          fontWeight: "bold", // ความหนาของตัวอักษร
          fontSize: "14px", // ขนาดตัวอักษร
          color: "#ffffff", // สีตัวอักษร
        },
      }),
      align: "center",
    },
    {
      title: "เหตุผล (จ่ายจริง)",
      dataIndex: "employee_reason",
      key: "employee_reason",
      render: (text, record) => <span>{text}</span>,
      onHeaderCell: () => ({
        style: {
          backgroundColor: "#00152a", // สีพื้นหลังของหัวคอลัมน์
          fontWeight: "bold", // ความหนาของตัวอักษร
          fontSize: "14px", // ขนาดตัวอักษร
          color: "#ffffff", // สีตัวอักษร
        },
      }),
      align: "center",
    },
    {
      title: "ตรวจสอบ/แก้ไข",
      dataIndex: "manager_reason",
      key: "manager_reason",
      align: "center",
      render: (text, record) => {
        if (
          record.quantity !== record.actual_quantity &&
          !tempData.find((item) => item.id === record.id)
        ) {
          // If there is a manager_reason from the backend, show it, otherwise show the "ตรวจสอบ" button
          const managerReason =
            record.manager_reason && record.manager_reason !== "-" ? (
              record.manager_reason
            ) : (
              <Button
                style={{
                  color: "#f0f0f0",
                  backgroundColor: "red",
                  borderColor: "red",
                }}
                type="primary"
                onClick={() => handleEditRow(record)}
              >
                ตรวจสอบ
              </Button>
            );
          return <span>{managerReason}</span>;
        }
        const savedReason = tempData.find(
          (item) => item.id === record.id
        )?.manager_reason;
        return <span>{savedReason || text}</span>;
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

  // ฟังก์ชันสำหรับจัดรูปแบบตัวเลข
  const formatNumber = (number) => {
    return new Intl.NumberFormat().format(number);
  };

  useEffect(() => {
    // แปลงข้อมูลเพื่อแสดงคำถามแต่ละข้อเป็นแถว
    const formattedData = Array.isArray(data)
      ? data.flatMap((m) =>
          m.details.map((d, index) => {
            const reason =
              d.manager_reason || tempData[d.id]?.manager_reason || "-";
            return {
              ...d,
              matunit: m.matunit,
              mat_name: m.mat_name,
              rowSpanMatunit: index === 0 ? m.details.length : 0,
              rowSpanMatName: index === 0 ? m.details.length : 0, // แสดง mat_name ในทุกแถวที่เกี่ยวข้อง
              rowSpanQuantity: index === 0 ? m.details.length : 0,
              counted_quantity: d.counted_quantity, // ใช้ counted_quantity ถ้ามี หรือ remaining_quantity ถ้าไม่มี
              reason: reason,
            };
          })
        )
      : [];
    setFormattedData(formattedData); // อัปเดตข้อมูลใน formattedData
  }, [data]); // คำนวณใหม่เมื่อข้อมูลเหล่านี้เปลี่ยนแปลง

  const isConfirmEditEnabled = () => {
    // คำนวณจำนวน id ที่มีค่า check เป็น true ใน formattedData
    const idsWithCheckTrue = formattedData
      .filter((item) => item.check === true)
      .map((item) => item.id);
    //console.log('จำนวน id ที่ check เป็น true ใน formattedData:', idsWithCheckTrue.length);
    //console.log('id ที่ check เป็น true ใน formattedData:', idsWithCheckTrue);

    // คำนวณจำนวน id ที่ check เป็น true ใน tempData
    const tempIdsWithCheckTrue = tempData
      .filter((temp) => {
        const matchingData = formattedData.find((item) => item.id === temp.id);
        return matchingData && matchingData.check === true;
      })
      .map((temp) => temp.id);
    //console.log('จำนวน id ที่ check เป็น true ใน tempData:', tempIdsWithCheckTrue.length);
    //console.log('id ที่ check เป็น true ใน tempData:', tempIdsWithCheckTrue);

    // ตรวจสอบว่า ids ทั้งสองชุดตรงกันหรือไม่
    const idsMatch =
      idsWithCheckTrue.length === tempIdsWithCheckTrue.length &&
      idsWithCheckTrue.every((id) => tempIdsWithCheckTrue.includes(id));

    //console.log('ผลการตรวจสอบ ids ตรงกันหรือไม่:', idsMatch);

    return idsMatch;
  };

  return (
    <MainLayout>
      <div
        style={{
          display: "flex",
          justifyContent: "flex-end",
          padding: "10px",
        }}
      >
        {/* ปุ่มอนุมัติ */}
        <Button
          style={{
            backgroundColor: "green", // ปรับให้ปุ่ม "ปิดงาน" เป็นสีเขียว
            borderColor: "green", // ขอบของปุ่มเป็นสีเขียว
            fontSize: "18px", // เพิ่มขนาดตัวอักษร
            width: "120px", // กำหนดความกว้าง
            height: "90px", // กำหนดความสูง (เท่ากับ width)
            display: "flex", // ใช้ flexbox เพื่อจัดให้อยู่ตรงกลาง
            alignItems: "center",
            justifyContent: "center",
            borderRadius: "18px",
          }}
          onClick={() => handleApprove(upload_id)}
        >
          อนุมัติ
        </Button>
      </div>

      <div>
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
            ตรวจสอบยอดคงเหลือของวัตถุดิบ :
          </div>
          <div className="table-container ">
            <Table
              columns={columns}
              dataSource={formattedData}
              pagination={false}
              rowKey={(record) => record.id}
              scroll={{ x: "max-content" }}
              className="custom-table"
              rowClassName={(record) => {
                // ตรวจสอบว่าค่า quantity ไม่เท่ากับ actual_quantity
                return record.quantity !== record.actual_quantity
                  ? "highlight-row"
                  : "";
              }}
            />
          </div>
          <div
            className="summary-container sarabun-bold"
            style={{
              backgroundColor: " #DCDCDC",
              marginBottom: "20px",
              borderRadius: "8px",
            }}
          >
            <p
              style={{ fontSize: "18px", marginLeft: "20px", padding: "10px" }}
            >
              <strong>รวมจำนวนที่สั่งเบิก:</strong>{" "}
              {formatNumber(totalRequested)}
            </p>
          </div>

          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              marginTop: "20px",
            }}
          >
            {/* ปุ่มย้อนกลับ */}
            <Link to="/Approval">
              <Button
                style={{
                  color: "#5755FE",
                  backgroundColor: "#f0f0f0",
                  borderColor: "#5755FE",
                }}
              >
                ย้อนกลับ
              </Button>
            </Link>

            {/* ปุ่มยืนยันการแก้ไข */}
            <Button
              type="primary"
              onClick={handleConfirmEdit}
              disabled={!isConfirmEditEnabled()} // ปิดปุ่มถ้าไม่มีข้อมูลใน tempData
              style={{
                margin: "0 auto", // จัดให้อยู่กลาง
                color: "#f0f0f0",
                backgroundColor: isConfirmEditEnabled() ? "#5755FE" : "gray", // เปลี่ยนสีปุ่มตามสถานะ
                borderColor: isConfirmEditEnabled() ? "#5755FE" : "gray", // เปลี่ยนสีกรอบปุ่มตามสถานะ
              }}
            >
              ยืนยันการตรวจสอบ
            </Button>
          </div>
        </Card>
      </div>

      {/* Modal for Editing */}
      <Modal
        title="เลือกเหตุผล"
        open={isEditModalVisible}
        onCancel={() => setIsEditModalVisible(false)}
        footer={[
          <Button
            key="save"
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
          value={managerReason}
          style={{
            display: "flex",
            flexDirection: "column",
          }}
        >
          <Radio className="sarabun-light" value="จ่ายวัตถุดิบเท่าที่เหลือ">
            จ่ายวัตถุดิบเท่าที่เหลือ
          </Radio>
          <Radio className="sarabun-light" value="รอ QC ตรวจสอบ">
            รอ QC ตรวจสอบ 
          </Radio>
          <Radio className="sarabun-light" value="รอวัตถุดิบเข้า">
            รอวัตถุดิบเข้า (ระบุ lot เช่น 16/11/2024 TPPM : 4 ชิ้น))
          </Radio>
        </Radio.Group>
        {isOtherReason && (
          <Input
            className="sarabun-light"
            value={inputReason}
            onChange={(e) => setInputReason(e.target.value)}
            placeholder="ระบุ lot (เช่น 16/11/2024  TPPM : 4 ชิ้น)"
            style={{ marginTop: 10 }}
          />
        )}
      </Modal>
    </MainLayout>
  );
};

export default SupEditDetails;
