import React from "react";
import { BrowserRouter as Router, Route, Routes } from "react-router-dom";
import PrivateRoute from "./PrivateRoute";
import Login from "./pages1/Login";
import Dashboardclerk from "./pages1/clerk/Dashboard1";
import Details from "./pages1/clerk/Details";
import Register from "./pages1/Register";
import UploadItemRequest from "./pages1/clerk/UploadItemRequest";
import OperationsDashboard from "./pages1/staff/Dashboard";
import MyTasks from "./pages1/staff/MyTasks";
import TaskDetails from "./pages1/staff/TaskDetails";
import TaskDetailsFinished from "./pages1/staff/TaskDetailsFinished";
import PendingTaskDetails from "./pages1/staff/PendingTaskDetails";
import SupervisorDashboard from "./pages1/supervisor/Dashboard";
import Analysis from "./pages1/supervisor/Analysis";
import UserManagement from "./pages1/admin/UserManagement";
import Approval from "./pages1/supervisorClerk/Approval";
import DashboardSupClerk from "./pages1/supervisorClerk/Dashboard";
import SupEditDetails from "./pages1/supervisorClerk/SupEditDetails";
import RemainingEditDetails from "./pages1/supervisorClerk/RemainingEditDetails"
import DashboardAnalysis from "./pages1/supervisorClerk/Analysis";

const App1 = () => {

  // src/App.js
React.useEffect(() => {
  const handleStorageChange = (event) => {
      if (event.key === 'accessToken') {
          // Perform any required actions when accessToken changes, like redirecting or updating state
          console.log('Token updated:', event.newValue);
      }
  };

  window.addEventListener('storage', handleStorageChange);

  return () => {
      window.removeEventListener('storage', handleStorageChange);
  };
}, []);


  return (
    <Router>
      <Routes>
        <Route path="/" element={<Login />} />
        <Route path="/Register" element={<Register />} />

        {/* Routes for Warehouse Officer */}
        <Route element={<PrivateRoute allowedRoles={["Warehouse Officer"]} />}>
          <Route path="/dashboardClerk" element={<Dashboardclerk />} />
          <Route path="/details/:upload_id" element={<Details />} />
          <Route path="/UploadItemRequest" element={<UploadItemRequest />} />
        </Route>

        {/* Routes for SupervisorClerk */}
        <Route element={<PrivateRoute allowedRoles={["Supervisor Clerk"]} />}>
          <Route path="/Approval" element={<Approval />}/>
          <Route path="/SupClerkDashboard" element={<DashboardSupClerk />}/>
          <Route path="/Sup-Edit/:upload_id" element={<SupEditDetails />} />
          <Route path="/Edit-Remaining/:upload_id" element={<RemainingEditDetails />} />
          <Route path="/SupClerkDashboardAnalysis" element={<DashboardAnalysis />} />
        </Route>

        {/* Routes for Operations */}
        <Route element={<PrivateRoute allowedRoles={["Operations"]} />}>
          <Route
            path="/OperationsDashboard"
            element={<OperationsDashboard />}
          />
          <Route path="/MyTasks" element={<MyTasks />} />
          <Route path="/TaskDetails/:upload_id" element={<TaskDetails />} />
          <Route path="/TaskDetailsFinished/:upload_id" element={<TaskDetailsFinished />} />
          <Route path="/PendingTaskDetails/:upload_id" element={<PendingTaskDetails />} />
        </Route>

        {/* Routes for Supervisor */}
        <Route element={<PrivateRoute allowedRoles={["Supervisor"]} />}>
          <Route
            path="/SupervisorDashboard"
            element={<SupervisorDashboard />}
          />
          <Route path="/Analysis" element={<Analysis />} />
        </Route>

        {/* Routes for Admin */}
        <Route element={<PrivateRoute allowedRoles={["Admin"]} />}>
          <Route path="/UserManagement" element={<UserManagement />} />
        </Route>

        
      </Routes>
    </Router>
  );
};

export default App1;
