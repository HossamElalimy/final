// frontend/src/components/teacher/TeacherLectures.js
import React, { useState, useEffect, useContext, useRef } from "react";
import axios from "axios";
import moment from "moment";
import DatePicker from "react-datepicker";
import "react-datepicker/dist/react-datepicker.css";
import SocketContext from "../../contexts/SocketContext";

const TeacherLectures = () => {
  const socket = useContext(SocketContext);
  const user = JSON.parse(localStorage.getItem("user"));  // Logged-in user (teacher)
  const [lectures, setLectures] = useState([]);
  const [teacherCourses, setTeacherCourses] = useState([]);
  const [filterDate, setFilterDate] = useState(new Date());    // default to today
  const [filterCourse, setFilterCourse] = useState("");
  const [selectedLecture, setSelectedLecture] = useState(null);
  const [attendance, setAttendance] = useState([]);   // attendance records for the selected lecture
  const [status, setStatus] = useState("");           // status of selected lecture (Ongoing/Ended/Upcoming)
  const [currentlyAttending, setCurrentlyAttending] = useState([]);
  const lastFetchTimeRef = useRef(0);  // to throttle lecture fetches
  const fetchCurrentlyAttending = async () => {
    try {
      const res = await axios.get(`http://localhost:5000/api/teacher/${user.userId}/currently-attending`);
      setCurrentlyAttending(res.data);
    } catch (err) {
      console.error("Error fetching currently attending:", err);
    }
  };
  // Fetch teacher's lectures, optionally filtered by date
  const fetchLectures = async () => {
    const now = Date.now();
    if (now - lastFetchTimeRef.current < 1000) return; // throttle to avoid rapid repeat calls
    lastFetchTimeRef.current = now;
    try {
      // Format selected date to YYYY-MM-DD for query
      const dateStr = moment(filterDate).format("YYYY-MM-DD");
      const res = await axios.get(
        `http://localhost:5000/api/teacher/${user.userId}/lectures`, 
        { params: { date: dateStr } }
      );
      let data = res.data;
      // Filter by course if dropdown is selected
      if (filterCourse) {
        data = data.filter(lec => lec.courseCode === filterCourse);
      }
      setLectures(data);
    } catch (err) {
      console.error("Error fetching lectures:", err);
    }
  };

  // Fetch list of courses for the teacher (to populate course filter dropdown)
  const fetchTeacherCourses = async () => {
    try {
      const res = await axios.get(`http://localhost:5000/api/teacher/courses/${user.userId}`);
      setTeacherCourses(res.data);
    } catch (err) {
      console.error("Error fetching teacher courses:", err);
    }
  };

  useEffect(() => {
    if (!user?.userId) return;
    fetchLectures();
    fetchTeacherCourses();
    fetchCurrentlyAttending();
  }, [user, filterDate, filterCourse]);  // refetch when date or course filter changes

  // Socket: listen for real-time attendance updates to refresh lecture list or records
  useEffect(() => {
    const handleUpdate = (updatedLectureId) => {
      // Refresh lecture list counts
      fetchLectures();
      // If the currently open lecture is updated (e.g., another device added attendance), refresh its records
      if (selectedLecture) {
        const openId = selectedLecture.lectureId || selectedLecture.timingId;
        if (openId === updatedLectureId) {
          openLectureModal(selectedLecture);
        }
      }
    };
    socket.on("attendance-updated", handleUpdate);
    return () => {
      socket.off("attendance-updated", handleUpdate);
    };
  }, [socket, selectedLecture]);

  // Determine lecture status text based on current time (or selected filter date)
  const getStatusBadge = (lec) => {
    const now = moment();
    const lecDate = filterDate ? moment(filterDate) : moment();
    const start = moment(`${lecDate.format("YYYY-MM-DD")}T${lec.startTime}`, "YYYY-MM-DDTHH:mm");
    const end   = moment(`${lecDate.format("YYYY-MM-DD")}T${lec.endTime}`, "YYYY-MM-DDTHH:mm");
    if (!lec || lec.day !== lecDate.format("dddd")) {
      return "Not Today";
    }
    if (now.isBefore(start)) return "Upcoming";
    if (now.isAfter(end)) return "Ended";
    return "Ongoing";
  };

  // Open the attendance management modal for a lecture
  const openLectureModal = async (lec) => {
    // Determine status for the selected lecture
    const stat = getStatusBadge(lec);
    setSelectedLecture(lec);
    setStatus(stat);
  
    try {
      if (stat === "Ongoing") {
        // Fetch from CurrentlyAttending collection
        const res = await axios.get(`http://localhost:5000/api/teacher/${user.userId}/currently-attending?lectureId=${lec.lectureId || lec.timingId}`);
        setAttendance(res.data);
      } else if (stat === "Ended") {
        // Fetch finalized attendance records
        const lectureIdentifier = lec.lectureId ? lec.lectureId : lec.timingId;
        const res = await axios.get(`http://localhost:5000/api/teacher/attendance/${lectureIdentifier}`);
        setAttendance(res.data);
      } else {
        // For upcoming or other statuses, clear attendance or set empty
        setAttendance([]);
      }
    } catch (err) {
      console.error("Error fetching attendance records:", err);
    }
  };

  // Handle local edits in attendance list (update state)
  const handleAttendanceChange = (index, field, value) => {
    setAttendance(prev => {
      const updated = [...prev];
      updated[index][field] = value;
      return updated;
    });
  };

  // Save changes to a single attendance record (calls API to update)
  const saveAttendance = async (record) => {
    try {
      await axios.put(`http://localhost:5000/api/teacher/attendance/${record._id}`, {
        // Only send fields that might change
        status: record.status,
        loginTime: record.loginTime,    // times are strings like "HH:mm" or Date strings
        logoutTime: record.logoutTime,
        timingId: selectedLecture?.timingId 
      });
      // Immediately reflect changes in UI (or refetch records)
      if (selectedLecture) openLectureModal(selectedLecture);
    } catch (err) {
      console.error("Error saving attendance:", err);
    }
  };

  // Delete an attendance record (remove a student entry)
  const deleteAttendance = async (recordId) => {
    try {
      await axios.delete(`http://localhost:5000/api/teacher/attendance/${recordId}`);
      setAttendance(prev => prev.filter(r => r._id !== recordId));
    } catch (err) {
      console.error("Error deleting attendance:", err);
    }
  };

  // Add a new blank attendance record (e.g., for a student not yet listed)
  const addAttendance = async () => {
    if (!selectedLecture) return;
    try {
      const lectureIdentifier = selectedLecture.lectureId ? selectedLecture.lectureId : selectedLecture.timingId;
      // Create a new record with default values (studentId and fullName should be filled in by teacher)
      const newRecord = {
        lectureId: lectureIdentifier,
        studentId: "", 
        fullName: "", 
        loginTime: "", 
        logoutTime: "", 
        status: "Attended"   // default new entry as Attended
      };
      const res = await axios.post("http://localhost:5000/api/teacher/attendance", newRecord);
      // Append the created record (with its _id) to our attendance state
      setAttendance(prev => [...prev, res.data]);
    } catch (err) {
      console.error("Error adding attendance record:", err);
    }
  };

  return (
    <div className="container mt-4">
      <h3 className="mb-3">📘 My Lectures</h3>

      {/* Filters: Date picker and Course dropdown */}
      <div className="row mb-3">
        <div className="col-md-6">
          <DatePicker 
            className="form-control"
            selected={filterDate} 
            onChange={(date) => setFilterDate(date)} 
            dateFormat="yyyy-MM-dd"
            placeholderText="Filter by Date" 
          />
        </div>
        <div className="col-md-6">
          <select 
            className="form-select"
            value={filterCourse}
            onChange={(e) => setFilterCourse(e.target.value)}
          >
            <option value="">All Courses</option>
            {teacherCourses.map(course => (
              <option key={course.courseCode} value={course.courseCode}>
                {course.courseCode}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Lectures table */}
      <table className="table table-bordered table-hover">
        <thead className="table-dark">
          <tr>
            <th>Course Code</th>
            <th>Course Name</th>
            <th>Day</th>
            <th>Starts</th>
            <th>Ends</th>
            <th>Status</th>
            <th>Attendance / Total</th>
            <th>Actions</th>
          </tr>
        </thead>
        <tbody>
          {lectures.filter(lec => {
            // Filter the lectures list by selected course (if any). Date filtering is already done via fetchLectures.
            return filterCourse ? lec.courseCode === filterCourse : true;
          }).map(lec => {
            const stat = getStatusBadge(lec);
            return (
              <tr key={lec.lectureId || lec.timingId}>
                <td>{lec.courseCode}</td>
                <td>{lec.courseName}</td>
                <td>{lec.day}</td>
                <td>{moment(lec.startTime, "HH:mm").format("hh:mm A")}</td>
                <td>{moment(lec.endTime, "HH:mm").format("hh:mm A")}</td>
                <td>
                  <span className={
                    "badge bg-" + 
                    (stat === "Ongoing" ? "success" : stat === "Ended" ? "secondary" : stat === "Upcoming" ? "info" : "dark")
                  }>
                    {stat}
                  </span>
                </td>
                <td>
                  {lec.attendedCount !== undefined 
                    ? `${lec.attendedCount} / ${lec.totalStudents}` 
                    : `- / ${lec.totalStudents}`
                  }
                </td>
                <td>
                  {/* Only allow managing if lecture is ongoing or ended (teacher should not manage future lectures) */}
                  <button 
                    className="btn btn-primary btn-sm" 
                    onClick={() => openLectureModal(lec)}
                    disabled={stat === "Upcoming"}
                  >
                    Manage
                  </button>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>

      {/* Attendance Management Modal */}
      {selectedLecture && (
        <div className="modal show d-block" tabIndex="-1">
          <div className="modal-dialog modal-lg">
            <div className="modal-content">
              {/* Modal Header */}
              <div className="modal-header">
                <h5 className="modal-title">
                  Manage Attendance – {selectedLecture.courseCode} ({moment(selectedLecture.startTime, "HH:mm").format("hh:mm A")} - {moment(selectedLecture.endTime, "HH:mm").format("hh:mm A")})
                </h5>
                <button type="button" className="btn-close" onClick={() => setSelectedLecture(null)}></button>
              </div>
              {/* Modal Body: Attendance records table */}
              <div className="modal-body">
                <table className="table">
                  <thead>
                    <tr>
                      <th>Student ID</th>
                   
                      <th>Login Time</th>
                      <th>Logout Time</th>
                      <th>Status</th>
                      {status === "Ongoing" && <th>Actions</th>}
                    </tr>
                  </thead>
                  <tbody>
                    {attendance.map((record, index) => (
                      <tr key={record._id || index}>
                        <td>{record.studentId}</td>
                        {/* Teacher can edit the full name or ID if needed (not usually necessary if pre-filled) */}
                   
                        <td>
                          <input 
                            type="time"
                            className="form-control" 
                            value={record.loginTime ? moment(record.loginTime).format("HH:mm") : ""} 
                            onChange={(e) => handleAttendanceChange(index, "loginTime", e.target.value)}
                            disabled={status !== "Ongoing"}
                          />
                        </td>
                        <td>
                          <input 
                            type="time"
                            className="form-control" 
                            value={record.logoutTime ? moment(record.logoutTime).format("HH:mm") : ""} 
                            onChange={(e) => handleAttendanceChange(index, "logoutTime", e.target.value)}
                            disabled={status !== "Ongoing"}
                          />
                        </td>
                        <td>
                        <select
  className="form-select"
  style={{ minWidth: "130px" }}
  value={record.status || "Attended"}
  onChange={(e) => handleAttendanceChange(index, "status", e.target.value)}
  disabled={status !== "Ongoing"}
>
  <option value="Attended">Attended</option>
  <option value="Late">Late</option>
  <option value="Absent">Absent</option>
</select>


                        </td>
                        {status === "Ongoing" && (
                      <td>
                      <div className="d-flex align-items-center gap-2">
                        {record._id && (
                          <>
                            <button className="btn btn-success btn-sm" onClick={() => saveAttendance(record)}>
                              Save
                            </button>
                            <button className="btn btn-danger btn-sm" onClick={() => deleteAttendance(record._id)}>
                              Delete
                            </button>
                          </>
                        )}
                      </div>
                    </td>
                    
                        
                        )}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              {/* Modal Footer: add new record or close */}
              <div className="modal-footer">
                {status === "Ongoing" && (
                  <button className="btn btn-secondary" onClick={addAttendance}>
                    Add Student
                  </button>
                )}
                <button className="btn btn-outline-dark" onClick={() => setSelectedLecture(null)}>
                  Close
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default TeacherLectures;
