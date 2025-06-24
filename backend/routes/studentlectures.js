const express = require("express");
const router = express.Router();
const User = require("../models/User");
const Course = require("../models/Course");
const Attendance = require("../models/Attendance");
const CurrentlyAttending = require("../models/CurrentlyAttending");


router.get("/live/:studentId", async (req, res) => {
  try {
    const { studentId } = req.params;
    const { date, course = "" } = req.query;

    const student = await User.findOne({ userId: studentId });
    if (!student) return res.status(404).json({ error: "Student not found" });

    const enrolledCourses = student?.studentData?.enrolledCourses || [];
    const selectedDate = date ? new Date(date) : new Date();
const todayDateStr = selectedDate.toISOString().split("T")[0];
const selectedDay = selectedDate.toLocaleDateString("en-US", { weekday: "long" });

    const filterRegex = new RegExp(course, "i");

    const rawCourses = await Course.find({
      courseCode: { $in: enrolledCourses },
      faculty: student.faculty,
      ...(course && { courseCode: filterRegex })
    });

    const result = [];

    for (const course of rawCourses) {
      for (const timing of course.timings.filter(t => t.day === selectedDay)) {
        const startDateTime = new Date(`${todayDateStr}T${timing.timeStart}`);
        const endDateTime = new Date(`${todayDateStr}T${timing.timeEnd}`);
        const now = new Date();

        const status = now < startDateTime
          ? "Upcoming"
          : now >= startDateTime && now <= endDateTime
          ? "Ongoing"
          : "Ended";

     // 🆕 Pull from CurrentlyAttending instead of Attendance
     let myLogIn = null;
     let myLogOut = null;
     let myAttendance = "Waiting";
     
     if (status === "Ongoing") {
       const realTime = await CurrentlyAttending.findOne({
         studentId,
         courseCode: course.courseCode,
         timingId: timing._id.toString(),
         date: todayDateStr
       });
     
       if (realTime) {
         myLogIn = realTime.loginTime;
         myLogOut = realTime.logoutTime;
     
         if (myLogIn && !myLogOut) myAttendance = "Attending";
         else if (myLogIn && myLogOut) myAttendance = "Attended";
       }
     }
     else if (status === "Ended") {
      const final = await Attendance.findOne({
        studentId,
        courseCode: course.courseCode,
        date: todayDateStr
      });
    
      if (final) {
        // ✅ Use finalized status without override
        myAttendance = final.status;
        myLogIn = final.loginTime || null;
        myLogOut = final.logoutTime || null;
      } else {
        // 🆘 No finalized record — try fallback
        const session = await CurrentlyAttending.findOne({
          studentId,
          courseCode: course.courseCode,
          timingId: timing._id.toString(),
          date: todayDateStr
        });
    
        if (session) {
          myLogIn = session.loginTime || null;
          myLogOut = session.logoutTime || null;
    
          if (myLogIn) {
            // Estimate status based on presence of login and logout
            const login = new Date(myLogIn);
            const logout = myLogOut ? new Date(myLogOut) : null;
            const lateThreshold = new Date(startDateTime.getTime() + 15 * 60000); // 15 minutes after start
            const earlyLeaveThreshold = new Date(endDateTime.getTime() - 15 * 60000); // 15 minutes before end
    
            if (login > lateThreshold) {
              myAttendance = "Late";
            } else if (logout && logout < earlyLeaveThreshold) {
              myAttendance = "Absent"; // left too early
            } else {
              myAttendance = "Attended"; // treated as attended
            }
          } else {
            myAttendance = "Absent"; // never logged in
          }
        } else {
          myAttendance = "Absent"; // No record in either collection
        }
      }
    }
    
      
      
     
  

  
                    
          
          
          
         

        result.push({
            _id: timing._id,
          courseCode: course.courseCode,
          courseName: course.courseName,
          faculty: course.faculty,
          teacherName: course.teachers?.join(", ") || "N/A",
          day: timing.day,
          startTime: timing.timeStart,
          endTime: timing.timeEnd,
          type: timing.type,
          room: timing.room || "N/A",
          enrolledCount: course.students?.length || 0,
          startDateTime,
          endDateTime,
          timingId: timing._id, 
          myAttendance,
          myLogIn,
          myLogOut
          
        });
      }
    }

    result.sort((a, b) => new Date(a.startDateTime) - new Date(b.startDateTime));
    res.json(result);

  } catch (err) {
    console.error("🔥 Student lecture live error:", err);
    res.status(500).json({ error: "Server error", message: err.message });
  }
});

module.exports = router;
