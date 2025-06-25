const CurrentlyAttending = require("../models/CurrentlyAttending");
const Course = require("../models/Course");

exports.getCurrentlyAttendingByTeacher = async (req, res) => {
  try {
    const { teacherId } = req.params;
    const todayStr = new Date().toISOString().slice(0, 10); // YYYY-MM-DD

    // Find courses assigned to this teacher
    const courses = await Course.find({ teachers: teacherId });
    const courseCodes = courses.map(c => c.courseCode);

    // Query CurrentlyAttending for today's attendance in those courses, only students currently logged in (logoutTime null)
    const attendingStudents = await CurrentlyAttending.find({
      courseCode: { $in: courseCodes },
      date: todayStr,
      logoutTime: null,
    });

    res.json(attendingStudents);
  } catch (error) {
    console.error("Error fetching currently attending:", error);
    res.status(500).json({ error: "Failed to fetch currently attending students" });
  }
};
