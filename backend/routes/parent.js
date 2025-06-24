// backend/routes/parent.js
const express = require("express");
const router = express.Router();
const User = require("../models/User");
const Wallet = require("../models/Wallet");
const Attendance = require("../models/Attendance");
const Transaction = require("../models/Transaction");
const Course = require("../models/Course");


router.get("/summary/:parentId", async (req, res) => {
  try {
    const parent = await User.findOne({ userId: req.params.parentId });
    if (!parent || parent.role !== "parent") {
      return res.status(404).json({ error: "Parent not found" });
    }

    const linkedStudents = parent.studentIDs || [];

    const summaries = await Promise.all(
      linkedStudents.map(async (studentId) => {
        const student = await User.findOne({ userId: studentId });
        if (!student) return null;
        const transactions = await Transaction.find({ userId: studentId });
        // 🧾 Wallet ID Format: SW + studentId
        const walletId = `SW${studentId}`;
        const rawWallet = await Wallet.findOne({ walletID: `SW${studentId}` });
        const totalAdded = transactions
        .filter(tx => tx.action === "add")
        .reduce((sum, tx) => sum + tx.amount, 0);
      
      const totalDeducted = transactions
        .filter(tx => tx.action === "deduct")
        .reduce((sum, tx) => sum + tx.amount, 0);

      const wallet = {
  balance: rawWallet?.balance || 0,
};

        // 🧠 Attendance Stats
        const attendances = await Attendance.find({ studentId });
        const totalAttended = attendances.filter(a => a.status === "Attended").length;
        const totalAbsences = attendances.filter(a => a.status === "Absent").length;
        const totalLate = attendances.filter(a => a.status === "Late").length;
        const totalLectures = attendances.length;
        const attendanceRate = totalLectures ? Math.round((totalAttended / totalLectures) * 100) : 0;
        const lateRate = totalLectures ? Math.round((totalLate / totalLectures) * 100) : 0;

        // 🕒 Today's Attendance Breakdown
        const todayISO = new Date().toISOString().slice(0, 10);
        const todayAttendances = attendances.filter(a => a.date === todayISO);
        const lecturesEndedToday = todayAttendances.filter(a => a.status !== "Upcoming").length;
        const lecturesUpcomingToday = todayAttendances.filter(a => a.status === "Upcoming").length;
        const ongoingLectures = todayAttendances.filter(a => a.status === "Ongoing").length;

        // 💰 Transactions
       
        const transactionsToday = transactions.filter(
          tx => new Date(tx.timestamp).toISOString().slice(0, 10) === todayISO
        ).length;

        const purchasesToday = transactions.filter(
            tx =>
              new Date(tx.timestamp).toISOString().slice(0, 10) === todayISO &&
              tx.action === "purchase"
          );
          
          const todaySpent = purchasesToday.reduce((sum, tx) => sum + tx.amount, 0);
          

        const totalTransactions = transactions.length;
        const totalPurchased = transactions
  .filter(tx => tx.action === "purchase")
  .reduce((sum, tx) => sum + tx.amount, 0);


        // 📚 Courses
        const enrolledCourses = await Course.find({ students: studentId });
        const totalCourses = enrolledCourses.length;

        // ✅ Return all summary info
        return {
          studentId,
          studentName: student.fullName,
          walletBalance: wallet.balance,
          totalAdded: wallet.totalAdded,
          totalDeducted: wallet.totalDeducted,
          totalAttended,
          totalAbsences,
          totalLate,
          totalLectures,
          attendanceRate,
          lateRate,
          lecturesEndedToday,
          lecturesUpcomingToday,
          ongoingLectures,
          purchasesToday: purchasesToday.length,
          transactionsToday,
          totalPurchased,
          totalTransactions,
          totalCourses,
          todaySpent,
          totalAdded,
totalDeducted,

        };
      })
    );

    res.json(summaries.filter(Boolean));
  } catch (err) {
    console.error("Parent summary error:", err);
    res.status(500).json({ error: "Internal server error" });
  }
});
router.get("/attendance/:studentId", async (req, res) => {
    try {
      const { studentId } = req.params;
      const attendances = await Attendance.find({ studentId }).sort({ date: -1 });
  
      res.json(attendances);
    } catch (err) {
      console.error("Parent attendance fetch error:", err);
      res.status(500).json({ error: "Could not fetch attendance" });
    }
  });
// backend/routes/parent.js
router.get("/transactions/:studentId", async (req, res) => {
    try {
      const transactions = await Transaction.find({ userId: req.params.studentId }).sort({ timestamp: -1 });
      res.json(transactions);
    } catch (err) {
      console.error("Parent transactions error:", err);
      res.status(500).json({ error: "Failed to fetch transactions" });
    }
  });
  router.post("/fund", async (req, res) => {
    const { studentId, amount } = req.body;
  
    if (!studentId || !amount) {
      return res.status(400).json({ error: "Missing fields" });
    }
  
    try {
      const walletId = `SW${studentId}`;
      const wallet = await Wallet.findOne({ walletId });
  
      if (!wallet) return res.status(404).json({ error: "Wallet not found" });
  
      wallet.balance += amount;
      wallet.totalAdded += amount;
      await wallet.save();
  
      await Transaction.create({
        userId: studentId,
        action: "add",
        amount,
        timestamp: new Date()
      });
  
      req.app.get("io").emit("wallet-update");
  
      res.json({ success: true });
    } catch (err) {
      console.error("💥 Fund Wallet Error:", err);
      res.status(500).json({ error: "Internal Server Error" });
    }
  });


  router.get("/linkedStudents/:parentId", async (req, res) => {
    try {
      const parent = await User.findOne({ userId: req.params.parentId });
      if (!parent || !parent.studentIDs || parent.studentIDs.length === 0) {
        return res.status(404).json({ error: "Parent or studentIDs not found" });
      }
  
      const students = await User.find(
        { userId: { $in: parent.studentIDs } },
        { userId: 1, fullName: 1 }
      );
      res.json(students);
    } catch (err) {
      console.error("❌ Error fetching linked students:", err);
      res.status(500).json({ error: "Server error" });
    }
  });
  
  
module.exports = router;
