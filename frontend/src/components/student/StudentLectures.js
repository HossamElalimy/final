import React, { useEffect, useState, useContext } from "react";
import axios from "axios";
import DatePicker from "react-datepicker";
import "react-datepicker/dist/react-datepicker.css";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import SocketContext from "../../contexts/SocketContext";
import { toast } from "react-toastify";



const user = JSON.parse(localStorage.getItem("user"));

const StudentLectures = () => {
  const [lectures, setLectures] = useState([]);
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [courseSearch, setCourseSearch] = useState("");
  const [courseSuggestions, setCourseSuggestions] = useState([]);
  const socket = useContext(SocketContext);
  const simulateRFIDScan = async (lectureId, courseCode, mode) => {
    try {
      const res = await axios.post("http://localhost:5000/api/simulaterfid", {
        userId: user.userId,
        lectureId,
        mode,
      });
      toast.success(res.data.message, { autoClose: 2000 });

  
      // 🧠 Refetch updated data instead of patching manually
      await fetchLectures();
    } catch (err) {
      console.error("❌ RFID simulation error:", err);
      toast.error(err?.response?.data?.message || "Something went wrong during scan.", { autoClose: 2000 });

    }
  };
  
  
  
  
  
  
  useEffect(() => {
    if (!socket) return;
    const handleUpdate = () => {
      console.log("📡 Lecture update received");
      fetchLectures();
    };
    socket.on("lecture-updated", handleUpdate);
    return () => socket.off("lecture-updated", handleUpdate);
  }, [socket]);

  useEffect(() => {
    const interval = setInterval(() => {
      fetchLectures();
    }, 30000);
    return () => clearInterval(interval);
  }, []);

  const fetchLectures = async () => {
    const dateStr = selectedDate.toISOString().split("T")[0];
    try {
      const res = await axios.get(
        `http://localhost:5000/api/studentlectures/live/${user.userId}`,
        {
          params: { date: dateStr, course: courseSearch }
        }
      );
      const sorted = res.data.sort((a, b) => new Date(a.startDateTime) - new Date(b.startDateTime));
      setLectures(sorted);
    } catch (err) {
      console.error("Error fetching student lectures:", err);
    }
  };

  useEffect(() => {
    fetchLectures();
  }, [selectedDate, courseSearch]);

  const getStatus = (start, end) => {
    const now = new Date();
    const s = new Date(start);
    const e = new Date(end);
    if (now < s) return "Upcoming";
    if (now >= s && now <= e) return "Ongoing";
    return "Ended";
  };

  const getAttendanceStatus = (lec, forExport = false) => {
    const isEnded = getStatus(lec.startDateTime, lec.endDateTime) === "Ended";
    const isOngoing = getStatus(lec.startDateTime, lec.endDateTime) === "Ongoing";
    const hasLogin = !!lec.myLogIn;
    const hasLogout = !!lec.myLogOut;
  
    if (isOngoing && hasLogin && !hasLogout)
      return forExport ? "Attending" : "🟡 Attending..";
  
    if (isOngoing && !hasLogin)
      return forExport ? "Waiting" : "🟡 Waiting...";
  
    if (isEnded && hasLogin && hasLogout)
      return forExport ? "Attended" : "✅ Attended";
  
    if (isEnded && !hasLogin)
      return forExport ? "Absent" : "❌ Absent";
  
    return "N/A";
  };
  
  
  
  
  const exportCSV = () => {
    const headers = ["Course", "Name", "Faculty", "Day", "Start", "End", "Type", "Room", "Status", "My Attendance", "Log In", "Log Out"];
    const rows = lectures.map((l) => [
      l.courseCode,
      l.courseName,
      l.faculty,
      l.day,
      l.startTime,
      l.endTime,
      l.type,
      l.room,
      getStatus(l.startDateTime, l.endDateTime),
      l.myAttendance || "N/A",



      l.myLogIn ? new Date(l.myLogIn).toLocaleTimeString() : "—",
      l.myLogOut ? new Date(l.myLogOut).toLocaleTimeString() : "—"
    ]);
    const content = "data:text/csv;charset=utf-8," + [headers, ...rows].map((r) => r.join(",")).join("\n");
    const link = document.createElement("a");
    link.setAttribute("href", encodeURI(content));
    link.setAttribute("download", "student-lectures.csv");
    document.body.appendChild(link);
    link.click();
  };

  const exportPDF = () => {
    const doc = new jsPDF();
    doc.text("My Lecture Report", 14, 16);
    autoTable(doc, {
      startY: 20,
      head: [["Course", "Name", "Faculty", "Day", "Start", "End", "Type", "Room", "Status", "Attendance", "Log In", "Log Out"]],
      body: lectures.map((l) => [
        l.courseCode,
        l.courseName,
        l.faculty,
        l.day,
        l.startTime,
        l.endTime,
        l.type,
        l.room,
        getStatus(l.startDateTime, l.endDateTime),
        l.myAttendance || "N/A",


        l.myLogIn ? new Date(l.myLogIn).toLocaleTimeString() : "—",
        l.myLogOut ? new Date(l.myLogOut).toLocaleTimeString() : "—"
      ])
    });
    doc.save("student-lectures.pdf");
  };

  const handleCourseSearchChange = async (value) => {
    setCourseSearch(value);
    if (value.length >= 2) {
      try {
        const res = await axios.get("http://localhost:5000/api/courses/suggest", {
          params: { query: value }
        });
        setCourseSuggestions(res.data);
      } catch (err) {
        console.error("Error fetching suggestions:", err.message);
        setCourseSuggestions([]);
      }
    } else {
      setCourseSuggestions([]);
    }
  };

  return (
    <div className="container mt-4">
      <h4 className="mb-3">📘 My Lectures</h4>
      <div className="d-flex flex-wrap gap-3 mb-4">
        <DatePicker
          selected={selectedDate}
          onChange={(date) => setSelectedDate(date)}
          className="form-control"
          dateFormat="yyyy-MM-dd"
        />
        <input
          className="form-control"
          placeholder="Search by course code"
          value={courseSearch}
          onChange={(e) => handleCourseSearchChange(e.target.value)}
          list="course-suggestions"
        />
        <datalist id="course-suggestions">
          {courseSuggestions.map((s, i) => <option key={i} value={s} />)}
        </datalist>
        <button className="btn btn-outline-success" onClick={exportCSV}>Export CSV</button>
        <button className="btn btn-outline-primary" onClick={exportPDF}>Export PDF</button>
      </div>


      <table className="table table-hover table-bordered">
        <thead className="table-light">
          <tr>
            <th>Course</th>
            <th>Name</th>
            <th>Faculty</th>
            <th>Day</th>
            <th>Start</th>
            <th>End</th>
            <th>Type</th>
            <th>Room</th>
            <th>Status</th>
            <th>My Attendance</th>
            <th>Log In</th>
            <th>Log Out</th>
          </tr>
        </thead>
        <tbody>
          {lectures.map((lec, i) => (
            <tr key={i}>
              <td>{lec.courseCode}</td>
              <td>{lec.courseName}</td>
              <td>{lec.faculty}</td>
              <td>{lec.day}</td>
              <td>{lec.startTime}</td>
              <td>{lec.endTime}</td>
              <td>{lec.type}</td>
              <td>{lec.room}</td>
        {/* Log In column */}
        <td>
  <span className={`badge bg-${
    getStatus(lec.startDateTime, lec.endDateTime) === "Ongoing"
      ? "success"
      : getStatus(lec.startDateTime, lec.endDateTime) === "Ended"
      ? "danger"
      : "warning"
  }`}>
    {getStatus(lec.startDateTime, lec.endDateTime)}
  </span>
</td>

<td>
  <span className={`badge bg-${
    lec.myAttendance === "Waiting" ? "secondary" :
    lec.myAttendance === "Attending" ? "warning text-dark" :
    lec.myAttendance === "Attended" ? "success" :
    lec.myAttendance === "Late" ? "warning text-dark" :
    lec.myAttendance === "Absent" ? "danger" : "secondary"
  }`}>
    {lec.myAttendance || "N/A"}
  </span>
</td>



{/* Log In column */}

<td>
  {lec.myLogIn && (
    <span className="me-2">{new Date(lec.myLogIn).toLocaleTimeString()}</span>
  )}
  {(() => {
    const now = new Date();
    const isOngoing = getStatus(lec.startDateTime, lec.endDateTime) === "Ongoing";
    const endTime = new Date(lec.endDateTime);
    const reLoginAllowed = lec.myLogOut && now < new Date(endTime.getTime() - 15 * 60000);
    if (isOngoing && (!lec.myLogIn || reLoginAllowed)) {
      return (
        <button
          className="btn btn-sm btn-outline-success"
          onClick={() => simulateRFIDScan(lec.timingId, lec.courseCode, "login")}
        >
          {lec.myLogOut ? "Re-Scan" : "Scan"}
        </button>
      );
    }
    return null;
  })()}
</td>







{/* Log Out column */}
<td>
  {lec.myLogOut ? (
    <span className="me-2">{new Date(lec.myLogOut).toLocaleTimeString()}</span>
  ) : getStatus(lec.startDateTime, lec.endDateTime) === "Ended" && lec.myLogIn ? (
    <span className="me-2 text-muted">{new Date(lec.endDateTime).toLocaleTimeString()} <small>(assumed)</small></span>
  ) : null}

  {(() => {
    const isOngoing = getStatus(lec.startDateTime, lec.endDateTime) === "Ongoing";
    if (isOngoing && lec.myLogIn && !lec.myLogOut) {
      return (
        <button
          className="btn btn-sm btn-outline-danger"
          onClick={() => simulateRFIDScan(lec.timingId, lec.courseCode, "logout")}
        >
          Scan
        </button>
      );
    }
    return null;
  })()}
</td>








            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};

export default StudentLectures;
