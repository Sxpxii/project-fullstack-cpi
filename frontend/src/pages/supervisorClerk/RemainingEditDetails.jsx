import React, { useState, useEffect } from "react";
import { useParams, Link } from "react-router-dom";
import axios from "axios";
import { Button, Table, Radio, Card, Modal, Input, message } from "antd";
import MainLayout from "../../components/LayoutSupervisorClerk";
import "../../styles/EditDetails.css";
import config from "../../configAPI";
import Swal from "sweetalert2";
import { useNavigate } from "react-router-dom";

const RemainingEditDetails = () => {
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
  const [inventoryId, setInventoryId] = useState(null);

  const navigate = useNavigate();

  const fetchData = async () => {
    if (!upload_id) {
      console.error("upload_id is undefined");
      return;
    }

    try {
      const token = sessionStorage.getItem("token");
      const response = await axios.get(
        `${config.API_URL}/supClerkTasks/remaining-details/${upload_id}`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

      const formattedData = response.data.map((item) => ({
        ...item,
        manager_reason_remaining: item.manager_reason_remaining || "-",
      }));
      console.log("Fetched Data:", formattedData);
      setData(formattedData);
      setInventoryId(response.data[0].inventory_id || null);
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
    setManagerReason(record.manager_reason_remaining || ""); // กำหนดเหตุผลปัจจุบันให้กับ modal
    setIsEditModalVisible(true);
  };

  const handleReasonChange = (e) => {
    const selectedReason = e.target.value;
    setManagerReason(selectedReason);
    if (selectedReason === "อื่นๆ") {
      setIsOtherReason(true);
      setInputReason("");
    } else {
      setIsOtherReason(false);
    }
  };

  const handleSave = () => {
    if (currentRecord && managerReason) {
      // ตรวจสอบว่าเหตุผลเป็น "รอวัตถุดิบเข้า"
      if (managerReason === "อื่นๆ") {
        // ตรวจสอบว่า inputReason ไม่ว่างเปล่า
        if (!inputReason) {
          message.warning("กรุณากรอกหตุผล");
          return; // หยุดการบันทึกข้อมูล
        }
      }

      const reasonToSave =
        managerReason === "อื่นๆ" && inputReason
          ? `${inputReason}`
          : managerReason;

      setTempData((prevTempData) => {
        const updatedTempData = [
          ...prevTempData.filter((item) => item.id !== currentRecord.id),
          { id: currentRecord.id, manager_reason_remaining: reasonToSave },
        ];
        console.log("Updated TempData:", updatedTempData); // เพิ่ม log ที่นี่
        return updatedTempData;
      });
      setIsEditModalVisible(false);
      setManagerReason("");
      setInputReason("");
    } else {
      message.warning("กรุณาเลือกเหตุผลก่อนบันทึก");
    }
  };

  const handleApproveRemaining = async () => {
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
          `${config.API_URL}/supClerkTasks/approveRemaining/${upload_id}`,
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
            text: "รายการของคุณได้รับการอนุมัติเรียบร้อยแล้ว!",
            showConfirmButton: false,
            timer: 1000,
            customClass: {
              title: "sarabun-bold", // เพิ่มคลาสให้กับ title
              htmlContainer: "sarabun-light", // เพิ่มคลาสให้กับข้อความ
            },
          }).then(() => {
            // เมื่อกด "ตกลง" ใน SweetAlert2 ให้ทำการ navigate ไปที่หน้า /Approval
            navigate("/Approval");
          });
        } else {
          Swal.fire({
            icon: "error",
            title: "การอนุมัติไม่สำเร็จ",
            text: "เกิดข้อผิดพลาดในการอนุมัติรายการนี้!",
            showConfirmButton: false,
            timer: 1000,
            customClass: {
              title: "sarabun-bold", // เพิ่มคลาสให้กับ title
              htmlContainer: "sarabun-light", // เพิ่มคลาสให้กับข้อความ
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
      title: "จำนวนที่สั่งเบิก",
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
      title: "จำนวนนับจริง",
      dataIndex: "counted_quantity",
      key: "counted_quantity",
      render: (text, record) => {
        // Check if the value is null, if so, display "-"
        const displayValue = text === null ? "-" : formatNumber(text);
        return <span>{displayValue}</span>;
      },
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
      title: "ตรวจสอบคงเหลือ",
      dataIndex: "manager_reason_remaining",
      key: "manager_reason_remaining",
      align: "center",
      render: (text, record) => {
        if (
          record.remaining_quantity !== record.counted_quantity &&
          !tempData.find((item) => item.id === record.id)
        ) {
          // If there is a manager_reason from the backend, show it, otherwise show the "ตรวจสอบ" button
          const managerReason =
            record.manager_reason_remaining &&
            record.manager_reason_remaining !== "-" ? (
              record.manager_reason_remaining
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
        )?.manager_reason_remaining;
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
              d.manager_reason_remaining ||
              tempData[d.id]?.manager_reason_remaining ||
              "-";
            return {
              ...d,
              mat_unit: m.mat_unit,
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
        className="dashboard-title sarabun-bold"
        style={{
          fontSize: "30px",
          textAlign: "center", // จัดข้อความตรงกลาง
          display: "flex",
          justifyContent: "center", // จัดให้อยู่ตรงกลางแนวนอน
          alignItems: "center", // จัดให้อยู่ตรงกลางแนวตั้ง (ถ้าสูง)
          height: "50px", // ตั้งความสูงให้พอดี
          marginBottom: "30px",
          marginTop: "30px",
        }}
      >
        ใบสั่งงานเลขที่ : {inventoryId ? inventoryId : "N/A"}
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
                // ตรวจสอบว่าค่า remaining_quantity ไม่เท่ากับ counted_quantity
                return record.remaining_quantity !== record.counted_quantity
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
            className="button-container sarabun-light"
            style={{
              display: "flex",
              justifyContent: "center",
              marginTop: "10px",
            }}
          >
            {/* ปุ่มย้อนกลับ */}
            <Link to="/Approval">
              <Button
                style={{
                  color: "#5755FE",
                  backgroundColor: "#f0f0f0",
                  borderColor: "#5755FE",
                  marginRight: "40px",
                }}
              >
                ย้อนกลับ
              </Button>
            </Link>

            {/* ปุ่มอนุมัติ */}
            <Button
              style={{
                color: "#ffffff",
                backgroundColor: isConfirmEditEnabled() ? "green" : "gray", // เปลี่ยนสีปุ่มตามสถานะ
                borderColor: isConfirmEditEnabled() ? "green" : "gray", // เปลี่ยนสีกรอบปุ่มตามสถานะ
              }}
              onClick={() => handleApproveRemaining(upload_id)}
              disabled={!isConfirmEditEnabled()}
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
          <Radio className="sarabun-light" value="เช็คยอดคงเหลือผิด">
            เช็คยอดคงเหลือผิด
          </Radio>
          <Radio className="sarabun-light" value="จ่ายไม่ครบ">
            จ่ายไม่ครบ
          </Radio>
          <Radio className="sarabun-light" value="เกินมาจาก Supplier">
            เกินมาจาก Supplier
          </Radio>
          <Radio className="sarabun-light" value="ขาดมาจาก Supplier">
            ขาดมาจาก Supplier
          </Radio>
          <Radio className="sarabun-light" value="อื่นๆ">
            อื่นๆ
          </Radio>
        </Radio.Group>
        {isOtherReason && (
          <Input
            className="sarabun-light"
            value={inputReason}
            onChange={(e) => setInputReason(e.target.value)}
            placeholder="ระบุเหตุผล"
            style={{ marginTop: 10 }}
          />
        )}
      </Modal>
    </MainLayout>
  );
};

export default RemainingEditDetails;
