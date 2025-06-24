// MerchantLayout.js
import React from "react";
import MerchantSidebar from "./MerchantSidebar";
import { merchantMenu } from "./merchantMenu";
import StudentTopbar from "../student/StudentTopbar"; // reuse for now
import { Outlet } from "react-router-dom";

const MerchantLayout = () => (
  <div id="wrapper">
    <MerchantSidebar menuItems={merchantMenu} />
    <div className="d-flex flex-column" id="content-wrapper">
      <div id="content">
        <StudentTopbar />
        <div className="container-fluid">
          <Outlet />
        </div>
      </div>
    </div>
  </div>
);

export default MerchantLayout;
// This layout includes the sidebar and topbar, and uses Outlet for nested routes