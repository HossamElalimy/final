import React, { useEffect, useState, useContext } from "react";
import axios from "axios";
import StudentStatCard from "../student/StudentStatCard";
import SocketContext from "../../contexts/SocketContext"; // if you want real-time updates (optional)


const MerchantHome = () => {
    const merchant = JSON.parse(localStorage.getItem("user"));
    const socket = useContext(SocketContext);
    const [summary, setSummary] = useState(null);
  
    const fetchSummary = async () => {
      try {
        const res = await axios.get(`http://localhost:5000/api/merchants/summary/${merchant.userId}`);
        setSummary(res.data.summary || {});

      } catch (err) {
        console.error("❌ Error fetching merchant summary:", err);
      }
    };
  
    useEffect(() => {
      fetchSummary();
  
      if (!socket) return;
  
      socket.on("walletUpdated", fetchSummary);
      socket.on("transactionUpdated", fetchSummary);
  
      return () => {
        socket.off("walletUpdated", fetchSummary);
        socket.off("transactionUpdated", fetchSummary);
      };
    }, [socket]);
  
    if (!summary) return <div className="text-center mt-4">Loading...</div>;
  
    return (
      <div className="container-fluid py-4">
        <h3 className="mb-4 fw-bold text-primary">Welcome, {merchant.fullName}</h3>
        <div className="row g-4">
          <StudentStatCard title="Wallet Balance" value={`EGP ${summary.walletBalance.toFixed(2)}`} iconClass="fas fa-wallet" textColor="dark" />
          <StudentStatCard title="Merchant Type" value={merchant.merchantType} iconClass="fas fa-store" textColor="info" />
          
          <StudentStatCard title="Total Items" value={summary.totalItems} iconClass="fas fa-boxes" textColor="primary" />
          <StudentStatCard title="Items Sold" value={summary.totalItemsSold} iconClass="fas fa-shopping-cart" textColor="info" />
          <StudentStatCard title="Revenue" value={`EGP ${summary.totalRevenue}`} iconClass="fas fa-coins" textColor="success" />
          <StudentStatCard title="Cost" value={`EGP ${summary.totalCost}`} iconClass="fas fa-dollar-sign" textColor="warning" />
          <StudentStatCard title="Profit" value={`EGP ${summary.totalProfit}`} iconClass="fas fa-chart-line" textColor="danger" />
        </div>
      </div>
    );
  };
  
  export default MerchantHome;