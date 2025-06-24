const mongoose = require("mongoose");

const visaSchema = new mongoose.Schema({
  visaNo: { type: String, required: true, unique: true },
  expiryDate: { type: String, required: true }, // MM/YY format
  cvv: { type: String, required: true },
  balance: { type: Number, default: 0 },
  createdAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model("Visa", visaSchema);
