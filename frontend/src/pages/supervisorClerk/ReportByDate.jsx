import React, { useState, useEffect } from "react";
import axios from "axios";
import { Row, Col, Table, Button, Card, Spin } from "antd";
import config from "../../configAPI";
import MainLayout from "../../components/LayoutSupervisorClerk";
import dayjs from "dayjs";
import utc from "dayjs/plugin/utc";
import timezone from "dayjs/plugin/timezone";
import * as XLSX from "xlsx";
import { saveAs } from "file-saver";
import { FaFileExcel } from "react-icons/fa";

dayjs.extend(utc);
dayjs.extend(timezone);

const DateRangeFilter = () => {
  const [filterStartDate, setFilterStartDate] = useState("");
  const [filterEndDate, setFilterEndDate] = useState("");
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(false);

  const handleSearch = async () => {
    setLoading(true);
    try {
      const params = {};

      if (filterStartDate && filterEndDate) {
        // แปลง endDate ให้รวมเวลา 23:59:59
        const end = new Date(filterEndDate);
        end.setHours(23, 59, 59, 999); // <<< สำคัญตรงนี้

        params.startDate = filterStartDate;
        params.endDate = end.toISOString(); 
      }

      const response = await axios.get(
        `${config.API_URL}/supClerkReports/requests-reports`,
        { params }
      );
      console.log("Response data:", response.data);

      setData(Array.isArray(response.data) ? response.data : []);
    } catch (error) {
      console.error("Error fetching data:", error);
      alert("เกิดข้อผิดพลาดในการดึงข้อมูล");
    } finally {
      setLoading(false); // หยุดแสดง Spin
    }
  };

  const handleReset = () => {
    setFilterStartDate("");
    setFilterEndDate("");
    setData([]);
  };

  const exportToExcel = () => {
    if (data.length === 0) {
      alert("กรุณาค้นหาข้อมูลก่อนทำการ Export");
      return;
    }

    const exportData = data.map((item, index) => ({
      ลำดับ: index + 1,
      "Inventory ID": item.inventory_id,
      รายการ: item.mat_name,
      ล็อต: item.mat_lot,
      ตำแหน่ง: item.loc,
      จำนวนที่ต้องจ่าย: item.quantity,
      จำนวนจ่ายจริง: item.actual_quantity,
      จำนวนคงเหลือในโปรแกรม: item.remaining_quantity,
      จำนวนคงเหลือนับจริง: item.counted_quantity,
      "เหตุผลเจ้าหน้าที่ (จ่ายจริง)": item.employee_reason || "-",
      "เหตุผลเจ้าหน้าที่ (คงเหลือ)": item.employee_reason_remaining || "-",
      "เหตุผลหัวหน้า (จ่ายจริง)": item.manager_reason || "-",
      "เหตุผลหัวหน้า (คงเหลือ)": item.manager_reason_remaining || "-",
      เวลา: item.selected_time
        ? dayjs
            .utc(item.selected_time)
            .tz("Asia/Bangkok")
            .format("YYYY-MM-DD HH:mm:ss")
        : "-",
    }));

    const worksheet = XLSX.utils.json_to_sheet(exportData);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "รายละเอียด");

    const excelBuffer = XLSX.write(workbook, {
      bookType: "xlsx",
      type: "array",
    });

    const fileName = `Report.xlsx`;
    const dataBlob = new Blob([excelBuffer], {
      type: "application/octet-stream",
    });
    saveAs(dataBlob, fileName);
  };

  const columns = [
    {
      title: "ลำดับ",
      dataIndex: "index",
      key: "index",
      align: "center",
      width: 70,
      render: (text, record, index) => index + 1,
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
      title: "Inventory ID",
      dataIndex: "inventory_id",
      key: "inventory_id",
      align: "center",
      width: 300,
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
      title: "รายการ",
      dataIndex: "mat_name",
      key: "mat_name",
      align: "left",
      width: 300,
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
      title: "ล็อต", // เพิ่มคอลัมน์สำหรับวัตถุดิบ
      dataIndex: "mat_lot",
      key: "mat_lot",
      align: "center",
      width: 250,
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
      title: "ตำแหน่ง", // เพิ่มคอลัมน์สำหรับยอดสั่งเบิกทั้งหมด
      dataIndex: "loc",
      key: "loc",
      align: "center",
      width: 150,
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
      title: "จำนวนที่ต้องจ่าย",
      dataIndex: "quantity",
      key: "quantity",
      align: "center",
      width: 150,
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
      title: "จำนวนที่จ่ายจริง",
      dataIndex: "actual_quantity",
      key: "actual_quantity",
      align: "center",
      width: 150,
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
      align: "center",
      width: 150,
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
      title: "จำนวนคงเหลือนับจริง",
      dataIndex: "counted_quantity",
      key: "counted_quantity",
      align: "center",
      width: 150,
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
          เหตุผลเจ้าหน้าที่ (มีปัญหาจำนวนจ่ายจริง)
        </div>
      ),
      dataIndex: "employee_reason",
      key: "employee_reason",
      align: "center",
      width: 150,
      render: (text) => text || "-",
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
          เหตุผลเจ้าหน้าที่ (มีปัญหาจำนวนคงเหลือไม่ตรง)
        </div>
      ),
      dataIndex: "employee_reason_remaining",
      key: "employee_reason_remaining",
      align: "center",
      width: 150,
      render: (text) => text || "-",
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
          เหตุผลหัวหน้า (มีปัญหาจำนวนจ่ายจริง)
        </div>
      ),
      dataIndex: "manager_reason",
      key: "manager_reason",
      align: "center",
      width: 150,
      render: (text) => text || "-",
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
          เหตุผลหัวหน้า (มีปัญหาจำนวนคงเหลือไม่ตรง)
        </div>
      ),
      dataIndex: "manager_reason_remaining",
      key: "manager_reason_remaining",
      align: "center",
      width: 150,
      render: (text) => text || "-",
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
      title: "เวลา",
      dataIndex: "selected_time",
      key: "selected_time",
      align: "center",
      width: 150,
      render: (text) =>
        text
          ? dayjs.utc(text).tz("Asia/Bangkok").format("YYYY-MM-DD HH:mm:ss")
          : "-",
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
      title: "ธุรการ",
      dataIndex: "uploaded_by",
      key: "uploaded_by",
      align: "center",
      width: 150,
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
      title: "เจ้าหน้าที่",
      dataIndex: "assigned_to_name",
      key: "assigned_to_name",
      align: "center",
      width: 150,
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

  return (
    <MainLayout>
      <div style={{ padding: "0 48px" }}>
        <div
          className="sarabun-bold"
          style={{
            fontSize: "35px",
            marginLeft: "20px",
            marginTop: "30px",
            color: "#000000E0",
          }}
        >
          Report
        </div>
        <div
          style={{
            flex: 1,
            display: "flex",
            justifyContent: "flex-end",
          }}
        >
          <button
            className="sarabun-light"
            style={{
              color: "#f0f0f0",
              backgroundColor: "#28a745 ",
              borderColor: "#28a745",
              padding: "12px 20px", // เพิ่มขนาดปุ่ม
              fontSize: "16px",
              borderRadius: "8px",
              cursor: "pointer",
              display: "flex",
              alignItems: "center",
              gap: "8px",
            }}
            onClick={exportToExcel}
          >
            <FaFileExcel style={{ fontSize: "20px" }} />
            Export เป็น Excel
          </button>
        </div>

        <div
          style={{
            display: "flex",
            justifyContent: "flex-end",
            alignItems: "center",
            gap: "10px",
            marginTop: "30px",
          }}
        >
          <div>
            <label
              htmlFor="datePicker"
              style={{
                fontSize: "16px",
                fontWeight: "bold",
                marginRight: "10px",
              }}
            >
              เริ่ม:
            </label>
            <input
              type="date"
              value={filterStartDate || ""}
              onChange={(e) => setFilterStartDate(e.target.value)}
              className="sarabun-light"
              style={{
                padding: "8px",
                fontSize: "16px",
                borderRadius: "10px",
                border: "1px solid #ccc",
                cursor: "pointer",
                marginRight: "10px",
              }}
            />
          </div>

          <div>
            <label
              htmlFor="datePicker"
              style={{
                fontSize: "16px",
                fontWeight: "bold",
                marginRight: "10px",
              }}
            >
              สิ้นสุด:
            </label>
            <input
              type="date"
              value={filterEndDate || ""}
              onChange={(e) => setFilterEndDate(e.target.value)}
              className="sarabun-light"
              style={{
                padding: "8px",
                fontSize: "16px",
                borderRadius: "10px",
                border: "1px solid #ccc",
                cursor: "pointer",
                marginRight: "10px",
              }}
            />
          </div>

          <Button
            className="sarabun-light"
            onClick={handleSearch}
            style={{
              padding: "8px 12px",
              fontSize: "15px",
              backgroundColor: "#00152a",
              color: "white",
              border: "none",
              borderRadius: "9px",
              marginRight: "20px",
            }}
          >
            ค้นหา
          </Button>

          <Button
            className="sarabun-light"
            onClick={handleReset}
            style={{
              padding: "8px 12px",
              fontSize: "15px",
              backgroundColor: "#d9d9d9",
              color: "#000",
              border: "none",
              borderRadius: "9px",
            }}
          >
            รีเซ็ต
          </Button>
        </div>

        <Row gutter={24} style={{ marginTop: 30 }}>
          <Col span={24}>
            <Card
              style={{
                backgroundColor: "#ffffff",
                borderRadius: "24px",
                height: "800px",
              }}
            >
              <div
                className="sarabun-bold"
                style={{
                  marginBottom: "8px",
                  fontSize: "18px",
                }}
              >
                รายละเอียด :
              </div>

              <Spin
                spinning={loading}
                tip={
                  <span className="sarabun-light" style={{ fontSize: "18px" }}>
                    กำลังโหลดข้อมูล... กรุณารอสักครู่
                  </span>
                }
                size="large"
              >
                <Table
                  dataSource={data}
                  columns={columns}
                  rowKey={(record) => record.id}
                  pagination={false}
                  scroll={{
                    x: "max-content",
                    y: 600,
                  }}
                  style={{
                    overflow: "auto",
                    scrollbarWidth: "thin",
                  }}
                />
              </Spin>
            </Card>
          </Col>
        </Row>
      </div>
    </MainLayout>
  );
};

export default DateRangeFilter;
