// src/components/Alert.js
import React from 'react';
import { Alert } from 'antd';

const PermissionAlert = ({ message }) => (
    <Alert message={message} type="error" showIcon />
);

export default PermissionAlert;
