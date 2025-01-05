import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import axios from "axios";
import { Row, Col, Card, Input, DatePicker, Button, Table, Tag } from "antd";
import "../../styles1/SupervisorDashboard.css";
import MainLayout from "../../components/LayoutSupervisorClerk";
import ReactApexChart from "react-apexcharts";
import config from "../../configAPI";
import moment from "moment";
import { io } from "socket.io-client";
import Swal from "sweetalert2";

const SupervisorDashboard = () => {
  const navigate = useNavigate();
  const [dailyOverview, setDailyOverview] = useState({
    total: 0,
    in_progress: 0,
    pending_review: 0,
    completed: 0,
  });
  const [chartData, setChartData] = useState({ categories: [], series: [] });
  const [donutChartData, setDonutChartData] = useState({
    series: [],
    labels: [],
  });
  const [uploadDetails, setUploadDetails] = useState([]);
  const [filterDate, setFilterDate] = useState(null);
  const [searchID, setSearchID] = useState("");
  const [filteredData, setFilteredData] = useState([]);
  const [notifications, setNotifications] = useState([]);

  useEffect(() => {
    const socket = io(`${config.API_URL}`, {
      transports: ["polling", "websocket"], // ตั้งค่าให้ใช้ WebSocket เท่านั้น
    });

    // ฟังเหตุการณ์การแจ้งเตือนจาก Backend
    socket.on("notification", (data) => {
      console.log("การแจ้งเตือนที่ได้รับ:", data);

      // ปรับข้อความเพื่อแสดงข้อมูลที่ต้องการ
      const titleMessage = `แจ้งเตือนจาก ${data.userName}`;
      const message = `รายการเลขที่ ${data.inventoryId} : ${data.message}`;

      // แสดงการแจ้งเตือนใหม่ด้วย SweetAlert2
      Swal.fire({
        title: titleMessage,
        text: message,
        icon: "info",
        confirmButtonText: "ตกลง",
        allowOutsideClick: false, // ป้องกันการคลิกนอกเพื่อปิด
        allowEscapeKey: false, // ป้องกันการกด Escape เพื่อปิด
        customClass: {
          title: "sarabun-bold", // เพิ่มคลาสให้กับ title
          htmlContainer: "sarabun-light", // เพิ่มคลาสให้กับข้อความ
          confirmButton: "sarabun-light",
        },
        willClose: () => {
          // อัปเดต State เมื่อผู้ใช้กดตกลง
          setNotifications((prevNotifications) => [
            ...prevNotifications,
            {
              userName: data.userName,
              inventoryId: data.inventoryId,
              message: data.message,
              type: data.type,
              status: data.status,
              createdAt: data.createdAt,
            },
          ]);
          // นำทางไปยังหน้า /Approval
          navigate("/Approval");
        },
      });
    });

    // ทำความสะอาด Socket เมื่อ Component ถูกยกเลิก
    return () => {
      socket.disconnect();
    };
  }, [setNotifications, navigate]);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const today = new Date().toISOString().split("T")[0];
        const [
          dailyOverviewResponse,
          dailyIssuesResponse,
          uploadDetailsResponse,
          averageStatusTimesResponse,
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
          axios.get(`${config.API_URL}/supClerkdashboard/average-times`),
        ]);

        setDailyOverview(dailyOverviewResponse.data);

        // Update Donut Chart Data
        const formattedIssues = dailyIssuesResponse.data.map((issue) => ({
          ...issue,
          displayReason:
            issue.reason === null ? "No reason provided" : issue.reason,
        }));

        setDonutChartData({
          series: formattedIssues.map((issue) =>
            parseInt(issue.issue_count, 10)
          ),
          labels: formattedIssues.map((issue) => issue.displayReason),
        });

        // ตรวจสอบข้อมูลดิบที่ได้รับ
        //console.log("Raw Upload Details:", uploadDetailsResponse.data);

        // จัดเรียงข้อมูลตามวันที่ล่าสุด
        const sortedUploadDetails = uploadDetailsResponse.data.sort((a, b) => {
          // ใช้ moment.js เพื่อแปลงวันที่ให้เป็น Date object ก่อนการเปรียบเทียบ
          const dateA = moment(a.approved_date, "DD/MM/YYYY").toDate();
          const dateB = moment(b.approved_date, "DD/MM/YYYY").toDate();
          return dateB - dateA; // จัดเรียงจากใหม่ไปเก่า
        });

        // ตรวจสอบข้อมูลหลังจัดเรียง
        //console.log("Sorted Upload Details:", sortedUploadDetails);

        // Set Upload Details Data
        setUploadDetails(sortedUploadDetails);

        // ตั้งค่า Chart Data สำหรับ Average Status Times
        const averageStatusData = averageStatusTimesResponse.data;
        // การตรวจสอบค่าก่อนการใช้งาน
        //console.log("Average Status Times Data:", averageStatusData);

        // แปลงเวลาจาก seconds เป็น HH:mm:ss
        const formatTime = (hours = 0, minutes = 0, seconds = 0) => {
          const totalSeconds = hours * 3600 + minutes * 60 + seconds;
          const formattedHours = Math.floor(totalSeconds / 3600);
          const formattedMinutes = Math.floor((totalSeconds % 3600) / 60);
          const formattedSeconds = totalSeconds % 60;
          return `${String(formattedHours).padStart(2, "0")}:${String(
            formattedMinutes
          ).padStart(2, "0")}:${String(formattedSeconds).padStart(2, "0")}`;
        };

        setChartData({
          categories: averageStatusData.map((item) => item.status),
          series: [
            {
              name: "Average Duration",
              data: averageStatusData.map((item) =>
                formatTime(
                  item.avg_duration_seconds.hours,
                  item.avg_duration_seconds.minutes,
                  item.avg_duration_seconds.seconds
                )
              ),
            },
          ],
        });
      } catch (error) {
        console.error("Error fetching data:", error);
      }
    };

    fetchData();
  }, []);

  //console.log("Categories:", chartData.categories);
  //console.log("Series:", chartData.series);

  // ข้อมูลและตัวเลือกของกราฟ Donut
  const donutChartOptions = {
    chart: {
      type: "donut",
    },
    labels: donutChartData.labels,
    responsive: [
      {
        breakpoint: 480,
        options: {
          chart: {
            width: 200,
          },
          legend: {
            position: "bottom",
          },
        },
      },
    ],
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

  // ฟังก์ชันสำหรับการกรองข้อมูล
  useEffect(() => {
    let data = [...uploadDetails]; // คัดลอกข้อมูลก่อนการกรอง

    if (filterDate) {
      const selectedDate = moment(filterDate).format("DD/MM/YYYY");
      data = data.filter((item) => item.approved_date === selectedDate);
    }
    if (searchID) {
      data = data.filter((item) =>
        item.inventory_id.toString().includes(searchID)
      );
    }

    setFilteredData(data); // อัปเดตข้อมูลที่กรองแล้ว
  }, [filterDate, searchID, uploadDetails]); // เพิ่ม dependency ให้ถูกต้อง

  return (
    <MainLayout>
      <div className="header-content">
        <div
          className="dashboard-title sarabun-bold"
          style={{
            fontSize: "28px",
            marginLeft: "20px",
            padding: "10px",
            color: "#000000E0",
          }}
        >
          Daily Overview
        </div>
      </div>
      <div style={{ padding: "0 48px" }}>
        <div
          style={{
            background: "#fff",
            minHeight: 280,
            padding: 24,
            borderRadius: 8,
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
              จำนวนงานทั้งหมด {dailyOverview.total || 0} รายการ
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

          <Row style={{ marginTop: 30 }}>
            <Col span={12}>
              <Card className="sarabun-light" title="Problem">
                <ReactApexChart
                  options={donutChartOptions}
                  series={donutChartData.series}
                  type="donut"
                  height={350}
                />
              </Card>
            </Col>

            <Col span={10}>
              <Card style={{ height: "100%" }}>
                <ReactApexChart
                  options={{
                    chart: {
                      type: "line",
                      height: 400,
                    },
                    xaxis: {
                      categories: chartData?.categories || [], // สถานะ (เช่น In Progress, Pending Review)
                      title: {
                        text: "สถานะ",
                        style: {
                          fontFamily: "Sarabun, sans-serif",
                          fontWeight: "bold",
                          fontSize: "14px",
                          color: "#333333",
                        },
                      },
                    },
                    yaxis: {
                      title: {
                        text: "เวลาเฉลี่ย (ชั่วโมง)",
                        style: {
                          fontFamily: "Sarabun, sans-serif",
                          fontWeight: "bold",
                          fontSize: "14px",
                          color: "#333333",
                        },
                      },
                      labels: {
                        formatter: (value) => {
                          const hours = (value / 3600).toFixed(0);
                          return `${hours} ชม.`;
                        },
                      },
                    },
                    stroke: {
                      curve: "smooth", // ใช้เส้นโค้งนุ่มนวล
                    },
                    title: {
                      text: "เวลาเฉลี่ยที่ใช้ในแต่ละสถานะ",
                      align: "center",
                      style: {
                        fontFamily: "Sarabun, sans-serif",
                        fontWeight: "bold",
                        fontSize: "16px",
                        color: "#333333",
                      },
                    },
                    legend: {
                      show: true,
                      position: "top", // แสดง legend ด้านบน
                    },
                    tooltip: {
                      y: {
                        formatter: (value) => {
                          const hours = Math.floor(value / 3600);
                          const minutes = Math.floor((value % 3600) / 60);
                          const seconds = value % 60;
                          return `${String(hours).padStart(2, "0")}:${String(
                            minutes
                          ).padStart(2, "0")}:${String(seconds).padStart(
                            2,
                            "0"
                          )}`;
                        },
                      },
                    },
                  }}
                  series={
                    chartData?.series && chartData.series.length > 0
                      ? [
                          {
                            name: "Average Duration",
                            data: chartData.series[0].data.map((timeString) => {
                              const [hours, minutes, seconds] = timeString
                                .split(":")
                                .map(Number);
                              return hours * 3600 + minutes * 60 + seconds;
                            }),
                          },
                        ]
                      : []
                  } // ตรวจสอบว่า chartData.series มีข้อมูลก่อนใช้งาน
                />
              </Card>
            </Col>
          </Row>

          <Row gutter={20} style={{ marginTop: 30, alignItems: "stretch" }}>
            <Col span={24}>
              <Card
                className="sarabun-light"
                title="ผู้รับผิดชอบ"
                style={{ height: "100%" }}
              >
                <Row gutter={16} style={{ marginBottom: "20px" }}>
                  <Col span={6}>
                    <DatePicker
                      style={{ width: "100%" }}
                      placeholder="เลือกวันที่..."
                      onChange={(date) => setFilterDate(date)}
                    />
                  </Col>
                  <Col span={8}>
                    <Input
                      placeholder="ค้นหา"
                      value={searchID}
                      onChange={(e) => setSearchID(e.target.value)}
                    />
                  </Col>
                  <Col span={2}>
                    <Button
                      type="primary"
                      style={{
                        width: "100%",
                        color: "#f0f0f0",
                        backgroundColor: "#00152a",
                        borderColor: "#00152a",
                      }}
                      onClick={() => {
                        setFilterDate(null);
                        setSearchID("");
                      }}
                    >
                      รีเซ็ต
                    </Button>
                  </Col>
                </Row>

                <Table
                  dataSource={filteredData}
                  columns={columns}
                  rowKey="inventory_id"
                  pagination={false}
                />
              </Card>
            </Col>
          </Row>
        </div>
      </div>
    </MainLayout>
  );
};

export default SupervisorDashboard;
