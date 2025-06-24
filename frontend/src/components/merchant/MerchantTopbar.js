import React, { useState, useEffect, useContext } from "react";
import SocketContext from "../../contexts/SocketContext";

const StudentTopbar = () => {
  const socket = useContext(SocketContext);
  const [isConnected, setIsConnected] = useState(false);
  const [notifications, setNotifications] = useState([]);
  const [offlineTooLong, setOfflineTooLong] = useState(false);

  useEffect(() => {
    const handleConnect = () => {
      setIsConnected(true);
      setOfflineTooLong(false);
    };

    const handleDisconnect = () => {
      setIsConnected(false);
      setTimeout(() => {
        if (!socket.connected) setOfflineTooLong(true);
      }, 5000);
    };

    const handleNotification = (data) => {
      setNotifications((prev) => [...prev, data]);
    };

    socket.on("connect", handleConnect);
    socket.on("disconnect", handleDisconnect);
    socket.on("new-notification", handleNotification);

    return () => {
      socket.off("connect", handleConnect);
      socket.off("disconnect", handleDisconnect);
      socket.off("new-notification", handleNotification);
    };
  }, [socket]);

  const logout = () => {
    localStorage.clear();
    window.location.href = "/";
  };

  return (
    <>
      {offlineTooLong && (
        <div className="alert alert-danger text-center m-0 rounded-0 py-2 fw-bold">
          🔌 Connection lost. Trying to reconnect...
        </div>
      )}

      <nav className="navbar navbar-light navbar-expand bg-white shadow mb-4 topbar static-top">
        <div className="container-fluid d-flex justify-content-between align-items-center">
          {/* Search input */}
          <div className="d-flex align-items-center gap-2">
            <form className="d-none d-sm-inline-block form-inline mw-100 navbar-search">
              <div className="input-group">
                <input
                  type="text"
                  className="form-control bg-light border-0 small"
                  placeholder="Search for ..."
                />
                <button className="btn btn-primary" type="button">
                  <i className="fas fa-search fa-sm"></i>
                </button>
              </div>
            </form>
            {/* Live status badge */}
            <span
              className={`badge bg-${isConnected ? "success" : "danger"}`}
              style={{ fontSize: "0.8rem" }}
            >
              {isConnected ? "Live" : "Offline"}
            </span>
          </div>

          {/* Notifications and profile */}
          <div className="d-flex align-items-center gap-3">
            {/* Notifications dropdown */}
            <div className="dropdown">
              <div
                className="position-relative dropdown-toggle"
                role="button"
                data-bs-toggle="dropdown"
              >
                <i className="fas fa-bell fa-lg text-secondary"></i>
                <span className="position-absolute top-0 start-100 translate-middle badge rounded-pill bg-danger">
                  {notifications.length > 9 ? "9+" : notifications.length}
                </span>
              </div>

              <div className="dropdown-menu dropdown-menu-end shadow p-2">
                <h6 className="dropdown-header text-primary">Alerts</h6>
                {notifications.length === 0 && (
                  <span className="dropdown-item small text-muted">
                    No new alerts
                  </span>
                )}
                {notifications.map((note, idx) => (
                  <span className="dropdown-item small" key={idx}>
                    {note.type === "money" ? "💰" : "📢"} {note.message}
                  </span>
                ))}
              </div>
            </div>

            <div className="vr mx-2"></div>

            {/* Profile dropdown */}
            <div className="dropdown">
              <div
                className="dropdown-toggle d-flex align-items-center"
                role="button"
                data-bs-toggle="dropdown"
              >
                <span className="text-gray-600 small fw-bold">
                  {JSON.parse(localStorage.getItem("user"))?.fullName || "User"}
                </span>
              </div>

              <div className="dropdown-menu dropdown-menu-end shadow">
                <a className="dropdown-item" href="#">
                  <i className="fas fa-user fa-sm fa-fw me-2 text-gray-400"></i>{" "}
                  Profile
                </a>
                <a className="dropdown-item" href="#">
                  <i className="fas fa-cogs fa-sm fa-fw me-2 text-gray-400"></i>{" "}
                  Settings
                </a>
                <div className="dropdown-divider" />
                <button className="dropdown-item text-danger" onClick={logout}>
                  <i className="fas fa-sign-out-alt fa-sm fa-fw me-2 text-gray-400"></i>{" "}
                  Logout
                </button>
              </div>
            </div>
          </div>
        </div>
      </nav>
    </>
  );
};

export default StudentTopbar;
