import React, { useEffect, useState } from "react";
import "./AdminCourseList.css"; // Reuse your styling if it's glassy
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import { useContext } from "react";
import SocketContext from "../../contexts/SocketContext";


import DatePicker from "react-datepicker";
import "react-datepicker/dist/react-datepicker.css";




const AdminTransactions = () => {
  const socket = useContext(SocketContext);

  const [transactions, setTransactions] = useState([]);
  const [timeFilter, setTimeFilter] = useState("");
const [userIdInput, setUserIdInput] = useState("");
const [userSuggestions, setUserSuggestions] = useState([]);
const [customDate, setCustomDate] = useState("");
const [totalAmount, setTotalAmount] = useState(0);

const [totalAdded, setTotalAdded] = useState(0);
const [totalDeducted, setTotalDeducted] = useState(0);
const [totalPurchased, setTotalPurchased] = useState(0);
const [totalWalletBalance, setTotalWalletBalance] = useState(0);
const fetchTotalWalletBalance = async () => {
    try {
      const res = await fetch("http://localhost:5000/api/wallet/total"); 
      const data = await res.json();
      setTotalWalletBalance(data.totalBalance);
    } catch (err) {
      console.error("Failed to fetch wallet total balance", err);
    }
  };
  
  




const handleExportCSV = () => {
    const headers = [
        "Transaction ID", "User ID", "Merchant ID", "Merchant Name",
        "Items", "Amount", "Action", "Wallet ID", "Date", "Time"
      ];
      
  
    const rows = transactions.map(tx => [
        tx.transactionId,
        tx.userId,
        tx.merchantId,
        tx.merchantName,
        `"${tx.items.join(", ")}"`,  // wrap in quotes
        tx.amount,
        tx.action,
        tx.walletID,
        new Date(tx.timestamp).toLocaleDateString(),
        new Date(tx.timestamp).toLocaleTimeString()
      ]);
      
  
    const csvContent =
      "data:text/csv;charset=utf-8," +
      [headers, ...rows].map(e => e.join(",")).join("\n");
  
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", "transactions.csv");
    document.body.appendChild(link);
    link.click();
  };
  
  
  const handleExportPDF = () => {
    const doc = new jsPDF();
  
    doc.text("Transactions Report", 14, 16);
  
    autoTable(doc, {
      startY: 20,
      head: [[
        "Transaction ID", "User ID", "Merchant ID", "Merchant Name",
        "Items", "Amount", "Action", "Wallet ID", "Date", "Time"
      ]],
      body: transactions.map(tx => [
        tx.transactionId,
        tx.userId,
        tx.merchantId,
        tx.merchantName,
        tx.items.join(", "),
        `$${tx.amount}`,
        tx.action,
        tx.walletID,
        new Date(tx.timestamp).toLocaleDateString(),
        new Date(tx.timestamp).toLocaleTimeString(),
      ]),
    });
  
    doc.save("transactions.pdf");
  };
  
  
  
  const fetchTransactions = async () => {
    let url = "http://localhost:5000/api/transactions?";
  
    if (timeFilter) url += `timeframe=${timeFilter}&`;
    if (userIdInput) url += `userId=${userIdInput}&`;
    if (customDate) url += `date=${customDate}&`;
  
    try {
      const res = await fetch(url);
      const data = await res.json();
  
      if (!Array.isArray(data.transactions)) {
        console.error("Unexpected response format:", data);
        setTransactions([]);
        return;
      }
  
      setTransactions(data.transactions);
      setTotalAmount(data.totalAmount || 0);
      setTotalAdded(data.totalAdded || 0);
      setTotalDeducted(data.totalDeducted || 0);
      setTotalPurchased(data.totalPurchased || 0);
    } catch (err) {
      console.error("Failed to load filtered transactions", err);
      setTransactions([]);
    }
  };
  
  
  
  useEffect(() => {
    fetchTransactions();
    fetchTotalWalletBalance();
  }, [timeFilter, customDate, userIdInput]);

  
  
  useEffect(() => {
    if (!socket) return;
  
    const handleNewTransaction = (newTx) => {
      setTransactions((prev) => [newTx, ...prev]);
      setTotalAmount((prev) => {
        const newTotal = (parseFloat(prev) + parseFloat(newTx.amount)) || 0;
        return Math.round(newTotal * 100) / 100;
      });
      
  
      if (newTx.action === "add") {
        setTotalAdded((prev) => prev + newTx.amount);
      } else if (newTx.action === "deduct") {
        setTotalDeducted((prev) => prev + newTx.amount);
      } else if (newTx.action === "purchase") {
        setTotalPurchased((prev) => prev + newTx.amount);
      }
  
      fetchTotalWalletBalance(); // update total wallets
    };
  
    socket.on("new-transaction", handleNewTransaction);
  
    return () => {
      socket.off("new-transaction", handleNewTransaction);
    };
  }, [socket]);
  
  

  return (
    
    <div className="container mt-4">
        <div className="d-flex gap-3 mb-4 align-items-center flex-wrap">
        <select
  className="form-select"
  style={{ maxWidth: "180px" }}
  value={timeFilter}  // ✅ controlled by state
  onChange={(e) => setTimeFilter(e.target.value)}
>

    <option value="">All Time</option>
    <option value="today">Today</option>
    <option value="thisweek">This Week</option>
    <option value="thismonth">This Month</option>
  </select>

  <div className="position-relative" style={{ maxWidth: "300px" }}>
  <DatePicker
    selected={customDate ? new Date(customDate) : null}
    onChange={(date) => {
      const formatted = date.toISOString().split("T")[0];
      setCustomDate(formatted);
      fetchTransactions();
    }}
    className="form-control"
    placeholderText="Select date"
    dateFormat="yyyy-MM-dd"
  />
</div>

<div className="position-relative" style={{ maxWidth: "300px" }}>
  <input
    type="text"
    className="form-control"
    placeholder="Search by User ID"
    value={userIdInput}
    onChange={async (e) => {
      const val = e.target.value;
      setUserIdInput(val);

      if (val.length < 2) {
        setUserSuggestions([]);
        return;
      }

      const res = await fetch(`http://localhost:5000/api/users/search?query=${val}`);
      const data = await res.json();
      setUserSuggestions(data);
    }}
  />
  {userSuggestions.length > 0 && (
    <ul className="list-group position-absolute z-3 w-100" style={{ top: "100%" }}>
      {userSuggestions.map((s, i) => (
        <li
          key={i}
          className="list-group-item list-group-item-action"
          onClick={() => {
            setUserIdInput(s.userId);
            setUserSuggestions([]);
          }}
        >
          {s.fullName} ({s.userId})
        </li>
      ))}
    </ul>
  )}
</div>

  <button
  className="btn btn-outline-danger"
  onClick={() => {
    setTimeFilter("");
    setUserIdInput("");
    setUserSuggestions([]);
    setCustomDate("");
    fetchTransactions();
  }}
>
  ❌ Clear Filters
</button>


  <div className="d-flex flex-wrap gap-4 align-items-center">
  <h6 className="text-muted">🔢 Total Transactions: {transactions.length}</h6>
  <h6 className="text-muted">💰 Total Amount: ${totalAmount}</h6>
  <h6 className="text-success">➕ Total Added: ${totalAdded}</h6>
  <h6 className="text-danger">➖ Total Deducted: ${totalDeducted}</h6>
  <h6 className="text-primary">🛒 Total Purchased: ${totalPurchased}</h6>
  <h6 className="text-info">🏦 Total Wallet Balances: ${totalWalletBalance}</h6>

  

</div>








</div>


      <h4>All Transactions</h4>
      <table className="table table-bordered table-striped">
        <thead>
          <tr>
            <th>Transaction ID</th>
            <th>User ID</th>
            <th>Merchant ID</th>
            <th>Merchant Name</th>
            <th>Items</th>
            <th>Amount</th>
            <th>Action</th>
            <th>Wallet ID</th>
            <th>Date</th>
            <th>Time</th>
            <th>New Balance</th>

          </tr>
          
        </thead>
        
        
        <tbody>
          {transactions.map((tx, index) => (
            <tr key={index}>
              <td>{tx.transactionId}</td>
              <td>{tx.userId}</td>
              <td>{tx.merchantId}</td>
              <td>{tx.merchantName}</td>
              <td>{tx.items.join(", ")}</td>
              <td>${tx.amount}</td>
              <td>{tx.action}</td>
              <td>{tx.walletID}</td>
              <td>{new Date(tx.timestamp).toLocaleDateString()}</td>
<td>{new Date(tx.timestamp).toLocaleTimeString()}</td>
<td>${tx.balanceAfter || "N/A"}</td>





            </tr>
          ))}
        </tbody>
        
      </table>
      <div className="mt-3 d-flex gap-2">
  <button className="btn btn-outline-success" onClick={handleExportCSV}>Export as CSV</button>
  <button className="btn btn-outline-primary" onClick={handleExportPDF}>Export as PDF</button>
</div>

    </div>

    
  );
};

export default AdminTransactions;
