import React, { useState } from "react";
import axios from "axios";

const AttendanceForm = () => {
  const [studentId, setStudentId] = useState("");
  const [status, setStatus] = useState("present");
  const [message, setMessage] = useState("");

  const handleSubmit = async (e) => {
    e.preventDefault();

    try {
      const res = await axios.post("http://localhost:5000/api/attendance", {
        studentId,
        status
      });
      setMessage(res.data.message);
      setStudentId("");
    } catch (err) {
      setMessage("Failed to submit attendance");
    }
  };

  return (
    <div>
     <h3><span role="img" aria-label="rfid">📲</span> RFID Attendance Simulation</h3>

      <form onSubmit={handleSubmit}>
        <input
          type="text"
          placeholder="Enter Student ID"
          value={studentId}
          onChange={(e) => setStudentId(e.target.value)}
          required
        /><br />
        <select onChange={(e) => setStatus(e.target.value)} value={status}>
          <option value="present">Present</option>
          <option value="late">Late</option>
          <option value="absent">Absent</option>
        </select><br />
        <button type="submit">Submit Attendance</button>
      </form>
      <p>{message}</p>
    </div>
  );
};

export default AttendanceForm;
