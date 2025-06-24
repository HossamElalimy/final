import React from "react";
import Sidebar from "./Sidebar";
import Topbar from "./Topbar";
import { Outlet, Navigate, useLocation } from "react-router-dom";

const AdminLayout = () => {
  const user = JSON.parse(localStorage.getItem("user"));
  const location = useLocation();

  // Prevent wrapping /admin/home with Sidebar + Topbar
  if (location.pathname === "/admin/home") {
    return <Outlet />;
  }

  if (!user || user.role !== "admin") {
    return <Navigate to="/" replace />;
  }

  return (
    <div id="wrapper">
      <Sidebar />
      <div className="d-flex flex-column" id="content-wrapper">
        <div id="content">
          <Topbar />
          <div className="container-fluid">
            <Outlet />
          </div>
        </div>
      </div>
    </div>
  );
};

export default AdminLayout;
