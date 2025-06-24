const express = require("express");
const router = express.Router();
const Course = require("../models/Course");
const Attendance = require("../models/Attendance");
const CurrentlyAttending = require("../models/CurrentlyAttending");


router.post("/", async (req, res) => {
    const { userId, lectureId, mode } = req.body;
  
    try {
      const course = await Course.findOne({ "timings._id": lectureId });
      if (!course) return res.status(404).json({ error: "Course not found" });
  
      const timing = course.timings.id(lectureId);
      const now = new Date();
      const utcDate = new Date(Date.UTC(now.getFullYear(), now.getMonth(), now.getDate()));
const dateStr = utcDate.toISOString().split("T")[0];
      const startTime = new Date(`${dateStr}T${timing.timeStart}`);
const endTime = new Date(`${dateStr}T${timing.timeEnd}`);
if (now < startTime || now > endTime) {
  return res.status(400).json({ message: "Cannot scan outside lecture time." });
}




// 🧠 Check if attendance was finalized as Absent
const finalized = await Attendance.findOne({
    studentId: userId,
    courseCode: course.courseCode,
    date: dateStr,
    startTime: timing.timeStart,
    endTime: timing.timeEnd
  });
  
  if (finalized?.status === "Absent") {
    await Attendance.updateOne({ _id: finalized._id }, { status: "Overridden", note: "Re-login triggered" });

  
    // Create a new session so the user can now log in + log out again
    let found = await CurrentlyAttending.findOne({
        studentId: userId,
        courseCode: course.courseCode,
        timingId: timing._id.toString(),
        date: dateStr
      });
      
      if (!found) {
        await CurrentlyAttending.create({
          studentId: userId,
          courseCode: course.courseCode,
          courseName: course.courseName,
          timingId: timing._id.toString(),
          date: dateStr,
          loginTime: null,
          logoutTime: null
        });
      }
      
  }
  
  // Fetch (new) session after potentially creating
  let existing = await CurrentlyAttending.findOne({
    studentId: userId,
    courseCode: course.courseCode,
    timingId: timing._id.toString(),
    date: dateStr
  });
  
  
       // 🟢 Login
       if (mode === "login") {
        if (existing && existing.loginTime && existing.logoutTime) {
            const end = new Date(`${dateStr}T${timing.timeEnd}`);
            const reentryAllowedThreshold = new Date(end.getTime() - 15 * 60000);
          
            if (now < reentryAllowedThreshold) {
              existing.loginTime = now;
              existing.logoutTime = null; // reset logout to allow full re-attendance
              existing.updatedAt = new Date();
              await existing.save();
              return res.json({ message: " Re-login allowed. Login time updated." });
            }
          
            return res.status(400).json({ message: "Cannot re-login after logout." });
          }
          
        if (existing && existing.loginTime && !existing.logoutTime) {
          return res.status(400).json({ message: "Login already recorded." });
        }
  
        if (!existing) {
          await CurrentlyAttending.create({
            studentId: userId,
            courseCode: course.courseCode,
            courseName: course.courseName,
            timingId: timing._id.toString(),
            date: dateStr,
            loginTime: now,
            updatedAt: new Date()
          });
        } else {
          existing.loginTime = now;
          existing.updatedAt = new Date();
          await existing.save();
        }
  
        return res.json({ message: " Login recorded successfully." });
      }
          // 🔴 Handle Logout
   
    // 🔴 Logout
    if (mode === "logout") {
        if (!existing || !existing.loginTime) {
          return res.status(400).json({ message: "Cannot logout before login." });
        }
  
        if (existing.logoutTime) {
          return res.status(400).json({ message: "Logout already recorded." });
        }
  
        existing.logoutTime = now;
        existing.updatedAt = new Date();
        await existing.save();
  
        return res.json({ message: "Logout recorded successfully." });
      }
  
      res.status(400).json({ message: "Invalid mode." });
    } catch (err) {
      console.error("❌ RFID simulation error:", err.message);
      res.status(500).json({ error: "Server error", detail: err.message });
    }
  });
  
  module.exports = router;
  
