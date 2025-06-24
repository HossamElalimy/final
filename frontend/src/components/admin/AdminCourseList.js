import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import "./AdminCourseList.css";
import { useContext } from "react";
import SocketContext from "../../contexts/SocketContext";



const AdminCourseList = () => {
  
    const [teacherModal, setTeacherModal] = useState({ visible: false, course: null });

    const [studentModal, setStudentModal] = useState({ visible: false, course: null });
   
   
    const [editModal, setEditModal] = useState({ visible: false, course: null });


    

  const [courses, setCourses] = useState([]);
  const [selectedCourse, setSelectedCourse] = useState(null);
  const [confirmDelete, setConfirmDelete] = useState({ visible: false, course: null });
  const navigate = useNavigate();
  const socket = useContext(SocketContext);

  const ConfirmDeletePopup = ({ course, onClose, onDelete }) => (
    <div style={{
      position: "fixed", top: "30%", left: "50%", transform: "translate(-50%, -50%)",
      background: "rgba(255, 255, 255, 0.15)", backdropFilter: "blur(10px)",
      borderRadius: "12px", padding: "25px", zIndex: 9999,
      boxShadow: "0 8px 32px rgba(0,0,0,0.25)", minWidth: "300px", textAlign: "center"
    }}>
      <h5>🗑 Are you sure you want to delete <br /><strong>{course.courseCode}</strong>?</h5>
      <div className="mt-3 d-flex justify-content-center gap-2">
        <button className="btn btn-outline-secondary" onClick={onClose}>Cancel</button>
        <button className="btn btn-danger" onClick={() => onDelete(course._id)}>Delete</button>
      </div>
    </div>
  );
  
  const handleDeleteCourse = async (id) => {
    try {
      const res = await fetch(`http://localhost:5000/api/courses/${id}`, {
        method: "DELETE"
      });
      if (res.ok) {
        setCourses(prev => prev.filter(c => c._id !== id));
        setConfirmDelete({ visible: false, course: null });
      } else {
        alert("❌ Failed to delete course.");
      }
    } catch (err) {
      alert("❌ Server error while deleting.");
    }
  };
  
  

  useEffect(() => {
    fetch("http://localhost:5000/api/courses")
      .then((res) => res.json())
      .then(setCourses)
      .catch(console.error);
  }, []);
  useEffect(() => {
    if (!socket) return;
  
    const handleCreated = (course) => {
      setCourses((prev) => [course, ...prev]);
    };
  
    const handleUpdated = (updated) => {
      setCourses((prev) =>
        prev.map((c) => (c._id === updated._id ? updated : c))
      );
    };
  
    const handleDeleted = (id) => {
      setCourses((prev) => prev.filter((c) => c._id !== id));
    };
  
    socket.on("courseCreated", handleCreated);
    socket.on("courseUpdated", handleUpdated);
    socket.on("courseDeleted", handleDeleted);
  
    return () => {
      socket.off("courseCreated", handleCreated);
      socket.off("courseUpdated", handleUpdated);
      socket.off("courseDeleted", handleDeleted);
    };
  }, [socket]);
  
  const saveTeachersToCourse = async (courseId, updatedTeachers) => {
    try {
      const res = await fetch(`http://localhost:5000/api/courses/${courseId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ teachers: updatedTeachers }),
      });
  
      if (res.ok) {
        const updated = await res.json();
        setCourses(prev =>
          prev.map(c => c._id === courseId ? { ...c, teachers: updated.teachers } : c)
        );
        setTeacherModal({ visible: false, course: null });
      } else {
        alert("❌ Failed to update teachers");
      }
    } catch (err) {
      alert("❌ Server error while updating teachers.");
    }
  };
  

  const TeacherModal = ({ course, onClose, onSave }) => {
    const [tempTeachers, setTempTeachers] = useState([...course.teachers]);
    const [teacherSearchInput, setTeacherSearchInput] = useState("");
    const [teacherSuggestions, setTeacherSuggestions] = useState([]);

  
    const handleAdd = (teacherId) => {
      setTempTeachers(prev => {
        if (!prev.includes(teacherId)) {
          return [...prev, teacherId];
        }
        return prev;
      });
      setTeacherSearchInput("");
      setTeacherSuggestions([]);
      
    };
    
 
    
  
    const handleRemove = (teacherId) => {
      setTempTeachers(tempTeachers.filter(id => id !== teacherId));
    };
  
    const handleSearch = async (query) => {
      setTeacherSearchInput(query);
      if (query.length < 2) {
        setTeacherSuggestions([]);
        return;
      }
    
      const res = await fetch(`http://localhost:5000/api/courses/search/teachers?q=${query}`);
      const data = await res.json();
      setTeacherSuggestions(data); // list of teachers from backend
    };
    



    


  
  
    return (
      <div className="modal show fade d-block" style={{ backgroundColor: "rgba(0,0,0,0.5)" }}>
        <div className="modal-dialog modal-lg">
          <div className="modal-content glassmorphism p-3">
            <div className="modal-header">
              <h5 className="modal-title">Manage Teachers for {course.courseCode}</h5>
              <button className="btn-close" onClick={onClose}></button>
            </div>
            <div className="modal-body">
              <input
                className="form-control mb-2"
                placeholder="Search teacher..."
                value={teacherSearchInput}
                onChange={(e) => {
                  setTeacherSearchInput(e.target.value);
                  handleSearch(e.target.value);
                }}
              />
              <div className="list-group mb-3">
                {teacherSuggestions.map((t, idx) => (
                  <button
                    key={idx}
                    type="button"
                    className="list-group-item list-group-item-action"
                    onClick={() => handleAdd(t.userId)}
                  >
                    {t.fullName} ({t.userId})
                  </button>
                ))}
              </div>
  
              <h6>Assigned Teachers</h6>
              <ul className="list-group">
                {tempTeachers.map((id, idx) => (
                  <li key={idx} className="list-group-item d-flex justify-content-between">
                    {id}
                    <button className="btn btn-sm btn-danger" onClick={() => handleRemove(id)}>Remove</button>
                  </li>
                ))}
              </ul>
            </div>
            <div className="modal-footer">
              <button className="btn btn-secondary" onClick={onClose}>Cancel</button>
              <button
                className="btn btn-primary"
                onClick={() => onSave(course._id, tempTeachers)}
              >
                Save Changes
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  };
  const StudentModal = ({ course, onClose, courses, setCourses }) => {
    
    const [studentMap, setStudentMap] = useState({});
    const [studentSearch, setStudentSearch] = useState("");
    const [studentSuggestions, setStudentSuggestions] = useState([]);
    const enrolledStudents = courses.find(c => c._id === course._id)?.students || [];

  

  
    // Fetch full names for enrolled students
    useEffect(() => {
      const fetchStudentNames = async () => {
        try {
          const res = await fetch("http://localhost:5000/api/users");
          const allUsers = await res.json();
          const map = {};
          allUsers.forEach((u) => {
            if (u.role === "student") {
              map[u.userId] = u.fullName;
            }
          });
          setStudentMap(map);
        } catch (err) {
          console.error("Failed to fetch student names", err);
        }
      };
  
      fetchStudentNames();
    }, []);
  
    const handleRemove = async (studentId) => {
      const updated = enrolledStudents.filter((id) => id !== studentId);
      await fetch(
        `http://localhost:5000/api/courses/${course._id}/students/${studentId}`,
        { method: "DELETE" }
      );
    
      setCourses((prev) =>
        prev.map((c) =>
          c._id === course._id ? { ...c, students: updated } : c
        )
      );
    };
    
  
    const handleAdd = async (studentId) => {
      if (enrolledStudents.includes(studentId)) return;
    
      const res = await fetch(
        `http://localhost:5000/api/courses/${course._id}/students`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ studentId }),
        }
      );
    
      if (res.ok) {
        const updated = [...enrolledStudents, studentId];
        setCourses((prev) =>
          prev.map((c) =>
            c._id === course._id ? { ...c, students: updated } : c
          )
        );
        setStudentSearch("");
        setStudentSuggestions([]);
      }
    };
    
  
    const handleSearch = async (query) => {
      setStudentSearch(query);
      if (query.length < 2) return setStudentSuggestions([]);
    
      try {
        const res = await fetch(`http://localhost:5000/api/users/search?query=${query}&role=student`);
        let data = await res.json();
    
        console.log("Fetched Students:", data);
        console.log("Course Faculty:", course.faculty);
    
        // Filter by course faculty
        if (course.faculty) {
          data = data.filter(
            (s) => s.faculty?.trim().toLowerCase() === course.faculty.trim().toLowerCase()
          );
        }
    
        // Exclude already enrolled
        const enrolledStudents = course.students || [];
        data = data.filter((s) => !enrolledStudents.includes(s.userId));
    
        setStudentSuggestions(data);
      } catch (err) {
        console.error("Error fetching students:", err);
      }
    };
    
    
  
    const sortedStudents = [...enrolledStudents].sort((a, b) => {
      const nameA = studentMap[a] || a;
      const nameB = studentMap[b] || b;
      return nameA.localeCompare(nameB);
    });
    
  
    return (
      <div className="modal show fade d-block" style={{ backgroundColor: "rgba(0,0,0,0.5)" }}>
        <div className="modal-dialog modal-lg">
          <div className="modal-content glassmorphism p-3">
            <div className="modal-header">
              <h5 className="modal-title">Manage Students for {course.courseCode}</h5>
              <button className="btn-close" onClick={onClose}></button>
            </div>
            <div className="modal-body">
              <input
                className="form-control mb-2"
                placeholder="Search by ID or Name..."
                value={studentSearch}
                onChange={(e) => handleSearch(e.target.value)}
              />
              <div className="list-group mb-3">
                {studentSuggestions.map((s, idx) => (
                  <button
                    key={idx}
                    className="list-group-item list-group-item-action"
                    onClick={() => handleAdd(s.userId)}
                  >
                    {s.fullName} ({s.userId})
                  </button>
                ))}
              </div>
  
              <h6>Enrolled Students</h6>
              <ul className="list-group">
                {sortedStudents.map((id, idx) => (
                  <li key={idx} className="list-group-item d-flex justify-content-between">
                    {studentMap[id] ? `${studentMap[id]} (${id})` : id}
                    <button className="btn btn-sm btn-danger" onClick={() => handleRemove(id)}>Remove</button>
                  </li>
                ))}
              </ul>
            </div>
            <div className="modal-footer">
              <button className="btn btn-secondary" onClick={onClose}>Close</button>
            </div>
          </div>
        </div>
      </div>
    );
  };
  const EditCourseModal = ({ course, onClose, onSave }) => {
    const [courseCode, setCourseCode] = useState(course.courseCode);
    const [courseName, setCourseName] = useState(course.courseName);
    const [timings, setTimings] = useState([...course.timings]);
  
    const handleAddTiming = () => {
      setTimings([...timings, { type: "lecture", day: "", timeStart: "", timeEnd: "", room: "" }]);
    };
    
  
    const handleRemoveTiming = (index) => {
      setTimings(timings.filter((_, i) => i !== index));
    };
  
    const handleTimingChange = (index, field, value) => {
      const updated = [...timings];
      updated[index][field] = value;
      setTimings(updated);
    };
  
    const handleSubmit = () => {
      onSave(course._id, { courseCode, courseName, timings });
    };
    const isUnchanged =
    courseCode === course.courseCode &&
    courseName === course.courseName &&
    JSON.stringify(timings) === JSON.stringify(course.timings);
  
    return (
      <div className="modal show fade d-block" style={{ backgroundColor: "rgba(0,0,0,0.5)" }}>
        <div className="modal-dialog modal-lg">
          <div className="modal-content glassmorphism p-3">
            <div className="modal-header">
              <h5 className="modal-title">Edit Course – {course.courseCode}</h5>
              <button className="btn-close" onClick={onClose}></button>
            </div>
  
            <div className="modal-body">
              <div className="mb-3">
                <label>Course Code</label>
                <input className="form-control" value={courseCode} onChange={(e) => setCourseCode(e.target.value)} />
              </div>
              <div className="mb-3">
                <label>Course Name</label>
                <input className="form-control" value={courseName} onChange={(e) => setCourseName(e.target.value)} />
              </div>
  
              <h6>Timings</h6>
              {timings.map((timing, idx) => (
                <div key={idx} className="border rounded p-2 mb-2">
       <div className="row mb-2">
  <div className="col">
    <label>Type</label>
    <select
      className="form-select"
      value={timing.type}
      onChange={(e) => handleTimingChange(idx, "type", e.target.value)}
    >
      <option value="lecture">Lecture</option>
      <option value="lab">Lab</option>
      <option value="tutorial">Tutorial</option>
    </select>
  </div>
  <div className="col">
    <label>Day</label>
    <select
      className="form-select"
      value={timing.day}
      onChange={(e) => handleTimingChange(idx, "day", e.target.value)}
    >
      <option value="">Select Day</option>
      <option value="Saturday">Saturday</option>
      <option value="Sunday">Sunday</option>
      <option value="Monday">Monday</option>
      <option value="Tuesday">Tuesday</option>
      <option value="Wednesday">Wednesday</option>
      <option value="Thursday">Thursday</option>
    </select>
  </div>
  <div className="col">
    <label>Start Time</label>
    <input
      type="time"
      className="form-control"
      value={timing.timeStart}
      onChange={(e) => handleTimingChange(idx, "timeStart", e.target.value)}
    />
  </div>
  <div className="col">
    <label>End Time</label>
    <input
      type="time"
      className="form-control"
      value={timing.timeEnd}
      onChange={(e) => handleTimingChange(idx, "timeEnd", e.target.value)}
    />
  </div>
  <div className="col">
    <label>Room</label>
    <input
      type="text"
      className="form-control"
      placeholder="e.g., A102"
      value={timing.room || ""}
      onChange={(e) => handleTimingChange(idx, "room", e.target.value)}
    />
  </div>
</div>

                  <button className="btn btn-sm btn-outline-danger" onClick={() => handleRemoveTiming(idx)}>Remove</button>
                </div>
              ))}
  
              <button className="btn btn-outline-success mt-2" onClick={handleAddTiming}>➕ Add Timing</button>
            </div>
  
            <div className="modal-footer">
              <button className="btn btn-secondary" onClick={onClose}>Cancel</button>
              <button
  className="btn btn-primary"
  onClick={handleSubmit}
  disabled={isUnchanged}
>
  💾 Save Changes
</button>

            </div>
          </div>
        </div>
      </div>
    );
  };

  
  const handleSaveCourse = async (courseId, updatedCourse) => {
    try {
      const res = await fetch(`http://localhost:5000/api/courses/${courseId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(updatedCourse),
      });
  
      if (res.ok) {
        const updated = await res.json();
        setCourses(prev =>
          prev.map(c => c._id === courseId ? updated : c)
        );
        setEditModal({ visible: false, course: null });
  
        // Show glassy toast
        const toast = document.createElement("div");
        toast.innerHTML = "✅ Course updated successfully!";
        Object.assign(toast.style, {
          position: "fixed",
          bottom: "30px",
          left: "50%",
          transform: "translateX(-50%)",
          background: "rgba(255,255,255,0.2)",
          backdropFilter: "blur(10px)",
          color: "#000",
          padding: "10px 20px",
          borderRadius: "10px",
          zIndex: "9999",
          boxShadow: "0 8px 20px rgba(0,0,0,0.2)",
          fontWeight: "bold",
        });
        document.body.appendChild(toast);
        setTimeout(() => toast.remove(), 3000);
      } else {
        alert("❌ Failed to update course");
      }
    } catch (err) {
      alert("❌ Server error while updating course");
      console.error(err);
    }
  };
  
  
  
  
  return (

    
    <div className="container mt-4">
      <div className="d-flex justify-content-between align-items-center mb-3">
        <h4>Courses Table</h4>
        <button className="btn btn-success" onClick={() => navigate("/admin/courses/create")}>
          ➕ Create New Course
        </button>
      </div>

      <table className="table table-striped table-bordered">
        <thead>
          <tr>
            <th>Course Code</th>
            <th>Course Name</th>
            <th># Teachers</th>
            <th># Students</th>
            <th>Actions</th>
          </tr>
        </thead>
        <tbody>
          {courses.map((c, idx) => (
            <tr key={idx}>
              <td>
                <button
                  className="btn btn-link p-0"
                  onClick={() => setSelectedCourse(c)}
                >
                  {c.courseCode}
                </button>
              </td>
              <td>{c.courseName}</td>
              <td>{c.teachers?.length || 0}</td>
              <td>{c.students?.length || 0}</td>
              <td>
              <button
  className="btn btn-info btn-sm me-1"
  onClick={() => setEditModal({ visible: true, course: c })}
>
  Manage Course
</button>


                <button
  className="btn btn-warning btn-sm me-1"
  onClick={() => setStudentModal({ visible: true, course: c })}
>
  Manage Students
</button>

                <button
  className="btn btn-primary btn-sm me-1"
  onClick={() => setTeacherModal({ visible: true, course: c })}
>
  Manage Teachers
</button>

                <button
  className="btn btn-danger btn-sm"
  onClick={() => setConfirmDelete({ visible: true, course: c })}
>
  Delete
</button>


              </td>
            </tr>
          ))}
        </tbody>
      </table>

      {/* Modal */}
      {selectedCourse && (
        <div className="modal show fade d-block" tabIndex="-1" style={{ backgroundColor: "rgba(0,0,0,0.5)" }}>
          <div className="modal-dialog modal-lg">
            <div className="modal-content glassmorphism p-3">
              <div className="modal-header">
                <h5 className="modal-title">{selectedCourse.courseCode} Details</h5>
                <button className="btn-close" onClick={() => setSelectedCourse(null)}></button>
              </div>
              <div className="modal-body">
                <p><strong>Name:</strong> {selectedCourse.courseName}</p>
                <p><strong>Teachers:</strong> {selectedCourse.teacherDetails?.join(", ") || "None"}</p>
                <p><strong>Students:</strong> {selectedCourse.students?.join(", ") || "None"}</p>

                <table className="table table-sm table-bordered mt-3">
  <thead>
    <tr>
      <th>Type</th>
      <th>Day</th>
      <th>Start</th>
      <th>End</th>
      <th>Room</th>
    </tr>
  </thead>
  <tbody>
    {selectedCourse.timings?.map((t, i) => (
      <tr key={i}>
        <td>{t.type}</td>
        <td>{t.day}</td>
        <td>{t.timeStart}</td>
        <td>{t.timeEnd}</td>
        <td>{t.room || "-"}</td>
      </tr>
    ))}
  </tbody>
</table>

              </div>
              <div className="modal-footer">
                <button className="btn btn-secondary" onClick={() => setSelectedCourse(null)}>
                  Close
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
      {confirmDelete.visible && (
  <ConfirmDeletePopup
    course={confirmDelete.course}
    onClose={() => setConfirmDelete({ visible: false, course: null })}
    onDelete={handleDeleteCourse}
  />
)}
{teacherModal.visible && (
  <TeacherModal
    course={teacherModal.course}
    onClose={() => setTeacherModal({ visible: false, course: null })}
    onSave={saveTeachersToCourse}
  />
  
)}
{studentModal.visible && (
  <StudentModal
    course={studentModal.course}
    onClose={() => setStudentModal({ visible: false, course: null })}
    courses={courses}
    setCourses={setCourses}
  />
)}

{editModal.visible && (
  <EditCourseModal
    course={editModal.course}
    onClose={() => setEditModal({ visible: false, course: null })}
    onSave={handleSaveCourse}
  />
)}





    </div>
    
    
  );
};

export default AdminCourseList;
