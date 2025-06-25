import React, { useEffect, useState, useContext } from "react";
import axios from "axios";
import SocketContext from "../../contexts/SocketContext";


const MerchantTransactions = ({ merchantUserId }) => {
  const [transactions, setTransactions] = useState([]);
  const socket = useContext(SocketContext);

  const fetchTransactions = async () => {
    try {
      const res = await axios.get(`http://localhost:5000/api/transactions/merchant/${merchantUserId}`);
      setTransactions(res.data || []);
    } catch (err) {
      console.error("Failed to fetch transactions:", err);
    }
  };

  useEffect(() => {
    console.log("merchantUserId:", merchantUserId);
    fetchTransactions();
    console.log("Transactions loaded:", transactions);
    if (socket) {
      socket.on("transactionUpdated", (data) => {
        if (data.userId === merchantUserId || data.merchantId === merchantUserId) {
          fetchTransactions();
        }
      });
    }

    return () => {
      if (socket) socket.off("transactionUpdated");
    };
  }, [merchantUserId, socket]);

  return (
    <div className="merchant-transactions container-fluid p-3">
      <h4 className="mb-3">All Purchases</h4>
      <div className="table-responsive" style={{ maxHeight: "400px", overflowY: "auto" }}>
        <table className="table table-striped table-hover">
          <thead className="table-light">
            <tr>
              <th>Transaction ID</th>
              <th>Day</th>
              <th>Date</th>
              <th>Wallet ID</th>
              <th>Items</th>
              <th>Amount (EGP)</th>
            </tr>
          </thead>
          <tbody>
            {transactions.length === 0 ? (
              <tr>
                <td colSpan={6} className="text-center">No transactions found.</td>
              </tr>
            ) : (
              transactions.map((tx) => {
                const dateObj = new Date(tx.timestamp);
                const dayName = dateObj.toLocaleDateString("en-US", { weekday: "long" });
                const dateStr = dateObj.toLocaleDateString();

                return (
                  <tr key={tx._id}>
                    <td>{tx.transactionId}</td>
                    <td>{dayName}</td>
                    <td>{dateStr}</td>
                    <td>{tx.walletID}</td>
                    <td>{tx.items.join(", ")}</td>
                    <td>{tx.amount.toFixed(2)}</td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default MerchantTransactions;
