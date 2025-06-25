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

router.post("/purchase", async (req, res) => {
  const { studentUserId, merchantUserId, itemName, quantity } = req.body;

  try {
    const student = await User.findOne({ userId: studentUserId });
    if (!student) return res.status(404).json({ error: "Student not found" });

    const studentWallet = await Wallet.findOne({ userID: student._id });
    if (!studentWallet) return res.status(400).json({ error: "Student wallet not found" });

    const merchant = await User.findOne({ userId: merchantUserId, role: "merchant" });
    if (!merchant) return res.status(404).json({ error: "Merchant not found" });

    const item = merchant.items.find(i => i.name === itemName);
    if (!item) return res.status(404).json({ error: "Item not found" });

    if (item.quantity < quantity) {
      return res.status(400).json({ error: "Insufficient item quantity" });
    }

    const totalPrice = item.sellingPrice * quantity;

    if (studentWallet.balance < totalPrice) {
      return res.status(400).json({ error: "Insufficient wallet balance" });
    }

    studentWallet.balance -= totalPrice;
    await studentWallet.save();
    const { v4: uuidv4 } = require('uuid'); // Import UUID for unique IDs
    // Add the purchase transaction with all required merchant details:
    const purchaseTx = new Transaction({
      transactionId: uuidv4(),         // generate a unique transaction ID
      userId: studentUserId,
      walletID: studentWallet.walletID || studentWallet._id, // correct wallet id
      amount: totalPrice,
      action: "purchase",
      items: Array(quantity).fill(item.name),
      merchantId: merchant.userId,
      merchantName: merchant.merchantName,
      merchantType: merchant.merchantType,
      balanceAfter: studentWallet.balance,  // updated balance after deduction
      timestamp: new Date()
    });
    await purchaseTx.save();

    const merchantWallet = await Wallet.findOne({ userID: merchant._id });
    if (!merchantWallet) return res.status(400).json({ error: "Merchant wallet not found" });
    merchantWallet.balance += totalPrice;
    await merchantWallet.save();

    item.quantity -= quantity;
    merchant.markModified('items');
    await merchant.save();

    res.json({ message: "Purchase successful", studentBalance: studentWallet.balance, merchantBalance: merchantWallet.balance });
  } catch (error) {
    console.error("Purchase error:", error);
    res.status(500).json({ error: "Server error during purchase" });
  }
});

router.get("/merchant/:merchantUserId", async (req, res) => {
  try {
    const { merchantUserId } = req.params;

    // Find transactions where merchantId matches merchantUserId
    const transactions = await Transaction.find({
      merchantId: merchantUserId,
      action: "purchase"  // Only purchase actions
    }).sort({ timestamp: -1 });

    res.json(transactions);
  } catch (error) {
    console.error("Error fetching merchant transactions:", error);
    res.status(500).json({ error: "Server error" });
  }
});
// 1. Sales By Item (returns object: { itemName: quantitySold })
router.get("/merchants/sales-by-item/:merchantId", async (req, res) => {
  try {
    const { merchantId } = req.params;

    const purchases = await Transaction.find({ merchantId, action: "purchase" });

    const salesByItem = {};
    purchases.forEach(tx => {
      if (Array.isArray(tx.items)) {
        tx.items.forEach(item => {
          salesByItem[item] = (salesByItem[item] || 0) + 1;
        });
      }
    });

    res.json(salesByItem);
  } catch (error) {
    console.error("Error in sales-by-item:", error);
    res.status(500).json({ error: "Server error" });
  }
});

// 2. Revenue Breakdown By Item (returns object: { itemName: revenueAmount })
router.get("/merchants/revenue-by-item/:merchantId", async (req, res) => {
  try {
    const { merchantId } = req.params;

    const purchases = await Transaction.find({ merchantId, action: "purchase" });

    const revenueByItem = {};
    purchases.forEach(tx => {
      if (Array.isArray(tx.items) && tx.items.length > 0) {
        const pricePerItem = tx.amount / tx.items.length;
        tx.items.forEach(item => {
          revenueByItem[item] = (revenueByItem[item] || 0) + pricePerItem;
        });
      }
    });

    res.json(revenueByItem);
  } catch (error) {
    console.error("Error in revenue-by-item:", error);
    res.status(500).json({ error: "Server error" });
  }
});

// 3. Sales Over Time (returns object: { "YYYY-MM-DD": quantitySold })
router.get("/merchants/sales-over-time/:merchantId", async (req, res) => {
  try {
    const { merchantId } = req.params;

    const purchases = await Transaction.find({ merchantId, action: "purchase" });

    const salesOverTime = {};
    purchases.forEach(tx => {
      const dateKey = tx.timestamp.toISOString().slice(0, 10);
      salesOverTime[dateKey] = (salesOverTime[dateKey] || 0) + (tx.items?.length || 0);
    });

    res.json(salesOverTime);
  } catch (error) {
    console.error("Error in sales-over-time:", error);
    res.status(500).json({ error: "Server error" });
  }
});

// 4. Transaction Types Count (returns object: { add: count, deduct: count, purchase: count })
router.get("/merchants/transaction-types/:merchantId", async (req, res) => {
  try {
    const { merchantId } = req.params;

    const transactions = await Transaction.find({ merchantId });

    const transactionTypes = {};
    transactions.forEach(tx => {
      transactionTypes[tx.action] = (transactionTypes[tx.action] || 0) + 1;
    });

    res.json(transactionTypes);
  } catch (error) {
    console.error("Error in transaction-types:", error);
    res.status(500).json({ error: "Server error" });
  }
});

module.exports = router;
