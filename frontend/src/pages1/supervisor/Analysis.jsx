import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import axios from "axios";
import { Card, Row, Col, DatePicker } from "antd";
import { Line, Column } from "@ant-design/charts";
import "../../styles1/Analysis.css";
import MainLayout from "../../components/LayoutSupervisor";
import moment from "moment";
import ReactApexChart from "react-apexcharts";
import config from '../../configAPI';

const { MonthPicker } = DatePicker;

const Analysis = () => {
  const [processData, setProcessData] = useState([]);
  const [chartDataUploader, setChartDataUploader] = useState({
    categories: [],
    series: [{ data: [] }],
  });

  const [chartDataAssignee, setChartDataAssignee] = useState({
    categories: [],
    series: [{ data: [] }],
  });
  const [individualData, setIndividualData] = useState([]);
  const [issueData, setIssueData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const navigate = useNavigate();
  const [selectedMonth, setSelectedMonth] = useState(null);
  const [dailyOverview, setDailyOverview] = useState({ total: 0 });

  useEffect(() => {
    const fetchProcessPerformance = async () => {
      try {
        let url =
          `${config.API_URL}/supervisorAnalysis/process-performance`;
        if (selectedMonth) {
          const month = moment(selectedMonth).month() + 1;
          const year = moment(selectedMonth).year();
          url += `?month=${month}&year=${year}`;
        }
        const response = await axios.get(url);
        const data = response.data;

        // ข้อมูล uploader
        const uploaderCategories = Object.keys(data.uploader);
        const uploaderSeriesData = uploaderCategories.map(
          (userName) => data.uploader[userName].length
        );

        // ข้อมูล assignee
        const assigneeCategories = Object.keys(data.assignee);
        const assigneeSeriesData = assigneeCategories.map(
          (userName) => data.assignee[userName].length
        );

        setChartDataUploader({
          categories: uploaderCategories,
          series: [{ name: "จำนวนงาน ", data: uploaderSeriesData }],
        });

        setChartDataAssignee({
          categories: assigneeCategories,
          series: [{ name: "จำนวนงาน ", data: assigneeSeriesData }],
        });

        // ตั้งค่าจำนวนงานทั้งหมด
        setDailyOverview({
          total: data.totalUploads || 0,
        });
      } catch (error) {
        setError("Error fetching process performance");
        console.error("Error fetching process performance:", error);
      } finally {
        setLoading(false);
      }
    };
    fetchProcessPerformance();
  }, [selectedMonth]);

  const chartOptionsUploader = {
    chart: {
      type: "bar",
      height: 350,
    },
    colors: ["#008ffb"],
    xaxis: {
      categories: chartDataUploader.categories.length
        ? chartDataUploader.categories
        : ["No Data"], // เพิ่มค่าเริ่มต้นเมื่อไม่มีข้อมูล
      title: { text: "ธุรการ" }, // แสดงชื่อ uploader
    },
    yaxis: {
      title: { text: "จำนวนงาน" }, // แสดงจำนวนงาน
    },
    dataLabels: {
      enabled: false,
    },
    stroke: {
      show: true,
      width: 2,
      colors: ["transparent"],
    },
    fill: {
      opacity: 1,
    },
    tooltip: {
      y: {
        formatter: (val) => `${val}`,
      },
    },
  };

  const chartOptionsAssignee = {
    chart: {
      type: "bar",
      height: 350,
    },
    colors: ["#ffd591"],
    xaxis: {
      categories: chartDataAssignee.categories.length
        ? chartDataAssignee.categories
        : ["No Data"], // เพิ่มค่าเริ่มต้นเมื่อไม่มีข้อมูล
      title: { text: "เจ้าหน้าที่คลังวัตถุดิบ" }, // แสดงชื่อ assignee
    },
    yaxis: {
      title: { text: "จำนวนงาน" }, // แสดงจำนวนงาน
    },
    dataLabels: {
      enabled: false,
    },
    stroke: {
      show: true,
      width: 2,
      colors: ["transparent"],
    },
    fill: {
      opacity: 1,
    },
    tooltip: {
      y: {
        formatter: (val) => `${val}`,
      },
    },
  };

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
          Analysis Dashboard
        </div>
      </div>

      <div
        style={{
          background: "#fff",
          minHeight: 280,
          padding: 24,
          borderRadius: 8,
        }}
      >
        <Row gutter={16} style={{ marginBottom: "24px" }}>
          <Col span={24}>
            <Card title="Overall Process Performance">
              <Row
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                }}
              >
                <Card style={{ backgroundColor: "#91caff" }}>
                  <div className="sarabun-bold">จำนวนงานทั้งหมด</div>
                  <div className="sarabun-bold">
                    {dailyOverview.total || 0} รายการ
                  </div>
                </Card>
                <MonthPicker
                  onChange={(date) => setSelectedMonth(date)}
                  placeholder="Select month"
                />
              </Row>

              <Row gutter={16}>
                <Col span={12}>
                  <ReactApexChart
                    options={chartOptionsUploader}
                    series={chartDataUploader.series}
                    type="bar"
                    height={350}
                  />
                </Col>
                <Col span={12}>
                  <ReactApexChart
                    options={chartOptionsAssignee}
                    series={chartDataAssignee.series}
                    type="bar"
                    height={350}
                  />
                </Col>
              </Row>
            </Card>
          </Col>
        </Row>

        <Row gutter={16} style={{ marginBottom: "24px" }}>
          <Col span={24}>
            <Card title="Individual Performance">
              <Column
                data={individualData}
                xField="user"
                yField="performance"
                title="รายงานประสิทธิภาพรายบุคคล"
                height={300}
              />
            </Card>
          </Col>
        </Row>

        <Row gutter={16}>
          <Col span={24}>
            <Card title="Issue Analysis">
              <Line
                data={issueData}
                xField="issue"
                yField="frequency"
                title="วิเคราะห์ปัญหา"
                height={300}
              />
            </Card>
          </Col>
        </Row>
      </div>
    </MainLayout>
  );
};

export default Analysis;
