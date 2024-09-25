import React, { useState } from 'react';
import { Outlet } from 'react-router-dom';
import PermissionAlert from './components/Alert'; 

const PrivateRoute = ({ allowedRoles }) => {
    const [showAlert, setShowAlert] = useState(false);
    const role = sessionStorage.getItem('role');

    if (allowedRoles.includes(role)) {
        return <Outlet />;
    }

    if (!showAlert) {
        setShowAlert(true); // Show the alert if the role is not allowed
    }

    return (
        <>
            {showAlert && <PermissionAlert message="ไม่มีสิทธิ์เข้าถึงหน้านี้" />}
        </>
    );
};

export default PrivateRoute;
