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
  //const [chartData, setChartData] = useState({ categories: [], series: [] });
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
  const [averageStatusTimesData, setAverageStatusTimesData] = useState({
    categories: [],
    series: [],
  });
  const [chartOptions, setChartOptions] = useState({});
  const [chartSeries, setChartSeries] = useState([]);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const today = new Date().toISOString().split("T")[0];
        const [
          uploadDetailsResponse,
          averageStatusTimesResponse,
          workloadDetailsResponse,
          averageTimesByMaterialsResponse,
        ] = await Promise.all([
          axios.get(`${config.API_URL}/supClerkdashboard/daily-details`, {
            // ดึงข้อมูล upload details
            params: { date: today },
          }),
          axios.get(`${config.API_URL}/supClerkdashboard/average-times`),
          axios.get(`${config.API_URL}/supClerkdashboard/workload-details`),
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

        //console.log("Workload Details Response:", workloadDetailsResponse.data);
        setTotalUploads(workloadDetailsResponse.data.totalUploads);
        const { userIdCounts, assignedToCounts } = workloadDetailsResponse.data;

        setUserIdChartData({
          series: Object.values(userIdCounts), // ใช้ค่าเป็นจำนวนตัวเลข
          labels: Object.keys(userIdCounts),
        });

        setAssignedToChartData({
          series: Object.values(assignedToCounts), // ใช้ค่าเป็นจำนวนตัวเลข
          labels: Object.keys(assignedToCounts),
        });

        /*// ตั้งค่า Chart Data สำหรับ Average Status Times
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
        });*/

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
          return (hours * 60 + minutes + seconds / 60).toFixed(2); // แปลงเป็นนาที
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
        console.log(
          "average Status Times:",
          averageTimesByMaterialsResponse.data
        );
        const transformedData = averageTimesByMaterialsResponse.data.map(
          (item) => {
            const {
              material_type,
              status,
              avg_duration: { hours = 0, minutes = 0, seconds = 0 } = {}, // กำหนด default ให้เป็นวัตถุเปล่า
            } = item;
            const avgMinutes = (hours * 60 + minutes + seconds / 60).toFixed(2);
            return {
              material_type,
              status,
              avgMinutes: parseFloat(avgMinutes),
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

        setChartOptions({
          chart: {
            type: "bar",
            stacked: true,
          },
          plotOptions: {
            bar: {
              borderRadius: 18, // กำหนดขอบมนของแท่งกราฟ
              horizontal: false, // กำหนดแนวกราฟ (true = แนวนอน, false = แนวตั้ง)
            },
          },
          xaxis: {
            categories,
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
          colors: ["#4fc3f7", "#ffd54f", "#ab47bc", "#ff8a65"], // สีสำหรับแต่ละสถานะ
          tooltip: {
            y: {
              formatter: (value) => `${value} นาที`,
            },
          },
          dataLabels: {
            enabled: true, // เปิดการแสดงข้อมูลบนแท่งกราฟ
            style: {
              colors: ["#000"], // กำหนดสีของข้อความเป็นสีดำ
              fontFamily: "Sarabun, sans-serif",
              fontWeight: "bold",
            },
          },
        });

        console.log("Transformed Data:", transformedData);
        console.log("Chart Series Data:", seriesData);
        console.log("Chart Options:", chartOptions);

        setChartSeries(seriesData);
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
    if (filterMaterialType) {
      data = data.filter((item) => item.material_type === filterMaterialType);
    }

    setFilteredData(data); // อัปเดตข้อมูลที่กรองแล้ว
  }, [filterDate, searchID, filterMaterialType, uploadDetails]); // เพิ่ม dependency ให้ถูกต้อง

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
                เวลาจัดการวัตถุดิบเฉลี่ย (รวม) :
              </div>
              <ReactApexChart
                options={{
                  chart: {
                    type: "bar",
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
                    style: {
                      colors: ["#000"], // กำหนดสีของข้อความเป็นสีดำ
                      fontFamily: "Sarabun, sans-serif",
                      fontWeight: "bold",
                    },
                  },
                }}
                series={[
                  {
                    name: "เวลาเฉลี่ย (นาที)",
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
                  เวลาจัดการวัตถุดิบเฉลี่ย (ต่อวัตถุดิบ) :
                </div>
                {chartSeries.length > 0 && (
                  <ReactApexChart
                    options={chartOptions}
                    series={chartSeries}
                    type="bar"
                    height={350}
                  />
                )}
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
                ภาระงาน :
              </div>
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
                  ทั้งหมด
                </div>
                <div
                  className="sarabun-bold"
                  style={{
                    fontSize: "24px",
                    fontWeight: "bold",
                  }}
                >
                  {totalUploads}
                </div>
              </Card>
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
                }}
                series={assignedToChartData.series}
                type="donut"
                height={350}
              />
            </Card>
          </Col>
          <Col span={16}>
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
                  <DatePicker
                    className="sarabun-light"
                    style={{ width: "100%" }}
                    placeholder="เลือกวันที่..."
                    onChange={(date) => setFilterDate(date)}
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
                  x: 1000, // ความกว้างของตารางที่เลื่อนในแนวนอน
                  y: "calc(100% - 160px)", // ปรับความสูงของตารางให้พอดีกับ Card
                }}
                style={{
                  overflow: "auto", // แสดงแถบเลื่อนเฉพาะเมื่อมีเนื้อหาเกิน
                  scrollbarWidth: "thin", // ปรับขนาดของแถบเลื่อน
                }}
              />
            </Card>
          </Col>
        </Row>

        {/*
        <Row style={{ marginTop: 20 }}>
          <Col span={12}>
            <Card
              style={{
                backgroundColor: "#ffffff",
                borderRadius: "24px",
              }}
            >
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
*/}
      </div>
    </MainLayout>
  );
};

export default DashboardAnalysis;
