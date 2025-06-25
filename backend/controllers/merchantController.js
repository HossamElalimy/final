const User = require("../models/User");
const Wallet = require("../models/Wallet");
const Transaction = require("../models/Transaction");

const getMerchantSummary = async (req, res) => {
  try {
    const { userId } = req.params;

    const merchant = await User.findOne({ userId });
    if (!merchant) return res.status(404).json({ error: "Merchant not found" });

    // Fetch wallet balance by userID ref
    let walletBalance = 0;
    const wallet = await Wallet.findOne({ userID: merchant._id });
    if (wallet) {
      walletBalance = wallet.balance || 0;
    }

    const totalItems = merchant.items?.length || 0;

    // Calculate total items sold from transactions for this merchant
    
    const purchaseTransactions = await Transaction.find({ merchantId: merchant.userId, action: "purchase" });

    // Sum total quantity of all purchased items for this merchant
    let totalItemsSold = 0;
    purchaseTransactions.forEach(tx => {
      if (Array.isArray(tx.items)) {
        totalItemsSold += tx.items.length;  // count items purchased (assuming each item in array counts as 1 quantity)
      }
    });

    // Calculate total revenue and total cost
    let totalRevenue = 0;
    let totalCost = 0;

    for (const tx of purchaseTransactions) {
      totalRevenue += tx.amount;

      if (Array.isArray(tx.items)) {
        tx.items.forEach(itemName => {
          const found = merchant.items.find(i => i.name === itemName);
          if (found) totalCost += found.costPrice || 0;
        });
      }
    }

    // Calculate total added and deducted amounts for this merchant userId
    const allTransactions = await Transaction.find({ userId: merchant.userId });


    let addedAmount = 0;
    let deductedAmount = 0;

    for (const tx of allTransactions) {
      if (tx.action === "add") addedAmount += tx.amount;
      if (tx.action === "deduct") deductedAmount += tx.amount;
    }

    const profit = totalRevenue - totalCost;

    res.json({
      walletBalance,
      totalItems,
      totalItemsSold,
      totalRevenue,
      totalCost,
      totalProfit: profit,
      addedAmount,
      deductedAmount
    });
  } catch (err) {
    console.error("❌ Error in merchant summary:", err.message);
    res.status(500).json({ error: "Server error" });
  }
};

module.exports = { getMerchantSummary };
