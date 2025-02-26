import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import axios from "axios";
import { Row, Col, Card, Input, DatePicker, Button, Table, Tag } from "antd";
import "../../styles1/SupervisorDashboard.css";
import MainLayout from "../../components/LayoutSupervisorClerk";
import ReactApexChart from "react-apexcharts";
import config from "../../configAPI";
import moment from "moment";
import { IoCalendarOutline } from "react-icons/io5";
import { LuAlarmClock } from "react-icons/lu";

const SupervisorDashboard = () => {
  const navigate = useNavigate();
  const [state, setState] = React.useState({
    series: [0], // กำหนดค่าเริ่มต้นให้เป็น 0
    options: {
      chart: {
        height: 350,
        type: "radialBar",
      },
      plotOptions: {
        radialBar: {
          hollow: {
            size: "70%",
          },
          borderRadius: 12,
        },
      },
      labels: ["Completed"],
      colors: ["#7cb342"], // สีสำหรับแต่ละสถานะ
    },
  });
  const [dailyOverview, setDailyOverview] = useState({
    total: 0,
    in_progress: 0,
    pending_review: 0,
    completed: 0,
  });
  const [stackedChartData, setStackedChartData] = useState({
    series: [],
    categories: [],
  });
  const [uploadDetails, setUploadDetails] = useState([]);
  const [isUserActive, setIsUserActive] = useState(true);
  const [uploadOverdue, setUploadOverdue] = useState([]);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const today = new Date().toISOString().split("T")[0];
        const [
          dailyOverviewResponse,
          dailyIssuesResponse,
          uploadDetailsResponse,
        ] = await Promise.all([
          axios.get(`${config.API_URL}/supClerkdashboard/daily-overview`, {
            params: { date: today },
          }),
          axios.get(`${config.API_URL}/supClerkdashboard/daily-issues`, {
            params: { date: today },
          }),
          axios.get(`${config.API_URL}/supClerkdashboard/daily-details`, {
            // ดึงข้อมูล upload details
            params: { date: today },
          }),
        ]);

        setDailyOverview(dailyOverviewResponse.data);
        console.log("Daily Overview:", dailyOverviewResponse.data);

        // คำนวณเปอร์เซ็นต์งานที่เสร็จสมบูรณ์
        if (
          dailyOverviewResponse.data.total &&
          dailyOverviewResponse.data.completed
        ) {
          const completedPercentage =
            (dailyOverviewResponse.data.completed /
              dailyOverviewResponse.data.total) *
            100;

          const completedPercentageFixed = completedPercentage.toFixed(3);
          setState((prevState) => ({
            ...prevState,
            series: [parseFloat(completedPercentageFixed)],
          }));
          console.log("Daily completedPercentage:", completedPercentageFixed);
        } else {
          console.error("ข้อมูล dailyOverview ไม่ถูกต้อง");
        }

        // แปลงข้อมูล daily issues เป็นรูปแบบที่ใช้กับ Stacked Columns
        const formattedData = dailyIssuesResponse.data.reduce(
          (acc, issue) => {
            const totalRequests = parseInt(issue.total_requests, 10) || 0;
            const managerReasonCount =
              parseInt(issue.manager_reason_count, 10) || 0;
            const managerReasonRemainingCount =
              parseInt(issue.manager_reason_remaining_count, 10) || 0;
            const noIssueCount =
              totalRequests - managerReasonCount - managerReasonRemainingCount;

            acc.categories.push(`Inventory ID: ${issue.inventory_id}`); // ใช้ inventory_id เป็นแกน X
            acc.series[0].data.push(noIssueCount); // จำนวนรายการที่ไม่มีปัญหา
            acc.series[1].data.push(managerReasonCount); // จำนวนรายการที่มีปัญหา manager_reason_count
            acc.series[2].data.push(managerReasonRemainingCount); // จำนวนรายการที่มีปัญหา manager_reason_remaining_count

            return acc;
          },
          {
            categories: [], // แกน X
            series: [
              { name: "รายการที่ไม่มีปัญหา", data: [] }, // จำนวนรายการที่ไม่มีปัญหา
              { name: "รายการที่มีปัญหาการจ่าย", data: [] }, // จำนวนรายการที่มีปัญหา manager_reason_count
              { name: "รายการที่มีปัญหายอดคงเหลือ", data: [] }, // จำนวนรายการที่มีปัญหา manager_reason_remaining_count
            ],
          }
        );

        setStackedChartData(formattedData);

        const filteredUploadDetails = uploadDetailsResponse.data
          .filter((detail) => {
            const detailDate = moment(
              detail.approved_date,
              "DD/MM/YYYY"
            ).format("YYYY-MM-DD");
            return detailDate === today;
          })
          .sort((a, b) => {
            // ตรวจสอบว่า inventory_id เป็นตัวเลขก่อนทำการเปรียบเทียบ
            return b.inventory_id - a.inventory_id; // เรียงจากมากไปน้อย
          });

        console.log("filtered Daily :", filteredUploadDetails);

        // Set Upload Details Data
        setUploadDetails(filteredUploadDetails);

        // กรองข้อมูลและนับจำนวน is_overdue เป็น true
        const overdueCount = uploadDetailsResponse.data.filter(
          (item) => item.is_overdue === true
        ).length;

        // อัปเดต state
        setUploadOverdue((prev) => ({
          ...prev,
          overdue: overdueCount, // เพิ่มข้อมูล overdue ใน dailyOverview
        }));
      } catch (error) {
        console.error("Error fetching data:", error);
      }
    };

    fetchData();

    // Set up activity listener
    const handleUserActivity = () => setIsUserActive(true);
    window.addEventListener("mousemove", handleUserActivity);
    window.addEventListener("keydown", handleUserActivity);

    // Auto-refresh if user is inactive
    const interval = setInterval(() => {
      if (!isUserActive) {
        fetchTasks();
        fetchMyTasks();
      }
      setIsUserActive(false); // Reset user activity status
    }, 60000); // 1 minute interval

    return () => {
      clearInterval(interval);
      window.removeEventListener("mousemove", handleUserActivity);
      window.removeEventListener("keydown", handleUserActivity);
    };
  }, [isUserActive]);

  // การตั้งค่า options สำหรับกราฟ Stacked Columns
  const stackedChartOptions = {
    chart: {
      type: "bar",
      height: 350,
      stacked: true,
      toolbar: { show: true },
      zoom: { enabled: true },
    },
    responsive: [
      {
        breakpoint: 480,
        options: {
          legend: { position: "bottom", offsetX: -10, offsetY: 0 },
        },
      },
    ],

    plotOptions: {
      bar: {
        horizontal: false,
        borderRadius: 10, // ปรับค่าขอบมน
        borderRadiusApplication: "end", // 'around', 'end'
        borderRadiusWhenStacked: "last", // 'all', 'last'
        dataLabels: {
          total: {
            enabled: true,
            style: { fontSize: "13px", fontWeight: 900 },
          },
        },
      },
    },
    xaxis: {
      categories: stackedChartData.categories,
      labels: {
        style: {
          fontFamily: "Sarabun", // ใช้ฟอนต์ Sarabun
          fontWeight: "bold", // กำหนดให้ข้อความในแกน X หนักขึ้น
        },
      },
    },
    legend: {
      position: "right",
      offsetY: 40,
      labels: {
        style: {
          fontFamily: "Sarabun", // ใช้ฟอนต์ Sarabun
          fontWeight: "light", // ใช้ฟอนต์แบบธรรมดาสำหรับชื่อใน legend
        },
      },
    },
    fill: {
      opacity: 1,
    },
    colors: ["#4fc3f7", "#ffd54f", "#ff8a65"], // สีสำหรับแต่ละสถานะ
    dataLabels: {
      enabled: true, // เปิดการแสดงข้อมูลบนแท่งกราฟ
      style: {
        colors: ["#000"], // กำหนดสีของข้อความเป็นสีดำ
        fontFamily: "Sarabun, sans-serif",
        fontWeight: "bold",
      },
    },
  };

  const columns = [
    {
      title: "Inventory ID",
      dataIndex: "inventory_id",
      key: "inventory_id",
      align: "center",
      render: (text) => (text === null || text === "N/A" ? "-" : text),
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
      title: "วันที่",
      dataIndex: "approved_date",
      key: "approved_date",
      align: "center",
      render: (text) => (text === null || text === "N/A" ? "-" : text),
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
      title: "วัตถุดิบ", // เพิ่มคอลัมน์สำหรับวัตถุดิบ
      dataIndex: "material_type",
      key: "material_type",
      align: "center",
      render: (materialType) => {
        switch (materialType) {
          case "PK_DIS":
            return "กล่องดิส/ใบแนบ/สติ๊กเกอร์";
          case "PK_shoe":
            return "กล่องก้าม/ใบแนบ/สติ๊กเกอร์";
          case "WD":
            return "กิ๊ฟล๊อค/แผ่นชิม";
          case "PIN":
            return "สลัก/ตะขอ";
          case "BP":
            return "แผ่นเหล็ก";
          case "CHEMICAL":
            return "เคมี";
          default:
            return materialType; // หรือแสดงเป็นค่าเริ่มต้นหากไม่มีค่าที่ตรงกัน
        }
      },
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
      title: "จำนวนสั่งเบิกทั้งหมด", // เพิ่มคอลัมน์สำหรับยอดสั่งเบิกทั้งหมด
      dataIndex: "total_quantity",
      key: "total_quantity",
      align: "center",
      render: (text) => {
        // ตรวจสอบว่าค่าเป็น null หรือไม่
        if (text === null || text === "N/A") {
          return "-";
        }
        // ใช้ toLocaleString() สำหรับจัดรูปแบบตัวเลข
        return parseInt(text).toLocaleString("en-US");
      },
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
      dataIndex: "user_username",
      key: "user_username",
      render: (text) => (text === null || text === "N/A" ? "-" : text),
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
      title: "เจ้าหน้าที่",
      dataIndex: "assigned_username",
      key: "assigned_username",
      render: (text) => (text === null || text === "N/A" ? "-" : text),
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
      title: "เวลา",
      dataIndex: "duration",
      key: "duration",
      align: "center",
      render: (text) => (text === null || text === "N/A" ? "-" : text),
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
      title: "สถานะ",
      dataIndex: "current_status",
      key: "current_status",
      align: "center",
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
      render: (current_status) => {
        let color;
        switch (current_status) {
          case "ดำเนินการเรียบร้อย":
            color = "green";
            break;
          case "รอดำเนินการต่อ":
            color = "purple";
            break;
          case "กำลังดำเนินการ":
            color = "orange";
            break;
          case "รอตรวจสอบ":
            color = "red";
            break;
          case "รอรับงาน":
            color = "blue";
            break;
          default:
            color = "grey";
        }
        return (
          <Tag className="sarabun-light" color={color}>
            {current_status}
          </Tag>
        );
      },
    },
  ];

  // สร้างตัวแปรวันที่และเวลา
  const currentDate = new Date();
  // จัดรูปแบบวันที่เป็น "14 Jan 2025"
  const formattedDate = currentDate.toLocaleDateString("en-GB", {
    day: "2-digit",
    month: "short", // ใช้ 'short' เพื่อให้แสดงชื่อเดือนในรูปแบบย่อ (Jan, Feb, Mar, ...)
    year: "numeric",
  });

  // จัดรูปแบบเวลาให้เป็น "4.38 PM"
  const formattedTime = currentDate.toLocaleTimeString("en-GB", {
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
  });

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
          Dashboard Daily
        </div>

        <Card
          style={{
            backgroundColor: "#ffffff",
            borderRadius: "24px",
            marginTop: "20px",
            marginBottom: "20px",
          }}
        >
          <Row>
            <div
              className="sarabun-bold"
              style={{
                fontSize: "20px",
                marginLeft: "20px",
                marginBottom: "20px",
                color: "#000000E0",
              }}
            >
              จำนวนงานทั้งหมด {dailyOverview.total || 0} รายการ :
            </div>
          </Row>

          <Row gutter={16}>
            <Col className="gutter-row" span={6}>
              <Card
                style={{
                  fontSize: "16px",
                  backgroundColor: "#91caff",
                  textAlign: "center",
                  borderRadius: "24px", // กรอบมน
                  boxShadow: "0 4px 6px rgba(0, 0, 0, 0.1)", // เพิ่มเงา
                }}
              >
                <div
                  className="sarabun-bold"
                  style={{
                    marginBottom: "8px", // ปรับระยะห่างให้น้อยลง
                    fontSize: "18px", // ข้อความหัวใหญ่ขึ้นเล็กน้อย
                  }}
                >
                  รอรับงาน
                </div>
                <div
                  className="sarabun-bold"
                  style={{
                    fontSize: "24px", // ข้อความตัวเลขใหญ่ขึ้น
                    fontWeight: "bold", // เพิ่มความชัดเจน
                  }}
                >
                  {dailyOverview.padding || 0}
                </div>
              </Card>
            </Col>
            <Col className="gutter-row" span={6}>
              <Card
                style={{
                  fontSize: "16px",
                  backgroundColor: "#ffd591",
                  textAlign: "center",
                  borderRadius: "24px",
                  boxShadow: "0 4px 6px rgba(0, 0, 0, 0.1)",
                }}
              >
                <div
                  className="sarabun-bold"
                  style={{
                    marginBottom: "8px",
                    fontSize: "18px",
                  }}
                >
                  กำลังดำเนินการ
                </div>
                <div
                  className="sarabun-bold"
                  style={{
                    fontSize: "24px",
                    fontWeight: "bold",
                  }}
                >
                  {dailyOverview.in_progress || 0}
                </div>
              </Card>
            </Col>

            <Col className="gutter-row" span={6}>
              <Card
                style={{
                  fontSize: "16px",
                  backgroundColor: "#ffa5a1",
                  textAlign: "center",
                  borderRadius: "24px",
                  boxShadow: "0 4px 6px rgba(0, 0, 0, 0.1)",
                }}
              >
                <div
                  className="sarabun-bold"
                  style={{
                    marginBottom: "8px",
                    fontSize: "18px",
                  }}
                >
                  รอตรวจสอบ
                </div>
                <div
                  className="sarabun-bold"
                  style={{
                    fontSize: "24px",
                    fontWeight: "bold",
                  }}
                >
                  {dailyOverview.pending_review || 0}
                </div>
              </Card>
            </Col>

            <Col className="gutter-row" span={6}>
              <Card
                style={{
                  fontSize: "16px",
                  backgroundColor: "#b7eb8f",
                  textAlign: "center",
                  borderRadius: "24px",
                  boxShadow: "0 4px 6px rgba(0, 0, 0, 0.1)",
                }}
              >
                <div
                  className="sarabun-bold"
                  style={{
                    marginBottom: "8px",
                    fontSize: "18px",
                  }}
                >
                  ดำเนินการเรียบร้อย
                </div>
                <div
                  className="sarabun-bold"
                  style={{
                    fontSize: "24px",
                    fontWeight: "bold",
                  }}
                >
                  {dailyOverview.completed || 0}
                </div>
              </Card>
            </Col>
          </Row>
         
          <Row>
            <div
              className="sarabun-bold"
              style={{
                fontSize: "20px",
                marginTop: "20px",
                marginLeft: "20px",
                marginBottom: "20px",
                color: "#000000E0",
              }}
            >
              จำนวนงานที่เกินกำหนด :
            </div>
          </Row>
          <Row>
            <Col className="gutter-row" span={6}>
              <Card
                style={{
                  color: "#b0120a",
                  fontSize: "16px",
                  backgroundColor: "white",
                  textAlign: "center",
                  borderRadius: "24px",
                  boxShadow: "0 4px 6px rgba(0, 0, 0, 0.1)",
                  border: "4px solid #b0120a", // ขอบสีแดง
                }}
              >
                <div
                  className="sarabun-bold"
                  style={{
                    marginBottom: "8px",
                    fontSize: "18px",
                  }}
                >
                  เกินกำหนด
                </div>
                <div
                  className="sarabun-bold"
                  style={{
                    fontSize: "24px",
                    fontWeight: "bold",
                  }}
                >
                  {uploadOverdue.overdue || 0}
                </div>
              </Card>
            </Col>
          </Row>
         
        </Card>

        <Row gutter={24} style={{ marginTop: 30 }}>
          <Col span={6}>
            <Card
              style={{
                backgroundColor: "#ffffff",
                borderRadius: "24px",
                boxShadow: "0 6px 12px rgba(0, 0, 0, 0.15)",
              }}
            >
              {/* แสดงวันที่และเวลาในแนวนอน */}
              <div
                style={{
                  marginTop: "10px",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between", // จัดให้เว้นระยะห่างระหว่างไอเท็ม
                  flexWrap: "wrap", // ป้องกันการล้นในหน้าจอขนาดเล็ก
                  gap: 20, // ระยะห่างระหว่างวันที่และเวลา
                }}
              >
                {/* วันที่ */}
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                  }}
                >
                  <div
                    style={{
                      width: 40,
                      height: 40,
                      borderRadius: "50%",
                      backgroundColor: "#F5EFDF",
                      display: "flex",
                      justifyContent: "center",
                      alignItems: "center",
                      marginRight: 10,
                    }}
                  >
                    <IoCalendarOutline size={20} color="#25A3BF" />
                  </div>
                  <div className="sarabun-bold">{formattedDate} </div>
                </div>

                {/* เวลา */}
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                  }}
                >
                  <div
                    style={{
                      width: 40,
                      height: 40,
                      borderRadius: "50%",
                      backgroundColor: "#F5EFDF",
                      display: "flex",
                      justifyContent: "center",
                      alignItems: "center",
                      marginRight: 10,
                    }}
                  >
                    <LuAlarmClock size={20} color="#DC7C24" />
                  </div>
                  <div className="sarabun-bold">{formattedTime}</div>
                </div>

                <div
                  className="sarabun-bold"
                  style={{
                    marginTop: "10px",
                    marginBottom: "5px",
                    fontSize: "16px",
                  }}
                >
                  Daily Progress:
                </div>
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                  }}
                >
                  <ReactApexChart
                    options={state.options}
                    series={state.series}
                    type="radialBar"
                    height={350}
                  />
                </div>
              </div>
            </Card>
          </Col>
          <Col span={18}>
            <Card
              style={{
                backgroundColor: "#ffffff",
                borderRadius: "24px",
              }}
            >
              <div
                className="sarabun-bold"
                style={{
                  marginBottom: "8px",
                  fontSize: "18px",
                }}
              >
                ปัญหา :
              </div>
              <ReactApexChart
                options={stackedChartOptions}
                series={stackedChartData.series}
                type="bar"
                height={350}
              />
            </Card>
          </Col>
        </Row>

        <Row gutter={20} style={{ marginTop: 30, alignItems: "stretch" }}>
          <Col span={24}>
            <Card
              style={{
                backgroundColor: "#ffffff",
                borderRadius: "24px",
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
              <Table
                dataSource={uploadDetails}
                columns={columns}
                rowKey="inventory_id"
                pagination={false}
              />
            </Card>
          </Col>
        </Row>
      </div>
    </MainLayout>
  );
};

export default SupervisorDashboard;
