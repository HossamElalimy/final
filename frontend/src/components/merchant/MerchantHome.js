import React, { useEffect, useState, useContext } from "react";
import axios from "axios";
import StudentStatCard from "../student/StudentStatCard";
import SocketContext from "../../contexts/SocketContext";
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  PointElement,
  LineElement,
  ArcElement,
  Tooltip,
  Legend,
} from "chart.js";
import { Bar, Doughnut, Line } from "react-chartjs-2";
import { merchantMenu } from "./merchantMenu";

ChartJS.register(
  CategoryScale,
  LinearScale,
  BarElement,
  PointElement,
  LineElement,
  ArcElement,
  Tooltip,
  Legend
);

const MerchantHome = () => {
  const socket = useContext(SocketContext);
  const user = JSON.parse(localStorage.getItem("user"));

  const [summary, setSummary] = useState(null);
  const [salesByItem, setSalesByItem] = useState({});
  const [revenueByItem, setRevenueByItem] = useState({});
  const [salesOverTime, setSalesOverTime] = useState({});
  const [transactionTypes, setTransactionTypes] = useState({});

  const fetchSummary = async () => {
    if (!user || !user.userId || !user.userId.startsWith("M")) return;
    try {
      const res = await axios.get(
        `http://localhost:5000/api/merchants/summary/${user.userId}`
      );
      setSummary(res.data);
    } catch (err) {
      console.error("Error fetching merchant summary:", err);
      setSummary("error");
    }
  };

  const fetchChartsData = async () => {
    try {
      const [salesRes, revenueRes, salesTimeRes, txTypesRes] = await Promise.all([
        axios.get(`http://localhost:5000/api/transactions/merchants/sales-by-item/${user.userId}`),
        axios.get(`http://localhost:5000/api/transactions/merchants/revenue-by-item/${user.userId}`),
        axios.get(`http://localhost:5000/api/transactions/merchants/sales-over-time/${user.userId}`),
        axios.get(`http://localhost:5000/api/transactions/merchants/transaction-types/${user.userId}`),
      ]);

      console.log("Sales by Item:", salesRes.data);
      console.log("Revenue by Item:", revenueRes.data);
      console.log("Sales Over Time:", salesTimeRes.data);
      console.log("Transaction Types:", txTypesRes.data);

      setSalesByItem(salesRes.data);
      setRevenueByItem(revenueRes.data);
      setSalesOverTime(salesTimeRes.data);
      setTransactionTypes(txTypesRes.data);
    } catch (err) {
      console.error("Error fetching chart data:", err);
    }
  };

  useEffect(() => {
    fetchSummary();
    fetchChartsData();

    const interval = setInterval(() => {
      fetchSummary();
      fetchChartsData();
    }, 15000);

    return () => clearInterval(interval);
  }, []);

  if (summary === "error")
    return <p className="text-danger text-center mt-5">Failed to load merchant data.</p>;
  if (summary === null)
    return <p className="text-center text-muted mt-5">Loading...</p>;

  // Chart data objects
  const salesData = {
    labels: Object.keys(salesByItem),
    datasets: [
      {
        label: "Items Sold",
        data: Object.values(salesByItem),
        backgroundColor: "rgba(54, 162, 235, 0.6)",
      },
    ],
  };

  const revenueData = {
    labels: Object.keys(revenueByItem),
    datasets: [
      {
        label: "Revenue by Item (EGP)",
        data: Object.values(revenueByItem),
        backgroundColor: [
          "#FF6384",
          "#36A2EB",
          "#FFCE56",
          "#4BC0C0",
          "#9966FF",
          "#FF9F40",
        ],
      },
    ],
  };

  const salesOverTimeData = {
    labels: Object.keys(salesOverTime),
    datasets: [
      {
        label: "Sales Over Time",
        data: Object.values(salesOverTime),
        fill: false,
        borderColor: "rgba(75,192,192,1)",
        tension: 0.1,
      },
    ],
  };

  const transactionTypesData = {
    labels: Object.keys(transactionTypes),
    datasets: [
      {
        label: "Transaction Volume",
        data: Object.values(transactionTypes),
        backgroundColor: ["#36A2EB", "#FF6384", "#FFCE56"],
      },
    ],
  };

  return (
    <div className="container-fluid">
      <h4 className="mb-4 text-gray-800">Merchant Dashboard</h4>

      <div className="row g-3 mb-4">
        <StudentStatCard title="Wallet Balance" value={`EGP ${summary.walletBalance.toFixed(2)}`} iconClass="fas fa-wallet" textColor="primary" />
        <StudentStatCard title="Merchant Type" value={user.merchantType || "N/A"} iconClass="fas fa-store" textColor="info" />
        <StudentStatCard title="Total Items" value={summary.totalItems} iconClass="fas fa-boxes" textColor="primary" />
        <StudentStatCard title="Items Sold" value={summary.totalItemsSold} iconClass="fas fa-shopping-cart" textColor="success" />
        <StudentStatCard title="Revenue" value={`EGP ${summary.totalRevenue}`} iconClass="fas fa-coins" textColor="success" />
        <StudentStatCard title="Cost" value={`EGP ${summary.totalCost}`} iconClass="fas fa-dollar-sign" textColor="warning" />
        <StudentStatCard title="Profit" value={`EGP ${summary.totalProfit}`} iconClass="fas fa-chart-line" textColor="danger" />
        <StudentStatCard title="Total Added" value={`EGP ${summary.addedAmount || 0}`} iconClass="fas fa-plus-circle" textColor="success" />
        <StudentStatCard title="Total Deducted" value={`EGP ${summary.deductedAmount || 0}`} iconClass="fas fa-minus-circle" textColor="danger" />
      </div>

      <div className="row g-4">
  <div className="col-md-6 col-lg-6 mb-4">
    <div style={{ height: 350 }}>
      <Bar data={salesData} options={{ maintainAspectRatio: false }} />
    </div>
  </div>

  <div className="col-md-6 col-lg-6 mb-4">
    <div style={{ height: 350 }}>
      <Doughnut data={revenueData} options={{ maintainAspectRatio: false }} />
    </div>
  </div>
</div>

<div className="row g-4">
  <div className="col-md-6 col-lg-6 mb-4">
    <div style={{ height: 350 }}>
      <Line data={salesOverTimeData} options={{ maintainAspectRatio: false }} />
    </div>
  </div>

  <div className="col-md-6 col-lg-6 mb-4">
    <div style={{ height: 350 }}>
      <Bar data={transactionTypesData} options={{ maintainAspectRatio: false }} />
    </div>
  </div>
</div>

    </div>
  );
};

export default MerchantHome;
