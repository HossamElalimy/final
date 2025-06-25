const express = require("express");
const app = express();


const http = require("http").createServer(app);
const mongoose = require("mongoose");

const cors = require("cors");
const cron = require("node-cron");

const path = require("path");
require("dotenv").config();


// 🧠 SOCKET.IO
const { initSocket, io } = require("./socket");
initSocket(http)

const ioInstance = io(); // Get the actual io instance after initialization
app.set("io", ioInstance); // Save it on app for routes or cron jobs


// Middleware
app.use(cors({
  origin: "http://localhost:3000", // allow requests from frontend
  credentials: true
}));

app.use(express.json({ limit: "10mb" }));
app.use(express.urlencoded({ extended: true, limit: "10mb" }));




// App and Server


app.use('/landing', express.static(path.join(__dirname, '../landing')));


const studentAnalyticsRoutes = require("./routes/studentanalytics");
app.use("/api/studentanalytics", studentAnalyticsRoutes);



const studentLecturesRoute = require("./routes/studentlectures");
app.use("/api/studentlectures", studentLecturesRoute);

const simulaterfidRoute = require("./routes/simulaterfid");
app.use("/api/simulaterfid", simulaterfidRoute); 





const studentRoutes = require("./routes/student");
app.use("/api/student", studentRoutes);
// Routes
app.use("/api/auth", require("./routes/auth"));
app.use("/api/users", require("./routes/users"));
app.use("/api/attendance", require("./routes/attendance"));
app.use("/api/wallet", require("./routes/wallet"));
app.use("/api/courses", require("./routes/courses"));
app.use("/api/transactions", require("./routes/transaction"));
app.use("/api/lectures", require("./routes/lecture"));
app.use("/api/dashboard", require("./routes/dashboard"));
const merchantRoutes = require("./routes/merchants");
app.use("/api/merchants", merchantRoutes);



const visaRoutes = require("./routes/visa");
app.use("/api/visa", visaRoutes);

const teacherRoutes = require("./routes/teacher");
app.use("/api/teacher", teacherRoutes);


const teacherAnalyticsRoutes = require("./routes/teacheranalytics");
app.use("/api/teacher/analytics", teacherAnalyticsRoutes);



app.get("/", (req, res) => {
  res.send("RFID Server Running 🚀");
});

const parentRoutes = require("./routes/parent");
app.use("/api/parent", parentRoutes);

const mlRoutes = require("./routes/ml");
app.use("/api/ml", mlRoutes);
app.use("/api/merchant-items", require("./routes/merchantItems"));



// MongoDB connect and cron job
mongoose.connect(process.env.MONGO_URI)
  .then(() => {
    
    const Course = require("./models/Course");
    const Lecture = require("./models/Lecture");

    cron.schedule("* * * * *", async () => {
      
      const now = new Date();
      const today = now.toLocaleDateString("en-US", { weekday: "long" });
      const io = app.get("io");

      try {
        const courses = await Course.find();

        for (const course of courses) {
          for (const timing of course.timings) {
            if (timing.day !== today) continue;

            const [startH, startM] = timing.timeStart.split(":").map(Number);
            const [endH, endM] = timing.timeEnd.split(":").map(Number);

            const start = new Date(now);
            start.setHours(startH, startM, 0, 0);

            const end = new Date(now);
            end.setHours(endH, endM, 0, 0);

            if (now > new Date(end.getTime() + 1 * 60000)) // wait 1 extra minute
 {
              const exists = await Lecture.findOne({
                courseCode: course.courseCode,
                day: timing.day,
                startTime: timing.timeStart,
                endTime: timing.timeEnd,
              });

              if (!exists) {
                await Lecture.create({
                  courseCode: course.courseCode,
                  courseName: course.courseName,
                  faculty: course.faculty,
                  teacherId: course.teachers?.[0] || null,
                  teacherName: course.teachers?.[0] || "",
                  day: timing.day,
                  startTime: timing.timeStart,
                  endTime: timing.timeEnd,
                  startDateTime: start,
                  endDateTime: end,
                  type: timing.type,
                  room: timing.room || "N/A",
                  status: "ended",
                  createdBy: "system",
                });

                console.log(`✅ Moved ended lecture: ${course.courseCode} ${timing.type} ${timing.timeStart}–${timing.timeEnd}`);

                io.emit("lecture-updated", {
                  type: "ended",
                  courseCode: course.courseCode,
                  startTime: timing.timeStart,
                  endTime: timing.timeEnd,
                  title: `${course.courseName} (${timing.type}) - ${timing.timeStart}–${timing.timeEnd}`
                });
              }
            }
          }
        }
      } catch (err) {
        console.error("❌ Auto-move lecture failed:", err.message);
      }
      
    });
        // 🧠 CRON 2: Finalize attendance from CurrentlyAttending
        const CurrentlyAttending = require("./models/CurrentlyAttending");
        const Attendance = require("./models/Attendance");
    
        cron.schedule("* * * * *", async () => {
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
    
            if (now > new Date(end.getTime() + 1 * 60000))
              {
              const alreadyFinalized = await Attendance.findOne({
                studentId: session.studentId,
                courseCode: session.courseCode,
                date: session.date,
                startTime: timing.timeStart,
                endTime: timing.timeEnd
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
                const lateCutoffTime = new Date(scheduledStart.getTime() + totalDurationMs * 0.15); // after 15%
                
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
                status: finalStatus
              });
              const count = await Attendance.countDocuments({
                courseCode: session.courseCode,
                date: session.date,
                startTime: timing.timeStart,
                endTime: timing.timeEnd,
                status: { $in: ["Attended", "Late"] } // only those who actually showed up
              });
              
              await Lecture.updateOne(
                {
                  courseCode: session.courseCode,
                  startTime: timing.timeStart,
                  endTime: timing.timeEnd,
                  day: timing.day
                },
                { $set: { attendanceCount: count } }
              );
              // 📡 Notify frontend (optional)
ioInstance.emit("lecture-updated", {
  type: "attendance-finalized",
  courseCode: session.courseCode,
  startTime: timing.timeStart,
  endTime: timing.timeEnd,
  updatedCount: count
});

    
              await CurrentlyAttending.deleteOne({ _id: session._id });
    
              console.log(`✅ Finalized ${session.studentId} for ${session.courseCode} as ${finalStatus}`);
            }
          }
        });

    http.listen(process.env.PORT || 5000, () => {
      console.log(`✅ Server started on port ${process.env.PORT || 5000}`);
    });

      // Listen to new connections
      ioInstance.on("connection", (socket) => {
        console.log("🟢 Client connected:", socket.id);
      });

  })
  
  .catch((err) => console.error("MongoDB connection error:", err));
