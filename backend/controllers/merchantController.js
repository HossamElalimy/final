const Wallet = require("../models/Wallet");
const Transaction = require("../models/Transaction");
const User = require("../models/User");

exports.getMerchantSummary = async (req, res) => {
  try {
    const { userId } = req.params;

    // 1. Find merchant
    const merchant = await User.findOne({ userId });
    if (!merchant || merchant.role !== "merchant") {
      return res.status(404).json({ message: "Merchant not found" });
    }

    // 2. Wallet by merchant._id
    const wallet = await Wallet.findOne({ userID: merchant._id });
    const walletBalance = wallet?.balance || 0;

    // 3. Items info
    const items = merchant.items || [];
    const totalItems = items.length;
    const totalCost = items.reduce((sum, item) => sum + (item.costPrice || 0), 0);
    const totalRevenue = items.reduce((sum, item) => sum + (item.sellingPrice || 0), 0);
    const totalProfit = totalRevenue - totalCost;

    // 4. Transactions where merchantId matches and action = "purchase"
    const tx = await Transaction.find({
      type: "purchase",
      merchantId: merchant.userId
    });

    const totalItemsSold = tx.reduce((sum, t) => {
      return sum + (Array.isArray(t.items) ? t.items.reduce((s, i) => s + (i.quantity || 1), 0) : 0);
    }, 0);

    res.json({
        summary: {
          walletBalance,
          totalItems,
          totalCost,
          totalRevenue,
          totalProfit,
          totalItemsSold
        }
      });

  } catch (err) {
    console.error("❌ Error in merchant summary:", err.message);
    res.status(500).json({ error: "Failed to load merchant summary" });
  }
};
