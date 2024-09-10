// src/pages1/UploadMaterial.jsx
import React, { useState, useEffect } from "react";
import axios from "axios";
import { useNavigate } from "react-router-dom";
import {
  Spin,
  message,
  Card,
  Row,
  Col,
  Form,
  Input,
  Button,
  Table,
  Modal,
} from "antd";
import { HiMiniPencilSquare } from "react-icons/hi2";
import { FaCheck, FaTrashCan } from "react-icons/fa6";
import MainLayout from "../../components/LayoutAdmin";
import "../../styles1/UploadMaterial.css"; // นำเข้า CSS

function UploadMaterials() {
  const [selectedFile, setSelectedFile] = useState(null);
  const [loading, setLoading] = useState(false);
  const [uploadMessage, setUploadMessage] = useState("");
  const [materials, setMaterials] = useState([]); // เก็บข้อมูล materials
  const [filteredMaterials, setFilteredMaterials] = useState([]);
  const [form] = Form.useForm();
  const [filter, setFilter] = useState({ matunit: "", mat_name: "" });
  const [isModalVisible, setIsModalVisible] = useState(false);
  const [editingRecord, setEditingRecord] = useState(null);
  const [addingNewRow, setAddingNewRow] = useState(false);
  const navigate = useNavigate();

  const handleFileChange = (event) => {
    setSelectedFile(event.target.files[0]);
  };

  // ดึงข้อมูลวัสดุจาก API
  useEffect(() => {
    const fetchMaterials = async () => {
      try {
        const token = localStorage.getItem("token");
        const response = await axios.get("http://localhost:3001/materials", {
          headers: { Authorization: `Bearer ${token}` },
        });
        setMaterials(response.data); // เก็บข้อมูลใน state
        setFilteredMaterials(response.data);
      } catch (error) {
        console.error("Error fetching materials:", error);
        message.error("เกิดข้อผิดพลาดในการดึงข้อมูลวัสดุ");
      }
    };
    fetchMaterials();
  }, []);

  // คอลัมน์สำหรับแสดงตาราง
  const columns = [
    {
      title: "ลำดับ",
      key: "index",
      render: (text, record, index) => index + 1,
      align: "center",
    },
    {
      title: "รหัสวัตถุดิบ",
      dataIndex: "matunit",
      key: "matunit",
      align: "left",
    },
    {
      title: "ชื่อวัตถุดิบ",
      dataIndex: "mat_name",
      key: "mat_name",
      align: "left",
    },
    {
      title: "",
      key: "actions",
      render: (text, record) => (
        <div>
          <Button
            style={{
              color: "#5755FE",
              backgroundColor: "#f0f0f0",
              borderColor: "#f0f0f0",
              
            }}
            icon={<HiMiniPencilSquare />}
            onClick={() => handleEdit(record)}
          />
          <Button
            style={{
              color: "#5755FE",
              backgroundColor: "#f0f0f0",
              borderColor: "#f0f0f0",
            }}
            icon={<FaTrashCan />}
            onClick={() => handleDelete(record)}
          />
        </div>
      ),
      align: "center",
    },
  ];

  // ฟังก์ชันกรองข้อมูล
  const handleFilterChange = (e) => {
    const { name, value } = e.target;
    const newFilter = { ...filter, [name]: value };
    setFilter(newFilter);

    const filtered = materials.filter(
      (material) =>
        (newFilter.matunit
          ? material.matunit.includes(newFilter.matunit)
          : true) &&
        (newFilter.mat_name
          ? material.mat_name.includes(newFilter.mat_name)
          : true)
    );

    setFilteredMaterials(filtered);
  };

  // ฟังก์ชันล้างการกรอง
  const handleClearFilter = () => {
    setFilter({ matunit: "", mat_name: "" });
    setFilteredMaterials(materials);
  };

  const handleEdit = (record) => {
    if (!record) {
      message.error("ข้อมูลวัตถุดิบไม่ถูกต้อง");
      return;
    }
    if (!record.matunit) {
      message.error("รหัสวัตถุดิบไม่ถูกต้อง");
      return;
    }
    form.setFieldsValue({ matunit: record.matunit, mat_name: record.mat_name });
    setEditingRecord(record);
    setIsModalVisible(true);
  };

  // ฟังก์ชันที่ใช้บันทึกการแก้ไข
  const handleSaveEdit = async () => {
    try {
      const values = form.getFieldsValue();
      const token = localStorage.getItem("token");
      await axios.put(
        `http://localhost:3001/materials/${editingRecord.material_id}`,
        values,
        {
          headers: { Authorization: `Bearer ${token}` },
        }
      );
      message.success("อัปเดตข้อมูลวัสดุเรียบร้อยแล้ว");
      // รีเฟรชข้อมูลวัสดุหลังจากอัปเดต
      const updatedMaterials = await axios.get(
        "http://localhost:3001/materials",
        {
          headers: { Authorization: `Bearer ${token}` },
        }
      );
      setMaterials(updatedMaterials.data);
      setFilteredMaterials(updatedMaterials.data);
      setIsModalVisible(false);
    } catch (error) {
      console.error("Error updating material:", error);
      message.error("เกิดข้อผิดพลาดในการอัปเดตข้อมูล");
    }
  };

  // ฟังก์ชันที่ใช้ปิดโมเดล
  const handleCancelEdit = () => {
    setIsModalVisible(false);
  };

  const handleDelete = (record) => {
    Modal.confirm({
      title: "ยืนยันการลบ",
      content: `คุณแน่ใจหรือไม่ว่าต้องการลบ  ${record.matunit} : ${record.mat_name}`,
      okText: "ยืนยัน",
      cancelText: "ยกเลิก",
      onOk: async () => {
        try {
          const token = localStorage.getItem("token");
          await axios.delete(
            `http://localhost:3001/materials/${record.material_id}`,
            {
              headers: { Authorization: `Bearer ${token}` },
            }
          );
          message.success("ลบข้อมูลเรียบร้อยแล้ว");
          // Refresh data
          const updatedMaterials = await axios.get(
            "http://localhost:3001/materials",
            {
              headers: { Authorization: `Bearer ${token}` },
            }
          );
          setMaterials(updatedMaterials.data);
          setFilteredMaterials(updatedMaterials.data);
        } catch (error) {
          console.error("Error deleting material:", error);
          message.error("เกิดข้อผิดพลาดในการลบข้อมูล");
        }
      },
    });
  };

  // ฟังก์ชันบันทึกข้อมูลเมื่ออัปโหลดไฟล์
  const handleFileSaveClick = async () => {
    if (!selectedFile) {
      alert("กรุณาเลือกไฟล์.");
      return;
    }

    setLoading(true);

    const formData = new FormData();
    formData.append("file", selectedFile);

    try {
      const token = localStorage.getItem("token");

      const response = await axios.post(
        "http://localhost:3001/materials/upload",
        formData,
        {
          headers: {
            "Content-Type": "multipart/form-data",
            Authorization: `Bearer ${token}`,
          },
        }
      );
      console.log("File uploaded successfully:", response.data);
      setUploadMessage("บันทึกข้อมูลเรียบร้อยแล้ว");
      // รีเฟรชข้อมูลวัสดุหลังอัปโหลด
      const updatedMaterials = await axios.get(
        "http://localhost:3001/materials",
        {
          headers: { Authorization: `Bearer ${token}` },
        }
      );
      setMaterials(updatedMaterials.data);
      setFilteredMaterials(updatedMaterials.data);
    } catch (error) {
      console.error("Error uploading file:", error);
      alert("เกิดข้อผิดพลาดในการอัปโหลดไฟล์ กรุณาลองใหม่อีกครั้ง.");
    } finally {
      setLoading(false);
    }
  };

  const handleAddRow = () => {
    setAddingNewRow(true);
  };

  const handleSaveRow = async (values) => {
    try {
      const token = localStorage.getItem("token");
      await axios.post("http://localhost:3001/materials", values, {
        headers: { Authorization: `Bearer ${token}` },
      });
      message.success("บันทึกข้อมูลเรียบร้อยแล้ว");
      setAddingNewRow(false);
      const updatedMaterials = await axios.get(
        "http://localhost:3001/materials",
        {
          headers: { Authorization: `Bearer ${token}` },
        }
      );
      setMaterials(updatedMaterials.data);
      setFilteredMaterials(updatedMaterials.data);
    } catch (error) {
      console.error("Error saving material:", error);
      message.error("เกิดข้อผิดพลาดในการบันทึกข้อมูล");
    }
  };

  const handleCancelRow = () => {
    setAddingNewRow(false);
  };

  return (
    <MainLayout username="User">
      <Row gutter={16}>
        <Col span={12}>
          <Card
            className="sarabun-light"
            title="อัปโหลดไฟล์วัตถุดิบใหม่"
            style={{ borderRadius: "15px" }}
          >
            <input type="file" onChange={handleFileChange} />
            {loading && <p>กำลังอัปโหลด...</p>}
            {uploadMessage && <p>{uploadMessage}</p>}
            <Button
              style={{
                color: "#f0f0f0",
                backgroundColor: "#5755FE",
                borderColor: "#5755FE",
              }}
              onClick={handleFileSaveClick}
              disabled={loading}
            >
              บันทึก
            </Button>
          </Card>
        </Col>
      </Row>

      <Row>
        <Col span={24}>
          <Card
            className="dashboard-title sarabun-bold"
            title="ตารางข้อมูลวัตถุดิบ"
            style={{ marginTop: "20px" }}
          >
            <Button
              type="primary"
              onClick={handleAddRow}
              style={{
                color: "#f0f0f0",
                backgroundColor: "#5755FE",
                borderColor: "#5755FE",
                marginBottom: "16px",
              }}
            >
              เพิ่มวัตถุดิบใหม่
            </Button>

            <Form layout="inline" style={{ marginBottom: "20px" }}>
              <Form.Item
                className="dashboard-title sarabun-bold"
                label="รหัสวัตถุดิบ"
              >
                <Input
                  name="matunit"
                  value={filter.matunit}
                  onChange={handleFilterChange}
                  placeholder="กรอกรหัสวัตถุดิบ"
                />
              </Form.Item>
              <Form.Item label="ชื่อวัตถุดิบ">
                <Input
                  name="mat_name"
                  value={filter.mat_name}
                  onChange={handleFilterChange}
                  placeholder="กรอกชื่อวัตถุดิบ"
                />
              </Form.Item>
              <Form.Item>
                <Button
                  style={{
                    color: "#f0f0f0",
                    backgroundColor: "#5755FE",
                    borderColor: "#5755FE",
                    marginBottom: "16px",
                  }}
                  type="default"
                  onClick={handleClearFilter}
                >
                  Reset
                </Button>
              </Form.Item>
            </Form>

            <Table
              className="sarabun-light"
              columns={columns}
              dataSource={filteredMaterials}
              rowKey="id"
              pagination={{ pageSize: 10 }}
              
            />
          </Card>
        </Col>
      </Row>

      <Modal
        title="เพิ่ม / แก้ไข วัตถุดิบ"
        open={isModalVisible}
        onOk={handleSaveEdit}
        onCancel={handleCancelEdit}
        okText="บันทึก"
        cancelText="ยกเลิก"
      >
        <Form form={form} layout="vertical">
          <Form.Item
            name="matunit"
            label="รหัสวัตถุดิบ"
            rules={[{ required: true, message: "กรุณากรอกรหัสวัตถุดิบ" }]}
          >
            <Input />
          </Form.Item>
          <Form.Item
            name="mat_name"
            label="ชื่อวัตถุดิบ"
            rules={[{ required: true, message: "กรุณากรอกชื่อวัตถุดิบ" }]}
          >
            <Input />
          </Form.Item>
        </Form>
      </Modal>

      <Modal
        title="เพิ่มวัตถุดิบใหม่"
        open={addingNewRow}
        onOk={() => {
          form
            .validateFields()
            .then((values) => {
              handleSaveRow(values);
            })
            .catch((error) => console.log("Validate Failed:", error));
        }}
        onCancel={handleCancelRow}
        okText="บันทึก"
        cancelText="ยกเลิก"
      >
        <Form layout="vertical" form={form}>
          <Form.Item
            name="matunit"
            label="รหัสวัตถุดิบ"
            rules={[{ required: true, message: "กรุณากรอกรหัสวัตถุดิบ" }]}
          >
            <Input />
          </Form.Item>
          <Form.Item
            name="mat_name"
            label="ชื่อวัตถุดิบ"
            rules={[{ required: true, message: "กรุณากรอกชื่อวัตถุดิบ" }]}
          >
            <Input />
          </Form.Item>
        </Form>
      </Modal>
    </MainLayout>
  );
}

export default UploadMaterials;
