import React, { useEffect } from 'react';

const MyComponent = () => {
    useEffect(() => {
        const checkSession = async () => {
            try {
                const response = await fetch('/api/checkSession', {
                    method: 'GET',
                    headers: {
                        'Authorization': `Bearer ${localStorage.getItem('accessToken')}`
                    }
                });

                if (response.status === 401) {
                    window.location.href = '/'; // รีไดเรกต์ไปยังหน้าเข้าสู่ระบบ
                }
            } catch (err) {
                console.error('Error checking session:', err);
            }
        };

        const interval = setInterval(checkSession, 20 * 60 * 1000); // ตรวจสอบทุก 20 นาที
        checkSession(); // ตรวจสอบครั้งแรกเมื่อ component ถูก mount

        return () => clearInterval(interval); // ล้าง interval เมื่อ component ถูก unmount
    }, []);

    return (
        <div>
            {/* ส่วนที่เหลือของ component */}
        </div>
    );
};

export default MyComponent;
