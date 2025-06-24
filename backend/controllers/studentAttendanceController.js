const Attendance = require("../models/Attendance");

exports.getStudentAttendanceStats = async (req, res) => {
  try {
    const { userId } = req.params;

    const attendedLectures = await Attendance.countDocuments({
      studentId: userId,
      status: "Attended",
    });

    const absentLectures = await Attendance.countDocuments({
      studentId: userId,
      status: "Absent",
    });

    const lateLectures = await Attendance.countDocuments({
      studentId: userId,
      status: "Late",
    });

    const totalLectures = attendedLectures + absentLectures + lateLectures;
    const missedLectures = absentLectures;

    const attendanceRate =
      totalLectures > 0
        ? Math.round((attendedLectures / totalLectures) * 100)
        : 0;

    const lateRate =
      totalLectures > 0
        ? Math.round((lateLectures / totalLectures) * 100)
        : 0;

    res.json({
      attendedLectures,
      absentLectures,
      lateLectures,
      totalLectures,
      missedLectures,
      attendanceRate,
      lateRate,
    });
  } catch (error) {
    console.error("❌ Error in getStudentAttendanceStats:", error);
    res.status(500).json({ message: "Internal server error" });
  }
};
