import React from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faBox, faClipboard, faChartBar, faUser, faHome, faSignOutAlt } from '@fortawesome/free-solid-svg-icons';
import { message } from 'antd'; 
import axios from 'axios';
import '../styles1/Sidebar.css'; // Import CSS file for styling

function Sidebar({ sidebarOpen, toggleSidebar, username }) {
    const navigate = useNavigate();

    const handleLogout = async () => {
        try {
            await axios.post('http://localhost:3001/api/logout', {}, {
                headers: {
                    'Authorization': `Bearer ${localStorage.getItem('token')}`
                }
            });
            // ลบข้อมูลจาก localStorage
            localStorage.removeItem('token');
            localStorage.removeItem('refreshToken');
            localStorage.removeItem('username');
            localStorage.removeItem('role');
            
            message.success('Logout successful');
            navigate('/'); // เปลี่ยนเส้นทางไปที่หน้า login
        } catch (error) {
            console.error('Logout failed:', error);
            message.error('Logout failed');
        }
    };
    

    return (
        <div className={`sidebar ${sidebarOpen ? 'open' : 'closed'}`}>
            <div className="sidebar-toggle" onClick={toggleSidebar}>
                {sidebarOpen ? '<' : '>'}
            </div>
            <div className="logo">
                <FontAwesomeIcon icon={faHome} className="sidebar-icon" />
                {sidebarOpen && <span>คลังวัตถุดิบ</span>}
            </div>
            <ul className="sidebar-menu">
                <li>
                    <Link to="/Dashboard">
                        <FontAwesomeIcon icon={faBox} className="sidebar-icon" />
                        {sidebarOpen && <span>จัดการข้อมูลการเบิกจ่ายวัตถุดิบ</span>}
                    </Link>
                </li>
                <li>
                    <Link to="/OperationsDashboard">
                        <FontAwesomeIcon icon={faClipboard} className="sidebar-icon" />
                        {sidebarOpen && <span>ข้อมูลการปฏิบัติงาน</span>}
                    </Link>
                </li>
                <li>
                    <Link to="/reports">
                        <FontAwesomeIcon icon={faChartBar} className="sidebar-icon" />
                        {sidebarOpen && <span>รายงาน</span>}
                    </Link>
                </li>
                <li>
                    <Link to="/AdminDashboard">
                        <FontAwesomeIcon icon={faUser} className="sidebar-icon" />
                        {sidebarOpen && <span>จัดการผู้ใช้งาน</span>}
                    </Link>
                </li>
            </ul>
            <div className="sidebar-footer">
                {username && (
                    <div className="username">
                        <div className="username-icon-wrapper">
                            <FontAwesomeIcon icon={faUser} className="sidebar-icon username-icon" />
                        </div>
                        {sidebarOpen && <span>{username}</span>}
                    </div>
                )}
                <div className="logout" onClick={handleLogout}>
                    <FontAwesomeIcon icon={faSignOutAlt} className="sidebar-icon" />
                    {sidebarOpen && <span>ออกจากระบบ</span>}
                </div>
            </div>
        </div>
    );
}

export default Sidebar;
