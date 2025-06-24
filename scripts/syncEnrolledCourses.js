const mongoose = require("mongoose");
const User = require("../backend/models/User");
const Course = require("../backend/models/Course");

require("dotenv").config({ path: "./backend/.env" });


const syncEnrolledCourses = async () => {
  await mongoose.connect(process.env.MONGO_URI);
  const courses = await Course.find();

  for (const course of courses) {
    for (const studentId of course.students) {
      await User.updateOne(
        { userId: studentId },
        { $addToSet: { "studentData.enrolledCourses": course.courseCode } }
      );
    }
  }

  console.log("✅ Synced enrolledCourses to all students");
  process.exit();
};

syncEnrolledCourses();
