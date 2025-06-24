const mongoose = require("mongoose");
const Course = require("../models/Course");
const Lecture = require("../models/Lecture");

const MONGODB_URI = "mongodb://localhost:27017/rfidCampus"; // Update if needed

const connectDB = async () => {
  if (mongoose.connection.readyState === 0) {
    await mongoose.connect(MONGODB_URI);
    console.log("✅ Connected to MongoDB");
  }
};

const daysMap = {
  Sunday: 0,
  Monday: 1,
  Tuesday: 2,
  Wednesday: 3,
  Thursday: 4,
  Friday: 5,
  Saturday: 6,
};

const generateEndedLectures = async () => {
  await connectDB();

  const today = new Date();
  const startDate = new Date("2025-05-29");
  startDate.setHours(0, 0, 0, 0);

  const courses = await Course.find();

  for (const course of courses) {
    for (const timing of course.timings || []) {
      const timingDayIndex = daysMap[timing.day];
      if (timingDayIndex === undefined) continue;

      const dateCursor = new Date(startDate);
      while (dateCursor <= today) {
        if (dateCursor.getDay() === timingDayIndex) {
          const dateStr = dateCursor.toISOString().split("T")[0];
          const startDateTime = new Date(`${dateStr}T${timing.timeStart}`);
          const endDateTime = new Date(`${dateStr}T${timing.timeEnd}`);

          if (endDateTime < new Date()) {
            const exists = await Lecture.findOne({
              courseCode: course.courseCode,
              startDateTime,
              endDateTime,
              status: "ended"
            });

            if (!exists) {
              await Lecture.create({
                courseCode: course.courseCode,
                courseName: course.courseName,
                faculty: course.faculty,
                teacherId: course.teachers[0] || null,
                teacherName: course.teachers?.join(", "),
                day: timing.day,
                startTime: timing.timeStart,
                endTime: timing.timeEnd,
                startDateTime,
                endDateTime,
                type: timing.type,
                room: timing.room,
                attendanceCount: 0,
                createdBy: "system",
                status: "ended"
              });

              console.log(`✅ Saved: ${course.courseCode} - ${timing.day} (${dateStr})`);
            }
          }
        }
        dateCursor.setDate(dateCursor.getDate() + 1);
      }
    }
  }

  console.log("🕒 Lecture sync completed at", new Date().toLocaleTimeString());
};

// Run every 5 minutes
setInterval(generateEndedLectures, 5 * 60 * 1000); // 5 minutes

// Run once on start
generateEndedLectures();
