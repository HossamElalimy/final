const express = require("express");
const router = express.Router();
const Transaction = require("../models/Transaction");
const Lecture = require("../models/Lecture");
const User = require("../models/User");
const Attendance = require("../models/Attendance");

// 📊 Fetch student analytics data by userId
router.get("/:userId", async (req, res) => {
  try {
    const { userId } = req.params;

    const transactions = await Transaction.find({ userId });
    const attendanceRecords = await Attendance.find({
      studentId: { $regex: new RegExp(`^${userId}$`, "i") }
    });
    
    console.log("🔍 Querying Attendance for studentId:", userId);
    


    // Payments grouped by action type
    const paymentSummary = {
      add: 0,
      deduct: 0,
      purchase: 0
    };
    for (const tx of transactions) {
      paymentSummary[tx.action] = (paymentSummary[tx.action] || 0) + tx.amount;
    }

    // Attendance summary from Attendance collection
  // Attendance summary from Attendance collection
  console.log("🔍 Querying Attendance for studentId:", userId);
console.log("🧾 Found Attendance Records:", attendanceRecords.length);
const attendanceSummary = {
  attended: 0,
  absent: 0,
  late: 0
};

for (const record of attendanceRecords) {
  const status = record.status?.trim().toLowerCase();
  console.log(`📌 Found status: ${record.status} → normalized: ${status}`);
  if (status === "attended") attendanceSummary.attended++;
  else if (status === "absent") attendanceSummary.absent++;
  else if (status === "late") attendanceSummary.late++;
  
  
}

const totalLectures = attendanceSummary.attended + attendanceSummary.absent + attendanceSummary.late;
const missedLectures = attendanceSummary.absent + attendanceSummary.late;


res.json({
  paymentSummary,
  attendanceSummary,
  totalLectures,
  missedLectures
});






  } catch (err) {
    console.error("Error in student analytics:", err);
    res.status(500).json({ error: "Error generating analytics" });
  }
});
// 🎯 Spending grouped by Day, Month, and Year
// GET /api/studentanalytics/spending/:userId
router.get("/spending/:userId", async (req, res) => {
  const { userId } = req.params;
  const { day, month, year, mode } = req.query;

  const filter = { userId, action: "purchase" };

  if (day) {
    const start = new Date(day);
    const end = new Date(day);
    end.setDate(end.getDate() + 1);
    filter.timestamp = { $gte: start, $lt: end };
  } else if (month) {
    const [y, m] = month.split("-");
    const start = new Date(y, m - 1, 1);
    const end = new Date(y, m, 1);
    filter.timestamp = { $gte: start, $lt: end };
  } else if (year) {
    const start = new Date(`${year}-01-01`);
    const end = new Date(`${+year + 1}-01-01`);
    filter.timestamp = { $gte: start, $lt: end };
  } else if (mode === "today") {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);
    filter.timestamp = { $gte: today, $lt: tomorrow };
  }
 

  const tx = await Transaction.find(filter);

  const byDay = {};
  const byMonth = {};
  const byYear = {};
  const byItem = {};

  tx.forEach(t => {
    const date = new Date(t.timestamp);
    const day = date.toISOString().split("T")[0];
    const month = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
    const year = `${date.getFullYear()}`;

    byDay[day] = (byDay[day] || 0) + t.amount;
    byMonth[month] = (byMonth[month] || 0) + t.amount;
    byYear[year] = (byYear[year] || 0) + t.amount;

    t.items.forEach(item => {
      byItem[item] = (byItem[item] || 0) + t.amount / t.items.length;
    });
  });

  res.json({ byDay, byMonth, byYear, byItem });
});


router.get("/lecturesToday/:studentId", async (req, res) => {
  try {
    const { studentId } = req.params;

    // 🔍 Fetch student
    const student = await User.findOne({ userId: studentId });
    if (!student) return res.status(404).json({ error: "Student not found" });

    const enrolledCourses = student?.studentData?.enrolledCourses || [];
    if (enrolledCourses.length === 0) return res.json({ endedToday: 0 });

    // 🔍 Determine today's day name
    const today = new Date();
    const todayDay = today.toLocaleDateString("en-US", { weekday: "long" });

    const startOfDay = new Date(today);
    startOfDay.setHours(0, 0, 0, 0);

    const endOfDay = new Date(today);
    endOfDay.setHours(23, 59, 59, 999);

    const lectures = await Lecture.find({
      courseCode: { $in: enrolledCourses },
      status: "ended",
      day: todayDay,
      startDateTime: { $gte: startOfDay, $lte: endOfDay }
    });

    res.json({ endedToday: lectures.length });
  } catch (err) {
    console.error("❌ Error fetching lectures today:", err.message);
    res.status(500).json({ error: "Server error" });
  }
});
module.exports = router;
