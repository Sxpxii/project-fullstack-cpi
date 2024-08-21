import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { DashboardOutlined, UploadOutlined, FileOutlined } from '@ant-design/icons';
import { Breadcrumb, Layout, Menu, Row, Col, Card, Statistic } from 'antd';
import { Line, Column } from '@ant-design/charts';
import '../../styles1/Analysis.css';

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

const Analysis = () => {
    const [processData, setProcessData] = useState([]);
    const [individualData, setIndividualData] = useState([]);
    const [issueData, setIssueData] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const navigate = useNavigate();

    useEffect(() => {
        const fetchProcessPerformance = async () => {
            try {
                const response = await axios.get('http://localhost:3001/supervisorDashboard/process-performance');
                setProcessData(response.data);
            } catch (error) {
                setError('Error fetching process performance');
                console.error('Error fetching process performance:', error);
            } finally {
                setLoading(false);
            }
        };        
        fetchProcessPerformance();
    }, []);

    const handleMenuClick = (e) => {
        if (e.key === '1') {
            navigate('/SupervisorDashboard');
        } else if (e.key === '2') {
            navigate('/Analysis');
        }
    };

    return (
        <Layout style={{ minHeight: '100vh' }}>
            <Header style={{ display: 'flex', alignItems: 'center' }}>
                <div className="demo-logo" />
                <Menu
                    theme="dark"
                    mode="horizontal"
                    defaultSelectedKeys={['2']}
                    items={items}
                    onClick={handleMenuClick}
                    style={{ flex: 1, minWidth: 0 }}
                />
            </Header>
            <Content style={{ padding: '0 48px' }}>
                <Breadcrumb style={{ margin: '16px 0' }}>
                    <Breadcrumb.Item>Overview</Breadcrumb.Item>
                    <Breadcrumb.Item>Analysis</Breadcrumb.Item>
                </Breadcrumb>
                <div style={{ background: '#fff', minHeight: 280, padding: 24, borderRadius: 8 }}>
                    <h1>Analysis Dashboard</h1>
                    {loading && <p>Loading...</p>}
                    {error && <p style={{ color: 'red' }}>{error}</p>}
                    <Row gutter={16} style={{ marginBottom: '24px' }}>
                        <Col span={24}>
                            <Card title="Overall Process Performance">
                                <Column
                                    data={processData}
                                    xField="date"
                                    yField="value"
                                    title="การทำงานภาพรวมของกระบวนการเบิกจ่าย"
                                    height={300}
                                />
                            </Card>
                        </Col>
                    </Row>
                    <Row gutter={16} style={{ marginBottom: '24px' }}>
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
            </Content>
            <Footer style={{ textAlign: 'center' }}>
                Ant Design ©{new Date().getFullYear()} Created by Ant UED
            </Footer>
        </Layout>
    );
};

export default Analysis;
