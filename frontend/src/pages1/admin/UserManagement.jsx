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
} from "antd";
import MainLayout from "../../components/LayoutAdmin";
import { HiMiniPencilSquare } from "react-icons/hi2";
import { FaTrashCan } from "react-icons/fa6";

const { Option } = Select;

const UserManagement = () => {
  const [users, setUsers] = useState([]);
  const [onlineUsers, setOnlineUsers] = useState([]);
  const [offlineUsers, setOfflineUsers] = useState([]);
  const [isModalVisible, setIsModalVisible] = useState(false);
  const [isEditMode, setIsEditMode] = useState(false);
  const [editUserId, setEditUserId] = useState(null);
  const [form] = Form.useForm();

  useEffect(() => {
    // Function to fetch all data periodically (polling)
    const fetchData = async () => {
      fetchUsers();
      fetchOnlineUsers();
      fetchOfflineUsers();
    };

    // Call fetchData once immediately when component is mounted
    fetchData();

    // Set polling interval to call fetchData every 5 seconds (5000 milliseconds)
    const intervalId = setInterval(fetchData, 5000);

    // Clear interval when the component is unmounted
    return () => clearInterval(intervalId);
  }, []);

  // Function to check session validity
  const checkSession = async () => {
    try {
      const response = await fetch("/api/checkSession", {
        method: "GET",
        headers: {
          Authorization: `Bearer ${localStorage.getItem("accessToken")}`,
        },
      });

      if (response.status === 401) {
        window.location.href = "/login"; // Redirect to login page if session expired
      }
    } catch (err) {
      console.error("Error checking session:", err);
    }
  };

  useEffect(() => {
    // Check session validity every 60 seconds
    const sessionCheckInterval = setInterval(checkSession, 60000);

    // Clear the interval when the component unmounts
    return () => clearInterval(sessionCheckInterval);
  }, []);

  const fetchUsers = async () => {
    try {
      const res = await axios.get("http://localhost:3001/UserManagement/users");
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

  const fetchOnlineUsers = async () => {
    try {
      const res = await axios.get(
        "http://localhost:3001/UserManagement/online"
      );
      if (Array.isArray(res.data)) {
        setOnlineUsers(res.data);
      } else {
        console.error("Invalid data format for online users:", res.data);
        setOnlineUsers([]); // หรือการจัดการข้อผิดพลาดที่เหมาะสม
      }
    } catch (error) {
      console.error("Error fetching online users:", error);
      setOnlineUsers([]); // หรือการจัดการข้อผิดพลาดที่เหมาะสม
    }
  };

  const fetchOfflineUsers = async () => {
    try {
      const res = await axios.get(
        "http://localhost:3001/UserManagement/offline"
      );
      if (Array.isArray(res.data)) {
        setOfflineUsers(res.data);
      } else {
        console.error("Invalid data format for offline users:", res.data);
        setOfflineUsers([]); // หรือการจัดการข้อผิดพลาดที่เหมาะสม
      }
    } catch (error) {
      console.error("Error fetching offline users:", error);
      setOfflineUsers([]); // หรือการจัดการข้อผิดพลาดที่เหมาะสม
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
      const currentUserId = localStorage.getItem("userId");
      const token = localStorage.getItem("token");
      await axios.delete(
        `http://localhost:3001/UserManagement/users/${user_id}`,
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
      const currentUserId = localStorage.getItem("userId");

      if (editUserId) {
        await axios.put(
          `http://localhost:3001/UserManagement/users/${editUserId}`,
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

  const getStatusTag = (lastActivity) => {
    const now = new Date();
    const lastLogin = new Date(lastActivity);
    const isOnline = now - lastLogin < 60000; // Consider online if last activity was within the last 60 seconds
    return isOnline ? (
      <Tag className="sarabun-light" color="green">
        Online
      </Tag>
    ) : (
      <Tag className="sarabun-light" color="red">
        Offline
      </Tag>
    );
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
    ,
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
      title: "Last Login",
      dataIndex: "lastactivity",
      key: "lastactivity",
      align: "center",
      render: (text) => getStatusTag(text),
    },
    {
      title: "Actions",
      key: "actions",
      render: (text, record) => (
        <div>
          <Button
            style={{
              color: "#5755FE",
              backgroundColor: "#f0f0f0",
              borderColor: " #f0f0f0",
            }}
            icon={<HiMiniPencilSquare />}
            onClick={() => handleEdit(record)}
          />
          <Popconfirm
            title="Are you sure to delete this user?"
            onConfirm={() => handleDelete(record.user_id)}
            okText="Yes"
            cancelText="No"
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
        </div>
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
      const currentUserId = localStorage.getItem("userId");
      const payload = {
        ...values,
        invited_by: currentUserId, // ส่ง user_id ของผู้กด Add User ไปกับข้อมูลอื่น
      };
      console.log("payload:", payload);

      await axios.post(
        "http://localhost:3001/UserManagement/register",
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
            <Card>
              <Statistic title="Total Users" value={users.length} />
            </Card>
          </Col>
          <Col span={8}>
            <Card>
              <Statistic title="Users Online" value={onlineUsers.length} />
            </Card>
          </Col>
          <Col span={8}>
            <Card>
              <Statistic title="Users Offline" value={offlineUsers.length} />
            </Card>
          </Col>
        </Row>

        <Row>
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
              style={{ marginTop: 20 }}
            />
          </Card>
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
              <Button type="primary" htmlType="submit">
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
