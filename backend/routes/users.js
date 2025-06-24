const express = require("express");
const router = express.Router();
const User = require("../models/User");
const bcrypt = require("bcryptjs");

// Helper: Generate role-based user ID
async function generateUserId(role) {
  const rolePrefix = {
    admin: "A",
    teacher: "T",
    parent: "P",
    student: "S",
    merchant: "M",
    dean: "D",
    vice_dean: "V",
    secretary: "SC"
  };

  const prefix = rolePrefix[role.toLowerCase()] || "U";
  const count = await User.countDocuments({ role });
  const number = (count + 1).toString().padStart(2, "0"); // e.g. 01, 02
  return prefix + number; // A01, T02, M01, etc.
}

// POST request to create user
router.post("/", async (req, res) => {
  try {
    console.log("Creating user with data:", req.body);  // <-- Add this line here
    const { username,fullName, email, password, phoneNumber, role, status, faculty, year, merchantName, merchantType,studentID  } = req.body;

    // Check if the username or email already exists
    const existingUser = await User.findOne({ $or: [{ username }, { email }] });
    if (existingUser) {
      return res.status(400).json({ error: "Username or email already exists" });
    }

    // Hash password
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    const userId = await generateUserId(role); // Generate ID based on role

    let newUser;
    if (role === "merchant") {
      newUser = new User({
        username,
        fullName,
        email,
        password: hashedPassword,
        phoneNumber,
        role,
        status,
        merchantName,
        merchantType,
        userId,
        
      });
    } else if (role === "parent") {
      const studentIDs = req.body.studentIDs || [];
    
      if (!Array.isArray(studentIDs) || studentIDs.length === 0) {
        return res.status(400).json({ error: "Parent must be linked to at least one student." });
      }
    
      newUser = new User({
        username,
        fullName,
        email,
        password: hashedPassword,
        phoneNumber,
        role,
        status,
        studentIDs, // array of student IDs
        userId
      });
    }
    
    
    else if (["dean", "vice_dean"].includes(role)) {
      if (!faculty || !status) {
        return res.status(400).json({ error: "Faculty and status are required for dean or vice dean." });
      }
    
      newUser = new User({
        username,
        fullName,
        email,
        password: hashedPassword,
        phoneNumber,
        role,
        status,
        faculty,
        userId
      });

      
    
    }
    else if (role === "secretary") {
      if (!faculty) {
        return res.status(400).json({ error: "Faculty is required for secretary role." });
      }
    
      newUser = new User({
        username,
        fullName,
        email,
        password: hashedPassword,
        phoneNumber,
        role,
        status,
        faculty,
        userId
      });
    }
     else {
      // default handler for student, teacher, admin
      newUser = new User({
        username,
        fullName,
        email,
        password: hashedPassword,
        phoneNumber,
        role,
        status,
        faculty,
        year,
        userId
      });
    }
    

    await newUser.save();

    const io = req.app.get("io");
io.emit("userCreated", newUser);
    res.status(201).json(newUser); // Success response
  } catch (err) {
    console.error("Error creating user:", err);
    res.status(400).json({ error: err.message || "Could not create user" }); // Send detailed error message
  }
});

// PUT - Update User (ensure unique username/email validation here too)

router.put("/:id", async (req, res) => {
  const { username, fullName, email, password, phoneNumber, role, status, faculty, year, merchantName, merchantType, studentIDs } = req.body;

  // Ensure username and email are unique
  const existingUser = await User.findOne({
    $and: [{ _id: { $ne: req.params.id } }, { $or: [{ username }, { email }] }]
  });
  if (existingUser) {
    return res.status(400).json({ error: "Username or email already exists" });
  }

  try {
    const updatedData = {
      username,
      fullName,
      email,
      phoneNumber,
      role,
      status,
      faculty,
      year,
      merchantName,
      merchantType,
      studentIDs: role === "parent" ? studentIDs : undefined
    };
       // Remove empty or undefined fields
       Object.keys(updatedData).forEach(key => {
        if (updatedData[key] === undefined || updatedData[key] === "") {
          delete updatedData[key];
        }
      });

    if (password) {
      const salt = await bcrypt.genSalt(10);
      updatedData.password = await bcrypt.hash(password, salt);
    }

    const updated = await User.findByIdAndUpdate(req.params.id, updatedData, { new: true });
    const io = req.app.get("io");
io.emit("userUpdated", updated);
    res.status(200).json(updated);
  } catch (err) {
    console.error("User update error:", err);
    res.status(400).json({ error: err.message || "Failed to update user" });
  }
});


// ✅ GET all users
// ✅ GET /api/users with search and filter
// GET /api/users/search?query=...&role=...&status=...
router.get("/search", async (req, res) => {
  try {
    const { query, role, status } = req.query;
    const q = query?.toLowerCase() || "";

    const filter = {
      ...(role ? { role } : {}),
      ...(status ? { status } : {}),
      $or: [
        { fullName: { $regex: q, $options: "i" } },
        { userId: { $regex: q, $options: "i" } },
      ],
    };

    const users = await User.find(filter).sort({ createdAt: -1 });
    res.json(users);
  } catch (err) {
    console.error("Search Error:", err);
    res.status(500).json({ error: "Failed to search users." });
  }
});



// // Search for students by partial userId (starts with)
// router.get("/search", async (req, res) => {
//   const { query } = req.query;
//   console.log("Search Query:", query); // Check the incoming query
//   try {
//     const students = await User.find({
//       role: "student",
//       userId: { $regex: `^${query}`, $options: "i" }
//     }).select("userId fullName");
//     res.json(students);
//   } catch (err) {
//     console.error("Error searching for students:", err);
//     res.status(500).json({ error: "Error searching students" });
//   }
// });






// ✅ DELETE user
router.delete("/:id", async (req, res) => {
  try {
    await User.findByIdAndDelete(req.params.id);
    const io = req.app.get("io");
io.emit("userDeleted", req.params.id);
    res.json({ message: "User deleted" });
  } catch (err) {
    res.status(400).json({ error: "Delete failed" });
  }
});
router.get("/wallet/:userId", async (req, res) => {
  const { userId } = req.params;
  const wallet = await Wallet.findOne({ userId });

  if (!wallet) return res.json({ message: "No wallet" });
  res.json(wallet);
});

// GET /api/users/search?query=...&role=...
router.get("/search", async (req, res) => {
  try {
    const { query, role } = req.query;
    const q = query?.toLowerCase() || "";

    const filter = {
      ...(role ? { role } : {}),
      $or: [
        { fullName: { $regex: q, $options: "i" } },
        { userId: { $regex: q, $options: "i" } },
      ],
    };

    const users = await User.find(filter).select("userId fullName faculty");
    res.json(users);
  } catch (err) {
    console.error("Search Error:", err);
    res.status(500).json({ error: "Failed to search users." });
  }
});
// Suggest teacher names or IDs
router.get("/suggest", async (req, res) => {
  const query = req.query.query?.toLowerCase() || "";
  const teachers = await User.find({ role: "teacher", $or: [
    { userId: { $regex: query, $options: "i" } },
    { fullName: { $regex: query, $options: "i" } }
  ] }).limit(10);
  res.json(teachers.map((t) => `${t.fullName} (${t.userId})`));
});



module.exports = router;
