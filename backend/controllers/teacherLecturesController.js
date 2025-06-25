const Course = require("../models/Course");
const Attendance = require("../models/Attendance");
const CurrentlyAttending = require("../models/CurrentlyAttending");

exports.getTeacherLecturesByDate = async (req, res) => {
  try {
    const { teacherId } = req.params;
    const dateStr = req.query.date || new Date().toISOString().split("T")[0];
    const targetDate = new Date(dateStr);
    const weekdayName = targetDate.toLocaleDateString("en-US", { weekday: "long" });

    const courses = await Course.find({ teachers: { $in: [teacherId] } });
    const result = [];

    for (const course of courses) {
      for (const timing of course.timings) {
        if (timing.day !== weekdayName) continue;

        const startDateTime = new Date(`${dateStr}T${timing.timeStart}`);
        const endDateTime = new Date(`${dateStr}T${timing.timeEnd}`);
        let status;
        const now = new Date();
        if (targetDate.toDateString() === now.toDateString()) {
          if (now < startDateTime) status = "Upcoming";
          else if (now > endDateTime) status = "Ended";
          else status = "Ongoing";
        } else if (targetDate < now) status = "Ended";
        else status = "Upcoming";

        const attendanceCount = await Attendance.countDocuments({
          courseCode: course.courseCode,
          date: dateStr,
          day: timing.day,
          startTime: timing.timeStart,
          endTime: timing.timeEnd,
        });

        let countToUse;
        if (status === "Ongoing") {
          countToUse = await CurrentlyAttending.countDocuments({
            courseCode: course.courseCode,
            date: dateStr,
            timingId: timing._id.toString(),
          });
        } else {
          countToUse = attendanceCount;
        }

        result.push({
          courseCode: course.courseCode,
          courseName: course.courseName,
          day: timing.day,
          startTime: timing.timeStart,
          endTime: timing.timeEnd,
          type: timing.type,
          room: timing.room || "N/A",
          totalStudents: course.students.length,
          attendedCount: countToUse,
          status,
          timingId: timing._id,
          lectureId: undefined,
        });

        if (status === "Ended" && attendanceCount > 0) {
          const lectureDoc = await require("../models/Lecture").findOne({
            courseCode: course.courseCode,
            startDateTime,
            endDateTime,
            status: "ended",
          });
          if (lectureDoc) {
            result[result.length - 1].lectureId = lectureDoc._id.toString();
          }
        }
      }
    }

    result.sort((a, b) => a.startTime.localeCompare(b.startTime));
    res.json(result);
  } catch (err) {
    console.error("Lecture fetch error:", err);
    res.status(500).json({ error: "Failed to load teacher lectures" });
  }
};

exports.getTeacherCourses = async (req, res) => {
  try {
    const { teacherId } = req.params;
    const courses = await Course.find({ teachers: { $in: [teacherId] } })
      .select("courseCode courseName");
    res.json(courses);
  } catch (err) {
    console.error("Error fetching teacher courses:", err);
    res.status(500).json({ error: "Server error" });
  }
};