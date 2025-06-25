const mongoose = require("mongoose");

const MerchantSchema = new mongoose.Schema({
  merchantId: { type: String, required: true, unique: true },
  merchantName: { type: String, required: true },
  walletId: { type: String, required: true },
  items: [
    {
      name: String,
      price: Number,
      category: String
     
    }
  ]
}, { timestamps: true });

module.exports = mongoose.model("Merchant", MerchantSchema);
