import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import axios from "axios";
import {
  Row,
  Col,
  Card,
  Input,
  DatePicker,
  Button,
  Table,
  Tag,
  Select,
} from "antd";
import MainLayout from "../../components/LayoutSupervisorClerk";
import ReactApexChart from "react-apexcharts";
import config from "../../configAPI";
import moment from "moment";

const DashboardAnalysis = () => {
  const navigate = useNavigate();
  const [uploadDetails, setUploadDetails] = useState([]);
  const [filterDate, setFilterDate] = useState(null);
  const [searchID, setSearchID] = useState("");
  const [filterMaterialType, setFilterMaterialType] = useState("");
  const [filteredData, setFilteredData] = useState([]);
  const [isUserActive, setIsUserActive] = useState(true);
  const [userIdChartData, setUserIdChartData] = useState({
    series: [],
    labels: [],
  });
  const [assignedToChartData, setAssignedToChartData] = useState({
    series: [],
    labels: [],
  });
  const [totalUploads, setTotalUploads] = useState(0);
  const [grandTotalRequests, setgrandTotalRequests] = useState(0);
  const [userIdgrandTotalData, setUserIdgrandToData] = useState({
    series: [],
    labels: [],
  });
  const [assignedTograndToData, setAssignedTograndToData] = useState({
    series: [],
    labels: [],
  });
  const [TotalTaskItem, setTotalTaskItem] = useState(0);
  const [userIdTaskItemData, setuserIdTaskItemData] = useState({
    series: [],
    labels: [],
  });
  const [assignedToTaskItemData, setassignedToTaskItemData] = useState({
    series: [],
    labels: [],
  });
  const [averageStatusTimesData, setAverageStatusTimesData] = useState({
    categories: [],
    series: [],
  });
  const [averageStatusTimesbyMaterialsData,setAverageStatusTimesbyMaterialsData,] = useState({
    categories: [],
    series: [],
  });

  useEffect(() => {
    const fetchData = async () => {
      try {
        const today = new Date().toISOString().split("T")[0];
        const [
          uploadDetailsResponse,
          averageStatusTimesResponse,
          workloadDetailsResponse,
          workloadTasksResponse,
          workloadTaskItemsResponse,
          averageTimesByMaterialsResponse,
        ] = await Promise.all([
          axios.get(`${config.API_URL}/supClerkdashboard/daily-details`, {
            // ดึงข้อมูล upload details
            params: { date: today },
          }),
          axios.get(`${config.API_URL}/supClerkdashboard/average-times`),
          axios.get(`${config.API_URL}/supClerkdashboard/workload-details`),
          axios.get(`${config.API_URL}/supClerkdashboard/workload-tasks`),
          axios.get(`${config.API_URL}/supClerkdashboard/workload-tasks-item`),
          axios.get(
            `${config.API_URL}/supClerkdashboard/average-times-materials`
          ),
        ]);

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

        console.log("Workload Details Response:", workloadDetailsResponse.data);
        setTotalUploads(workloadDetailsResponse.data.totalUploads);
        setgrandTotalRequests(workloadTasksResponse.data.grandTotalRequests);
        setTotalTaskItem(workloadTaskItemsResponse.data.TotalTaskItem);

        const { userIdCounts, assignedToCounts } = workloadDetailsResponse.data;
        setUserIdChartData({
          series: Object.values(userIdCounts), // ใช้ค่าเป็นจำนวนตัวเลข
          labels: Object.keys(userIdCounts),
        });

        setAssignedToChartData({
          series: Object.values(assignedToCounts), // ใช้ค่าเป็นจำนวนตัวเลข
          labels: Object.keys(assignedToCounts),
        });

        console.log("workload-tasks:", workloadTasksResponse.data);
        const { userId, assignedTo } = workloadTasksResponse.data;
        setUserIdgrandToData({
          series: Object.values(userId), // ใช้ค่าเป็นจำนวนตัวเลข
          labels: Object.keys(userId),
        });

        setAssignedTograndToData({
          series: Object.values(assignedTo), // ใช้ค่าเป็นจำนวนตัวเลข
          labels: Object.keys(assignedTo),
        });

        console.log("workload-tasks-item:", workloadTaskItemsResponse.data);
        const { userIdTaskItem, assignedToTaskItem } =
          workloadTaskItemsResponse.data;
        setuserIdTaskItemData({
          series: Object.values(userIdTaskItem), // ใช้ค่าเป็นจำนวนตัวเลข
          labels: Object.keys(userIdTaskItem),
        });

        setassignedToTaskItemData({
          series: Object.values(assignedToTaskItem), // ใช้ค่าเป็นจำนวนตัวเลข
          labels: Object.keys(assignedToTaskItem),
        });

        // จัดการข้อมูล averageStatusTimesResponse
        //console.log("average Status Times:", averageStatusTimesResponse.data);
        const statusCategories = averageStatusTimesResponse.data.map(
          (item) => item.status
        );
        const statusDurations = averageStatusTimesResponse.data.map((item) => {
          const {
            hours = 0,
            minutes = 0,
            seconds = 0,
          } = item.avg_duration_seconds;
          const totalMinutes = hours * 60 + minutes + seconds / 60;
          return Math.round(totalMinutes); // ใช้ Math.round() เพื่อปัดเศษให้เป็นจำนวนเต็ม
        });

        setAverageStatusTimesData({
          categories: statusCategories, // หมายถึงสถานะ
          series: [
            {
              name: "เวลาเฉลี่ย (นาที)",
              data: statusDurations.map(Number), // หมายถึงเวลา
            },
          ],
        });

        // แปลงข้อมูลเวลาเป็นนาที
        /*console.log("average Status Times:",averageTimesByMaterialsResponse.data);*/
        const transformedData = averageTimesByMaterialsResponse.data.map(
          (item) => {
            const {
              material_type,
              status,
              avg_duration: { hours = 0, minutes = 0, seconds = 0 } = {},
            } = item;
            const totalMinutes = hours * 60 + minutes + seconds / 60;
            return {
              material_type,
              status,
              avgMinutes: Math.round(totalMinutes),
            };
          }
        );

        // สร้าง categories และ series สำหรับ Stacked Columns
        const categories = [
          ...new Set(transformedData.map((item) => item.material_type)),
        ];
        const statusGroups = [
          ...new Set(transformedData.map((item) => item.status)),
        ];

        const seriesData = statusGroups.map((status) => ({
          name: status,
          data: categories.map((category) => {
            const matched = transformedData.find(
              (item) =>
                item.material_type === category && item.status === status
            );
            return matched ? matched.avgMinutes : 0;
          }),
        }));

        setAverageStatusTimesbyMaterialsData({
          categories,
          series: seriesData,
        });
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
      }
      setIsUserActive(false); // Reset user activity status
    }, 60000); // 1 minute interval

    return () => {
      clearInterval(interval);
      window.removeEventListener("mousemove", handleUserActivity);
      window.removeEventListener("keydown", handleUserActivity);
    };
  }, [isUserActive]);

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
      title: "จำนวน", // เพิ่มคอลัมน์สำหรับยอดสั่งเบิกทั้งหมด
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

  // ฟังก์ชันสำหรับจัดรูปแบบตัวเลข
  const formatNumber = (number) => {
    return new Intl.NumberFormat().format(number);
  };

  // ฟังก์ชันสำหรับการกรองข้อมูล
  useEffect(() => {
    let data = [...uploadDetails]; // คัดลอกข้อมูลก่อนการกรอง

    if (searchID) {
      data = data.filter((item) =>
        item.inventory_id.toString().includes(searchID)
      );
    }
    if (filterMaterialType) {
      data = data.filter((item) => item.material_type === filterMaterialType);
    }

    setFilteredData(data); // อัปเดตข้อมูลที่กรองแล้ว
  }, [searchID, filterMaterialType, uploadDetails]); // เพิ่ม dependency ให้ถูกต้อง

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
          Dashboard Analysis
        </div>
        <Row gutter={16}>
          <Col className="gutter-row" span={8}>
            <Card
              style={{
                fontSize: "16px",
                backgroundColor: "#e0f2f1",
                textAlign: "center",
                borderRadius: "24px",
                boxShadow: "0 4px 6px rgba(0, 0, 0, 0.1)",
                marginTop: "20px",
                marginBottom: "20px",
              }}
            >
              <div
                className="sarabun-bold"
                style={{
                  marginBottom: "8px",
                  fontSize: "18px",
                }}
              >
                ใบสั่งเบิกทั้งหมด (ใบ)
              </div>
              <div
                className="sarabun-bold"
                style={{
                  fontSize: "24px",
                  fontWeight: "bold",
                }}
              >
                {formatNumber(totalUploads)}
              </div>
            </Card>
          </Col>
          <Col className="gutter-row" span={8}>
            <Card
              style={{
                fontSize: "16px",
                backgroundColor: "#e8eaf6",
                textAlign: "center",
                borderRadius: "24px",
                boxShadow: "0 4px 6px rgba(0, 0, 0, 0.1)",
                marginTop: "20px",
                marginBottom: "20px",
              }}
            >
              <div
                className="sarabun-bold"
                style={{
                  marginBottom: "8px",
                  fontSize: "18px",
                }}
              >
                รายการย่อยสั่งเบิกทั้งหมด (รายการ)
              </div>
              <div
                className="sarabun-bold"
                style={{
                  fontSize: "24px",
                  fontWeight: "bold",
                }}
              >
                {formatNumber(grandTotalRequests)}
              </div>
            </Card>
          </Col>
          <Col className="gutter-row" span={8}>
            <Card
              style={{
                fontSize: "16px",
                backgroundColor: "#fffde7",
                textAlign: "center",
                borderRadius: "24px",
                boxShadow: "0 4px 6px rgba(0, 0, 0, 0.1)",
                marginTop: "20px",
                marginBottom: "20px",
              }}
            >
              <div
                className="sarabun-bold"
                style={{
                  marginBottom: "8px",
                  fontSize: "18px",
                }}
              >
                จำนวนวัตถุดิบสั่งเบิกทั้งหมด
              </div>
              <div
                className="sarabun-bold"
                style={{
                  fontSize: "24px",
                  fontWeight: "bold",
                }}
              >
                {formatNumber(TotalTaskItem)}
              </div>
            </Card>
          </Col>
        </Row>

        <Row gutter={24} style={{ marginTop: 30 }}>
          <Col span={8}>
            <Card
              style={{
                backgroundColor: "#ffffff",
                borderRadius: "24px",
                height: "700px",
              }}
            >
              <div
                className="sarabun-bold"
                style={{
                  marginBottom: "30px",
                  fontSize: "20px",
                  textAlign: "center",
                }}
              >
                กราฟแสดงจำนวนใบสั่งเบิก/คน
              </div>

              <ReactApexChart
                options={{
                  chart: {
                    type: "donut",
                  },
                  labels: userIdChartData.labels,
                  title: {
                    text: "ธุรการคลังวัตถุดิบ :",
                    align: "left",
                    style: {
                      fontFamily: "Sarabun, sans-serif",
                      fontWeight: "bold",
                      fontSize: "14px",
                    },
                  },
                  legend: {
                    position: "right",
                  },
                  colors: ["#004d40", "#b2dfdb", "#00695c", "#80cbc4"],
                  tooltip: {
                    y: {
                      formatter: function (value) {
                        return value.toLocaleString(); // ใส่ , คั่นหลักพัน
                      },
                    },
                  },
                  dataLabels: {
                    enabled: true,
                    formatter: function (value) {
                      return value.toFixed(1) + "%"; // แสดงค่าเป็น %
                    },
                  },
                }}
                series={userIdChartData.series}
                type="donut"
                height={350}
                style={{ marginBottom: "20px" }}
              />

              <ReactApexChart
                options={{
                  chart: {
                    type: "donut",
                  },
                  labels: assignedToChartData.labels,
                  title: {
                    text: "เจ้าหน้าที่คลังวัตถุดิบ :",
                    align: "left",
                    style: {
                      fontFamily: "Sarabun, sans-serif",
                      fontWeight: "bold",
                      fontSize: "14px",
                    },
                  },
                  legend: {
                    position: "right",
                    labels: {
                      colors: "#000",
                      useSeriesColors: false,
                    },
                  },
                  colors: [
                    "#311b92",
                    "#b39ddb",
                    "#512da8",
                    "#9575cd",
                    "#4a148c",
                    "#ab47bc",
                    "#6a1b9a",
                    "#8e24aa",
                    "#ba68c8",
                  ],
                  tooltip: {
                    y: {
                      formatter: function (value) {
                        return value.toLocaleString(); // ใส่ , คั่นหลักพัน
                      },
                    },
                  },
                  dataLabels: {
                    enabled: true,
                    formatter: function (value) {
                      return value.toFixed(1) + "%"; // แสดงค่าเป็น %
                    },
                  },
                }}
                series={assignedToChartData.series}
                type="donut"
                height={350}
              />
            </Card>
          </Col>
          <Col span={8}>
            <Card
              style={{
                backgroundColor: "#ffffff",
                borderRadius: "24px",
                height: "700px",
              }}
            >
              <div
                className="sarabun-bold"
                style={{
                  marginBottom: "30px",
                  fontSize: "20px",
                  textAlign: "center",
                }}
              >
                กราฟแสดงจำนวนรายการย่อย/คน
              </div>

              <ReactApexChart
                options={{
                  chart: {
                    type: "donut",
                  },
                  labels: userIdgrandTotalData.labels,
                  title: {
                    text: "ธุรการคลังวัตถุดิบ :",
                    align: "left",
                    style: {
                      fontFamily: "Sarabun, sans-serif",
                      fontWeight: "bold",
                      fontSize: "14px",
                    },
                  },
                  legend: {
                    position: "right",
                  },
                  colors: ["#004d40", "#b2dfdb", "#00695c", "#80cbc4"],
                  tooltip: {
                    y: {
                      formatter: function (value) {
                        return value.toLocaleString(); // ใส่ , คั่นหลักพัน
                      },
                    },
                  },
                  dataLabels: {
                    enabled: true,
                    formatter: function (value) {
                      return value.toFixed(1) + "%"; // แสดงค่าเป็น %
                    },
                  },
                }}
                series={userIdgrandTotalData.series}
                type="donut"
                height={350}
                style={{ marginBottom: "20px" }}
              />
              <ReactApexChart
                options={{
                  chart: {
                    type: "donut",
                  },
                  labels: assignedTograndToData.labels,
                  title: {
                    text: "เจ้าหน้าที่คลังวัตถุดิบ :",
                    align: "left",
                    style: {
                      fontFamily: "Sarabun, sans-serif",
                      fontWeight: "bold",
                      fontSize: "14px",
                    },
                  },
                  legend: {
                    position: "right",
                    labels: {
                      colors: "#000",
                      useSeriesColors: false,
                    },
                  },
                  colors: [
                    "#311b92",
                    "#b39ddb",
                    "#512da8",
                    "#9575cd",
                    "#4a148c",
                    "#ab47bc",
                    "#6a1b9a",
                    "#8e24aa",
                    "#ba68c8",
                  ],
                  tooltip: {
                    y: {
                      formatter: function (value) {
                        return value.toLocaleString(); // ใส่ , คั่นหลักพัน
                      },
                    },
                  },
                  dataLabels: {
                    enabled: true,
                    formatter: function (value) {
                      return value.toFixed(1) + "%"; // แสดงค่าเป็น %
                    },
                  },
                }}
                series={assignedTograndToData.series}
                type="donut"
                height={350}
              />
            </Card>
          </Col>
          <Col span={8}>
            <Card
              style={{
                backgroundColor: "#ffffff",
                borderRadius: "24px",
                height: "700px",
              }}
            >
              <div
                className="sarabun-bold"
                style={{
                  marginBottom: "30px",
                  fontSize: "20px",
                  textAlign: "center",
                }}
              >
                กราฟแสดงจำนวนวัตถุดิบสั่งเบิก/คน
              </div>
              <ReactApexChart
                options={{
                  chart: {
                    type: "donut",
                  },
                  labels: userIdTaskItemData.labels,
                  title: {
                    text: "ธุรการคลังวัตถุดิบ :",
                    align: "left",
                    style: {
                      fontFamily: "Sarabun, sans-serif",
                      fontWeight: "bold",
                      fontSize: "14px",
                    },
                  },
                  legend: {
                    position: "right",
                  },
                  colors: ["#004d40", "#b2dfdb", "#00695c", "#80cbc4"],
                  tooltip: {
                    y: {
                      formatter: function (value) {
                        return value.toLocaleString(); // ใส่ , คั่นหลักพัน
                      },
                    },
                  },
                  dataLabels: {
                    enabled: true,
                    formatter: function (value) {
                      return value.toFixed(1) + "%"; // แสดงค่าเป็น %
                    },
                  },
                }}
                series={userIdTaskItemData.series}
                type="donut"
                height={350}
                style={{ marginBottom: "20px" }}
              />
              <ReactApexChart
                options={{
                  chart: {
                    type: "donut",
                  },
                  labels: assignedToTaskItemData.labels,
                  title: {
                    text: "เจ้าหน้าที่คลังวัตถุดิบ :",
                    align: "left",
                    style: {
                      fontFamily: "Sarabun, sans-serif",
                      fontWeight: "bold",
                      fontSize: "14px",
                    },
                  },
                  legend: {
                    position: "right",
                    labels: {
                      colors: "#000",
                      useSeriesColors: false,
                    },
                  },
                  colors: [
                    "#311b92",
                    "#b39ddb",
                    "#512da8",
                    "#9575cd",
                    "#4a148c",
                    "#ab47bc",
                    "#6a1b9a",
                    "#8e24aa",
                    "#ba68c8",
                  ],
                  tooltip: {
                    y: {
                      formatter: function (value) {
                        return value.toLocaleString(); // ใส่ , คั่นหลักพัน
                      },
                    },
                  },
                  dataLabels: {
                    enabled: true,
                    formatter: function (value) {
                      return value.toFixed(1) + "%"; // แสดงค่าเป็น %
                    },
                  },
                }}
                series={assignedToTaskItemData.series}
                type="donut"
                height={350}
              />
            </Card>
          </Col>
        </Row>

        <Row gutter={24}>
          <Col span={12}>
            <Card
              style={{
                backgroundColor: "#ffffff",
                borderRadius: "24px",
                marginTop: "20px",
              }}
            >
              <div
                className="sarabun-bold"
                style={{
                  marginBottom: "8px",
                  fontSize: "18px",
                }}
              >
                กราฟเวลาเฉลี่ยแต่ละสถานะในการเบิกจ่ายวัตถุดิบ (รวม) :
              </div>
              <ReactApexChart
                options={{
                  chart: {
                    type: "bar",
                    stacked: true,
                    toolbar: {
                      show: true,
                    },
                  },
                  plotOptions: {
                    bar: {
                      horizontal: true, // ทำให้กราฟเป็นแนวนอน
                      distributed: true, // ใช้สีต่างกันในแต่ละแถบ
                      borderRadius: 12, // ปรับค่าขอบมน
                      borderRadiusApplication: "end", // 'around', 'end'
                      borderRadiusWhenStacked: "last", // 'all', 'last'
                    },
                  },
                  xaxis: {
                    categories:
                      averageStatusTimesData.categories.length > 0
                        ? averageStatusTimesData.categories
                        : [], // ตรวจสอบว่า categories มีข้อมูล
                    title: {
                      text: "เวลาเฉลี่ย (นาที)",
                      style: {
                        fontFamily: "Sarabun, sans-serif",
                        fontWeight: "bold",
                      },
                    },
                  },
                  yaxis: {
                    title: {
                      text: "สถานะ",
                      style: {
                        fontFamily: "Sarabun, sans-serif",
                        fontWeight: "bold",
                      },
                    },
                  },

                  colors: ["#4fc3f7", "#ffd54f", "#ff8a65", "#ab47bc"], // สีสำหรับแต่ละสถานะ
                  legend: {
                    labels: {
                      style: {
                        fontFamily: "Sarabun, sans-serif", // กำหนดฟอนต์สำหรับคำอธิบาย
                      },
                    },
                  },
                  dataLabels: {
                    enabled: true, // เปิดการแสดงข้อมูลบนแท่งกราฟ
                    formatter: (value) => value.toLocaleString(),
                    style: {
                      colors: ["#000"], // กำหนดสีของข้อความเป็นสีดำ
                      fontFamily: "Sarabun, sans-serif",
                      fontWeight: "bold",
                    },
                  },
                  tooltip: {
                    y: {
                      formatter: (value) => value.toLocaleString() + " นาที", // ใส่ , และหน่วย นาที
                    },
                  },
                }}
                series={[
                  {
                    name: "เวลาเฉลี่ย",
                    data:
                      averageStatusTimesData.series.length > 0
                        ? averageStatusTimesData.series[0].data
                        : [], // ตรวจสอบว่า series มีข้อมูล
                  },
                ]}
                type="bar"
                height={350}
              />
            </Card>
          </Col>

          <Col span={12}>
            <Card
              style={{
                backgroundColor: "#ffffff",
                borderRadius: "24px",
                marginTop: "20px",
              }}
            >
              <div>
                <div
                  className="sarabun-bold"
                  style={{
                    marginBottom: "8px",
                    fontSize: "18px",
                  }}
                >
                  กราฟเวลาเฉลี่ยแต่ละสถานะ/วัตถุดิบ ในการเบิกจ่ายวัตถุดิบ :
                </div>
                <ReactApexChart
                  options={{
                    chart: { type: "bar", stacked: true },
                    plotOptions: {
                      bar: { borderRadius: 18, horizontal: false },
                    },
                    xaxis: {
                      categories: averageStatusTimesbyMaterialsData.categories,
                      title: {
                        text: "วัตถุดิบ",
                        style: {
                          fontFamily: "Sarabun, sans-serif",
                          fontWeight: "bold",
                        },
                      },
                    },
                    yaxis: {
                      title: {
                        text: "เวลาเฉลี่ย (นาที)",
                        style: {
                          fontFamily: "Sarabun, sans-serif",
                          fontWeight: "bold",
                        },
                      },
                    },
                    colors: ["#4fc3f7", "#ffd54f", "#ff8a65", "#ab47bc"],
                    tooltip: {
                      y: {
                        formatter: (value) => value.toLocaleString() + " นาที", // ใส่ , และหน่วย นาที
                      },
                    },
                    dataLabels: {
                      enabled: true,
                      formatter: (value) => value.toLocaleString(),
                      style: {
                        colors: ["#000"],
                        fontFamily: "Sarabun, sans-serif",
                        fontWeight: "bold",
                      },
                    },
                  }}
                  series={averageStatusTimesbyMaterialsData.series}
                  type="bar"
                  height={350}
                />
              </div>
            </Card>
          </Col>
        </Row>

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
              <Row
                gutter={16}
                style={{
                  marginBottom: "20px",
                  display: "flex",
                  justifyContent: "flex-end", // จัดให้อยู่ขวา
                  alignItems: "center",
                }}
              >
                <Col span={6}>
                  <Input
                    className="sarabun-light"
                    placeholder="ค้นหา Inventory ID"
                    value={searchID}
                    onChange={(e) => setSearchID(e.target.value)}
                  />
                </Col>
                <Col span={4}>
                  <Select
                    className="sarabun-light"
                    style={{ width: "100%" }}
                    placeholder="เลือกวัตถุดิบ"
                    value={filterMaterialType}
                    onChange={(value) => setFilterMaterialType(value)}
                  >
                    <Select.Option className="sarabun-light" value="">
                      วัตถุดิบ
                    </Select.Option>
                    <Select.Option className="sarabun-light" value="PK_DIS">
                      กล่องดิส/ใบแนบ/สติ๊กเกอร์
                    </Select.Option>
                    <Select.Option className="sarabun-light" value="PK_shoe">
                      กล่องก้าม/ใบแนบ/สติ๊กเกอร์
                    </Select.Option>
                    <Select.Option className="sarabun-light" value="WD">
                      กิ๊ฟล๊อค/แผ่นชิม
                    </Select.Option>
                    <Select.Option className="sarabun-light" value="PIN">
                      สลัก/ตะขอ
                    </Select.Option>
                    <Select.Option className="sarabun-light" value="BP">
                      แผ่นเหล็ก
                    </Select.Option>
                    <Select.Option className="sarabun-light" value="CHEMICAL">
                      เคมี
                    </Select.Option>
                  </Select>
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
                      setFilterMaterialType("");
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
                scroll={{
                  x: "max-content", // เปิดการเลื่อนในแนวนอนตามขนาดของคอลัมน์
                  y: 600, // เปิดการเลื่อนในแนวตั้งตามความสูงที่กำหนด
                }}
                style={{
                  overflow: "auto", // แสดงแถบเลื่อนเฉพาะเมื่อมีเนื้อหาเกิน
                  scrollbarWidth: "thin", // ปรับขนาดของแถบเลื่อน
                }}
              />
            </Card>
          </Col>
        </Row>
      </div>
    </MainLayout>
  );
};

export default DashboardAnalysis;
