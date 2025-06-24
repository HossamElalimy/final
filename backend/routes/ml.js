const express = require("express");
const router = express.Router();
const User = require("../models/User");
const Attendance = require("../models/Attendance");
const Transaction = require("../models/Transaction");
const axios = require("axios");

// 📍 GET /api/ml/parent/:parentId
router.get("/parent/:parentId", async (req, res) => {
  try {
    const parent = await User.findOne({ userId: req.params.parentId });
    if (!parent || parent.role !== "parent") {
      return res.status(404).json({ error: "Parent not found" });
    }

    const studentIDs = parent.studentIDs || [];
    const results = [];

    for (const id of studentIDs) {
      try {
        const student = await User.findOne({ userId: id });
        if (!student) {
          console.warn(`⚠️ No student found with ID ${id}`);
          continue;
        }
    
        const featuresRes = await axios.get(`http://localhost:5000/api/ml/features/${id}`);
        const f = featuresRes.data;
    
        const attendanceFeatures = [
          parseFloat(f.attendanceRate),
          parseFloat(f.lateRate),
          parseFloat(f.absenceRate)
        ];
    
        const spendingFeatures = [
          parseFloat(f.avgSpend),
          parseFloat(f.transactionsPerDay),
          parseFloat(f.monthlyTotalSpend)
        ];
    
        const { data: prediction } = await axios.post("http://localhost:5001/predict", [{
          studentId: id,
          attendanceFeatures,
          spendingFeatures
        }]);
    
        const { data: budget } = await axios.post("http://localhost:5001/budget-assist", [{
          studentId: id,
          spendingFeatures
        }]);
    
        results.push({
          ...prediction[0],
          ...budget[0],
          studentName: student.fullName   // ✅ Add this line
        });
    
        console.log(`✅ Prediction done for ${id}`);
      } catch (e) {
        console.warn(`⚠️ Failed for student ${id}:`, e.message);
      }
    }
    

    res.json(results);
  } catch (err) {
    console.error("ML prediction route error:", err);
    res.status(500).json({ error: "Internal server error" });
  }
});

// 📍 GET /api/ml/features/:studentId
router.get("/features/:studentId", async (req, res) => {
  try {
    const { studentId } = req.params;

    // 🎯 Attendance stats
    const totalLectures = await Attendance.countDocuments({ studentId });
    const attended = await Attendance.countDocuments({ studentId, status: "Attended" });
    const late = await Attendance.countDocuments({ studentId, status: "Late" });
    const absent = await Attendance.countDocuments({ studentId, status: "Absent" });

    const attendanceRate = totalLectures ? attended / totalLectures : 0;
    const lateRate = totalLectures ? late / totalLectures : 0;
    const absenceRate = totalLectures ? absent / totalLectures : 0;

    // 💸 Spending stats
    const transactions = await Transaction.find({ userId: studentId });
    const totalSpend = transactions.reduce((sum, t) => sum + (t.amount || 0), 0);
    const days = new Set(transactions.map(t => new Date(t.timestamp).toDateString())).size;

    const avgSpend = transactions.length ? totalSpend / transactions.length : 0;
    const transactionsPerDay = days ? transactions.length / days : 0;
    const monthlyTotalSpend = totalSpend / (days ? (days / 30) : 1); // rough estimate

    res.json({
      attendanceRate: attendanceRate.toFixed(2),
      lateRate: lateRate.toFixed(2),
      absenceRate: absenceRate.toFixed(2),
      avgSpend: avgSpend.toFixed(2),
      transactionsPerDay: transactionsPerDay.toFixed(2),
      monthlyTotalSpend: monthlyTotalSpend.toFixed(2)
    });
  } catch (err) {
    console.error("📉 Feature calculation failed:", err);
    res.status(500).json({ error: "Failed to compute student features" });
  }
});

module.exports = router;
