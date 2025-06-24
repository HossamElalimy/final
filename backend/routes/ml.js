const express = require("express");
const router = express.Router();
const User = require("../models/User");
const { default: axios } = require("axios");

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
        const { data } = await axios.get(`http://localhost:5001/api/predict/${id}`);
        results.push(data);
      } catch (e) {
        console.warn(`Failed to get prediction for ${id}`);
      }
    }

    res.json(results);
  } catch (err) {
    console.error("ML prediction route error:", err);
    res.status(500).json({ error: "Internal server error" });
  }
});

module.exports = router;
