import React from "react";
import { Link, useLocation } from "react-router-dom";
import { teacherMenu } from "./teacherMenu";

const TeacherSidebar = () => {
  const location = useLocation();
  const isActive = (path) => location.pathname.startsWith(path);

  const logout = () => {
    localStorage.clear();
    window.location.href = "http://localhost:5000/landing/index.html";
  };

  return (
    <nav className="navbar navbar-dark align-items-start sidebar sidebar-dark accordion bg-gradient-primary p-0">
      <div className="container-fluid d-flex flex-column p-0">
        <Link className="navbar-brand sidebar-brand m-0" to="/teacher/home">
          <div className="sidebar-brand-icon-wrapper">
            <i className="fas fa-chalkboard-teacher fa-lg animated-icon"></i>
          </div>
          <div className="sidebar-brand-text">Teacher Panel</div>
        </Link>
        <hr className="sidebar-divider my-0" />
        <div className="sidebar-nav-wrapper">
          <ul className="navbar-nav text-light" id="accordionSidebar">
            {teacherMenu.map(({ label, path, icon }) => (
              <li className="nav-item" key={path}>
                <Link className={`nav-link ${isActive(path) ? "active-highlight" : ""}`} to={path}>
                  <i className={`fas fa-${icon}`}></i>
                  <span>{label}</span>
                </Link>
              </li>
            ))}
          </ul>
        </div>
        <div className="text-center mt-auto mb-3">
          <button className="btn btn-danger btn-sm" onClick={logout}>
            Logout
          </button>
        </div>
      </div>
    </nav>
  );
};

export default TeacherSidebar;
