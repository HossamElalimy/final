const Wallet = require("../models/Wallet");
const Transaction = require("../models/Transaction");
const Course = require("../models/Course");
const Lecture = require("../models/Lecture");
const User = require("../models/User");

exports.getStudentSummary = async (req, res) => {
  try {
    const { userId } = req.params;
    const today = new Date();
    const todayStr = today.toISOString().slice(0, 10);
    const dayName = today.toLocaleString("en-US", { weekday: "long" });

    // 🔹 Find the user
    const user = await User.findOne({ userId });
    if (!user) return res.status(404).json({ message: "User not found" });

    // 🔹 Find wallet by user._id
    const wallet = await Wallet.findOne({ userID: user._id });
    const walletBalance = wallet ? wallet.balance : null;

    // 🔹 Transactions by walletID (instead of userId)
    const allTx = await Transaction.find({ walletID: wallet?.walletID || "invalid" });
    const totalTransactions = allTx.length;
    const totalPurchased = allTx
  .filter(tx => tx.action === "purchase")
  .reduce((acc, tx) => acc + tx.amount, 0);

    const addedAmount = allTx.filter(tx => tx.action === "add").reduce((acc, tx) => acc + tx.amount, 0);
    const deductedAmount = allTx.filter(tx => tx.action === "deduct").reduce((acc, tx) => acc + tx.amount, 0);
    const txToday = allTx.filter(tx => tx.timestamp.toISOString().startsWith(todayStr));
    const transactionsToday = txToday.length;
    const purchasesToday = txToday.reduce((acc, tx) => acc + (tx.items.length || 0), 0);

    // 🔹 Courses
    const courses = await Course.find({ students: userId });
    const totalCourses = courses.length;

    // 🔹 Ended lectures
    const allLectures = await Lecture.find({ students: userId });







    const endedTodayLectures = await Lecture.find({
      courseCode: { $in: user.studentData?.enrolledCourses || [] },
      status: "ended",
      day: dayName,
      startDateTime: {
        $gte: new Date(todayStr + "T00:00:00.000Z"),
        $lte: new Date(todayStr + "T23:59:59.999Z")
      }
    });
    const endedToday = endedTodayLectures.length;
    

    // 🔹 Ongoing & Upcoming
    const now = today.getHours() + today.getMinutes() / 60;
    let ongoingLectures = 0;
    let upcomingToday = 0;
    let timingToday = [];
    
    for (const course of courses) {
      for (const timing of course.timings) {
        if (timing.day === dayName) {
          const [startH, startM] = timing.timeStart.split(":").map(Number);
          const [endH, endM] = timing.timeEnd.split(":").map(Number);
          const start = startH + startM / 60;
          const end = endH + endM / 60;
    
          timingToday.push({
            courseCode: course.courseCode,
            timeStart: timing.timeStart,
            timeEnd: timing.timeEnd,
          });
    
          if (now >= start && now <= end) ongoingLectures++;
          else if (now < start) upcomingToday++;
        }
      }
    }
    
 
    


    res.json({
      walletBalance,
      totalPurchased,
      totalTransactions,
      transactionsToday,
      purchasesToday,
      totalCourses,
      endedToday,
      upcomingToday,
      ongoingLectures,
      addedAmount,
      deductedAmount,
      timingToday
    });
    
    
  } catch (error) {
    console.error("Error in student summary:", error);
    res.status(500).json({ message: "Internal server error" });
  }
};
