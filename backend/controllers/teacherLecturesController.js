// backend/controllers/teacherLecturesController.js
const Course = require("../models/Course");
const Attendance = require("../models/Attendance");

exports.getTeacherLecturesByDate = async (req, res) => {
  try {
    const { teacherId } = req.params;
    const dateStr = req.query.date || new Date().toISOString().split("T")[0];  // default to today if no date provided
    const targetDate = new Date(dateStr);
    const weekdayName = targetDate.toLocaleDateString("en-US", { weekday: "long" });  // e.g., "Wednesday"

    // Find all courses where this teacher is assigned
    const courses = await Course.find({ teachers: { $in: [teacherId] } });
    const result = [];

    for (const course of courses) {
      // For each timing in the course that matches the day of week of targetDate
      for (const timing of course.timings) {
        if (timing.day !== weekdayName) continue;
        // Determine lecture status based on current time and target date
        const startDateTime = new Date(`${dateStr}T${timing.timeStart}`);
        const endDateTime = new Date(`${dateStr}T${timing.timeEnd}`);
        let status;
        const now = new Date();
        if (targetDate.toDateString() === now.toDateString()) {
          // If looking at today, calculate status relative to current time
          if (now < startDateTime) {
            status = "Upcoming";
          } else if (now > endDateTime) {
            status = "Ended";
          } else {
            status = "Ongoing";
          }
        } else if (targetDate < now) {
          // Date in the past
          status = "Ended";
        } else {
          // Date in the future
          status = "Upcoming";
        }
        // Count how many attendance records exist for this lecture (if any)
        const attendanceCount = await Attendance.countDocuments({ 
          courseCode: course.courseCode,
          date: dateStr,
          day: timing.day,
          startTime: timing.timeStart,
          endTime: timing.timeEnd
        });
        result.push({
          courseCode: course.courseCode,
          courseName: course.courseName,
          day: timing.day,
          startTime: timing.timeStart,
          endTime: timing.timeEnd,
          type: timing.type,
          room: timing.room || "N/A",
          totalStudents: course.students.length,           // total students enrolled in course
          attendedCount: status === "Ended" ? attendanceCount : attendanceCount,  
          // ^ attendedCount: number of attendance records (if lecture ended or ongoing)
          status,
          // Use a lecture identifier:
          timingId: timing._id,   // unique ID for this scheduled lecture timing
          // If a Lecture document exists (for ended lectures), include its _id:
          lectureId: undefined    // will be set below if Lecture record found
        });
        // If a Lecture doc has been created for this past lecture, attach its ID
        if (status === "Ended" && attendanceCount > 0) {
          // Find Lecture record for this instance if it exists (created when lecture ended)
          const lectureDoc = await require("../models/Lecture").findOne({
            courseCode: course.courseCode,
            startDateTime,
            endDateTime,
            status: "ended"
          });
          if (lectureDoc) {
            result[result.length - 1].lectureId = lectureDoc._id.toString();
          }
        }
      }
    }

    // Sort lectures by start time
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
    // Return only course code and name for courses taught by this teacher
    const courses = await Course.find({ teachers: { $in: [teacherId] } })
                                .select("courseCode courseName");
    res.json(courses);
  } catch (err) {
    console.error("Error fetching teacher courses:", err);
    res.status(500).json({ error: "Server error" });
  }
};
