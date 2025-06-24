import React, { useEffect, useState } from "react";
import axios from "axios";
import { Doughnut, Bar, Line } from "react-chartjs-2";
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  ArcElement,
  BarElement,
  PointElement,
  LineElement,
  Tooltip,
  Legend
} from "chart.js";

ChartJS.register(
  CategoryScale,
  LinearScale,
  ArcElement,
  BarElement,
  PointElement,
  LineElement,
  Tooltip,
  Legend
);

const TeacherCharts = ({ teacherId, selectedCourseCode }) => {
  const [chartData, setChartData] = useState(null);

  useEffect(() => {
    const fetchChartData = async () => {
      try {
        const query = selectedCourseCode ? `?courseCode=${selectedCourseCode}` : "";
        const res = await axios.get(`http://localhost:5000/api/teacher/analytics/${teacherId}${query}`);
        setChartData(res.data);
      } catch (err) {
        console.error("Failed to load chart data:", err);
      }
    };
    fetchChartData();
  }, [teacherId, selectedCourseCode]);

  if (!chartData) return <p className="text-center mt-4">📊 Loading charts...</p>;

  const safeArray = (arr) => Array.isArray(arr) ? arr : [];

  return (
    <div className="teacher-charts-container">
      <div className="row g-4">
        {/* Doughnut: Overall Breakdown */}
        <div className="col-md-6">
          <div className="chart-card p-3 shadow-sm rounded bg-white">
            <h6 className="text-center mb-3">Overall Attendance Breakdown</h6>
            <div className="chart-wrapper">
              <Doughnut
                data={{
                  labels: ["Attended", "Late", "Absent"],
                  datasets: [{
                    data: chartData.totalCounts || [0, 0, 0],
                    backgroundColor: ["#28a745", "#ffc107", "#dc3545"]
                  }]
                }}
                options={{ maintainAspectRatio: false }}
              />
            </div>
          </div>
        </div>

   {/* Most Missed Days */}
<div className="col-md-6">
  <div className="chart-card p-3 shadow-sm rounded bg-white">
    <h6 className="text-center mb-3">Top Days with Most Absentees</h6>
    <div className="chart-wrapper">
      <Bar
        data={{
          labels: chartData.missedDays.map(d => d.date),
          datasets: [{
            label: "Absent Count",
            data: chartData.missedDays.map(d => d.count),
            backgroundColor: "#dc3545"
          }]
        }}
        options={{
          indexAxis: "y",
          maintainAspectRatio: false,
          plugins: { legend: { display: false } }
        }}
      />
    </div>
  </div>
</div>
{/* Late Attendance Trend */}
<div className="col-md-6">
  <div className="chart-card p-3 shadow-sm rounded bg-white">
    <h6 className="text-center mb-3">Late Attendance Trend</h6>
    <div className="chart-wrapper">
      <Line
        data={{
          labels: chartData.lateTrend.map(d => d.date),
          datasets: [{
            label: "Late",
            data: chartData.lateTrend.map(d => d.count),
            borderColor: "#ffc107",
            fill: false
          }]
        }}
        options={{ maintainAspectRatio: false }}
      />
    </div>
  </div>
</div>


        {/* Horizontal Bar: Attendance by Course */}
        <div className="col-md-6">
          <div className="chart-card p-3 shadow-sm rounded bg-white">
            <h6 className="text-center mb-3">Attendance by Course</h6>
            <div className="chart-wrapper">
              <Bar
                data={{
                  labels: safeArray(chartData.courses).map(c => c.courseCode),
                  datasets: [{
                    label: "Attendance %",
                    data: safeArray(chartData.courses).map(c => c.attendanceRate),
                    backgroundColor: "#17a2b8"
                  }]
                }}
                options={{
                  indexAxis: "y",
                  maintainAspectRatio: false,
                  plugins: { legend: { display: false } }
                }}
              />
            </div>
          </div>
        </div>

        {/* Line Chart: Attendance Over Time */}
        <div className="col-md-6">
          <div className="chart-card p-3 shadow-sm rounded bg-white">
            <h6 className="text-center mb-3">Attendance Over Time</h6>
            <div className="chart-wrapper">
              <Line
                data={{
                  labels: safeArray(chartData.byDate).map(d => d.date),
                  datasets: [{
                    label: "Attended",
                    data: safeArray(chartData.byDate).map(d => d.attended),
                    borderColor: "#28a745",
                    fill: false
                  }]
                }}
                options={{ maintainAspectRatio: false }}
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default TeacherCharts;
