import React from "react";
import TeacherSidebar from "./TeacherSidebar";
import TeacherTopbar from "./TeacherTopbar";
import { Outlet } from "react-router-dom";

const TeacherLayout = () => (
  <div id="wrapper">
    <TeacherSidebar />
    <div className="d-flex flex-column" id="content-wrapper">
      <div id="content">
        <TeacherTopbar />
        <div className="container-fluid">
          <Outlet />
        </div>
      </div>
    </div>
  </div>
);

export default TeacherLayout;
