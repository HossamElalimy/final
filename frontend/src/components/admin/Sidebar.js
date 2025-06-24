import React from "react";
import { Link, useLocation } from "react-router-dom";
import "./Sidebar.css";


const Sidebar = () => {
  const location = useLocation();

  const isActive = (path) => location.pathname.startsWith(path);


  const logout = () => {
    localStorage.clear();
    window.location.href = "http://localhost:5000/landing/index.html"; 
  };
  

  return (
    <nav className="navbar navbar-dark align-items-start sidebar sidebar-dark accordion bg-gradient-primary p-0">
      <div className="container-fluid d-flex flex-column p-0">
      <Link className="navbar-brand sidebar-brand m-0" to="/admin/home">
  <div className="sidebar-brand-icon-wrapper">
    <i className="fas fa-user-shield fa-lg animated-icon"></i>
  </div>
  <div className="sidebar-brand-text">Admin Panel</div>
</Link>



        <hr className="sidebar-divider my-0" />
        <div className="sidebar-nav-wrapper">
        <ul className="navbar-nav text-light" id="accordionSidebar">
          <li className="nav-item">
            <Link
              className={`nav-link ${isActive("/admin/home") ? "active-highlight" : ""}`}
              to="/admin/home"
            >
              <i className="fas fa-tachometer-alt"></i>
              <span>Dashboard</span>
            </Link>
          </li>
          <li className="nav-item">
            <Link
              className={`nav-link ${isActive("/admin/users") ? "active-highlight" : ""}`}
              to="/admin/users"
            >
              <i className="fas fa-users"></i>
              <span>Users</span>
            </Link>
          </li>
          <li className="nav-item">
            <Link
              className={`nav-link ${isActive("/admin/courses") ? "active-highlight" : ""}`}
              to="/admin/courses"
            >
              <i className="fas fa-book"></i>
              <span>Courses</span>
            </Link>
          </li>
          <li className="nav-item">
            <Link
              className={`nav-link ${isActive("/admin/transactions") ? "active-highlight" : ""}`}
              to="/admin/transactions"
            >
              <i className="fas fa-receipt"></i>
              <span>Transactions</span>
            </Link>
          </li>

          <li className="nav-item">
  <Link
    className={`nav-link ${isActive("/admin/lectures") ? "active-highlight" : ""}`}
    to="/admin/lectures"
  >
    <i className="fas fa-chalkboard"></i>
    <span>Lectures</span>
  </Link>
</li>


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

export default Sidebar;
