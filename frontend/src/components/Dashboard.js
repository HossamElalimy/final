import React from "react";
import Register from "./Register";
import AttendanceForm from "./AttendanceForm";
import { useNavigate } from "react-router-dom";

const Dashboard = () => {
  const navigate = useNavigate();
  const user = JSON.parse(localStorage.getItem("user"));

  // Redirect to login if not logged in
  if (!user) {
    return <h3>Please login to access the dashboard.</h3>;
  }

  // Logout handler
  const handleLogout = () => {
    localStorage.clear();
    navigate("/");
  };

  return (
    <div>
      <h2>Welcome, {user.username} ({user.role})</h2>
      <button onClick={handleLogout}>Logout</button>

      {/* Admin Panel */}
      {user.role === "admin" && (
        <div style={{ marginTop: "20px" }}>
          <h3>
            <span role="img" aria-label="crown">👑</span> Admin Tools
          </h3>
          <Register />
        </div>
      )}

      {/* Teacher Panel */}
      {user.role === "teacher" && (
        <div style={{ marginTop: "20px" }}>
          <h3>
            <span role="img" aria-label="teacher">🧑‍🏫</span> Teacher Panel
          </h3>
          <AttendanceForm />
        </div>
      )}

      {/* Student Panel */}
      {user.role === "student" && (
        <p>
          <span role="img" aria-label="graduation cap">🎓</span> Student panel coming soon
        </p>
      )}

      {/* Parent Panel */}
      {user.role === "parent" && (
        <p>
          <span role="img" aria-label="family">👨‍👩‍👧</span> Parent panel coming soon
        </p>
      )}
    </div>
  );
};

export default Dashboard;
