import React, { useState, useEffect } from "react";
import { Drawer, Badge } from "antd";
import { BellOutlined } from "@ant-design/icons";
import Swal from "sweetalert2";
import axios from "axios";

const Notification = ({ notifications }) => {
  const [drawerVisible, setDrawerVisible] = useState(false);

  const showSweetAlert = (message) => {
    Swal.fire({
      title: "การแจ้งเตือนใหม่",
      text: message,
      icon: "info",
      confirmButtonText: "Okay",
    });
  };

  const toggleDrawer = () => {
    setDrawerVisible(!drawerVisible);
  };

  useEffect(() => {
    if (notifications.length > 0) {
      const newNotification = notifications[notifications.length - 1];
      showSweetAlert(newNotification.message);
    }
  }, [notifications]);

  return (
    <>
      {/* ไอคอน Bell พร้อม Badge */}
      <Badge count={notifications.length} offset={[0, 5]}>
        <BellOutlined
          style={{ fontSize: "20px", color: "white", cursor: "pointer" }}
          onClick={toggleDrawer}
        />
      </Badge>

      {/* Drawer สำหรับแสดง Notifications */}
      <Drawer
        title="All Notifications"
        placement="right"
        onClose={toggleDrawer}
        visible={drawerVisible}
      >
        {notifications && notifications.length > 0 ? (
          notifications.map((notification, index) => (
            <div
              key={index}
              style={{
                marginBottom: "10px",
                padding: "10px",
                borderBottom: "1px solid #f0f0f0",
              }}
            >
              <strong>{notification.title || "Notification"}</strong>
              <p>{notification.message}</p>
            </div>
          ))
        ) : (
          <p>No notifications available.</p>
        )}
      </Drawer>
    </>
  );
};

export default Notification;
