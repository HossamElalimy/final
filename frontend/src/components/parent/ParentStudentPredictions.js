import React, { useEffect, useState, useContext, useRef, useCallback } from "react";
import axios from "axios";
import ParentLayout from "./ParentLayout";
import StudentStatCard from "../student/StudentStatCard";
import { Bar, Doughnut } from "react-chartjs-2";
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  ArcElement,
  Tooltip,
  Legend,
} from "chart.js";
import SocketContext from "../../contexts/SocketContext";

ChartJS.register(CategoryScale, LinearScale, BarElement, ArcElement, Tooltip, Legend);

const ParentStudentPredictions = () => {
  const parent = JSON.parse(localStorage.getItem("user"));
  const [data, setData] = useState([]);
  const [selectedStudentId, setSelectedStudentId] = useState(null);

  const socket = useContext(SocketContext);
  const predictionCooldownRef = useRef(false);

  const fetchPredictions = useCallback(async () => {
    if (predictionCooldownRef.current) return;
    predictionCooldownRef.current = true;
  
    try {
      const res = await axios.get(`http://localhost:5000/api/ml/parent/${parent.userId}`);
      console.log("✅ Prediction data:", res.data);
      setData(res.data || []);
    } catch (err) {
      console.error("❌ Prediction fetch failed:", err);
    }
  
    setTimeout(() => {
      predictionCooldownRef.current = false;
    }, 5000);
  }, [parent.userId]);
  useEffect(() => {
    fetchPredictions();
  
    if (socket) {
      socket.on("attendance-update", fetchPredictions);
      socket.on("transaction-update", fetchPredictions);
      return () => {
        socket.off("attendance-update", fetchPredictions);
        socket.off("transaction-update", fetchPredictions);
      };
    }
  }, [socket, parent.userId, fetchPredictions]);
  
  // Automatically select student if only one exists
  useEffect(() => {
    if (data.length === 1 && !selectedStudentId) {
      setSelectedStudentId(data[0].studentId);
    }
  }, [data, selectedStudentId]);

  const formatCurrency = (value) => `EGP ${Number(value).toFixed(2)}`;

  const filteredData =
  data.length === 1 ? data :
  selectedStudentId ? data.filter((s) => s.studentId === selectedStudentId) :
  data;


  return (
    <ParentLayout>
      <div className="container-fluid mt-4">
        <h2 className="fw-bold mb-4">Student Behavior & Spending Forecast</h2>

        {data.length > 1 && (
          <div className="mb-4">
            <label className="form-label">Select Student:</label>
            <select
              className="form-select w-auto"
              value={selectedStudentId || ""}
              onChange={(e) => setSelectedStudentId(e.target.value)}
            >
              <option value="">All</option>
              {data.map((s) => (
                <option key={s.studentId} value={s.studentId}>
                  {s.studentId}
                </option>
              ))}
            </select>
          </div>
        )}

        {filteredData.length === 0 ? (
          <p>No prediction data available.</p>
        ) : (
          filteredData.map((s, i) => (
            <div key={i} className="mb-5">
              <h4 className="mb-3 text-primary">🧑‍🎓 {s.studentName} ({s.studentId})</h4>


              <div className="row g-3">
                <StudentStatCard
                  title="Attendance Forecast"
                  value={`${Math.round(s.attendanceProb * 100)}%`}
                  iconClass="fas fa-check-circle"
                  textColor="primary"
                />
                <StudentStatCard
                  title="Late Rate"
                  value={`${Math.round(s.lateProb * 100)}%`}
                  iconClass="fas fa-clock"
                  textColor="warning"
                />
                <StudentStatCard
                  title="Absence Rate"
                  value={`${Math.round(s.absenceProb * 100)}%`}
                  iconClass="fas fa-times-circle"
                  textColor="danger"
                />
                <StudentStatCard
                  title="Weekly Spending"
                  value={formatCurrency(s.predictedSpendingNextWeek)}
                  iconClass="fas fa-calendar-week"
                  textColor="info"
                />
                <StudentStatCard
                  title="Monthly Spending"
                  value={formatCurrency(s.predictedSpendingNextMonth)}
                  iconClass="fas fa-calendar-alt"
                  textColor="success"
                />
                <StudentStatCard
                  title="Spending Type"
                  value={["Essentials", "Mixed", "Luxuries"][s.spendingType]}
                  iconClass="fas fa-tags"
                  textColor="dark"
                />
                <StudentStatCard
                  title="Spending Category"
                  value={["Low", "Medium", "High"][s.spendingLabel]}
                  iconClass="fas fa-chart-pie"
                  textColor="secondary"
                />
              </div>

              <div className="row mt-4">
                <div className="col-md-6">
                  <div className="card p-3">
                    <h6 className="mb-3">Attendance Breakdown</h6>
                    <Doughnut
                      data={{
                        labels: ["Attendance", "Late", "Absent"],
                        datasets: [
                          {
                            data: [
                              Math.round(s.attendanceProb * 100),
                              Math.round(s.lateProb * 100),
                              Math.round(s.absenceProb * 100),
                            ],
                            backgroundColor: ["#4e73df", "#f6c23e", "#e74a3b"],
                          },
                        ],
                      }}
                    />
                  </div>
                </div>
                <div className="col-md-6">
                  <div className="card p-3">
                    <h6 className="mb-3">Spending Forecast</h6>
                    <Bar
                      data={{
                        labels: ["Weekly", "Monthly"],
                        datasets: [
                          {
                            label: "Spending (EGP)",
                            data: [s.predictedSpendingNextWeek, s.predictedSpendingNextMonth],
                            backgroundColor: ["#36b9cc", "#1cc88a"],
                          },
                        ],
                      }}
                    />
                  </div>
                </div>
              </div>
            </div>
          ))
        )}
      </div>
    </ParentLayout>
  );
};

export default ParentStudentPredictions;
