const express = require("express");
const router = express.Router();
const { getStudentSummary } = require("../controllers/studentController");
const { getStudentAttendanceStats } = require("../controllers/studentAttendanceController");
const { getStudentLecturesWithAttendance } = require("../controllers/studentLecturesController");



router.get("/summary/:userId", getStudentSummary);
router.get("/attendance-stats/:userId", getStudentAttendanceStats);
router.get("/lectures/:userId", getStudentLecturesWithAttendance);



module.exports = router;
