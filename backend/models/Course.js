// backend/models/Course.js

const mongoose = require("mongoose");

const courseSchema = new mongoose.Schema(
  {
    courseCode: {
      type: String,
      required: true,
      unique: true, // ensure uniqueness
    },
    courseName: {
      type: String,
      required: true,
    },
    faculty: {
      type: String,
      required: true,
      enum: ["Dentistry", "Pharmacy", "Biotechnology", "Engineering", "Computer Science", "Mass Communication", "Management Sciences", "Arts and Design", "Languages", "Physical Therapy"]
    },
 

    timings: [
      {
        type: { type: String, enum: ["lecture", "lab", "tutorial"], required: true },

        day: { type: String, required: true },
        timeStart: { type: String, required: true },
        timeEnd: { type: String, required: true },
        room: { type: String, required: true } // ✅ new required field
      }
    ],
    teachers: [
      {
        type: String, // Teacher's userId (e.g., T01, T02)
      },
    ],
    students: [
      {
        type: String, // Student's userId (e.g., S01, S02)
      },
    ],
  },
  { timestamps: true }
);

module.exports = mongoose.model("Course", courseSchema);
