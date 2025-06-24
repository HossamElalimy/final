const Lecture = require("../models/Lecture");
const Attendance = require("../models/Attendance");
const User = require("../models/User");

exports.getStudentLecturesWithAttendance = async (req, res) => {
  try {
    const { userId } = req.params;

    const user = await User.findOne({ userId });
    if (!user) return res.status(404).json({ message: "User not found" });

    const enrolled = user.studentData?.enrolledCourses || [];

    const lectures = await Lecture.find({ courseCode: { $in: enrolled } });
    const attendanceRecords = await Attendance.find({ studentId: userId });

    // Create map by courseCode + date
    const attendanceMap = {};
    attendanceRecords.forEach(record => {
      const key = `${record.courseCode}-${record.date}`;
      attendanceMap[key] = record;
    });

    const enrichedLectures = lectures.map(lec => {
      const date = lec.startDateTime.toISOString().slice(0, 10);
      const key = `${lec.courseCode}-${date}`;
      const att = attendanceMap[key];

      return {
        ...lec.toObject(),
        myAttendance: att?.status || "Waiting",
        myLogIn: att?.loginTime || null,
        myLogOut: att?.logoutTime || null,
        
      };
    });

    res.json(enrichedLectures);
  } catch (error) {
    console.error("❌ Error in getStudentLecturesWithAttendance:", error);
    res.status(500).json({ message: "Internal server error" });
  }
};
