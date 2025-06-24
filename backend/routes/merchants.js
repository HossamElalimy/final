const express = require("express");
const router = express.Router();
const User = require("../models/User");

router.get("/", async (req, res) => {
  try {
    const merchants = await User.find({ role: "merchant" }, { password: 0 }); // Exclude password
    res.json(merchants);
  } catch (err) {
    res.status(500).json({ error: "Failed to fetch merchants" });
  }
});

router.post("/add", async (req, res) => {
    try {
      const newMerchant = new User({ ...req.body, role: "merchant" });
      await newMerchant.save();
  
      // Notify all sockets
      req.app.get("io")?.emit("merchant-updated");
  
      res.json({ success: true, message: "Merchant added" });
    } catch (err) {
      res.status(500).json({ error: "Failed to add merchant" });
    }
  });

  router.delete("/:id", async (req, res) => {
    try {
      await User.findByIdAndDelete(req.params.id);
      req.app.get("io")?.emit("merchant-updated");
      res.json({ success: true });
    } catch (err) {
      res.status(500).json({ error: "Failed to delete merchant" });
    }
  });
  

module.exports = router;
