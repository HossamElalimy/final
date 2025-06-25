const express = require("express");
const router = express.Router();
const Lecture = require("../models/Lecture");
const Course = require("../models/Course");
const Attendance = require("../models/Attendance");



// GET /api/lectures?date=2025-05-29&search=cs101&faculty=Engineering
router.get("/", async (req, res) => {
  try {
    const { date, course = "", teacher = "", faculty = "" } = req.query;
    const todayDateStr = date || new Date().toISOString().split("T")[0];
    const selectedDay = new Date(todayDateStr).toLocaleDateString("en-US", { weekday: "long" });

    let filterRegex = {};
    try {
      filterRegex.course = course ? new RegExp(course, "i") : null;
      filterRegex.teacher = teacher ? new RegExp(teacher, "i") : null;
    } catch (err) {
      return res.status(400).json({ error: "❌ Invalid search pattern in course or teacher field." });
    }

    const rawCourses = await Course.find({
      ...(faculty && { faculty }),
      ...(filterRegex.course && { courseCode: filterRegex.course }),
      ...(teacher && {
        $or: [
          { teacherName: filterRegex.teacher },
          { teachers: { $in: [teacher] } }
        ]
      })
    });

    const flattenedLectures = [];

    for (const course of rawCourses) {
      for (const timing of course.timings.filter(t => t.day === selectedDay)) {
        const attendanceCount = await Attendance.countDocuments({
          courseCode: course.courseCode,
          day: timing.day,
          startTime: timing.timeStart,
          endTime: timing.timeEnd,
        });

        flattenedLectures.push({
          courseCode: course.courseCode,
          courseName: course.courseName,
          faculty: course.faculty,
          teacherName: course.teachers?.join(", "),
          day: timing.day,
          startTime: timing.timeStart,
          endTime: timing.timeEnd,
          type: timing.type,
          room: timing.room || "N/A",
          createdBy: course.createdBy || null,
          startDateTime: new Date(`${todayDateStr}T${timing.timeStart}`),
          endDateTime: new Date(`${todayDateStr}T${timing.timeEnd}`),
          attendanceCount,
          enrolledCount: course.students?.length || 0
        });
      }
    }

    res.json(flattenedLectures);
  } catch (err) {
    console.error("❌ Fetch lectures failed:", err);
    res.status(500).json({ error: "Server error", details: err.message });
  }
});




router.get("/faculties", async (req, res) => {
  try {
    const faculties = await Lecture.distinct("faculty");
    res.json(faculties);
  } catch (err) {
    res.status(500).json({ error: "Failed to get faculties", details: err.message });
  }
});

router.get("/by-course", async (req, res) => {
  const { courseId, status } = req.query;

  if (!courseId || !status) {
    return res.status(400).json({ error: "Missing courseId or status" });
  }

  // Get the course to retrieve its courseCode
  const course = await Course.findById(courseId);
  if (!course) return res.status(404).json({ error: "Course not found" });

  const courseCode = course.courseCode;

  if (status === "ended") {
    const lectures = await Lecture.find({ courseCode, status: "ended" }).sort({ startDateTime: -1 });

    const formatted = lectures.map(l => ({
      _id: l._id,
      title: `${l.courseName} (${l.type}) - ${l.day} ${l.startTime}–${l.endTime}`
    }));

    return res.json(formatted);
  }

  if (status === "ongoing") {
    const today = new Date();
    const todayDay = today.toLocaleDateString("en-US", { weekday: "long" });

    const matched = course.timings
      .filter(t => t.day === todayDay)
      .map(t => {
        const [startH, startM] = t.timeStart.split(":").map(Number);
        const [endH, endM] = t.timeEnd.split(":").map(Number);
        const now = new Date();

        const start = new Date(now);
        start.setHours(startH, startM, 0, 0);
        const end = new Date(now);
        end.setHours(endH, endM, 0, 0);

        const isNow = now >= start && now <= end;
        if (!isNow) return null;

        return {
          _id: `${course._id}-${t.type}-${t.day}-${t.timeStart}`,
          title: `${course.courseName} (${t.type}) - ${t.day} ${t.timeStart}–${t.timeEnd}`
        };
      })
      .filter(Boolean);

    return res.json(matched);
  }

  return res.status(400).json({ error: "Invalid status" });
});

module.exports = router;
