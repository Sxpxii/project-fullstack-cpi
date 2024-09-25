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
import config from '../../configAPI';

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
      await axios.delete(
        `${config.API_URL}/UserManagement/users/${user_id}`,
        {
          headers: { Authorization: `Bearer ${token}` },
          data: { performed_by: currentUserId },
        }
      );
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
    },
    {
      title: "Username",
      dataIndex: "username",
      key: "username",
      align: "center",
    },
    {
      title: "Role",
      dataIndex: "role",
      key: "role",
      align: "center",
    },
    {
      title: "Invited By",
      dataIndex: "invited_by",
      key: "invited_by",
      align: "center",
    },
    {
      title: "Created At",
      dataIndex: "created_at",
      key: "created_at",
      align: "center",
      render: (text) => formatDate(text),
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

      await axios.post(
        `${config.API_URL}/UserManagement/register`,
        payload
      );
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
        <Row gutter={16}>
          <Col span={8}>
            <Card style={{ backgroundColor: '#91caff'}}>
              <Statistic title="Total Users" value={users.length} />
            </Card>
          </Col>
          <Col span={8}>
            <Card style={{ backgroundColor: '#ffd591'}}>
            <Statistic title="Users With Recent Activity" value={users.filter(user => new Date() - new Date(user.lastactivity) < 24 * 60 * 60 * 1000).length} />
            </Card>
          </Col>
          <Col span={8}>
            <Card style={{ backgroundColor: '#b7eb8f'}}>
            <Statistic title="New Users This Month" value={users.filter(user => new Date(user.created_at).getMonth() === new Date().getMonth()).length} />
            </Card>
          </Col>
        </Row>

        <Row >
        <Col span={24}>
          <Card
            className="dashboard-title sarabun-bold"
            title="Users"
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
                Add New User
              </Button>
            }
          >
            <Table
              className="sarabun-light"
              dataSource={users}
              columns={columns}
              rowKey="user_id"
              style={{ marginTop: 20, width: '100%' }}
            />
          </Card>
          </Col>
        </Row>

        {/* Modal for adding new user */}
        <Modal
          title={isEditMode ? "Edit User" : "Add New User"}
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
              label="Username"
              rules={[
                { required: true, message: "Please input the username!" },
              ]}
            >
              <Input />
            </Form.Item>
            <Form.Item
              name="password"
              label="Password"
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
              label="Role"
              rules={[{ required: true, message: "Please select the role!" }]}
            >
              <Select>
                <Option value="Warehouse Officer">ธุรการคลังวัตถุดิบ</Option>
                <Option value="Operations">เจ้าหน้าที่คลังวัตถุดิบ</Option>
                <Option value="Supervisor">หัวหน้า</Option>
                <Option value="Admin">ผู้ดูแลระบบ</Option>
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
              }}>
                {isEditMode ? "Save Changes" : "Add User"}
              </Button>
            </Form.Item>
          </Form>
        </Modal>
      </div>
    </MainLayout>
  );
};

export default UserManagement;
