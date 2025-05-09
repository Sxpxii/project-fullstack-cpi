import React, { useEffect, useState } from "react";
import axios from "axios";
import {
  Table,
  Card,
  Statistic,
  Row,
  Col,
  Button,
  Modal,
  Form,
  Input,
  Select,
  Popconfirm,
  Tag,
  message,
  Space,
} from "antd";
import MainLayout from "../../components/LayoutAdmin";
import { HiMiniPencilSquare } from "react-icons/hi2";
import { FaTrashCan } from "react-icons/fa6";
import config from "../../configAPI";

const { Option } = Select;

const UserManagement = () => {
  const [users, setUsers] = useState([]);
  const [isModalVisible, setIsModalVisible] = useState(false);
  const [isEditMode, setIsEditMode] = useState(false);
  const [editUserId, setEditUserId] = useState(null);
  const [form] = Form.useForm();

  useEffect(() => {
    fetchUsers();
  }, []);

  const fetchUsers = async () => {
    try {
      const res = await axios.get(`${config.API_URL}/UserManagement/users`);
      console.log("Fetched users:", res.data);
      if (Array.isArray(res.data)) {
        setUsers(res.data);
      } else {
        console.error("Invalid data format for users:", res.data);
        setUsers([]); // หรือการจัดการข้อผิดพลาดที่เหมาะสม
      }
    } catch (error) {
      console.error("Error fetching users:", error);
      setUsers([]); // หรือการจัดการข้อผิดพลาดที่เหมาะสม
    }
  };

  const handleEdit = (user) => {
    setEditUserId(user.user_id);
    form.setFieldsValue({
      username: user.username,
      password: "", // Password should be empty for security reasons
      role: user.role,
    });
    setIsEditMode(true);
    setIsModalVisible(true);
  };

  const handleDelete = async (user_id) => {
    try {
      const currentUserId = sessionStorage.getItem("userId");
      const token = sessionStorage.getItem("token");
      await axios.delete(`${config.API_URL}/UserManagement/users/${user_id}`, {
        headers: { Authorization: `Bearer ${token}` },
        data: { performed_by: currentUserId },
      });
      fetchUsers();
    } catch (error) {
      console.error("Error deleting user:", error);
    }
  };

  const handleModalOk = async (values) => {
    try {
      const currentUserId = sessionStorage.getItem("userId");

      if (editUserId) {
        await axios.put(
          `${config.API_URL}/UserManagement/users/${editUserId}`,
          { ...values, updated_by: currentUserId }
        );
      }
      setIsModalVisible(false);
      form.resetFields();
      fetchUsers();
    } catch (error) {
      console.error("Error updating user:", error);
    }
  };

  const formatDate = (dateString) => {
    const date = new Date(dateString);
    return `${date.getFullYear()}-${("0" + (date.getMonth() + 1)).slice(-2)}-${(
      "0" + date.getDate()
    ).slice(-2)}`;
  };

  const columns = [
    {
      title: "ลำดับ",
      key: "index",
      render: (text, record, index) => index + 1,
      align: "center",
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
      title: "Username",
      dataIndex: "username",
      key: "username",
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
      title: "Role",
      dataIndex: "role",
      key: "role",
      align: "center",
      render: (role) => {
        switch (role) {
          case "Warehouse Officer":
            return "ธุรการคลังวัตถุดิบ";
          case "Operations":
            return "เจ้าหน้าที่คลังวัตถุดิบ";
          case "Supervisor Clerk":
            return "หัวหน้า";
          case "Admin":
            return "แอดมิน";
          default:
            return role; // หรือแสดงเป็นค่าเริ่มต้นหากไม่มีค่าที่ตรงกัน
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
      title: "Invited By",
      dataIndex: "invited_by",
      key: "invited_by",
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
      title: "Created At",
      dataIndex: "created_at",
      key: "created_at",
      align: "center",
      render: (text) => formatDate(text),
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
      title: "",
      key: "actions",
      render: (text, record) => (
        <Space>
          <Button
            style={{
              color: "#5755FE",
              backgroundColor: "#f0f0f0",
              borderColor: " #f0f0f0",
              display: "flex",
              justifycontent: "space-between",
            }}
            icon={<HiMiniPencilSquare />}
            onClick={() => handleEdit(record)}
          />
          <Popconfirm
            title="Are you sure to delete this user?"
            onConfirm={() => handleDelete(record.user_id)}
            okText="Yes"
            cancelText="No"
            okButtonProps={{
              style: {
                color: "#f0f0f0",
                backgroundColor: "#5755FE",
                borderColor: "#5755FE",
              },
            }}
            cancelButtonProps={{
              style: {
                color: "#5755FE",
                backgroundColor: "#f0f0f0",
                borderColor: "#f0f0f0",
              },
            }}
          >
            <Button
              style={{
                color: "#5755FE",
                backgroundColor: "#f0f0f0",
                borderColor: " #f0f0f0",
              }}
              icon={<FaTrashCan />}
            />
          </Popconfirm>
        </Space>
      ),
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
    },
  ];

  // Function to show modal
  const showModal = () => {
    form.resetFields(); // Reset form fields to empty for new user
    setIsEditMode(false);
    setIsModalVisible(true);
  };

  // Function to handle form submission
  const handleAddUser = async (values) => {
    try {
      const currentUserId = sessionStorage.getItem("userId");
      const payload = {
        ...values,
        invited_by: currentUserId, // ส่ง user_id ของผู้กด Add User ไปกับข้อมูลอื่น
      };
      console.log("payload:", payload);

      await axios.post(`${config.API_URL}/UserManagement/register`, payload);
      setIsModalVisible(false);
      form.resetFields();
      fetchUsers(); // Fetch users again to refresh the table
    } catch (error) {
      console.error("Error adding user:", error);
    }
  };

  return (
    <MainLayout username="User">
      <div className="App">
        <Row gutter={16} style={{ marginTop:"30px", marginBottom:"30px"}}>
          <Col className="gutter-row" span={8}>
            <Card
              style={{
                fontSize: "16px",
                backgroundColor: "#91caff",
                textAlign: "center",
                borderRadius: "24px",
                boxShadow: "0 4px 6px rgba(0, 0, 0, 0.1)",
              }}
            >
              <Statistic
                title={
                  <span
                    className="sarabun-bold"
                    style={{ color: "#000", fontSize: "18px" }}
                  >
                    ผู้ใช้งานทั้งหมด
                  </span>
                }
                value={users.length}
                valueRender={(value) => (
                  <span
                    className="sarabun-bold"
                    style={{ color: "#000", fontSize: "30px" }}
                  >
                    {value}
                  </span>
                )}
              />
            </Card>
          </Col>

          <Col className="gutter-row" span={8}>
            <Card
              style={{
                fontSize: "16px",
                backgroundColor: "#ffd591",
                textAlign: "center",
                borderRadius: "24px",
                boxShadow: "0 4px 6px rgba(0, 0, 0, 0.1)",
              }}
            >
              <Statistic
                title={
                  <span
                    className="sarabun-bold"
                    style={{ color: "#000", fontSize: "18px" }}
                  >
                    ผู้ใช้ที่ใช้งานล่าสุด
                  </span>
                }
                value={
                  users.filter(
                    (user) =>
                      new Date() - new Date(user.lastactivity) <
                      24 * 60 * 60 * 1000
                  ).length
                }
                valueRender={(value) => (
                  <span
                    className="sarabun-bold"
                    style={{ color: "#000", fontSize: "30px" }}
                  >
                    {value}
                  </span>
                )}
              />
            </Card>
          </Col>

          <Col className="gutter-row" span={8}>
            <Card
              style={{
                fontSize: "16px",
                backgroundColor: "#b7eb8f",
                textAlign: "center",
                borderRadius: "24px",
                boxShadow: "0 4px 6px rgba(0, 0, 0, 0.1)",
              }}
            >
              <Statistic
                title={
                  <span
                    className="sarabun-bold"
                    style={{ color: "#000", fontSize: "18px" }}
                  >
                    ผู้ใช้ใหม่ในเดือนนี้
                  </span>
                }
                value={
                  users.filter(
                    (user) =>
                      new Date(user.created_at).getMonth() ===
                      new Date().getMonth()
                  ).length
                }
                valueRender={(value) => (
                  <span
                    className="sarabun-bold"
                    style={{ color: "#000", fontSize: "30px" }}
                  >
                    {value}
                  </span>
                )}
              />
            </Card>
          </Col>
        </Row>

        <Row>
          <Col span={24}>
            <Card
              className="dashboard-title sarabun-bold"
              title="ผู้ใช้งานระบบ"
              style={{ marginTop: "20px" }}
              extra={
                <Button
                  style={{
                    color: "#f0f0f0",
                    backgroundColor: "#5755FE",
                    borderColor: "#5755FE",
                  }}
                  type="primary"
                  onClick={showModal}
                >
                  เพิ่มผู้ใช้ใหม่
                </Button>
              }
            >
              <Table
                className="sarabun-light"
                dataSource={users}
                columns={columns}
                rowKey="user_id"
                style={{ marginTop: 20, width: "100%" }}
              />
            </Card>
          </Col>
        </Row>

        {/* Modal for adding new user */}
        <Modal
          title={<span className="sarabun-bold">{isEditMode ? "Edit User" : "Add New User"}</span>}
          visible={isModalVisible}
          onCancel={() => setIsModalVisible(false)}
          footer={null}
        >
          <Form
            form={form}
            layout="vertical"
            onFinish={isEditMode ? handleModalOk : handleAddUser}
          >
            <Form.Item
              name="username"
              label={<span className="sarabun-bold">Username</span>}
              rules={[
                { required: true, message: "Please input the username!" },
              ]}
            >
              <Input />
            </Form.Item>
            <Form.Item
              name="password"
              label={<span className="sarabun-bold">Password</span>}
              rules={[
                {
                  required: !isEditMode,
                  message: "Please input the password!",
                },
              ]}
            >
              <Input.Password />
            </Form.Item>
            <Form.Item
              name="role"
              label={<span className="sarabun-bold">Role</span>}
              rules={[{ required: true, message: "Please select the role!" }]}
            >
              <Select>
                <Option className="sarabun-bold" value="Warehouse Officer">ธุรการคลังวัตถุดิบ</Option>
                <Option className="sarabun-bold" value="Supervisor Clerk">
                  หัวหน้า
                </Option>
                <Option  className="sarabun-bold"value="Operations">เจ้าหน้าที่คลังวัตถุดิบ</Option>
                <Option className="sarabun-bold" value="Admin">แอดมิน</Option>
              </Select>
            </Form.Item>
            <Form.Item>
              <Button
                type="primary"
                htmlType="submit"
                style={{
                  color: "#f0f0f0",
                  backgroundColor: "#5755FE",
                  borderColor: "#5755FE ",
                }}
              >
                {isEditMode ? "บันทึก" : "เพิ่มผู้ใช้งานใหม่"}
              </Button>
            </Form.Item>
          </Form>
        </Modal>
      </div>
    </MainLayout>
  );
};

export default UserManagement;
