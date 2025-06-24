import React, { useEffect, useState, useContext } from "react";
import axios from "axios";
import StudentStatCard from "../student/StudentStatCard";
import SocketContext from "../../contexts/SocketContext";
import "./../../styles/TeacherDashboard.css";
import TeacherCharts from "./TeacherCharts";


const TeacherHome = () => {
  const [summary, setSummary] = useState(null);
  
  const [selectedCourseCode, setSelectedCourseCode] = useState(""); 
  
  const socket = useContext(SocketContext);
  const user = JSON.parse(localStorage.getItem("user"));

  const fetchSummary = async () => {
    try {
      const res = await axios.get(`http://localhost:5000/api/teacher/summary/${user.userId}`);
      setSummary(res.data);
    } catch (err) {
      console.error("Error fetching teacher summary:", err);
    }
  };

  useEffect(() => {
    fetchSummary();
    if (!socket) return;
    socket.on("lecture-updated", fetchSummary);
    return () => socket.off("lecture-updated", fetchSummary);
  }, [socket]);

  if (!summary) return <p className="text-center mt-5">Loading dashboard...</p>;

  // 🔍 Get selected course data
  const selectedCourse = summary.courses.find(c => c.courseCode === selectedCourseCode);

  return (
    <div className="container-fluid">
      <h4 className="mb-4 text-gray-800">Teacher Dashboard</h4>
      <div className="row g-4 mb-4">
        <StudentStatCard title="Total Courses" value={summary.totalCourses} iconClass="fas fa-book-open" textColor="primary" />
        <StudentStatCard title="Total Lectures" value={summary.totalLectures} iconClass="fas fa-chalkboard" textColor="info" />
        <StudentStatCard title="Lectures Today (Ended)" value={summary.endedToday} iconClass="fas fa-calendar-check" textColor="success" />
        <StudentStatCard title="Lectures Today (Upcoming)" value={summary.upcomingToday} iconClass="fas fa-hourglass-start" textColor="warning" />
        <StudentStatCard title="Ongoing Lectures" value={summary.ongoingLectures} iconClass="fas fa-spinner" textColor="secondary" />
        <StudentStatCard title="Total Students" value={summary.totalStudents} iconClass="fas fa-users" textColor="dark" />
      </div>

     {/* 🔽 Course Selection Panel */}
     <div className="card course-selector-card mb-4">
  <div className="d-flex justify-content-between align-items-center mb-3">
    <h5 className="fw-bold text-primary mb-0">
      <i className="fas fa-list-alt me-2 text-dark" /> Select a Course to View Attendance
    </h5>
    {selectedCourseCode && (
      <span className="course-badge">
        <i className="fas fa-check-circle me-1" />
        Selected: {selectedCourseCode}
      </span>
    )}
  </div>

  <select
    className="form-select shadow-sm rounded-3"
    value={selectedCourseCode}
    onChange={e => setSelectedCourseCode(e.target.value)}
  >
    <option value="">-- Choose a Course --</option>
    {summary.courses.map(course => (
      <option key={course.courseCode} value={course.courseCode}>
        {course.courseCode}
      </option>
    ))}
  </select>
</div>


{/* 📊 Course Attendance Stats */}
{selectedCourse && (
  <div className="attendance-summary-card">
    <h5 className="attendance-summary-title">
      <i className="fas fa-chart-bar me-2 text-primary" />
      Attendance Summary for <span className="text-primary">{selectedCourse.courseCode}</span>
    </h5>

    <div className="row row-cols-1 row-cols-sm-2 row-cols-md-3 g-4">
  <StudentStatCard
    title="Total Attended"
    value={selectedCourse.attendance}
    iconClass="fas fa-check-circle"
    textColor="success"
    cardClass="stat-card-sm"
  />
  <StudentStatCard
    title="Attendance Rate"
    value={`${selectedCourse.attendanceRate}%`}
    iconClass="fas fa-chart-line"
    textColor="primary"
    cardClass="stat-card-sm"
  />
  <StudentStatCard
    title="Late Students"
    value={selectedCourse.late}
    iconClass="fas fa-clock"
    textColor="warning"
    cardClass="stat-card-sm"
  />
  <StudentStatCard
    title="Late Rate"
    value={`${selectedCourse.lateRate}%`}
    iconClass="fas fa-percentage"
    textColor="warning"
    cardClass="stat-card-sm"
  />
  <StudentStatCard
    title="Absent Students"
    value={selectedCourse.absent}
    iconClass="fas fa-user-times"
    textColor="danger"
    cardClass="stat-card-sm"
  />
  <StudentStatCard
    title="Absent Rate"
    value={`${selectedCourse.absentRate}%`}
    iconClass="fas fa-chart-pie"
    textColor="danger"
    cardClass="stat-card-sm"
  />
</div>

    </div>
 
)}
<hr className="my-5" />
<TeacherCharts teacherId={user.userId} selectedCourseCode={selectedCourseCode} />




    </div>
  );
};

export default TeacherHome;
