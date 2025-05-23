import React from "react";
import { BrowserRouter as Router, Route, Routes } from "react-router-dom";
import PrivateRoute from "./PrivateRoute";
import Login from "./pages/Login";
import Register from "./pages/Register";
import Dashboardclerk from "./pages/clerk/DashboardClerk";
import UploadItemRequest from "./pages/clerk/UploadItemRequest";
import Details from "./pages/clerk/DetailsClerk";
import OperationsDashboard from "./pages/staff/DashboardStaff";
import MyTasks from "./pages/staff/MyTasks";
import TaskDetails from "./pages/staff/TaskDetails";
import TaskDetailsFinished from "./pages/staff/TaskDetailsFinished";
import PendingTaskDetails from "./pages/staff/PendingTaskDetails";
import UserManagement from "./pages/admin/UserManagement";
import Approval from "./pages/supervisorClerk/Approval";
import DashboardSupClerk from "./pages/supervisorClerk/DashboardDaily";
import SupEditDetails from "./pages/supervisorClerk/SupEditDetails";
import RemainingEditDetails from "./pages/supervisorClerk/RemainingEditDetails"
import DashboardAnalysis from "./pages/supervisorClerk/DashboardAnalysis";
import DetailsSupClerk from "./pages/supervisorClerk/DetailSup";
import ReportByDate from "./pages/supervisorClerk/ReportByDate";
import DashboardMaterialUsage from  "./pages/supervisorClerk/DashboardMaterialUsage";

const App = () => {

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
          <Route path="/details-SupClerk/:upload_id" element={<DetailsSupClerk />} />
          <Route path="/ReportByDate" element={<ReportByDate />} />
          <Route path="/DashboardMaterialUsage" element={<DashboardMaterialUsage />} />
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

        {/* Routes for Admin */}
        <Route element={<PrivateRoute allowedRoles={["Admin"]} />}>
          <Route path="/UserManagement" element={<UserManagement />} />
          <Route path="/Register" element={<Register />} />
        </Route>

      </Routes>
    </Router>
  );
};

export default App;
