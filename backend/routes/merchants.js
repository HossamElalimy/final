const express = require("express");
const router = express.Router();
const { getMerchantSummary } = require("../controllers/merchantController");

router.get("/summary/:userId", getMerchantSummary);

module.exports = router;
