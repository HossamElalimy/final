const mongoose = require("mongoose");

const currentlyAttendingSchema = new mongoose.Schema({
  studentId: { type: String, required: true },
  courseCode: { type: String, required: true },
  courseName: { type: String, required: true },
  timingId: { type: String, required: true },
  date: { type: String, required: true }, // "YYYY-MM-DD"
  loginTime: { type: Date, required: true },
  logoutTime: { type: Date, default: null }
});

module.exports = mongoose.model("CurrentlyAttending", currentlyAttendingSchema);
