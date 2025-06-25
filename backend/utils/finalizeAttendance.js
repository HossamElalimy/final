// backend/utils/finalizeAttendance.js
const Course = require("../models/Course");
const CurrentlyAttending = require("../models/CurrentlyAttending");
const Attendance = require("../models/Attendance");
const Lecture = require("../models/Lecture");

const finalizeAttendance = async (ioInstance) => {
  const now = new Date();
  const dateStr = now.toISOString().split("T")[0];

  const sessions = await CurrentlyAttending.find();
  for (const session of sessions) {
    const course = await Course.findOne({ courseCode: session.courseCode });
    if (!course) continue;

    const timing = course.timings.id(session.timingId);
    if (!timing) continue;

    const start = new Date(`${session.date}T${timing.timeStart}`);
    const end = new Date(`${session.date}T${timing.timeEnd}`);

    if (now > new Date(end.getTime() + 1 * 60000)) {
      const alreadyFinalized = await Attendance.findOne({
        studentId: session.studentId,
        courseCode: session.courseCode,
        date: session.date,
        startTime: timing.timeStart,
        endTime: timing.timeEnd,
      });

      if (alreadyFinalized) {
        await CurrentlyAttending.deleteOne({ _id: session._id });
        continue;
      }

      function determineAttendanceStatus(loginTime, logoutTime, scheduledStart, scheduledEnd) {
        if (!loginTime) return "Absent";

        const login = new Date(loginTime);
        const logout = logoutTime ? new Date(logoutTime) : new Date(scheduledEnd);

        const totalDurationMs = scheduledEnd - scheduledStart;
        const attendedDurationMs = logout - login;

        const attendedPercent = (attendedDurationMs / totalDurationMs) * 100;
        const lateCutoffTime = new Date(scheduledStart.getTime() + totalDurationMs * 0.15);

        if (attendedDurationMs <= 0 || attendedPercent < 50) return "Absent";
        if (login > lateCutoffTime) return "Late";

        return "Attended";
      }

      const finalStatus = determineAttendanceStatus(
        session.loginTime,
        session.logoutTime,
        start,
        end
      );

      await Attendance.create({
        studentId: session.studentId,
        courseCode: session.courseCode,
        courseName: session.courseName,
        date: session.date,
        day: timing.day,
        startTime: timing.timeStart,
        endTime: timing.timeEnd,
        room: timing.room || "N/A",
        loginTime: session.loginTime || null,
        logoutTime: session.logoutTime || null,
        status: finalStatus,
      });

      const count = await Attendance.countDocuments({
        courseCode: session.courseCode,
        date: session.date,
        startTime: timing.timeStart,
        endTime: timing.timeEnd,
        status: { $in: ["Attended", "Late"] },
      });

      await Lecture.updateOne(
        {
          courseCode: session.courseCode,
          startTime: timing.timeStart,
          endTime: timing.timeEnd,
          day: timing.day,
        },
        { $set: { attendanceCount: count, status: "Ended" } }
      );

      ioInstance.emit("lecture-updated", {
        type: "attendance-finalized",
        courseCode: session.courseCode,
        startTime: timing.timeStart,
        endTime: timing.timeEnd,
        updatedCount: count,
      });

      await CurrentlyAttending.deleteOne({ _id: session._id });

      console.log(`✅ Finalized ${session.studentId} for ${session.courseCode} as ${finalStatus}`);
    }
  }
};

module.exports = finalizeAttendance;
