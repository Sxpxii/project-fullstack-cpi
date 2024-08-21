import React from 'react';
import { BrowserRouter as Router, Route, Routes } from 'react-router-dom';
import PrivateRoute from './PrivateRoute';
import Login from './pages1/Login';
import Dashboard from './pages1/clerk/Dashboard';
import Details from './pages1/clerk/Details';
import Register from './pages1/Register';
import UploadBalance from './pages1/clerk/UploadBalance';
import UploadRequest from './pages1/clerk/UploadRequest';
import UploadMaterials from './pages1/clerk/UploadMaterials';
import OperationsDashboard from './pages1/staff/Dashboard';
import MyTasks from './pages1/staff/MyTasks';
import TaskDetails from './pages1/staff/TaskDetails';
import SupervisorDashboard from './pages1/supervisor/Dashboard';
import Analysis from './pages1/supervisor/Analysis';
import EditDetails from './pages1/clerk/EditDetails';

const App1 = () => {
    return (
        <Router>
            <Routes>
                <Route path="/" element={<Login />} />
                <Route path="/Register" element={<Register />} />

                {/* Routes for Warehouse Officer */}
                <Route element={<PrivateRoute allowedRoles={['Warehouse Officer']} />}>
                    <Route path="/dashboard" element={<Dashboard />} />
                    <Route path="/details/:id" element={<Details />} />
                    <Route path="/edit-details/:upload_id" element={<EditDetails />} />
                    <Route path="/UploadBalance" element={<UploadBalance />} />
                    <Route path="/UploadRequest" element={<UploadRequest />} />
                    <Route path="/UploadMaterials" element={<UploadMaterials />} />
                </Route>

                {/* Routes for Operations */}
                <Route element={<PrivateRoute allowedRoles={['Operations']} />}>
                    <Route path="/OperationsDashboard" element={<OperationsDashboard />} />
                    <Route path="/MyTasks" element={<MyTasks />} />
                    <Route path="/TaskDetails/:upload_id" element={<TaskDetails />} />
                </Route>

                {/* Routes for Supervisor */}
                <Route element={<PrivateRoute allowedRoles={['Supervisor']} />}>
                    <Route path="/SupervisorDashboard" element={<SupervisorDashboard />} />
                    <Route path="/Analysis" element={<Analysis />} />
                </Route>
            </Routes>
        </Router>
    );
};

export default App1;
