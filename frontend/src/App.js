// frontend/src/App.js
import React from "react";
import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import { ToastContainer } from "react-toastify";
import 'react-toastify/dist/ReactToastify.css';


import Login from "./components/Login";
import Dashboard from "./components/Dashboard";
import AdminHome from "./components/admin/AdminHome";
import AdminLayout from "./components/admin/AdminLayout";
import AdminUsers from "./components/admin/AdminUsers";
import SessionManager from "./components/SessionManager";
import AdminCourses from "./components/admin/AdminCourses";
import AdminCoursesList from "./components/admin/AdminCourseList";
import AdminTransactions from "./components/admin/AdminTransactions";
import AdminLectures from "./components/admin/AdminLectures";
//import StudentDashboard from "./components/student/StudentDashboard";
import StudentLayout from "./components/student/StudentLayout";
import StudentLectures from "./components/student/StudentLectures";
import StudentHome from "./components/student/StudentHome";
import StudentPayments from "./components/student/StudentPayment";
import StudentWallet from "./components/student/StudentWallet";
import TeacherLayout from "./components/teacher/TeacherLayout";
import TeacherHome from "./components/teacher/TeacherHome";
import TeacherLectures from "./components/teacher/TeacherLectures"; 
import ParentHome from "./components/parent/ParentHome";
import ParentLayout from "./components/parent/ParentLayout";
import ParentAttendancePage from "./components/parent/ParentAttendancePage";
import ParentTransactionsPage from "./components/parent/ParentTransactionsPage";
import FundWalletPage from "./components/parent/FundWalletPage";
import ParentStudentPredictions from "./components/parent/ParentStudentPredictions";
import MerchantHome from "./components/merchant/MerchantHome";
import MerchantLayout from "./components/merchant/MerchantLayout";
import MerchantItems from "./components/merchant/MerchantItems";
import MerchantTransactions from "./components/merchant/MerchantTransactions"; 

import MerchantTransactionsPage from './components/merchant/MerchantTransactionsPage';


function App() {
  return (
    <Router>
      <SessionManager />


      <Routes>
        <Route path="/" element={<Login />} />
        <Route path="/dashboard" element={<Dashboard />} />

          {/* Admin routes */}
        <Route path="/admin" element={<AdminLayout />}>
          <Route path="home" element={<AdminHome />} />
          <Route path="users" element={<AdminUsers />} />
          <Route path="courses" element={<AdminCoursesList />} />
          <Route path="courses/create" element={<AdminCourses />} />
          <Route path="transactions" element={<AdminTransactions />} />
          <Route path="lectures" element={<AdminLectures />} />
        </Route>

             {/* Student routes */}
  <Route path="/student" element={<StudentLayout />}>
  <Route path="home" element={<StudentHome />} />
    {/* <Route path="dashboard" element={<StudentDashboard />} /> */}
    <Route path="lectures" element={<StudentLectures />} />
    <Route path="wallet" element={<StudentWallet />} />
    <Route path="payments" element={<StudentPayments />} />

  </Route>

  <Route path="/teacher" element={<TeacherLayout />}>
  <Route path="home" element={<TeacherHome />} />
  <Route path="lectures" element={<TeacherLectures />} />
</Route>
<Route path="/parent" element={<ParentLayout />}>
  <Route path="home" element={<ParentHome />} />
  <Route path="fund-wallet" element={<FundWalletPage />} />
  <Route path="/parent/predictions" element={<ParentStudentPredictions />} />
</Route>
<Route path="/parent/attendance/:studentId/:studentName" element={<ParentAttendancePage />} />
<Route path="/parent/transactions/:studentId/:studentName" element={<ParentTransactionsPage />} />

<Route path="/merchant" element={<MerchantLayout />}>
  <Route path="home" element={<MerchantHome />} />
  <Route path="items" element={<MerchantItems />} />
  
  <Route path="transactions" element={<MerchantTransactionsPage />} />

</Route>



      </Routes>
      <ToastContainer position="bottom-right" autoClose={2000} hideProgressBar />
    </Router>
  );
}

export default App;
