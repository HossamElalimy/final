const express = require("express");
const router = express.Router();
const { getTeacherAnalytics } = require("../controllers/teacherAnalyticsController");

// Teacher attendance analytics data
router.get("/:teacherId", getTeacherAnalytics);

module.exports = router;
