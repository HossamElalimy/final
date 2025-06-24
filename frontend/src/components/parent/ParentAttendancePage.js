import React, { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import axios from "axios";
import moment from "moment";
import { useContext } from "react";
import SocketContext from "../../contexts/SocketContext";
const ParentAttendancePage = () => {
  const { studentId, studentName } = useParams();
  const navigate = useNavigate();
  const [records, setRecords] = useState([]);
  const socket = useContext(SocketContext);

  useEffect(() => {
    const fetchAttendance = async () => {
      try {
        const res = await axios.get(`http://localhost:5000/api/parent/attendance/${studentId}`);
        setRecords(res.data);
      } catch (err) {
        console.error("Failed to fetch attendance", err);
      }
    };
    fetchAttendance();
    if (!socket) return;
    socket.on("attendance-update", ({ studentId: updatedId }) => {
      if (updatedId === studentId) {
        fetchAttendance();
      }
    });
  
    return () => socket.off("attendance-update");
  }, [studentId, socket]);

  return (
    <div className="container mt-5">
      <div className="d-flex justify-content-between align-items-center mb-4">
        <h3 className="fw-bold text-primary">{studentName}'s Attendance History</h3>
        <button className="btn btn-secondary" onClick={() => navigate("/parent/home")}>
          ← Back
        </button>
      </div>

      <div className="card shadow">
        <div className="card-body table-responsive">
          <table className="table table-bordered table-hover align-middle">
            <thead className="table-light text-center">
              <tr>
                <th>Date</th>
                <th>Day</th>
                <th>Lecture</th>
                <th>Status</th>
                <th>Login</th>
                <th>Logout</th>
              </tr>
            </thead>
            <tbody>
              {records.length === 0 ? (
                <tr>
                  <td colSpan="6" className="text-center text-muted">
                    No attendance records found.
                  </td>
                </tr>
              ) : (
                records.map((r, idx) => (
                  <tr key={idx} className="text-center">
                    <td>{r.date || "—"}</td>
                    <td>{r.day || "—"}</td>
                    <td>{r.courseCode || "—"}</td>
                    <td className={
                      r.status === "Attended"
                        ? "text-success"
                        : r.status === "Late"
                        ? "text-warning"
                        : "text-danger"
                    }>
                      {r.status || "—"}
                    </td>
                    <td>{r.loginTime ? moment(r.loginTime).format("HH:mm") : "—"}</td>
                    <td>{r.logoutTime ? moment(r.logoutTime).format("HH:mm") : "—"}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default ParentAttendancePage;
