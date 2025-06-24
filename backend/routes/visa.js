const express = require("express");
const router = express.Router();
const Visa = require("../models/Visa");

router.post("/create", async (req, res) => {
  try {
    const { visaNo, expiryDate, cvv, balance } = req.body;
    const existing = await Visa.findOne({ visaNo });
    if (existing) return res.status(400).json({ message: "Visa already exists" });

    const visa = new Visa({ visaNo, expiryDate, cvv, balance });
    await visa.save();
    res.status(201).json({ message: "Visa created successfully", visa });
  } catch (err) {
    console.error("❌ Visa creation error:", err);
    res.status(500).json({ message: "Internal server error" });
  }
});

module.exports = router;
