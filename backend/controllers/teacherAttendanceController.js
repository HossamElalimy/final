// backend/controllers/teacherAttendanceController.js
const Course = require("../models/Course");
const User = require("../models/User");
const Lecture = require("../models/Lecture");
const Attendance = require("../models/Attendance");
const CurrentlyAttending = require("../models/CurrentlyAttending");

// GET /api/teacher/attendance/:lectureId
exports.getAttendanceRecords = async (req, res) => {
  try {
    const { lectureId } = req.params;
    let records = [];

    let lecture = null;
    if (lectureId.match(/^[0-9a-fA-F]{24}$/)) {
      lecture = await Lecture.findById(lectureId);
    }

    if (lecture) {
      // Ended lecture: use Attendance collection
      records = await Attendance.find({
        courseCode: lecture.courseCode,
        date: lecture.startDateTime.toISOString().split("T")[0],
        startTime: lecture.startTime,
        endTime: lecture.endTime,
      });

      const studentIds = records.map(r => r.studentId);
      const users = await User.find({ userId: { $in: studentIds } });

      records = records.map(rec => {
        const user = users.find(u => u.userId === rec.studentId);
        return {
          ...rec._doc,
          fullName: user ? (user.fullName || user.name || "Unknown") : "Unknown"

        };
      });

    } else {
      // Ongoing lecture: treat as timingId and fetch from Course
      const course = await Course.findOne({ "timings._id": lectureId });
      if (!course) return res.status(404).json({ message: "Lecture not found" });

      const timing = course.timings.id(lectureId);
      const todayStr = new Date().toISOString().split("T")[0];

      records = await Attendance.find({
        courseCode: course.courseCode,
        date: todayStr,
        day: timing.day,
        startTime: timing.timeStart,
        endTime: timing.timeEnd,
      });

      if (records.length === 0) {
        // No attendance yet — build default from student list
        const students = await User.find({ userId: { $in: course.students } });
        let tempRecords = students.map(student => ({
          studentId: student.userId,
          fullName: student.fullName || student.name || "Unknown",
          loginTime: "",
          logoutTime: "",
          status: "Absent",
        }));

        const sessions = await CurrentlyAttending.find({
          courseCode: course.courseCode,
          date: todayStr,
          timingId: lectureId,
        });

        sessions.forEach(session => {
          const rec = tempRecords.find(r => r.studentId === session.studentId);
          if (rec) {
            rec.loginTime = session.loginTime?.toISOString();
            rec.logoutTime = session.logoutTime?.toISOString();
            rec.status = "Attended";
          }
        });

        records = tempRecords;
      } else {
        const studentIds = records.map(r => r.studentId);
        const users = await User.find({ userId: { $in: studentIds } });
        records = records.map(rec => {
          const user = users.find(u => u.userId === rec.studentId);
          return {
            ...rec._doc,
             fullName: user ? (user.fullName || user.name || "Unknown") : "Unknown"
          };
        });
      }
    }

    res.json(records);
  } catch (err) {
    console.error("Failed to get attendance records:", err);
    res.status(500).json({ error: "Internal Server Error" });
  }
};

// POST /api/teacher/attendance
exports.addAttendanceRecord = async (req, res) => {
  try {
    const { lectureId, studentId, fullName, loginTime, logoutTime, status } = req.body;

    let courseCode, courseName, day, timeStart, timeEnd, date;
    let lecture = null;

    if (lectureId && lectureId.match(/^[0-9a-fA-F]{24}$/)) {
      lecture = await Lecture.findById(lectureId);
    }

    if (lecture) {
      courseCode = lecture.courseCode;
      courseName = lecture.courseName;
      day = lecture.day;
      timeStart = lecture.startTime;
      timeEnd = lecture.endTime;
      date = lecture.startDateTime.toISOString().split("T")[0];
    } else {
      const course = await Course.findOne({ "timings._id": lectureId });
      if (!course) return res.status(400).json({ error: "Invalid lecture identifier" });
      const timing = course.timings.id(lectureId);
      courseCode = course.courseCode;
      courseName = course.courseName;
      day = timing.day;
      timeStart = timing.timeStart;
      timeEnd = timing.timeEnd;
      date = new Date().toISOString().split("T")[0];
    }

    const record = new Attendance({
      studentId,
      courseCode,
      courseName,
      day,
      date,
      startTime: timeStart,
      endTime: timeEnd,
      status,
      loginTime: loginTime ? new Date(`${date}T${loginTime}`) : undefined,
      logoutTime: logoutTime ? new Date(`${date}T${logoutTime}`) : undefined,
    });

    await record.save();

    const saved = record.toObject();
    saved.fullName = fullName || "";
    res.status(201).json(saved);
  } catch (err) {
    console.error("Could not save attendance:", err);
    res.status(500).json({ error: "Could not save attendance" });
  }
};

// PUT /api/teacher/attendance/:recordId
exports.updateAttendanceRecord = async (req, res) => {
  try {
    const { recordId } = req.params;
    const updateData = req.body;

    if (updateData.loginTime) {
      const rec = await Attendance.findById(recordId);
      if (rec) updateData.loginTime = new Date(`${rec.date}T${updateData.loginTime}`);
    }
    if (updateData.logoutTime) {
      const rec = await Attendance.findById(recordId);
      if (rec) updateData.logoutTime = new Date(`${rec.date}T${updateData.logoutTime}`);
    }

    let updated = await Attendance.findByIdAndUpdate(recordId, updateData, { new: true });

if (updated) {
  // Try to clean up from CurrentlyAttending if exists
  await CurrentlyAttending.findOneAndDelete({
    studentId: updated.studentId,
    courseCode: updated.courseCode,
    timingId: req.body.timingId || updated.timingId,
    date: updated.date
  });
}

    if (!updated) return res.status(404).json({ error: "Attendance record not found" });

    res.json({ message: "Attendance record updated." });
  } catch (err) {
    console.error("Failed to update attendance:", err);
    res.status(500).json({ error: "Internal Server Error" });
  }
};

// DELETE /api/teacher/attendance/:recordId
exports.deleteAttendanceRecord = async (req, res) => {
  try {
    const { recordId } = req.params;
    await Attendance.findByIdAndDelete(recordId);
    res.json({ message: "Attendance record deleted." });
  } catch (err) {
    console.error("Failed to delete attendance:", err);
    res.status(500).json({ error: "Internal Server Error" });
  }
};
