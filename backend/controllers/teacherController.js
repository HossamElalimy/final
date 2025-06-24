const User = require("../models/User");
const Course = require("../models/Course");
const Lecture = require("../models/Lecture");
const Attendance = require("../models/Attendance");

exports.getTeacherSummary = async (req, res) => {
  const { teacherId } = req.params;
  console.log("✅ API HIT: getTeacherSummary");
  console.log("➡️ TeacherID received:", teacherId);

  try {
    const courses = await Course.find({ teachers: { $in: [teacherId] } });
    console.log("📚 Courses found:", courses.map(c => c.courseCode));

    const courseCodes = courses.map(c => c.courseCode);

    // Aggregate unique student IDs
    const studentIds = new Set();
    courses.forEach(course => {
      course.students.forEach(id => studentIds.add(id));
    });

    const lectures = await Lecture.find({ courseCode: { $in: courseCodes } });

    const now = new Date();
    const todayName = now.toLocaleDateString("en-US", { weekday: "long" });

    // ✅ Ongoing Lectures Aggregation
    let ongoingLectures = [];
    try {
      ongoingLectures = await Course.aggregate([
        { $match: { teachers: { $in: [teacherId] } } },
        { $unwind: "$timings" },
        { $match: { "timings.day": todayName } },
        {
          $addFields: {
            start: {
              $dateFromString: {
                dateString: {
                  $concat: [
                    { $dateToString: { format: "%Y-%m-%d", date: now } },
                    "T",
                    "$timings.timeStart"
                  ]
                }
              }
            },
            end: {
              $dateFromString: {
                dateString: {
                  $concat: [
                    { $dateToString: { format: "%Y-%m-%d", date: now } },
                    "T",
                    "$timings.timeEnd"
                  ]
                }
              }
            }
          }
        },
        {
          $match: {
            start: { $lte: now },
            end: { $gte: now }
          }
        }
      ]);
    } catch (aggErr) {
      console.error("⚠️ Aggregation failed:", aggErr.message);
    }

    const startOfDay = new Date(now); startOfDay.setHours(0, 0, 0, 0);
    const endOfDay = new Date(now); endOfDay.setHours(23, 59, 59, 999);

    const endedToday = await Lecture.countDocuments({
      courseCode: { $in: courseCodes },
      startDateTime: { $gte: startOfDay, $lte: endOfDay },
      status: "ended"
    });

    const totalLectures = lectures.length;

    const courseSummaries = [];
    for (const course of courses) {
      const attendanceRecords = await Attendance.find({ courseCode: course.courseCode });

      const attended = attendanceRecords.filter(a => a.status === "Attended").length;
      const late = attendanceRecords.filter(a => a.status === "Late").length;
      const absent = attendanceRecords.filter(a => a.status === "Absent").length;
      const total = attended + late + absent;

      const calcRate = (num) => (total ? ((num / total) * 100).toFixed(1) : "0.0");

      courseSummaries.push({
        courseCode: course.courseCode,
        attendance: attended,
        late,
        absent,
        attendanceRate: calcRate(attended),
        lateRate: calcRate(late),
        absentRate: calcRate(absent)
      });
    }

    res.json({
      totalCourses: courses.length,
      totalStudents: studentIds.size,
      totalLectures,
      endedToday,
      upcomingToday: courses.reduce((sum, course) => (
        sum + course.timings.filter(t => t.day === todayName && (
          new Date(`${now.toISOString().split("T")[0]}T${t.timeStart}`) > now
        )).length
      ), 0),
      ongoingLectures: ongoingLectures.length,
      courses: courseSummaries
    });
  } catch (err) {
    console.error("Teacher summary error:", err);
    res.status(500).json({ error: "Internal Server Error" });
  }
};
