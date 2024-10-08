// src/pages/Login.jsx
import React, { useState } from "react";
import { login } from "../services/authService";
import { Link, useNavigate } from "react-router-dom";
import { message } from "antd";
import "../styles1/Login.css";
import logo from "../assets/logo.png";

function Login() {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      const response = await login(username, password);
      console.log(response);

      if (
        !response ||
        !response.accessToken ||
        !response.refreshToken ||
        !response.userId
      ) {
        throw new Error("Invalid response from server");
      }

      const { role } = JSON.parse(atob(response.accessToken.split(".")[1]));
      const userId = response.userId;

      sessionStorage.setItem("token", response.accessToken);
      sessionStorage.setItem("refreshToken", response.refreshToken);
      sessionStorage.setItem("username", username);
      sessionStorage.setItem("role", role);
      sessionStorage.setItem("userId", userId);

      message.success("Login successful");

      if (role === "Warehouse Officer") {
        navigate("/Dashboard");
      } else if (role === "Operations") {
        navigate("/OperationsDashboard");
      } else if (role === "Supervisor") {
        navigate("/SupervisorDashboard");
      } else if (role === "Admin") {
        navigate("/UserManagement");
      } else {
        alert("Unknown role");
      }
    } catch (error) {
      console.error("Login error:", error);
      message.error("Login failed");
    }
  };

  return (
    <div className="login-page sarabun-light">
      <div className="login-container">
        <div className="login-info">
        <img src={logo} alt="Logo" className="login-logo" />
          <h1>ยินดีต้อนรับ!</h1>
          <p>กรุณาล็อคอินเพื่อเข้าใช้งานระบบ</p>
          <ul className="info-list">
            <li>Manage your warehouse efficiently</li>
            <li>Track your inventory in real-time</li>
            <li>Ensure smooth operations</li>
          </ul>
        </div>
        <div className="login-form-container">
          <h1 className="login-title">Login</h1>
          <form onSubmit={handleSubmit} className="login-form">
            <input
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              placeholder="Username"
              className="login-input"
            />
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Password"
              className="login-input"
            />
            <button type="submit" className="login-button">
              Login
            </button>
          </form>

        </div>
      </div>
    </div>
  );
}

export default Login;
