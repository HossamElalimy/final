import React, { useState, useEffect, useContext } from "react";
import SocketContext from "../../contexts/SocketContext";

const TeacherTopbar = () => {
  const socket = useContext(SocketContext);
  const [isConnected, setIsConnected] = useState(false);

  useEffect(() => {
    const handleConnect = () => setIsConnected(true);
    const handleDisconnect = () => setIsConnected(false);
    socket.on("connect", handleConnect);
    socket.on("disconnect", handleDisconnect);
    return () => {
      socket.off("connect", handleConnect);
      socket.off("disconnect", handleDisconnect);
    };
  }, [socket]);

  return (
    <nav className="navbar navbar-light navbar-expand bg-white shadow mb-4 topbar static-top">
      <div className="container-fluid d-flex justify-content-between align-items-center">
        <div className="d-flex align-items-center gap-2">
          <form className="d-none d-sm-inline-block form-inline mw-100 navbar-search">
            <div className="input-group">
              <input type="text" className="form-control bg-light border-0 small" placeholder="Search for ..." />
              <button className="btn btn-primary" type="button">
                <i className="fas fa-search fa-sm"></i>
              </button>
            </div>
          </form>
          <span className={`badge bg-${isConnected ? "success" : "danger"}`} style={{ fontSize: "0.8rem" }}>
            {isConnected ? "Live" : "Offline"}
          </span>
        </div>
        <div className="d-flex align-items-center gap-3">
          <div className="dropdown">
            <div className="dropdown-toggle d-flex align-items-center" role="button" data-bs-toggle="dropdown">
              <span className="text-gray-600 small fw-bold">
                {JSON.parse(localStorage.getItem("user"))?.fullName || "Teacher"}
              </span>
            </div>
            <div className="dropdown-menu dropdown-menu-end shadow">
              <button className="dropdown-item text-danger" onClick={() => {
                localStorage.clear();
                window.location.href = "/";
              }}>
                <i className="fas fa-sign-out-alt fa-sm fa-fw me-2 text-gray-400"></i> Logout
              </button>
            </div>
          </div>
        </div>
      </div>
    </nav>
  );
};

export default TeacherTopbar;
