// backend/routes/teacher.js
const express = require("express");
const router = express.Router();

const { 
  getTeacherLecturesByDate, 
  getTeacherCourses 
} = require("../controllers/teacherLecturesController");
const { 
  getAttendanceRecords, 
  addAttendanceRecord, 
  updateAttendanceRecord, 
  deleteAttendanceRecord 
} = require("../controllers/teacherAttendanceController");

const { getTeacherSummary } = require("../controllers/teacherSummaryController");

// Fetch lectures for a teacher on a specific date (defaults to today if no date query)
// Allows optional course filter via query param
router.get("/:teacherId/lectures", getTeacherLecturesByDate);

// Fetch list of course codes/names the teacher is enrolled in
router.get("/courses/:teacherId", getTeacherCourses);

// Get all attendance records (or default entries) for a specific lecture (by lectureId or timingId)
router.get("/attendance/:lectureId", getAttendanceRecords);

// Add a new attendance record (manual entry)
router.post("/attendance", addAttendanceRecord);

// Update an existing attendance record
router.put("/attendance/:recordId", updateAttendanceRecord);

// Delete an attendance record
router.delete("/attendance/:recordId", deleteAttendanceRecord);

router.get("/summary/:teacherId", getTeacherSummary);

module.exports = router;
