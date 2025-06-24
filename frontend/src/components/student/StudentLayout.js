import React from "react";
import StudentSidebar from "./StudentSidebar";
import StudentTopbar from "./StudentTopbar";
import { studentMenu } from "./studentMenu";
import { Outlet } from "react-router-dom";

const StudentLayout = () => (
  <div id="wrapper">
    <StudentSidebar menuItems={studentMenu} />
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

export default StudentLayout;
