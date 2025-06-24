const express = require("express");
const router = express.Router();
const User = require("../models/User");
const Course = require("../models/Course");
const Wallet = require("../models/Wallet");
const Attendance = require("../models/Attendance");
const Transaction = require("../models/Transaction");
const Lecture = require("../models/Lecture");

router.get("/summary", async (req, res) => {
  try {
    // Get today's date range
const todayStart = new Date();
todayStart.setHours(0, 0, 0, 0);
const todayEnd = new Date();
todayEnd.setHours(23, 59, 59, 999);
    const year = parseInt(req.query.year) || new Date().getFullYear();

    const startOfYear = new Date(year, 0, 1);
    const endOfYear = new Date(year, 11, 31, 23, 59, 59, 999);

    const [
      totalStudents,
      totalTeachers,
      totalAdmins,
      totalDeans,
      totalViceDeans,
      totalParents,
      totalSecretaries,
      totalMerchants
    ] = await Promise.all([
      User.countDocuments({ role: "student" }),
      User.countDocuments({ role: "teacher" }),
      User.countDocuments({ role: "admin" }),
      User.countDocuments({ role: "dean" }),
      User.countDocuments({ role: "vice_dean" }),
      User.countDocuments({ role: "parent" }),
      User.countDocuments({ role: "secretary" }),
      User.countDocuments({ role: "merchant" }),
    ]);

    const rawCourses = await Course.find({}, "_id courseName");
    const courses = rawCourses.map(course => ({
      _id: course._id.toString(),
      courseName: course.courseName
    }));
    


 

    const [
      transactionsToday,
      totalTransactions,
      purchasedTodayData,
      totalPurchasedData,
      totalWallets,
      wallets,
      totalLectures,
      totalLecturesToday,
      upcomingLecturesToday
    ] = await Promise.all([
      Transaction.countDocuments({ timestamp: { $gte: todayStart, $lte: todayEnd } }),
      Transaction.countDocuments(),

      Transaction.aggregate([
        {
          $match: {
            timestamp: { $gte: todayStart, $lte: todayEnd },
            action: "purchase"
          }
        },
        {
          $group: { _id: null, total: { $sum: "$amount" } }
        }
      ]),

      Transaction.aggregate([
        {
          $match: {
            action: "purchase",
            timestamp: { $gte: startOfYear, $lte: endOfYear } // ✅ filter by selected year
          }
        },
        {
          $group: { _id: null, total: { $sum: "$amount" } }
        }
      ]),
      

      Wallet.countDocuments(),
      Wallet.find(),

      Lecture.countDocuments(),
      Lecture.countDocuments({
        startDateTime: { $gte: todayStart, $lte: todayEnd },
        status: "ended"
      }),
      Lecture.countDocuments({
        startDateTime: { $gte: todayStart, $lte: todayEnd },
        status: "upcoming"
      })
    ]);

    // Monthly Purchases Aggregation by Year
    const monthlyPurchasesAgg = await Transaction.aggregate([
      {
        $match: {
          action: "purchase",
          timestamp: { $gte: startOfYear, $lte: endOfYear }
        }
      },
      {
        $group: {
          _id: { $month: "$timestamp" },
          total: { $sum: "$amount" }
        }
      }
    ]);

    const monthlyPurchases = Array(12).fill(0);
    monthlyPurchasesAgg.forEach(item => {
      monthlyPurchases[item._id - 1] = item.total;
    });

    // Pie Chart: Purchases by Category (using merchantName)
    const categoryAgg = await Transaction.aggregate([
      {
        $match: {
          action: "purchase",
          timestamp: { $gte: startOfYear, $lte: endOfYear }
        }
      },
      {
        $group: {
          _id: "$merchantName", // Use "$category" if you prefer
          total: { $sum: "$amount" }
        }
      }
    ]);

    const categoryPurchases = categoryAgg.map(entry => ({
      label: entry._id || "Unknown",
      value: entry.total
    }));
    // Add in your summary route
    const now = new Date();
    const todayDay = now.toLocaleDateString("en-US", { weekday: "long" });
    
    const allCourses = await Course.find();
    
    let ongoingLectureCount = 0;

    for (const course of allCourses) {
      for (const timing of course.timings) {
        if (timing.day !== todayDay) continue;
    
        const [startH, startM] = timing.timeStart.split(":").map(Number);
        const [endH, endM] = timing.timeEnd.split(":").map(Number);
    
        const start = new Date(now);
        start.setHours(startH, startM, 0, 0);
    
        const end = new Date(now);
        end.setHours(endH, endM, 0, 0);
    
        if (now >= start && now <= end) {
          ongoingLectureCount++;
        }
      }
    }
    
    



    const totalWalletAmount = wallets.reduce((sum, w) => sum + (w.balance || 0), 0);

    const attendanceTotal = await Attendance.countDocuments();
    const attendanceMax = totalLectures * totalStudents || 1;
    const attendancePercent = Math.round((attendanceTotal / attendanceMax) * 100);
    // Calculate attendance for today only
const todayAttendanceCount = await Attendance.countDocuments({
  timestamp: { $gte: todayStart, $lte: todayEnd }
});



// Step 1: Find all lectures today
const lecturesTodayDocs = await Lecture.find({
  startDateTime: { $gte: todayStart, $lte: todayEnd }
});

// Step 2: Extract unique student IDs from all lectures
const studentSet = new Set();
lecturesTodayDocs.forEach(lec => {
  (lec.students || []).forEach(sid => studentSet.add(sid));
});
const expectedCount = studentSet.size || 1; // avoid divide by zero

// Step 3: Count attendance records today
const attendanceTodayCount = await Attendance.countDocuments({
  timestamp: { $gte: todayStart, $lte: todayEnd }
});

// Step 4: Compute %
const attendancePercentToday = Math.round((attendanceTodayCount / expectedCount) * 100);




const allLectures = await Lecture.find().sort({ startDateTime: -1 });

const lecturesDropdown = allLectures.map(l => ({
  id: l._id,
  title: l.title
}));
const totalCourses = await Course.countDocuments();




    res.json({
      totalStudents,
      totalTeachers,
      totalAdmins,
      totalDeans,
      totalViceDeans,
      totalParents,
      totalSecretaries,
      totalMerchants,
      totalCourses,
      totalLectures,
      totalLecturesToday,
      upcomingLecturesToday,
      totalWallets,
      totalWalletAmount,
      transactionsToday,
      totalTransactions,
      purchasedToday: purchasedTodayData[0]?.total || 0,
      totalPurchased: totalPurchasedData[0]?.total || 0,
      attendancePercent,
      monthlyPurchases,
      categoryPurchases, // ✅ For pie chart
      ongoingLectureCount,
      attendancePercentToday,
      attendanceTodayCount,
      expectedTodayCount: expectedCount,


      lecturesDropdown,
  
      courses
    });
  } catch (err) {
    console.error("Dashboard summary failed:", err);
    res.status(500).json({ error: "Server error" });
  }
});
// 🆕 GET /summary/lecture-attendance?lectureId=xxxx
router.get("/summary/lecture-attendance", async (req, res) => {
  try {
    const { lectureId } = req.query;
    if (!lectureId) return res.status(400).json({ error: "Missing lectureId" });

    const lecture = await Lecture.findById(lectureId);
    if (!lecture) return res.status(404).json({ error: "Lecture not found" });

    const totalStudents = await User.countDocuments({ role: "student" });

    const attended = await Attendance.countDocuments({ lectureId });

    const percent = Math.round((attended / (totalStudents || 1)) * 100);

    res.json({ attendancePercent: percent, total: attended, max: totalStudents });
  } catch (err) {
    console.error("Lecture attendance error:", err);
    res.status(500).json({ error: "Server error" });
  }
});
// 🆕 GET /dashboard/purchases-by-item
router.get("/purchases-by-item", async (req, res) => {
  try {
    const year = parseInt(req.query.year) || new Date().getFullYear();
    const start = new Date(year, 0, 1);
    const end = new Date(year, 11, 31, 23, 59, 59);

    const result = await Transaction.aggregate([
      { $match: { action: "purchase", timestamp: { $gte: start, $lte: end } } },
      { $unwind: "$items" }, // ✅ Unwind the array
      {
        $group: {
          _id: "$items", // ✅ Group by individual item
          total: { $sum: "$amount" } // ⚠️ Optional: change to $divide if splitting amount
        }
      },
      { $sort: { total: -1 } },
      { $limit: 7 }
    ]);

    res.json(result.map(r => ({
      label: r._id || "Unknown",
      value: r.total
    })));
  } catch (err) {
    console.error("Purchases by item failed:", err);
    res.status(500).json({ error: "Server error" });
  }
});


// 🆕 GET /dashboard/attendance-status-summary
router.get("/attendance-status-summary", async (req, res) => {
  try {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const end = new Date(today);
    end.setHours(23, 59, 59, 999);

    const statuses = await Attendance.aggregate([
      {
        $match: {
          timestamp: { $gte: today, $lte: end },
          status: { $in: ["Absent", "Late", "Attended"] } // ensure only valid ones
        }
      },
      {
        $group: {
          _id: "$status",
          count: { $sum: 1 }
        }
      }
    ]);
    

    res.json(statuses.map(s => ({ status: s._id, count: s.count })));

  } catch (err) {
    console.error("Attendance status summary failed:", err);
    res.status(500).json({ error: "Server error" });
  }
});
// 🆕 GET /dashboard/attendance-top-absent-days
router.get("/attendance-top-absent-days", async (req, res) => {
  try {
    const top = await Attendance.aggregate([
      { $match: { status: "Absent" } },
      {
        $group: {
          _id: { $dateToString: { format: "%Y-%m-%d", date: "$timestamp" } },
          count: { $sum: 1 }
        }
      },
      { $sort: { count: -1 } },
      { $limit: 7 }
    ]);

    res.json(top.map(t => ({ date: t._id, count: t.count })));
  } catch (err) {
    console.error("Top absent days error:", err);
    res.status(500).json({ error: "Server error" });
  }
});
// 🆕 GET /dashboard/attendance-late-trend
router.get("/attendance-late-trend", async (req, res) => {
  try {
    const start = new Date();
    start.setDate(start.getDate() - 30);

    const trend = await Attendance.aggregate([
      {
        $match: {
          status: "Late",
          timestamp: { $gte: start }
        }
      },
      {
        $group: {
          _id: {
            dayOfWeek: { $dayOfWeek: "$timestamp" },  // 1 (Sunday) to 7 (Saturday)
            month: { $month: "$timestamp" }           // 1 (Jan) to 12 (Dec)
          },
          count: { $sum: 1 }
        }
      },
      {
        $project: {
          day: {
            $arrayElemAt: [
              [ "", "Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday" ],
              "$_id.dayOfWeek"
            ]
          },
          month: {
            $arrayElemAt: [
              [ "", "Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec" ],
              "$_id.month"
            ]
          },
          count: 1
        }
      },
      {
        $project: {
          label: { $concat: ["$day", " - ", "$month"] },
          count: 1
        }
      },
      { $sort: { label: 1 } }
    ]);

    res.json(trend.map(t => ({
      date: t.label,
      count: t.count
    })));
  } catch (err) {
    console.error("Late trend error:", err);
    res.status(500).json({ error: "Server error" });
  }
});

// 🆕 GET /dashboard/transactions-daily
router.get("/transactions-daily", async (req, res) => {
  try {
    const start = new Date();
    start.setDate(start.getDate() - 30);

    const data = await Transaction.aggregate([
      { $match: { timestamp: { $gte: start } } },
      {
        $group: {
          _id: { $dateToString: { format: "%Y-%m-%d", date: "$timestamp" } },
          count: { $sum: 1 }
        }
      },
      { $sort: { _id: 1 } }
    ]);

    res.json(data.map(d => ({ date: d._id, count: d.count })));
  } catch (err) {
    console.error("Transactions daily error:", err);
    res.status(500).json({ error: "Server error" });
  }
});
// 🆕 GET /dashboard/top-spending-students
router.get("/top-spending-students", async (req, res) => {
  try {
    const data = await Transaction.aggregate([
      { $match: { action: "purchase" } },
      {
        $group: {
          _id: "$userId", // Still grouping by studentId like "S02"
          total: { $sum: "$amount" }
        }
      },
      { $sort: { total: -1 } },
      { $limit: 5 },
      {
        $lookup: {
          from: "users",
          localField: "_id",           // This is "S02"
          foreignField: "userId",      // 🔥 Match on User.userId, NOT _id
          as: "user"
        }
      },
      {
        $project: {
          name: { $arrayElemAt: ["$user.fullName", 0] }, // optionally: .userId
          total: 1,
          fallbackId: "$_id"
        }
      }
    ]);

    res.json(
      data.map(d => ({
        name: d.name || d.fallbackId || "Unknown", // fallback to ID if name not found
        total: d.total
      }))
    );
  } catch (err) {
    console.error("Top spenders error:", err);
    res.status(500).json({ error: "Server error" });
  }
});



module.exports = router;
