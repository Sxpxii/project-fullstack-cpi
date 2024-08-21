import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';
import { DashboardOutlined, UploadOutlined, UserOutlined, LogoutOutlined  } from '@ant-design/icons';
import { Breadcrumb, Layout, Menu, Row, Col, Card, Modal, Progress, Avatar, Dropdown, Space  } from 'antd';
import { Pie } from '@ant-design/charts';
import '../../styles1/SupervisorDashboard.css';

const { Header, Content, Footer } = Layout;

const items = [
    { key: '1', 
      icon: <DashboardOutlined />,
      label: 'ติดตามสถานะ' 
    },
    { key: '2',
      icon: <UploadOutlined />,
      label: 'วิเคราะห์การทำงาน' ,
    }
];

const formatDate = (dateString) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-GB'); // รูปแบบวันที่ตามที่คุณต้องการ
};

const SupervisorDashboard = () => {
  const [data, setData] = useState([]);
  const [user, setUser] = useState(null);
  const [isModalVisible, setIsModalVisible] = useState(false);
  const [selectedItem, setSelectedItem] = useState(null);
  const navigate = useNavigate();

  useEffect(() => {
      const fetchData = async () => {
          try {
              const response = await axios.get('http://localhost:3001/supervisorDashboard/daily-overview');
              const formattedData = response.data.map(item => ({
                  ...item,
                  date: formatDate(item.date)
              }));
              setData(formattedData);
          } catch (error) {
              console.error('Error fetching data:', error);
          }
      };

      fetchData();

      const storedUserName = localStorage.getItem('userName'); // ดึงข้อมูลชื่อผู้ใช้จาก Local Storage
      if (storedUserName) {
          setUser(storedUserName);
      } else {
          setUser('Guest');
      }
  }, []);

  const handleMenuClick = (e) => {
      if (e.key === '1') {
          navigate('/SupervisorDashboard');
      } else if (e.key === '2') {
          navigate('/Analysis');
      }
  };

  const showModal = (item) => {
      setSelectedItem(item);
      setIsModalVisible(true);
  };

  const handleOk = () => {
      setIsModalVisible(false);
  };

  const handleCancel = () => {
      setIsModalVisible(false);
  };

  const handleLogout = () => {
      // ทำการ Logout และเปลี่ยนเส้นทางไปยังหน้า Login
      localStorage.removeItem('accessToken');
      localStorage.removeItem('refreshToken');
      localStorage.removeItem('userName');
      navigate('/');
  };

  const menu = (
      <Menu>
          <Menu.Item key="1">
              <span>{user}</span>
          </Menu.Item>
          <Menu.Item key="2" icon={<LogoutOutlined />} onClick={handleLogout}>
              Logout
          </Menu.Item>
      </Menu>
  );

  // ฟังก์ชันสำหรับสร้างแผนภูมิวงกลม
  const generatePieChartData = (item) => {
    return [
        { type: 'กำลังดำเนินการ', value: item.in_progress },
        { type: 'ดำเนินการเรียบร้อย', value: item.completed },
        { type: 'รอตรวจสอบ', value: item.review },
    ];
    };


  return (
    <Layout style={{ minHeight: '100vh' }}>
        <Header style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            {/* <div className="demo-logo" /> */}
            <Menu
                theme="dark"
                mode="horizontal"
                defaultSelectedKeys={['1']}
                items={items}
                onClick={handleMenuClick}
                style={{ flex: 1, minWidth: 0 }}
            />
            <Dropdown overlay={menu} trigger={['click']}>
                <Avatar icon={<UserOutlined />} style={{ cursor: 'pointer' }} />
            </Dropdown>
        </Header>
        <Content style={{ padding: '0 48px' }}>
            <Breadcrumb style={{ margin: '16px 0' }}>
                <Breadcrumb.Item>Overview</Breadcrumb.Item>
            </Breadcrumb>
            <div
                style={{
                    background: '#fff',
                    minHeight: 280,
                    padding: 24,
                    borderRadius: 8,
                }}
            >
                <Row gutter={16}>
                    {Array.isArray(data) && data.map((item) => (
                        <Col span={8} key={item.date}>
                            <Card title={`Date: ${item.date}`}>
                                <Pie
                                    data={generatePieChartData(item)}
                                    angleField="value"
                                    colorField="type"
                                    radius={1}
                                    label={{
                                        type: 'spider',
                                        content: '{name} ({percentage})',
                                    }}
                                    interactions={[{ type: 'element-active' }]}
                                    onReady={plot => {
                                        plot.on('element:click', () => showModal(item));
                                    }}
                                />
                            </Card>
                        </Col>
                    ))}
                </Row>

                <Modal
                    title="รายละเอียด"
                    visible={isModalVisible}
                    onOk={handleOk}
                    onCancel={handleCancel}
                >
                    {selectedItem && (
                        <div>
                            <p>Total Uploads: {selectedItem.total_uploads}</p>
                            <p>In Progress: {selectedItem.in_progress}</p>
                            <p>Completed: {selectedItem.completed}</p>
                            <p>Review: {selectedItem.review}</p>
                        </div>
                    )}
                </Modal>
            </div>
        </Content>
        <Footer style={{ textAlign: 'center' }}>
            Ant Design ©{new Date().getFullYear()} Created by Ant UED
        </Footer>
    </Layout>
);
};


export default SupervisorDashboard;
