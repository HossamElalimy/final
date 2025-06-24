const mongoose = require("mongoose");

const lectureSchema = new mongoose.Schema({
  courseCode: { type: String, required: true },
  courseName: { type: String, required: true },
  faculty: { type: String, required: true },

  teacherId: { type: String },
  teacherName: { type: String },

  day: { type: String }, // optional if you rely on startDateTime
  startTime: { type: String },
  endTime: { type: String },

  startDateTime: { type: Date, required: true },
  endDateTime: { type: Date, required: true },

  type: { type: String, enum: ["lecture", "tutorial", "lab"], required: true },
  room: { type: String },

  attendanceCount: { type: Number, default: 0 },

  status: {
    type: String,
    enum: ["upcoming", "ongoing", "ended"],
    default: "ended"
  },

  createdBy: { type: String },
}, { timestamps: true }); // ✅ adds createdAt & updatedAt

module.exports = mongoose.model("Lecture", lectureSchema);
