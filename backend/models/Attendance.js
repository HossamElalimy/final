const mongoose = require("mongoose");

const AttendanceSchema = new mongoose.Schema({
  studentId: { type: String, required: true },
  courseCode: { type: String, required: true },
  courseName: { type: String, required: true },
  day: { type: String, required: true },          // e.g., "Monday"
  date: { type: String, required: true },         // e.g., "2025-06-09"
  status: {
    type: String,
    enum: ["Waiting", "Attending", "Attended", "Absent", "Late"],
    required: true
  },
  
  loginTime: { type: Date },
  logoutTime: { type: Date },
  timestamp: { type: Date, default: Date.now }
});

module.exports = mongoose.model("Attendance", AttendanceSchema);
