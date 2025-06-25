import React, { useEffect, useState } from "react";
import axios from "axios";
import DatePicker from "react-datepicker";
import "react-datepicker/dist/react-datepicker.css";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import "./AdminLectures.css";
import { useContext } from "react";
import SocketContext from "../../contexts/SocketContext";


const AdminLectures = () => {
  const [lectures, setLectures] = useState([]);
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [facultyFilter, setFacultyFilter] = useState("");
  const facultyList = [
    "Dentistry",
    "Pharmacy",
    "Biotechnology",
    "Engineering",
    "Computer Science",
    "Mass Communication",
    "Management Sciences",
    "Arts and Design",
    "Languages",
    "Physical Therapy"
  ];
  

  

  const [search, setSearch] = useState("");
  const [courseSuggestions, setCourseSuggestions] = useState([]);
  const [teacherSuggestions, setTeacherSuggestions] = useState([]);
  const [courseSearch, setCourseSearch] = useState("");
const [teacherSearch, setTeacherSearch] = useState("");
const [showModal, setShowModal] = useState(false);
const [selectedLecture, setSelectedLecture] = useState(null);
const [attendanceRecords, setAttendanceRecords] = useState([]);
const socket = useContext(SocketContext);




useEffect(() => {
  fetchLectures();
}, [selectedDate, courseSearch, teacherSearch, facultyFilter,showModal]);
useEffect(() => {
  if (!socket) return;

  const handleUpdate = (payload) => {
    console.log("📡 Real-time update:", payload);
    if (payload.type === "attendance-finalized") {
      fetchLectures(); // refresh attendance count
    }
  };

  socket.on("lecture-updated", handleUpdate);

  return () => socket.off("lecture-updated", handleUpdate);
}, [socket]);

const getAttendanceColor = (attended, total) => {
  if (!total) return "secondary";
  const ratio = attended / total;
  if (ratio >= 0.9) return "success";
  if (ratio >= 0.5) return "warning";
  return "danger";
};

  
const openAttendanceModal = async (lec) => {
  console.log("Opening modal for:", lec); // ✅ Add this

  try {
    const res = await axios.get(`http://localhost:5000/api/attendance/byLecture`, {
      params: {
        courseCode: lec.courseCode,
        day: lec.day,
        startTime: lec.startTime,
        endTime: lec.endTime
      }
    });

    setSelectedLecture(lec);
    setAttendanceRecords(res.data);
    setShowModal(true);
  } catch (err) {
    console.error("Failed to fetch attendance", err);
  }
};



  

const fetchLectures = async () => {
  try {
    const dateStr = selectedDate.toISOString().split("T")[0];
    const res = await axios.get("http://localhost:5000/api/lectures", {
      params: {
        date: dateStr,
        course: courseSearch,
        teacher: teacherSearch,
        faculty: facultyFilter
      }
    });
    console.log("Fetched lectures:", res.data);
    setLectures(res.data);
  } catch (err) {
    console.error("Error fetching lectures:", err);
  }
};
const handleCourseSearchChange = (value) => {
  setCourseSearch(value);
  if (value.length >= 2) {
    fetchCourseSuggestions(value);
  } else {
    setCourseSuggestions([]);
  }
};

const handleTeacherSearchChange = (value) => {
  console.log("Searching teacher with:", value); // Add this for debugging
  const match = value.match(/\((T\d+)\)/); // If format is "Teacher Hossam (T01)"
  const clean = match ? match[1] : value;

  setTeacherSearch(clean);

  if (clean.length >= 2) {
    fetchTeacherSuggestions(clean);
  } else {
    setTeacherSuggestions([]);
  }
};


  

  const fetchCourseSuggestions = async (query) => {
    const res = await axios.get("http://localhost:5000/api/courses/suggest", {
      params: { query }
    });
    setCourseSuggestions(res.data);
  };

  const fetchTeacherSuggestions = async (query) => {
    try {
      const res = await axios.get("http://localhost:5000/api/courses/search/teachers", {
        params: { q: query }
      });
      setTeacherSuggestions(res.data); // Make sure this is updating correctly
    } catch (err) {
      console.error("Teacher suggest error:", err);
      setTeacherSuggestions([]); // Reset in case of failure
    }
  };
  
  

  const handleSearchChange = (value) => {
    // 👇 Check if the value includes "(Txx)" and extract it
    const match = value.match(/\((T\d+)\)/); // e.g. "(T01)"
    const cleanValue = match ? match[1] : value; // use T01 if found
  
    setSearch(cleanValue);
  
    if (cleanValue.length >= 2) {
      fetchCourseSuggestions(cleanValue);
      fetchTeacherSuggestions(cleanValue);
    } else {
      setCourseSuggestions([]);
      setTeacherSuggestions([]);
    }
  };
  
  

  const getStatus = (start, end) => {
    const now = new Date();
    const s = new Date(start);
    const e = new Date(end);
    if (now < s) return "Upcoming";
    if (now >= s && now <= e) return "Ongoing";
    return "Ended";
  };
  

  const exportCSV = () => {
    const headers = ["Course ID", "Course Name", "Faculty", "Day", "Start", "End", "Type", "Teacher", "Attendance"];
    const rows = lectures.map((l) => [
      l.courseCode,
      l.courseName,
      l.faculty,
      l.day,
      l.startTime,
      l.endTime,
      l.type,
      l.teacherName,
      l.attendanceCount || 0
    ]);
    const content =
      "data:text/csv;charset=utf-8," +
      [headers, ...rows].map((r) => r.join(",")).join("\n");
    const link = document.createElement("a");
    link.setAttribute("href", encodeURI(content));
    link.setAttribute("download", "lectures.csv");
    document.body.appendChild(link);
    link.click();
  };

  const exportPDF = () => {
    const doc = new jsPDF();
    doc.text("Lecture Report", 14, 16);
    autoTable(doc, {
      startY: 20,
      head: [["Course ID", "Name", "Faculty", "Day", "Start", "End", "Type", "Teacher", "Attendance"]],
      body: lectures.map((l) => [
        l.courseCode,
        l.courseName,
        l.faculty,
        l.day,
        l.startTime,
        l.endTime,
        l.type,
        l.teacherName,
        l.attendanceCount || 0
      ])
    });
    doc.save("lectures.pdf");
  };
  useEffect(() => {
    const interval = setInterval(() => {
      const now = new Date();
      setLectures((prevLectures) =>
        prevLectures.map((lec) => {
          const start = new Date(lec.startDateTime);
          const end = new Date(lec.endDateTime);
  
          let status = "Upcoming";
          if (now >= start && now <= end) {
            status = "Ongoing";
          } else if (now > end) {
            status = "Ended";
          }
  
          return {
            ...lec,
            _dynamicStatus: status  // 👈 Add a temporary override field
          };
        })
      );
    }, 30000); // update every 30 seconds
  
    return () => clearInterval(interval);
  }, []);
  
  return (

    
    <div className="container mt-4">
      {showModal && selectedLecture && (
  <div className="modal d-block" tabIndex="-1" style={{ background: "rgba(0,0,0,0.5)" }}>
    <div className="modal-dialog modal-lg">
      <div className="modal-content">
        <div className="modal-header">
          <h5 className="modal-title">
            Attendance: {selectedLecture.courseCode} ({selectedLecture.attendanceCount || 0} / {selectedLecture.enrolledCount || 0})
          </h5>
          <button type="button" className="btn-close" onClick={() => setShowModal(false)}></button>
        </div>
        <div className="modal-body">
          <table className="table table-bordered table-hover">
            <thead>
              <tr>
                <th>Student ID</th>
                <th>Log In Time</th>
                <th>Log Out Time</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {attendanceRecords.map((record, i) => {
                const s = new Date(selectedLecture.startDateTime);
                const e = new Date(selectedLecture.endDateTime);
                const login = new Date(record.loginTime);
                const logout = new Date(record.logoutTime);

                let status = "Attended";
                if (login > new Date(s.getTime() + 15 * 60000)) status = "Late";
                if (logout < new Date(e.getTime() - 15 * 60000)) status = "Absent";

                return (
                  <tr key={i}>
                    <td>{record.studentId}</td>
                    <td>{login.toLocaleTimeString()}</td>
                    <td>{logout.toLocaleTimeString()}</td>
                    <td>
                      <span className={`badge bg-${status === "Attended" ? "success" : status === "Late" ? "warning" : "danger"}`}>
                        {status}
                      </span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  </div>
)}


      <h4 className="mb-3">Lecture Schedule</h4>

      <div className="d-flex flex-wrap gap-3 mb-4">
        <DatePicker
          selected={selectedDate}
          onChange={(date) => setSelectedDate(date)}
          className="form-control"
          dateFormat="yyyy-MM-dd"
        />
{/* Course Search */}
<input
  className="form-control"
  placeholder="Search by course code"
  value={courseSearch}
  onChange={(e) => handleCourseSearchChange(e.target.value)}
  list="course-suggestions"
/>
<datalist id="course-suggestions">
  {courseSuggestions.map((s, i) => (
    <option key={i} value={s} />
  ))}
</datalist>

{/* Teacher Search */}
<input
  className="form-control"
  placeholder="Search by teacher ID or name"
  value={teacherSearch}
  onChange={(e) => handleTeacherSearchChange(e.target.value)}
  list="teacher-suggestions"
/>
<datalist id="teacher-suggestions">
  {teacherSuggestions.map((t, i) => (
    <option key={i} value={`${t.fullName} (${t.userId})`} />
  ))}
</datalist>




        <select
          className="form-select"
          value={facultyFilter}
          onChange={(e) => setFacultyFilter(e.target.value)}
        >
          <option value="">All Faculties</option>
          {facultyList.map((f, i) => (
            <option key={i} value={f}>{f}</option>
          ))}
        </select>

        <button className="btn btn-outline-success" onClick={exportCSV}>Export CSV</button>
        <button className="btn btn-outline-primary" onClick={exportPDF}>Export PDF</button>
      </div>

      <table className="table table-hover table-bordered">
        <thead className="table-light">
          <tr>
            <th>Course ID</th>
            <th>Course Name</th>
            <th>Faculty</th>
            <th>Day</th>
            <th>Start</th>
            <th>End</th>
            <th>Type</th>
            <th>Teacher</th>
            <th>Room</th>
            <th>Status</th>
            <th>Attendance</th>

          </tr>
        </thead>
        <tbody>
          {lectures.map((lec, i) => (
            <React.Fragment key={i}>
             <tr style={{ cursor: "pointer" }} onClick={() => openAttendanceModal(lec)}>

                <td>{lec.courseCode}</td>
                <td>{lec.courseName}</td>
                <td>{lec.faculty}</td>
                <td>{lec.day}</td>
                <td>{lec.startTime}</td>
                <td>{lec.endTime}</td>
                <td>{lec.type}</td>
                <td>{lec.teacherName}</td>
                <td>{lec.room || "N/A"}</td>
                

                <td>
                  <span
                    className={`badge bg-${
                      getStatus(lec.startDateTime, lec.endDateTime) === "Ongoing"
                        ? "success"
                        : getStatus(lec.startDateTime, lec.endDateTime) === "Ended"
                        ? "danger"
                        : "warning"
                    }`}
                  >
                    {getStatus(lec.startDateTime, lec.endDateTime)}
                  </span>
                </td>
                <td>
                <span className={`badge bg-${getAttendanceColor(lec.attendanceCount, lec.enrolledCount)}`}>
  {lec.attendanceCount || 0} / {lec.enrolledCount || 0}
</span>

</td>


              </tr>
              
             


            </React.Fragment>
            
          ))}
        </tbody>
      </table>
    </div>
  );
};

export default AdminLectures;
