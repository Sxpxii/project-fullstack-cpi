import React, { useEffect, useState } from "react";
import axios from "axios";
import config from "../../configAPI";
import MainLayout from "../../components/LayoutSupervisorClerk";
import { Row, Col, Table, Button, Card, Spin } from "antd";

const materialTypeLabels = {
  PK_DIS: "กล่องดิส/ใบแนบ/สติ๊กเกอร์",
  PK_shoe: "กล่องก้าม/ใบแนบ/สติ๊กเกอร์",
  WD: "กิ๊ฟล๊อค/แผ่นชิม",
  PIN: "สลัก/ตะขอ",
  BP: "แผ่นเหล็ก",
  CHEMICAL: "เคมี",
};

const MaterialUsageSummary = () => {
  const [data, setData] = useState([]);
  const [materialType, setMaterialType] = useState("");
  const [filterStartDate, setFilterStartDate] = useState("");
  const [filterEndDate, setFilterEndDate] = useState("");
  const [loading, setLoading] = useState(false);
  const [top5Materials, setTop5Materials] = useState([]);

  const handleSearch = async () => {
    try {
      setLoading(true);
      const params = {};
      if (materialType) params.materialType = materialType;
      if (filterStartDate) params.StartDate = filterStartDate;
      if (filterEndDate) params.endDate = filterEndDate;

      const response = await axios.get(
        `${config.API_URL}/supClerkdashboard/materialUsageSummary`,
        { params }
      );
      // เรียงลำดับข้อมูลตาม total_requested จากมากไปน้อย
      const sortedData = response.data.data.sort(
        (a, b) => b.total_requested - a.total_requested
      );
      setData(sortedData);
      setTop5Materials(sortedData.slice(0, 5)); // เก็บ 5 อันดับ
    } catch (error) {
      console.error("Error fetching material usage summary:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    handleSearch(); // โหลดเมื่อเปิดหน้า
  }, []);

  const handleReset = () => {
    setFilterStartDate("");
    setFilterEndDate("");
    setData([]);
  };

  // ฟังก์ชันสำหรับจัดรูปแบบตัวเลข
  const formatNumber = (number) => {
    return new Intl.NumberFormat().format(number);
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
      title: "จำนวนที่ขอเบิก",
      dataIndex: "total_requested",
      key: "total_requested",
      align: "center",
      width: 150,
      render: (text) => formatNumber(text),
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
      dataIndex: "total_issued",
      key: "total_issued",
      align: "center",
      width: 150,
      render: (text) => formatNumber(text),
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

  const circleColors = ["#01579b", "#0288d1", "#03a9f4", "#4fc3f7 ", "#afbfff"];

  return (
    <MainLayout>
      <div style={{ padding: "0 48px" }}>
        <div
          className="sarabun-bold"
          style={{
            fontSize: "35px",
            marginTop: "30px",
            color: "#000000E0",
          }}
        >
          Dashboard ปริมาณการใช้วัตถุดิบ
        </div>

        <div
          className="sarabun-bold"
          style={{
            marginTop: "30px",
            marginBottom: "50px",
            fontSize: "18px",
          }}
        >
          วัตถุดิบที่มีการใช้มากที่สุด 5 อันดับ:
        </div>

        <Row gutter={20} style={{ marginTop: 10 }}>
          {top5Materials.map((item, index) => (
            <Col className="gutter-row" span={6} key={item.mat_name}>
              <div style={{ position: "relative", marginBottom: "30px" }}>
                {/* วงกลมแสดงอันดับ */}
                <div
                  style={{
                    position: "absolute",
                    top: "-20px",
                    left: "50%",
                    transform: "translateX(-50%)",
                    width: "50px",
                    height: "50px",
                    borderRadius: "50%",
                    backgroundColor: circleColors[index],
                    color: "#fff",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    fontWeight: "bold",
                    fontSize: "18px",
                    boxShadow: "0 4px 8px rgba(0,0,0,0.2)",
                    zIndex: 1,
                  }}
                >
                  {index + 1}
                </div>

                {/* ตัว Card */}
                <Card
                  style={{
                    background: "#ffffff",
                    border: `3px solid ${circleColors[index]}`,
                    padding: "30px 0 12px 0", // Padding บนเผื่อ space ให้กับวงกลม
                    borderRadius: "24px",
                    cursor: "pointer",
                    boxShadow: "0 4px 6px rgba(0, 0, 0, 0.1)",
                    textAlign: "center",
                  }}
                >
                  <div
                    className="sarabun-bold"
                    style={{
                      fontSize: "16px",
                      color: "#333",
                    }}
                  >
                    {item.mat_name}
                  </div>
                  <div
                    className="sarabun-bold"
                    style={{
                      fontSize: "15px",
                      marginTop: "8px",
                      color: "#424242",
                    }}
                  >
                    จำนวนที่เบิก: {formatNumber(item.total_requested)}
                  </div>
                </Card>
              </div>
            </Col>
          ))}
        </Row>

        <div
          style={{
            display: "flex",
            justifyContent: "flex-start",
            alignItems: "center",
            gap: "20px",
            marginTop: "30px",
            flexWrap: "wrap", // กรณีหน้าจอเล็กให้ขึ้นบรรทัดใหม่
          }}
        >
          <div>
            <label
              style={{
                fontSize: "16px",
                fontWeight: "bold",
                marginRight: "10px",
              }}
            >
              ประเภทวัตถุดิบ:
            </label>
            <select
              value={materialType}
              className="sarabun-light"
              onChange={(e) => setMaterialType(e.target.value)}
              style={{
                padding: "8px",
                fontSize: "16px",
                borderRadius: "10px",
                border: "1px solid #ccc",
              }}
            >
              <option value="">-- เลือกประเภทวัตถุดิบ --</option>
              <option value="PK_DIS">กล่องดิส/ใบแนบ/สติ๊กเกอร์</option>
              <option value="PK_shoe">กล่องก้าม/ใบแนบ/สติ๊กเกอร์</option>
              <option value="WD">กิ๊ฟล๊อค/แผ่นชิม</option>
              <option value="PIN">สลัก/ตะขอ</option>
              <option value="BP">แผ่นเหล็ก</option>
              <option value="CHEMICAL">เคมี</option>
            </select>
          </div>

          <div>
            <label
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
              }}
            />
          </div>

          <div>
            <label
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
                  marginBottom: "20px",
                  fontSize: "18px",
                  textAlign: "center",
                }}
              >
                รายละเอียดปริมาณการใช้วัตถุดิบ :{" "}
                {materialType ? materialTypeLabels[materialType] : "ทั้งหมด"}
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

export default MaterialUsageSummary;
