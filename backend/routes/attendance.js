const express = require("express");
const Attendance = require("../models/Attendance");

const router = express.Router();

// POST /api/attendance
router.post("/", async (req, res) => {
  const { studentId, status } = req.body;

  try {
    const record = new Attendance({ studentId, status });
    await record.save();
    res.status(201).json({ message: "Attendance recorded ✅" });
  } catch (err) {
    res.status(500).json({ error: "Could not save attendance" });
  }
});
router.get("/byLecture", async (req, res) => {
  try {
    const { courseCode, day, startTime, endTime } = req.query;

    const records = await Attendance.find({
      courseCode,
      day,
      startTime,
      endTime,
    });

    res.json(records);
  } catch (err) {
    console.error("Failed to get attendance:", err);
    res.status(500).json({ error: "Internal Server Error" });
  }
});

module.exports = router;
