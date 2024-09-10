// src/pages/Register.jsx
import React, { useState } from 'react';
import { register } from '../services/authService';
import { Link } from 'react-router-dom';
import '../styles1/Register.css';

function Register() {
    const [username, setUsername] = useState('');
    const [password, setPassword] = useState('');
    const [role, setRole] = useState('Warehouse Officer');

    const handleSubmit = async (e) => {
        e.preventDefault();
        try {
            await register(username, password, role);
            alert('Registration successful');
        } catch (error) {
            console.error(error);
            if (error.response && error.response.data && error.response.data.error) {
                alert(error.response.data.error);
            } else {
                alert('Registration failed');
            }
        }
    };

    return (
        <div className="register-page-wrapper sarabun-light">
            <div className="register-form-container">
                <h1 className="register-title">Register</h1>
                <form onSubmit={handleSubmit} className="register-form">
                    <input 
                        type="text" 
                        value={username} 
                        onChange={(e) => setUsername(e.target.value)} 
                        placeholder="Username" 
                        className="register-input"
                    />
                    <input 
                        type="password" 
                        value={password} 
                        onChange={(e) => setPassword(e.target.value)} 
                        placeholder="Password" 
                        className="register-input"
                    />
                    <select 
                        value={role} 
                        onChange={(e) => setRole(e.target.value)} 
                        className="register-input sarabun-light"

                    >
                        <option value="Warehouse Officer">ธุรการคลังวัตถุดิบ</option>
                        <option value="Operations">เจ้าหน้าที่คลังวัตถุดิบ</option>
                        <option value="Supervisor">หัวหน้า</option>
                        <option value="Admin">ผู้ดูแลระบบ</option>
                    </select>
                    <button type="submit" className="register-button">Register</button>
                </form>
                <Link to="/" className="login-link">ย้อนกลับ</Link>
            </div>
        </div>
    );
}

export default Register;
