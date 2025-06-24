import React from "react";
import ParentSidebar from "./ParentSidebar";
import { parentMenu } from "./parentMenu";
import StudentTopbar from "../student/StudentTopbar"; // reuse for now
import { Outlet } from "react-router-dom";

const ParentLayout = () => (
  <div id="wrapper">
    <ParentSidebar menuItems={parentMenu} />
    <div className="d-flex flex-column" id="content-wrapper">
      <div id="content">
        <StudentTopbar /> {/* Or replace later with ParentTopbar */}
        <div className="container-fluid">
          <Outlet />
        </div>
      </div>
    </div>
  </div>
);

export default ParentLayout;
