const mongoose = require("mongoose");

const transactionSchema = new mongoose.Schema(
  {
    transactionId: { type: String, required: true, unique: true },
    userId: { type: String, required: true },        // e.g., S01
    merchantId: { type: String, required: function() { return this.action === 'purchase'; }},
merchantName: { type: String, required: function() { return this.action === 'purchase'; }},
merchantType: {
  type: String,
  required: function () {
    return this.action === "purchase";
  }
},
    items: [{ type: String }],                       // e.g., ["Burger", "Juice"]
    amount: { type: Number, required: true },        // e.g., 50
    action: {
      type: String,
      enum: ["add", "deduct", "purchase"],           // action type
      required: true
    },
    walletID: { type: String, required: true },      // e.g., SW01 (Student Wallet 01)
    balanceAfter: { type: Number, required: true }, // ✅ New field
    timestamp: { type: Date, default: Date.now }     // saved automatically
  },
  { timestamps: true }
);

module.exports = mongoose.model("Transaction", transactionSchema);
