const User = require("../models/User");
const Course = require("../models/Course");
const Lecture = require("../models/Lecture");
const Attendance = require("../models/Attendance");

// controller: backend/controllers/teacherSummaryController.js
exports.getTeacherSummary = async (req, res) => {
  const { teacherId } = req.params;
  const now = new Date();
  const todayStr = now.toISOString().split("T")[0];       // e.g., "2025-06-18"
  const todayName = now.toLocaleDateString("en-US", { weekday: "long" });  // e.g., "Wednesday"

  // 1. Fetch all courses taught by this teacher
  const courses = await Course.find({ teachers: { $in: [teacherId] } });
  const courseCodes = courses.map(c => c.courseCode);
  
  // 2. Count unique students across these courses
  const studentIds = new Set();
  courses.forEach(c => c.students.forEach(sid => studentIds.add(sid)));

  // 3. Total lectures for these courses
  const lectures = await Lecture.find({ courseCode: { $in: courseCodes } });

  // 4. Lectures that ended today (for teacher's courses)
  const startOfDay = new Date(now); startOfDay.setHours(0,0,0,0);
  const endOfDay = new Date(now); endOfDay.setHours(23,59,59,999);
  const endedToday = await Lecture.countDocuments({
    courseCode: { $in: courseCodes },
    startDateTime: { $gte: startOfDay, $lte: endOfDay },
    status: "ended"
  });

  // 5. Attendance taken today (records in Attendance for today’s date)
  const attendanceTakenToday = await Attendance.countDocuments({
    courseCode: { $in: courseCodes },
    date: todayStr
  });
  const pendingLecturesToday = endedToday - attendanceTakenToday;

  // 6. Upcoming lectures today (scheduled later today in course timings)
  let upcomingToday = 0;
  for (const course of courses) {
    course.timings.forEach(t => {
      if (t.day !== todayName) return;
      // Construct DateTime for today's date at timing's start
      const timeStr = t.timeStart.length === 5 ? t.timeStart + ":00" : t.timeStart;
      const lectureStart = new Date(`${todayStr}T${timeStr}`);
      if (lectureStart > now) upcomingToday++;
    });
  }

  // 7. Ongoing lectures now (current time falls between a timing interval today)
  let ongoingCount = 0;
  for (const course of courses) {
    course.timings.forEach(t => {
      if (t.day !== todayName) return;
      const start = new Date(`${todayStr}T${t.timeStart}`);
      const end   = new Date(`${todayStr}T${t.timeEnd}`);
      if (now >= start && now <= end) {
        ongoingCount++;
      }
    });
  }

  // 8. Per-course attendance breakdown
  const courseSummaries = [];
  for (const course of courses) {
    const records = await Attendance.find({ courseCode: course.courseCode });
    const attended = records.filter(r => r.status === "Attended").length;
    const late     = records.filter(r => r.status === "Late").length;
    const absent   = records.filter(r => r.status === "Absent").length;
    const total    = attended + late + absent;
    // Calculate percentages (as string with one decimal)
    const pct = n => total ? ((n/total)*100).toFixed(1) : "0.0";
    courseSummaries.push({
      courseCode: course.courseCode,
      attendance: attended,            // total attended count
      late: late,                      // total late count
      absent: absent,                  // total absent count
      attendanceRate: pct(attended),   // e.g., "85.5"
      lateRate: pct(late),
      absentRate: pct(absent)
    });
  }

  // 9. Send summary response
  res.json({
    totalCourses: courses.length,
    totalStudents: studentIds.size,
    totalLectures: lectures.length,
    endedToday,
    upcomingToday,
    ongoingLectures: ongoingCount,
    attendanceTakenToday,
    pendingLecturesToday,
    courses: courseSummaries
  });
};

