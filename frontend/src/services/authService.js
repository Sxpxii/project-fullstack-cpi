// src/services/authService.js
import axios from 'axios';

export const register = async (username, password, role) => {
    return await axios.post('http://localhost:3001/api/register', { username, password, role });
};

export const login = async (username, password) => {
    try {
        const response = await axios.post('http://localhost:3001/api/login', { username, password });
        return response.data; // ส่งข้อมูลที่ได้รับจากเซิร์ฟเวอร์ไปยัง Login.jsx
    } catch (error) {
        throw error; // ส่ง error ไปยัง Login.jsx เพื่อจัดการแสดงข้อความแจ้งเตือนให้ผู้ใช้
    }
};

// Add axios interceptor
axios.interceptors.response.use(
    response => response,
    async error => {
        const originalRequest = error.config;
        if (error.response.status === 401 && error.response.data.error === 'TokenExpiredError') {
            try {
                const refreshToken = localStorage.getItem('refreshToken');
                if (!refreshToken) throw new Error('No refresh token available');

                const response = await axios.post('http://localhost:3001/api/refreshToken', { token: refreshToken });
                const newAccessToken = response.data.accessToken;
                
                localStorage.setItem('token', newAccessToken);
                originalRequest.headers['Authorization'] = 'Bearer ' + newAccessToken;

                return axios(originalRequest);
            } catch (refreshError) {
                console.error('Failed to refresh token', refreshError);
                // Handle the case where refreshing token fails
            }
        }
        return Promise.reject(error);
    }
);