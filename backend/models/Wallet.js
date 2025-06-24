const mongoose = require("mongoose");

const WalletSchema = new mongoose.Schema({
  walletID: { type: String, unique: true, required: true },
  userID: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
  balance: { type: Number, default: 0 }
});

module.exports = mongoose.model("Wallet", WalletSchema);
