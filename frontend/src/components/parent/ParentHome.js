import React, { useEffect, useState } from "react";
import axios from "axios";
import StudentStatCard from "../student/StudentStatCard";
import StudentCharts from "../student/StudentCharts";
import { Modal, Button } from "react-bootstrap";
import { useNavigate } from "react-router-dom";
import { useContext } from "react";
import SocketContext from "../../contexts/SocketContext";


const ParentHome = () => {
    const navigate = useNavigate();
  const parent = JSON.parse(localStorage.getItem("user"));
  const [summaryData, setSummaryData] = useState([]);
  const [selectedStudentId, setSelectedStudentId] = useState(null);
  const [selectedStudent, setSelectedStudent] = useState(null);

  const socket = useContext(SocketContext);

  useEffect(() => {
    if (!socket || !parent?.userId) return;
  
    const refetch = () => {
      axios.get(`http://localhost:5000/api/parent/summary/${parent.userId}`)
        .then(res => setSummaryData(res.data));
    };
  
    socket.on("attendance-update", refetch);
    socket.on("wallet-update", refetch);
    socket.on("transaction-update", refetch);
  
    return () => {
      socket.off("attendance-update", refetch);
      socket.off("wallet-update", refetch);
      socket.off("transaction-update", refetch);
    };
  }, [socket, parent]);

  useEffect(() => {
    const fetchSummary = async () => {
      if (!parent || !parent.userId) return;
      try {
        const res = await axios.get(`http://localhost:5000/api/parent/summary/${parent.userId}`);
        setSummaryData(res.data);
      } catch (err) {
        console.error("Parent summary error:", err);
      }
    };

    fetchSummary();
  }, [parent]);

  
  
  
  
  
  return (
    <div className="container-fluid mt-4">
      <h2 className="fw-bold mb-4">Welcome, {parent.fullName}</h2>
      {summaryData.length > 1 && (
  <div className="mb-4">
    <label className="form-label">Select Child:</label>
    <select
  className="form-select w-auto"
  value={selectedStudentId || ""}
  onChange={(e) => setSelectedStudentId(e.target.value)}
>
  <option value="">All</option>
  {summaryData.map(child => (
    <option key={child.studentId} value={child.studentId}>
      {child.studentName}
    </option>
  ))}
</select>

  </div>
)}

{summaryData.length === 0 ? (
  <p>No linked student data found.</p>
) : (
  summaryData
    .filter(child => !selectedStudentId || child.studentId === selectedStudentId)
    .map((child, idx) => (
      <div key={idx} className="mb-5">
        <h4 className="mb-3 text-primary">👨‍🎓 {child.studentName}</h4>
        <div className="row g-3">
        <button
  className="btn btn-outline-primary btn-sm mt-2"
  onClick={() => navigate(`/parent/attendance/${child.studentId}/${encodeURIComponent(child.studentName)}`)}
>
  View Full Attendance
</button>

<button
  className="btn btn-outline-dark btn-sm mt-2"
  onClick={() => navigate(`/parent/transactions/${child.studentId}/${encodeURIComponent(child.studentName)}`)}
>
  View Transaction History
</button>


          <StudentStatCard title="Wallet Balance" value={`${child.walletBalance} EGP`} iconClass="fas fa-wallet" textColor="success" />
          <StudentStatCard title="Total Attended" value={child.totalAttended} iconClass="fas fa-check-circle" textColor="primary" />
          <StudentStatCard title="Lectures Missed / Total" value={`${child.totalAbsences} / ${child.totalLectures}`} iconClass="fas fa-percentage" textColor="secondary" />
          <StudentStatCard title="Today's Spending" value={`${child.todaySpent} EGP`} iconClass="fas fa-money-bill-wave" textColor="warning" />
          <StudentStatCard title="Total Purchased" value={`${child.totalPurchased} EGP`} iconClass="fas fa-shopping-cart" textColor="success" />
          <StudentStatCard title="Total Transactions" value={child.totalTransactions} iconClass="fas fa-list" textColor="info" />
          <StudentStatCard title="Transactions Today" value={child.transactionsToday} iconClass="fas fa-credit-card" textColor="primary" />
          <StudentStatCard title="Purchases Today" value={child.purchasesToday} iconClass="fas fa-shopping-bag" textColor="success" />
          <StudentStatCard title="Total Courses" value={child.totalCourses} iconClass="fas fa-book" textColor="dark" />
          <StudentStatCard title="Lectures Today (Ended)" value={child.lecturesEndedToday} iconClass="fas fa-calendar" textColor="secondary" />
          <StudentStatCard title="Lectures Today (Upcoming)" value={child.lecturesUpcomingToday} iconClass="fas fa-hourglass-half" textColor="warning" />
          <StudentStatCard title="Lectures Late" value={child.totalLate} iconClass="fas fa-clock" textColor="danger" />
          <StudentStatCard title="Attendance Rate" value={`${child.attendanceRate}%`} iconClass="fas fa-chart-line" textColor="info" />
          <StudentStatCard title="Late Rate" value={`${child.lateRate}%`} iconClass="fas fa-hourglass-end" textColor="warning" />
          <StudentStatCard title="Ongoing Lectures" value={child.ongoingLectures} iconClass="fas fa-play-circle" textColor="info" />
          <StudentStatCard title="Total Deducted" value={`${child.totalDeducted} EGP`} iconClass="fas fa-minus-circle" textColor="danger" />
          <StudentStatCard title="Total Added" value={`${child.totalAdded} EGP`} iconClass="fas fa-plus-circle" textColor="success" />

          <div className="mt-4">
            <StudentCharts studentId={child.studentId} />
          </div>
        </div>
      </div>
    ))
)}

</div> 
);      {/* ✅ Closes the return(...) properly */}

};

export default ParentHome;