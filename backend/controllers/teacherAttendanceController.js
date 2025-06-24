// backend/controllers/teacherAttendanceController.js
const Course = require("../models/Course");
const User   = require("../models/User");
const Lecture = require("../models/Lecture");
const Attendance = require("../models/Attendance");

// GET /api/teacher/attendance/:lectureId
// Fetch existing attendance records for a lecture. If none exist (e.g., lecture ongoing and not yet taken), return students list.
exports.getAttendanceRecords = async (req, res) => {
  try {
    const { lectureId } = req.params;
    let records = [];

    // Try to interpret lectureId as a Lecture document ID first
    let lecture = null;
    if (lectureId.match(/^[0-9a-fA-F]{24}$/)) {
      lecture = await Lecture.findById(lectureId);
    }
    if (lecture) {
      // Lecture doc exists (likely an ended lecture). Fetch all attendance records for that lecture instance.
      records = await Attendance.find({
        courseCode: lecture.courseCode,
        date: lecture.startDateTime.toISOString().split("T")[0],  // date portion of lecture
        startTime: lecture.startTime,
        endTime: lecture.endTime
      });
      // Optionally populate student names from User model for convenience
      // Assuming Attendance studentId corresponds to User.userId
      const studentIds = records.map(r => r.studentId);
      const users = await User.find({ userId: { $in: studentIds } });
      records = records.map(rec => {
        const user = users.find(u => u.userId === rec.studentId);
        return { 
          ...rec._doc, 
          fullName: user ? user.name : "",  // attach full name if available
        };
      });
    } else {
      // If not a Lecture ID, treat it as a timingId (for an ongoing or upcoming lecture)
      // Find the course and timing by this subdocument ID
      const course = await Course.findOne({ "timings._id": lectureId });
      if (!course) {
        return res.status(404).json({ message: "Lecture not found" });
      }
      const timing = course.timings.id(lectureId);
      const todayStr = new Date().toISOString().split("T")[0];
      // Fetch any existing records for today's occurrence of this lecture (if some attendance already taken)
      records = await Attendance.find({
        courseCode: course.courseCode,
        date: todayStr,
        day: timing.day,
        startTime: timing.timeStart,
        endTime: timing.timeEnd
      });
      if (records.length === 0) {
        // No records yet: initialize default entries for each student as absent (for teacher to update).
        const students = await User.find({ userId: { $in: course.students } });
        records = students.map(student => ({
          studentId: student.userId,
          fullName: student.name,
          loginTime: "",   // no scan times since manually managed
          logoutTime: "",
          status: "Absent" // default each student as Absent initially
        }));
      } else {
        // If some records exist (e.g., teacher already marked some students), include them and fetch names
        const studentIds = records.map(r => r.studentId);
        const users = await User.find({ userId: { $in: studentIds } });
        records = records.map(rec => {
          const user = users.find(u => u.userId === rec.studentId);
          return { 
            ...rec._doc, 
            fullName: user ? user.name : "",
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
// Add a new attendance record (e.g., for a student who just joined or manual addition).
exports.addAttendanceRecord = async (req, res) => {
  try {
    const { lectureId, studentId, fullName, loginTime, logoutTime, status } = req.body;
    // Determine lecture details from lectureId (could be Lecture._id for ended lectures or timingId for ongoing)
    let courseCode, courseName, day, timeStart, timeEnd, date;
    let lecture = null;
    if (lectureId && lectureId.match(/^[0-9a-fA-F]{24}$/)) {
      lecture = await Lecture.findById(lectureId);
    }
    if (lecture) {
      // Use Lecture document details
      courseCode = lecture.courseCode;
      courseName = lecture.courseName;
      day        = lecture.day;
      timeStart  = lecture.startTime;
      timeEnd    = lecture.endTime;
      date       = lecture.startDateTime.toISOString().split("T")[0];
    } else {
      // Use timingId to get course and timing details (assuming lectureId is actually timingId in this case)
      const course = await Course.findOne({ "timings._id": lectureId });
      if (!course) return res.status(400).json({ error: "Invalid lecture identifier" });
      const timing = course.timings.id(lectureId);
      courseCode = course.courseCode;
      courseName = course.courseName;
      day        = timing.day;
      timeStart  = timing.timeStart;
      timeEnd    = timing.timeEnd;
      // Use current date for ongoing lecture (since teacher is adding attendance presumably on the day of lecture)
      date       = new Date().toISOString().split("T")[0];
    }
    // Create and save the new attendance record
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
      logoutTime: logoutTime ? new Date(`${date}T${logoutTime}`) : undefined
    });
    await record.save();
    // Return the created record (including a generated ID) to the frontend
    const saved = record.toObject();
    // Attach fullName for convenience (not stored in Attendance, but we have it from request or can fetch)
    saved.fullName = fullName || "";
    res.status(201).json(saved);
  } catch (err) {
    console.error("Could not save attendance:", err);
    res.status(500).json({ error: "Could not save attendance" });
  }
};

// PUT /api/teacher/attendance/:recordId
// Update an existing attendance record (e.g., change status or times for a student).
exports.updateAttendanceRecord = async (req, res) => {
  try {
    const { recordId } = req.params;
    const updateData = req.body;  // { studentId, status, loginTime, logoutTime, ... }
    // If loginTime/logoutTime are provided as strings, convert to Date
    if (updateData.loginTime) {
      // Assuming loginTime in request is in "HH:MM" format for the same date as originally recorded
      const rec = await Attendance.findById(recordId);
      if (rec) {
        const dateStr = rec.date; 
        updateData.loginTime = new Date(`${dateStr}T${updateData.loginTime}`);
      }
    }
    if (updateData.logoutTime) {
      const rec = await Attendance.findById(recordId);
      if (rec) {
        const dateStr = rec.date;
        updateData.logoutTime = new Date(`${dateStr}T${updateData.logoutTime}`);
      }
    }
    const updated = await Attendance.findByIdAndUpdate(recordId, updateData, { new: true });
    if (!updated) {
      return res.status(404).json({ error: "Attendance record not found" });
    }
    res.json({ message: "Attendance record updated." });
  } catch (err) {
    console.error("Failed to update attendance:", err);
    res.status(500).json({ error: "Internal Server Error" });
  }
};

// DELETE /api/teacher/attendance/:recordId
// Delete an attendance record (e.g., remove a mistakenly added student record).
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
