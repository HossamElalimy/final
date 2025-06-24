const Attendance = require("../models/Attendance");
const Course = require("../models/Course");

// controller: backend/controllers/teacherAnalyticsController.js
exports.getTeacherAnalytics = async (req, res) => {
    const { teacherId } = req.params;
    const { courseCode } = req.query;
    try {
      // 1. Get all courses for the teacher, filter by courseCode if provided
      let courses = await Course.find({ teachers: { $in: [teacherId] } });
      if (courseCode) {
        courses = courses.filter(c => c.courseCode === courseCode);
      }
      const courseCodes = courses.map(c => c.courseCode);
  
      // 2. Fetch all attendance records for these courses
      const records = await Attendance.find({ courseCode: { $in: courseCodes } });
  
      // Initialize counters/collectors
      const totalCounts = { attended: 0, late: 0, absent: 0 };
      const byCourse   = {};   // { courseCode: { total: X, attended: Y } }
      const byDate     = {};   // { "YYYY-MM-DD": { attended: n } }
      const lateTrend  = {};   // { "YYYY-MM-DD": m }
      const missedDays = {};   // { "YYYY-MM-DD": k }
  
      for (const rec of records) {
        const status = rec.status?.toLowerCase();
        if (!status) continue;
        const day = rec.date;            // date string "YYYY-MM-DD"
        const cc  = rec.courseCode;
  
        // Tally overall counts
        if (status === "attended") totalCounts.attended++;
        if (status === "late")     totalCounts.late++;
        if (status === "absent")   totalCounts.absent++;
  
        // Course-level stats
        if (!byCourse[cc]) byCourse[cc] = { total: 0, attended: 0 };
        byCourse[cc].total++;
        if (status === "attended") {
          byCourse[cc].attended++;
        }
  
        // Date-based stats
        if (!byDate[day]) byDate[day] = { attended: 0 };
        if (status === "attended") {
          byDate[day].attended++;
        }
  
        if (!lateTrend[day]) lateTrend[day] = 0;
        if (status === "late") {
          lateTrend[day]++;    // late occurrences per day
        }
  
        if (!missedDays[day]) missedDays[day] = 0;
        if (status === "absent") {
          missedDays[day]++;   // absence occurrences per day
        }
      }
  
      // Prepare response data structures
      res.json({
        // Overall counts array for doughnut chart [Attended, Late, Absent]
        totalCounts: [ totalCounts.attended, totalCounts.late, totalCounts.absent ],
        // Attendance percentage by course for bar chart
        courses: Object.entries(byCourse).map(([code, data]) => ({
          courseCode: code,
          attendanceRate: data.total 
            ? ((data.attended / data.total) * 100).toFixed(1) 
            : 0
        })),
        // Attendance over time (attended count per date)
        byDate: Object.entries(byDate).map(([date, data]) => ({
          date,
          attended: data.attended
        })),
        // Late trend over time (late count per date)
        lateTrend: Object.entries(lateTrend).map(([date, count]) => ({ date, count })),
        // Most missed days (absent count per date)
        missedDays: Object.entries(missedDays).map(([date, count]) => ({ date, count }))
      });
    } catch (err) {
      console.error("Error in teacher analytics:", err);
      res.status(500).json({ error: "Internal Server Error" });
    }
  };
  
  