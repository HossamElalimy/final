const express = require("express");
const router = express.Router();
const Course = require("../models/Course");
const User = require("../models/User");

// Create a new course
router.post("/", async (req, res) => {
  try {
    const { courseCode, courseName, faculty, timings, teachers, students = [] } = req.body;

    // Check if course code already exists
    const existing = await Course.findOne({ courseCode });
    if (existing) return res.status(400).json({ error: "Course code already exists." });

    // Validate students are from same faculty
    const invalidStudents = [];
    for (const studentId of students) {
      const student = await User.findOne({ userId: studentId });
      if (!student || student.faculty !== faculty) {
        invalidStudents.push(studentId);
      }
    }

    if (invalidStudents.length > 0) {
      return res.status(400).json({
        error: `❌ Cannot add students from different faculty: ${invalidStudents.join(", ")}`
      });
    }

    // Create course
    const course = new Course({ courseCode, courseName, faculty, timings, teachers, students });
    await course.save();

    // Update enrolledCourses for students
    for (const studentId of students) {
      await User.updateOne(
        { userId: studentId },
        { $addToSet: { "studentData.enrolledCourses": courseCode } }
      );
    }

    const io = req.app.get("io");
    io.emit("courseCreated", course);

    res.status(201).json(course);
  } catch (err) {
    console.error("❌ Course creation error:", err);
    res.status(500).json({ error: "Error creating course", details: err.message });
  }
});


// Get all courses
// Get all courses with teacher details
router.get("/", async (req, res) => {
  try {
    const courses = await Course.find().lean();
    const teachers = await User.find({ role: "teacher" }).lean();

    const teacherMap = {};
    teachers.forEach((t) => {
      teacherMap[t.userId] = `${t.fullName} (${t.userId})`;
    });

    // Attach teacher names to each course
    const enrichedCourses = courses.map(course => ({
      ...course,
      teacherDetails: course.teachers.map(tid => teacherMap[tid] || tid),
    }));

    res.json(enrichedCourses);
  } catch (err) {
    res.status(500).json({ error: "Error fetching courses" });
  }
});


// 
router.get("/search/teachers", async (req, res) => {
  try {
    const query = req.query.q || "";
    if (!query.trim()) return res.json([]);  // return empty array if no query

    const teachers = await User.find({
      role: "teacher",
      $or: [
        { userId: { $regex: query, $options: "i" } },
        { fullName: { $regex: query, $options: "i" } }
      ]
    }).select("userId fullName");

    res.json(teachers);
  } catch (err) {
    console.error("❌ Teacher search error:", err.message);
    res.status(500).json({ error: "Failed to search teachers" });
  }
});


// Update a course (can update timings, teachers, students)
router.put("/:id", async (req, res) => {
  try {
    const updated = await Course.findByIdAndUpdate(req.params.id, req.body, { new: true });
    const io = req.app.get("io");
    io.emit("courseUpdated", updated);
    if (!updated) return res.status(404).json({ error: "Course not found" });
    res.json(updated);
  } catch (err) {
    res.status(500).json({ error: "Error updating course" });
  }
});

// Delete a course
router.delete("/:id", async (req, res) => {
  try {
    const deleted = await Course.findByIdAndDelete(req.params.id);
    const io = req.app.get("io");
    io.emit("courseDeleted", req.params.id);
    if (!deleted) return res.status(404).json({ error: "Course not found" });
    res.json({ message: "Course deleted successfully" });
  } catch (err) {
    res.status(500).json({ error: "Error deleting course" });
  }
});


router.get("/suggest", async (req, res) => {
  const query = req.query.query || "";

  let regex;
  try {
    // prevent malformed regex like "CS[301"
    regex = new RegExp(query.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), "i");
  } catch (err) {
    return res.status(400).json({ error: "Invalid search pattern." });
  }

  try {
    const courses = await Course.find({ courseCode: regex }).limit(5);
    res.json(courses.map(c => c.courseCode));
  } catch (err) {
    console.error("❌ Course suggest failed:", err.message);
    res.status(500).json({ error: "Internal server error." });
  }
});
// 📌 2. GET COURSE BY ID - must come AFTER
router.get("/:id", async (req, res) => {
  try {
    const course = await Course.findById(req.params.id);
    if (!course) return res.status(404).json({ error: "Course not found" });
    res.json(course);
  } catch (err) {
    res.status(500).json({ error: "Error fetching course" });
  }
});

// Add student to course
router.post("/:id/students", async (req, res) => {
  const course = await Course.findById(req.params.id);
  const student = await User.findOne({ userId: req.body.studentId });

  if (!course || !student) return res.status(404).json({ error: "Not found" });
  
  if (student.faculty !== course.faculty) {
    return res.status(400).json({
      error: `Cannot enroll. Student ${student.userId} is from '${student.faculty}', but the course is for '${course.faculty}'.`
    });
  }

  const studentId = req.body.studentId;
  if (!course.students.includes(studentId)) {
    course.students.push(studentId);
    await course.save();
  
    // Also update user record
    await User.updateOne(
      { userId: studentId },
      { $addToSet: { "studentData.enrolledCourses": course.courseCode } }
    );
  }
  

  res.json({ message: "Student enrolled" });
});


// Remove student from course
router.delete("/:id/students/:studentId", async (req, res) => {
  const course = await Course.findById(req.params.id);

  if (!course) return res.status(404).json({ error: "Course not found" });

  course.students = course.students.filter(id => id !== req.params.studentId);
  await course.save();

  res.json({ message: "Student removed" });
});



// GET all unique faculties for dropdown
router.get("/faculties", async (req, res) => {
  try {
    const faculties = await Faculty.find(); // check that Faculty is defined
    res.json(faculties);
  } catch (error) {
    console.error("Error fetching faculties:", error.message);
    res.status(500).json({ error: "Internal Server Error" });
  }
});

// Add a new timing to a course by courseCode
router.put("/add-timing/:courseCode", async (req, res) => {
  try {
    const { courseCode } = req.params;
    const { timing } = req.body; // send { "timing": { ... } }

    const course = await Course.findOne({ courseCode });
    if (!course) return res.status(404).json({ error: "Course not found" });

    course.timings.push(timing);
    await course.save();

    res.json({ message: "Timing added", timing });
  } catch (err) {
    console.error("Add timing error:", err.message);
    res.status(500).json({ error: "Failed to add timing" });
  }
});



module.exports = router;
