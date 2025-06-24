import React, { useState } from "react";
import { useNavigate } from "react-router-dom"; // 👈 Import here
import { useContext } from "react";
import SocketContext from "../../contexts/SocketContext";





const AdminCourses = () => {
  const socket = useContext(SocketContext);
  const navigate = useNavigate();
  const [courseForm, setCourseForm] = useState({
    courseCode: "",
    courseName: "",
    type: "",
    faculty: "",  
    timings: [],
    teachers: [],
    
  });

  const [errorPopup, setErrorPopup] = useState({ visible: false, message: "" });

  const [popupVisible, setPopupVisible] = useState(false);

  const [timingInput, setTimingInput] = useState({
    day: "",
    start: "",
    end: "",
    room: ""
  });
  

  const [suggestions, setSuggestions] = useState([]);
  const [teacherSearch, setTeacherSearch] = useState("");


  const addTiming = () => {
    const { day, start, end, room } = timingInput;
  
    if (!courseForm.type || !day || !start || !end || !room.trim()) {
      return;
    }
  
    const newTiming = {
      type: courseForm.type,
      day,
      timeStart: start,
      timeEnd: end,
      room: room.trim()
    };
  
    setCourseForm({
      ...courseForm,
      timings: [...courseForm.timings, newTiming],
    });
  
    setTimingInput({ day: "", start: "", end: "", room: "" });
  };
  
  
  

  const handleChange = (e) => {
    setCourseForm({ ...courseForm, [e.target.name]: e.target.value });
  };

  const handleTypeChange = (e) => {
    setCourseForm({
      ...courseForm,
      type: { ...courseForm.type, [e.target.name]: e.target.checked },
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
  
    // Validate Course Code and Name
    if (!courseForm.courseCode || !courseForm.courseName) {
      setErrorPopup({
        visible: true,
        message: "⚠️ Course Code and Course Name are required.",
      });
      return;
    }
    if (!courseForm.faculty) {
      setErrorPopup({
        visible: true,
        message: "⚠️ Faculty is required for this course.",
      });
      return;
    }
    
  
    // Validate that one course type is selected
    const hasType = courseForm.type && courseForm.type.length !== 0;
    if (!hasType) {
      setErrorPopup({
        visible: true,
        message: "⚠️ Select a course type (Lecture, Lab, or Tutorial).",
      });
      return;
    }
  
    // Final formatted timings
    const enrichedTimings = courseForm.timings.map((timing) => ({
      ...timing,
      type: courseForm.type, // e.g. 'lecture'
    }));
  
    const newCourse = {
      courseCode: courseForm.courseCode,
      courseName: courseForm.courseName,
      faculty: courseForm.faculty,
      timings: courseForm.timings, // ✅ already correctly filled
      teachers: courseForm.teachers,
    };
    
    
  
    try {
      const res = await fetch("http://localhost:5000/api/courses", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(newCourse),
      });
  
      if (!res.ok) {
        const errorData = await res.json();
        if (errorData.error === "Course code already exists.") {
          setErrorPopup({
            visible: true,
            message: "❌ A course with this code already exists.",
          });
          return;
        } else {
          throw new Error(errorData.error || "Failed to create course");
        }
      }
      const createdCourse = await res.json(); // get new course from backend
      socket.emit("courseCreated", createdCourse); // manually emit if needed
      
      // Success popup
      setPopupVisible(true);
  
      // Reset form
      setCourseForm({
        courseCode: "",
        courseName: "",
        type: "",
        faculty: "",    
        timings: [],
        teachers: [],
      });
  
      setSuggestions([]);
      setTeacherSearch("");
  
    } catch (err) {
      setErrorPopup({
        visible: true,
        message: "🚫 Failed to create course: " + err.message,
      });
    }
  };
  
  
  const GlassyPopup = ({ message, onClose }) => (
    <div style={{
      position: "fixed",
      top: "30%",
      left: "50%",
      transform: "translate(-50%, -50%)",
      background: "rgba(255, 255, 255, 0.15)",
      backdropFilter: "blur(12px)",
      borderRadius: "16px",
      boxShadow: "0 8px 32px rgba(0,0,0,0.25)",
      padding: "30px 40px",
      zIndex: 9999,
      textAlign: "center",
      color: "#000",
      animation: "fadeIn 0.3s ease-in-out",
      minWidth: "320px",
      border: "1px solid rgba(255, 255, 255, 0.25)"
    }}>
      <div style={{ fontSize: "1.25rem", fontWeight: "500", marginBottom: "1rem" }}>
        🎉 {message}
      </div>
      <button
        onClick={onClose}
        className="btn btn-success"
        style={{
          padding: "6px 20px",
          fontSize: "1rem",
          borderRadius: "8px",
          backgroundColor: "#28a745",
          border: "none"
        }}
      >
        Okay
      </button>
      <style>
        {`
          @keyframes fadeIn {
            from { opacity: 0; transform: translate(-50%, -60%); }
            to { opacity: 1; transform: translate(-50%, -50%); }
          }
        `}

        
      </style>
      
    </div>
    
  );
  const ErrorPopup = ({ message, onClose, onManage }) => (
    <div style={{
      position: "fixed",
      top: "30%",
      left: "50%",
      transform: "translate(-50%, -50%)",
      background: "rgba(255, 255, 255, 0.15)",
      backdropFilter: "blur(12px)",
      borderRadius: "16px",
      boxShadow: "0 8px 32px rgba(0,0,0,0.25)",
      padding: "25px 30px",
      zIndex: 9999,
      textAlign: "center",
      color: "#000",
      minWidth: "350px",
      border: "1px solid rgba(255, 255, 255, 0.25)"
    }}>
      <h5 className="mb-3">{message}</h5>
      <div className="d-flex justify-content-center gap-2">
        <button
          onClick={onClose}
          className="btn btn-outline-danger"
          style={{ minWidth: "100px" }}
        >
          Close
        </button>
        <button
          onClick={onManage}
          className="btn btn-primary"
          style={{ minWidth: "120px" }}
        >
          Manage Course
        </button>
      </div>
    </div>
  );
  
  

  return (
    
    <div className="container mt-4">
      <button
  className="btn btn-outline-secondary mb-3"
  onClick={() => navigate("/admin/courses")} // or navigate(-1)
>
  ← Back to Course List
</button>

      <h4>Create New Course</h4>
      <form onSubmit={handleSubmit}>
        <div className="form-group mb-2">
          <label>Course Code</label>
          <input
            className="form-control"
            name="courseCode"
            value={courseForm.courseCode}
            onChange={handleChange}
            required
          />
        </div>

        <div className="form-group mb-2">
          <label>Course Name</label>
          <input
            className="form-control"
            name="courseName"
            value={courseForm.courseName}
            onChange={handleChange}
            required
          />
        </div>
        <div className="form-group mb-2">
  <label>Faculty</label>
  <select
    className="form-control"
    name="faculty"
    value={courseForm.faculty}
    onChange={handleChange}
    required
  >
    <option value="">-- Select Faculty --</option>
    <option value="Dentistry">Dentistry</option>
    <option value="Pharmacy">Pharmacy</option>
    <option value="Biotechnology">Biotechnology</option>
    <option value="Engineering">Engineering</option>
    <option value="Computer Science">Computer Science</option>
    <option value="Mass Communication">Mass Communication</option>
    <option value="Management Sciences">Management Sciences</option>
    <option value="Arts and Design">Arts and Design</option>
    <option value="Languages">Languages</option>
    <option value="Physical Therapy">Physical Therapy</option>
  </select>
</div>


        <div className="mb-2">
          <label>Course Types</label><br />
          {["lecture", "lab", "tutorial"].map((type) => (
  <label key={type} className="me-3">
    <input
      type="radio"
      name="courseType"
      value={type}
      checked={courseForm.type === type}
      onChange={(e) => setCourseForm({ ...courseForm, type: e.target.value })}
    />
    {" " + type.charAt(0).toUpperCase() + type.slice(1)}
  </label>
))}

        </div>

        <div className="form-group">
          <h6>Add Timing</h6>
          <div className="row mb-2">
            <div className="col">
            <select
  className="form-control"
  value={timingInput.day}
  onChange={(e) => setTimingInput({ ...timingInput, day: e.target.value })}
>
  <option value="">-- Select Day --</option>
  <option value="Saturday">Saturday</option>
  <option value="Sunday">Sunday</option>
  <option value="Monday">Monday</option>
  <option value="Tuesday">Tuesday</option>
  <option value="Wednesday">Wednesday</option>
  <option value="Thursday">Thursday</option>
</select>

            </div>
            <div className="col">
              <input
                className="form-control"
                placeholder="Start Time"
                type="time"
                value={timingInput.start}
                onChange={(e) => setTimingInput({ ...timingInput, start: e.target.value })}
              />
            </div>
            <div className="col">
              <input
                className="form-control"
                placeholder="End Time"
                type="time"
                value={timingInput.end}
                onChange={(e) => setTimingInput({ ...timingInput, end: e.target.value })}
              />
            </div>
            <div className="col">
  <input
    className="form-control"
    placeholder="Room"
    value={timingInput.room}
    onChange={(e) =>
      setTimingInput({ ...timingInput, room: e.target.value })
    }
  />
</div>

            <div className="col-auto">
              <button type="button" className="btn btn-outline-primary" onClick={addTiming}>
                ➕ Add Timing
              </button>
            </div>
          </div>
        </div>

        <div className="mb-3">
  <label>Search & Add Teacher</label>
  <input
    className="form-control mb-1"
    placeholder="Search teacher by ID or Name..."
    value={teacherSearch}
    onChange={async (e) => {
      const query = e.target.value;
      setTeacherSearch(query);
      if (query.length < 2) return setSuggestions([]);

      try {
        const res = await fetch(`http://localhost:5000/api/courses/search/teachers?q=${query}`);
        const data = await res.json();
        setSuggestions(data); // Array of { userId, fullName }
      } catch (err) {
        console.error("Search error:", err);
      }
    }}
  />
  <div className="list-group">
    {suggestions.map((t, idx) => (
      <button
        key={idx}
        type="button"
        className="list-group-item list-group-item-action"
        onClick={() => {
          if (!courseForm.teachers.includes(t.userId)) {
            setCourseForm({ ...courseForm, teachers: [...courseForm.teachers, t.userId] });
          }
          setSuggestions([]);
          setTeacherSearch("");
        }}
      >
        {t.fullName} ({t.userId})
      </button>
    ))}
  </div>

  {courseForm.teachers.length > 0 && (
    <div className="mt-2">
      <strong>Selected Teachers:</strong>
      <ul>
        {courseForm.teachers.map((id, i) => (
          <li key={i}>{id}</li>
        ))}
      </ul>
    </div>
  )}
</div>


    
        <button type="submit" className="btn btn-success">Create Course</button>
        {popupVisible && (
  <GlassyPopup
    message="✅ Course created successfully!"
    onClose={() => setPopupVisible(false)}
  />
)}

{errorPopup.visible && (
  <ErrorPopup
    message={errorPopup.message}
    onClose={() => setErrorPopup({ visible: false, message: "" })}
    onManage={() => window.location.href = "/admin/courses"}  // Adjust path if needed
  />
)}


      </form>
      {courseForm.timings.length > 0 && (
  <div className="mt-4">
    <h6>Added Timings</h6>
    <table className="table table-bordered">
      <thead>
        <tr>
          <th>Course Code</th>
          <th>Course Name</th>
          <th>Type</th>
          <th>Day</th>
          <th>Start</th>
          <th>End</th>
          <th>Room</th>

        </tr>
      </thead>
      <tbody>
        {courseForm.timings.map((t, i) => (
          <tr key={i}>
            <td>{courseForm.courseCode}</td>
            <td>{courseForm.courseName}</td>
            <td>{t.type.charAt(0).toUpperCase() + t.type.slice(1)}</td>
            <td>{t.day}</td>
            <td>{t.timeStart}</td>
            <td>{t.timeEnd}</td>
            <td>{t.room}</td>

          </tr>
        ))}
      </tbody>
    </table>
  </div>
)}

    </div>
  );


  
};


export default AdminCourses;
