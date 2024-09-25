import React, { useState, useEffect } from "react";
import axios from "axios";
import { useNavigate } from "react-router-dom";
import { Row, Col, Card, Modal, Select, Table } from "antd";
import Chart from "react-apexcharts";
import "../../styles1/SupervisorDashboard.css";
import MainLayout from "../../components/LayoutSupervisor";
import ReactApexChart from "react-apexcharts";
import config from '../../configAPI';

const { Option } = Select;

const formatDate = (dateString) => {
  const date = new Date(dateString);
  return date.toLocaleDateString("en-GB"); // รูปแบบวันที่ตามที่คุณต้องการ
};

const SupervisorDashboard = () => {
  const [data, setData] = useState([]);
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
  const [selectedMaterialType, setSelectedMaterialType] = useState("");
  const [uploadDetails, setUploadDetails] = useState([]);
  const navigate = useNavigate();

  useEffect(() => {
    const fetchData = async () => {
      try {
        const today = new Date().toISOString().split("T")[0];
        const [
          dailyOverviewResponse,
          inventoryStockResponse,
          dailyIssuesResponse,
          uploadDetailsResponse,
        ] = await Promise.all([
          axios.get(
           `${config.API_URL}/supervisorDashboard/daily-overview`,
            {
              params: { date: today },
            }
          ),
          axios.get(
            `${config.API_URL}/supervisorDashboard/inventory-stock`,
            {
              params: { materialType: selectedMaterialType },
            }
          ),
          axios.get(`${config.API_URL}/supervisorDashboard/daily-issues`, {
            params: { date: today },
          }),
          axios.get(`${config.API_URL}/supervisorDashboard/daily-details`, {
            // ดึงข้อมูล upload details
            params: { date: today },
          }),
        ]);

        setDailyOverview(dailyOverviewResponse.data);

        const formattedData = inventoryStockResponse.data.map((item) => ({
          ...item,
          mat_name: item.mat_name,
        }));

        setData(formattedData);

        const categories = formattedData.map((item) => item.mat_name);
        const totalRequestedSeries = formattedData.map(
          (item) => item.total_requested
        );
        const totalRemainingSeries = formattedData.map(
          (item) => item.total_remaining
        );

        setChartData({
          categories,
          series: [
            {
              name: "Total Requested",
              data: totalRequestedSeries,
            },
            {
              name: "Total Remaining",
              data: totalRemainingSeries,
            },
          ],
        });

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

        // Set Upload Details Data
        setUploadDetails(uploadDetailsResponse.data);
      } catch (error) {
        console.error("Error fetching data:", error);
      }
    };

    fetchData();
  }, [selectedMaterialType]);

  const handleMaterialTypeChange = (value) => {
    setSelectedMaterialType(value);
  };

  const chartOptions = {
    chart: {
      type: "bar",
      height: 350,
    },
    plotOptions: {
      bar: {
        horizontal: false,
        columnWidth: "55%",
        endingShape: "rounded",
      },
    },
    dataLabels: {
      enabled: false,
    },
    stroke: {
      show: true,
      width: 2,
      colors: ["transparent"],
    },
    xaxis: {
      title: { text: "Material_Name" },
      categories: chartData.categories,
    },
    yaxis: {
      title: {
        text: "Quantity",
      },
    },
    fill: {
      opacity: 1,
    },
    tooltip: {
      y: {
        formatter: (val) => val,
      },
    },
  };

  // ประกาศตัวแปร style
  const style = {
    padding: "20px",
    backgroundColor: "#f0f0f0",
    borderRadius: "8px",
  };

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
    },
    {
      title: "วัตถุดิบ",  // เพิ่มคอลัมน์สำหรับวัตถุดิบ
      dataIndex: "material_type",
      key: "material_type",
      align: "center",
    },
    {
      title: "จำนวนสั่งเบิกทั้งหมด",  // เพิ่มคอลัมน์สำหรับยอดสั่งเบิกทั้งหมด
      dataIndex: "total_requested",
      key: "total_requested",
      align: "center", 
    },
    {
      title: "ธุรการ",
      dataIndex: "user_username",
      key: "user_username",
      render: (text, record) => `${record.user_username}`,
      align: "center",
    },
    {
      title: "เจ้าหน้าที่",
      dataIndex: "assigned_username",
      key: "assigned_username",
      render: (text, record) => `${record.assigned_username}`,
      align: "center",
    },
    {
      title: "เวลา",
      dataIndex: "duration",
      key: "duration",
      align: "center",
    },
  ];

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
          <Row gutter={16}>
            <Col className="gutter-row" span={6}>
              <Card  style={{ backgroundColor: '#91caff'}}>
                <div className="sarabun-bold" >จำนวนงานทั้งหมด</div>
                <div className="sarabun-bold" >{dailyOverview.total || 0} รายการ</div>
              </Card>
            </Col>
            <Col className="gutter-row" span={6}>
              <Card  style={{ backgroundColor: '#ffd591'}}>
                <div className="sarabun-bold" >กำลังดำเนินการ</div>
                <div className="sarabun-bold" >{dailyOverview.in_progress || 0} รายการ</div>
              </Card>
            </Col>
            <Col className="gutter-row" span={6}>
              <Card  style={{ backgroundColor: '#ffa5a1'}}>
                <div className="sarabun-bold" >รอตรวจสอบ</div>
                <div className="sarabun-bold" >{dailyOverview.pending_review || 0} รายการ</div>
              </Card>
            </Col>
            <Col className="gutter-row" span={6}>
              <Card  style={{ backgroundColor: '#b7eb8f'}}>
                <div className="sarabun-bold" >ดำเนินการเรียบร้อย</div>
                <div className="sarabun-bold" >{dailyOverview.completed || 0} รายการ</div>
              </Card>
            </Col>
          </Row>

          <Row gutter={16} style={{ marginTop: 30 }}>
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

            <Col span={12}>
            <Card className="sarabun-light" title="Upload Details">
                <Table
                  dataSource={uploadDetails}
                  columns={columns}
                  rowKey="upload_id"
                  pagination={{ pageSize: 10 }}
                />
            </Card>
            </Col>
          </Row>
          <Row style={{ marginTop: 30 }}>
          <Col span={24}>
              <Card className="sarabun-light" title="Inventory Stock">
                <Select
                  className="sarabun-light"
                  style={{ width: 200, marginBottom: 20 }}
                  placeholder="Select Material Type"
                  onChange={handleMaterialTypeChange}
                  value={selectedMaterialType}
                >
                  <Option className="sarabun-light" value="">
                    เลือกวัตถุดิบ
                  </Option>
                  <Option className="sarabun-light" value="WD">
                    กิ๊ฟล๊อค/แผ่นชิม
                  </Option>
                  <Option className="sarabun-light" value="PIN">
                    สลัก/ตะขอ
                  </Option>
                  <Option className="sarabun-light" value="BP">
                    แผ่นเหล็ก
                  </Option>
                  <Option className="sarabun-light" value="CHEMICAL">
                    เคมี
                  </Option>
                </Select>
                <Chart
                  options={chartOptions}
                  series={chartData.series}
                  type="bar"
                  height={350}
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
