import React, { useEffect, useState, useContext } from "react";
import axios from "axios";
import { Bar, Doughnut } from "react-chartjs-2";
import {
  Chart as ChartJS, ArcElement, Tooltip, Legend, CategoryScale,
  LinearScale, BarElement
} from "chart.js";
import DatePicker from "react-datepicker";
import "react-datepicker/dist/react-datepicker.css";
import SocketContext from "../../contexts/SocketContext";

ChartJS.register(ArcElement, Tooltip, Legend, CategoryScale, LinearScale, BarElement);

const StudentCharts = ({ studentId: propStudentId }) => {

  const [itemSpending, setItemSpending] = useState({});
  const [itemFilter, setItemFilter] = useState("all");
  const [selectedItemDate, setSelectedItemDate] = useState(new Date());
  

  const user = JSON.parse(localStorage.getItem("user"));
  const studentId = propStudentId || user?.userId;
  
  const socket = useContext(SocketContext);

  const [data, setData] = useState(null);
  const [spending, setSpending] = useState(null);
  const [view, setView] = useState("byMonth");
  const [customDate, setCustomDate] = useState(null);

  const [spendingData, setSpendingData] = useState([]);
  const [categoryData, setCategoryData] = useState([]);

  const fetchData = async () => {
    const res = await axios.get(`http://localhost:5000/api/studentanalytics/spending/${studentId}?mode=all`);
    setSpendingData(res.data.spendingOverTime);
    setCategoryData(res.data.spendingByCategory);
  };

  useEffect(() => {
    if (studentId) fetchData();
  }, [studentId]);

  const fetchAnalytics = async () => {
    if (!user?.userId) return;
    const [summary, spend] = await Promise.all([
      axios.get(`http://localhost:5000/api/studentanalytics/${studentId}`),
      axios.get(`http://localhost:5000/api/studentanalytics/spending/${studentId}`)
    ]);
    
    setData(summary.data);
    setSpending(spend.data);
  };

  const getCustomSpending = () => {
    if (!customDate || !spending?.byDay) return {};
    const iso = customDate.toISOString().split("T")[0];
    return { [iso]: spending.byDay?.[iso] || 0 };
  };

  useEffect(() => {
    fetchAnalytics();
    if (!socket) return;

    socket.on("new-transaction", (tx) => {
      if (tx.userId === studentId)
        {
        console.log("📢 Real-time transaction detected. Updating charts...");
        fetchAnalytics();
      }
    });

    return () => socket.off("new-transaction");
  }, [socket]);

  useEffect(() => {
    const fetchItemSpending = async () => {
      if (!user?.userId) return;
  
      let url = `http://localhost:5000/api/studentanalytics/spending/${studentId}`;

      const d = new Date(selectedItemDate);
  
      if (itemFilter === "day") {
        url += `?day=${d.toISOString().split("T")[0]}`;
      } else if (itemFilter === "month") {
        url += `?month=${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
      } else if (itemFilter === "year") {
        url += `?year=${d.getFullYear()}`;
      } else if (itemFilter === "today") {
        url += `?mode=today`;
      }
      // No param if 'all' → full history
      
  
      try {
        const res = await axios.get(url);
        setItemSpending(res.data.byItem);
      } catch (err) {
        console.error("❌ Failed to load item spending:", err.message);
      }
    };
  
    fetchItemSpending();
  }, [itemFilter, selectedItemDate]);
  
  if (!data || !spending) return <p className="text-center text-muted mt-3">Loading analytics...</p>;

  const chartData = view === "custom" ? getCustomSpending() : spending[view];
  const labels = Object.keys(chartData);
  const values = Object.values(chartData);

  return (
    <div className="row">
      {/* Dropdown View Selector */}
      <div className="col-md-12 mb-3 d-flex align-items-center gap-3">
        <select className="form-select w-auto" value={view} onChange={e => setView(e.target.value)}>
          <option value="byDay">Spending by Day</option>
          <option value="byMonth">Spending by Month</option>
          <option value="byYear">Spending by Year</option>
          <option value="custom">Custom Date</option>
        </select>

        {view === "custom" && (
          <DatePicker
            selected={customDate}
            onChange={date => setCustomDate(date)}
            className="form-control"
            maxDate={new Date()}
            placeholderText="Select Date"
            dateFormat="yyyy-MM-dd"
          />
        )}
      </div>

      {/* Combined Spending View */}
      <div className="col-md-8 mb-4">
        <div className="card shadow">
          <div className="card-body">
            <h5 className="card-title">
              Spending ({view === "custom" ? "Selected Date" : view.replace("by", "")})
            </h5>
            <Bar data={{
              labels,
              datasets: [{
                label: "EGP",
                data: values,
                backgroundColor: "#4e73df"
              }]
            }} options={{ responsive: true }} />
          </div>
        </div>
      </div>

      {/* Category Purchases */}
      <div className="col-md-4 mb-4">
        <div className="card shadow">
          <div className="card-body">
          <div className="d-flex justify-content-between align-items-center mb-3">
  <h5 className="card-title mb-0">Spending by Item</h5>
  <div className="d-flex align-items-center gap-2">
  <select className="form-select form-select-sm" value={itemFilter} onChange={(e) => setItemFilter(e.target.value)}>
  <option value="day">Day</option>
  <option value="month">Month</option>
  <option value="year">Year</option>
  <option value="today">Today</option>
  <option value="all">All Time</option>
</select>

    <DatePicker
      selected={selectedItemDate}
      onChange={(date) => setSelectedItemDate(date)}
      dateFormat={
        itemFilter === "year"
          ? "yyyy"
          : itemFilter === "month"
          ? "MM/yyyy"
          : "yyyy-MM-dd"
      }
      showMonthYearPicker={itemFilter === "month"}
      showYearPicker={itemFilter === "year"}
      className="form-control form-control-sm"
    />
  </div>
</div>

<Doughnut data={{
  labels: Object.keys(itemSpending),
  datasets: [{
    data: Object.values(itemSpending),
    backgroundColor: ["#1cc88a", "#e74a3b", "#36b9cc", "#f6c23e", "#4e73df"]
  }]
}} options={{
  responsive: true,
  plugins: { legend: { position: "bottom" } }
}} />

          </div>
        </div>
      </div>
    </div>
  );
};

export default StudentCharts;
