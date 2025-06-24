const express = require("express");
const router = express.Router();
const Transaction = require("../models/Transaction");
const Wallet = require("../models/Wallet"); // make sure Wallet model exists
const { io } = require("../socket"); // ✅ keep as-is, but call it when needed
const User = require("../models/User");



router.get("/", async (req, res) => {
  try {
    const { userId, timeframe, date, merchantId, action, walletId } = req.query;
    const filter = {};

    // User ID (partial match)
    if (userId) {
        filter.$or = [
          { userId: { $regex: new RegExp(userId, "i") } },
          { merchantId: { $regex: new RegExp(userId, "i") } },
        ];
      }
      

    // Exact match filters
    if (merchantId) filter.merchantId = merchantId;
    if (action) filter.action = action;
    if (walletId) filter.walletID = walletId;

    // Specific date filtering (priority over timeframe)
    if (date) {
      const start = new Date(date);
      const end = new Date(date);
      end.setDate(end.getDate() + 1);
      filter.timestamp = { $gte: start, $lt: end };
    }
    // Time-based filtering
    else if (timeframe) {
      const now = new Date();
      let startDate;

      if (timeframe === "today") {
        startDate = new Date(now.getFullYear(), now.getMonth(), now.getDate());
      } else if (timeframe === "thisweek") {
        const day = now.getDay();
        startDate = new Date(now);
        startDate.setDate(now.getDate() - day);
        startDate.setHours(0, 0, 0, 0);
      } else if (timeframe === "thismonth") {
        startDate = new Date(now.getFullYear(), now.getMonth(), 1);
      }

      if (startDate) {
        filter.timestamp = { $gte: startDate };
      }
    }

    // Fetch filtered transactions
    const transactions = await Transaction.find(filter).sort({ timestamp: -1 });

    // Compute totals
    let totalAmount = 0;
    let totalAdded = 0;
    let totalDeducted = 0;
    let totalPurchased = 0;

    transactions.forEach(tx => {
      const amt = parseFloat(tx.amount) || 0;
      totalAmount += amt;

      if (tx.action === "add") totalAdded += amt;
      if (tx.action === "deduct") totalDeducted += amt;
      if (tx.action === "purchase") totalPurchased += amt;
    });

    res.json({
      totalTransactions: transactions.length,
      totalAmount: totalAmount.toFixed(2),
      totalAdded: totalAdded.toFixed(2),
      totalDeducted: totalDeducted.toFixed(2),
      totalPurchased: totalPurchased.toFixed(2),
      transactions
    });
  } catch (err) {
    console.error("Error fetching transactions:", err);
    res.status(500).json({ error: "Failed to fetch transactions" });
  }
});

router.post("/", async (req, res) => {
    try {
      const { amount, walletID, action } = req.body;
  
      const wallet = await Wallet.findOne({ walletID });
      if (!wallet) {
        return res.status(404).json({ error: "Wallet not found" });
      }
  
      let newBalance = wallet.balance;
  
      // Apply the transaction logic
      if (action === "add") {
        newBalance += amount;
      } else if (action === "deduct" || action === "purchase") {
        if (wallet.balance < amount) {
          return res.status(400).json({ error: "Insufficient balance" });
        }
        newBalance -= amount;
      }
  
      // Save updated wallet balance
      wallet.balance = newBalance;
      await wallet.save();
  
      // Create the transaction with balanceAfter
      const transaction = new Transaction({
        ...req.body,
        balanceAfter: newBalance,
      });
  
      await transaction.save();
      io().emit("new-transaction", transaction); // ✅ CORRECT ✅
      if (action === "purchase" || action === "add" || action === "deduct") {
        io().emit("transactionUpdated", {
          userId: transaction.userId,
          amount: transaction.amount,
          action: transaction.action,
          walletID: transaction.walletID,
        });
      }
      

      res.status(201).json(transaction);
    } catch (err) {
      res.status(400).json({ error: "Failed to save transaction", details: err.message });
    }
  
  });
  router.get("/total-wallet-balance", async (req, res) => {
    try {
      const wallets = await Wallet.find({});
      const totalWalletBalance = wallets.reduce((sum, w) => sum + (parseFloat(w.balance) || 0), 0);
      res.json({ totalWalletBalance: totalWalletBalance.toFixed(2) });
    } catch (err) {
      res.status(500).json({ error: "Failed to calculate total wallet balances" });
    }
  });
  
router.get("/user/:userId", async (req, res) => {
  try {
    const { userId } = req.params;
    console.log("🔍 Fetching wallet transactions for:", userId);

    // 1. Find user using `userId` field (e.g., "S02")
    const user = await User.findOne({ userId: userId });
    if (!user) {
      console.error("❌ User not found for userId:", userId);
      return res.status(404).json({ error: "User not found" });
    }

    // 2. Find wallet using user's _id (stored in Wallet.userID)
    const wallet = await Wallet.findOne({ userID: user._id });
    if (!wallet) {
      console.error("❌ Wallet not found for user _id:", user._id);
      return res.status(404).json({ error: "Wallet not found" });
    }

    // 3. Find all transactions for this wallet
    const transactions = await Transaction.find({ walletID: wallet.walletID }).sort({ timestamp: -1 });

    console.log(`✅ Found ${transactions.length} transactions for wallet ${wallet.walletID}`);
    res.json(transactions);
  } catch (err) {
    console.error("💥 Internal error fetching user transactions:", err);
    res.status(500).json({ error: "Failed to fetch transactions" });
  }
});

  
  
module.exports = router;
