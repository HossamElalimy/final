import React, { useEffect, useState } from "react";
import axios from "axios";

const ParentStudentPredictions = () => {
  const [data, setData] = useState(null);
  const [students, setStudents] = useState([]);
  const [selectedStudent, setSelectedStudent] = useState("");

  const user = JSON.parse(localStorage.getItem("user"));

  useEffect(() => {
    const fetchLinkedStudents = async () => {
      try {
        const res = await axios.get(`http://localhost:5000/api/parent/linkedStudents/${user.userId}`);
        setStudents(res.data);

        if (res.data.length > 0) {
          const firstStudentId = res.data[0].userId;
          setSelectedStudent(firstStudentId);
          fetchPredictions(firstStudentId);
        }
      } catch (err) {
        console.error("❌ Error fetching students", err);
      }
    };

    const fetchPredictions = async (studentId) => {
      try {
        const res = await axios.get(`http://localhost:5001/api/predict/future/${studentId}`);
        setData(res.data);
      } catch (err) {
        console.error("❌ Error fetching predictions", err);
        alert("Error fetching predictions.");
      }
    };

    fetchLinkedStudents();
  }, [user.userId]);

  return (
    <div className="container mt-4">
      <h2>📊 Student Behavior Forecast</h2>

      {data && (
        <div className="card mt-4 p-3">
          <h5>{data.studentName}</h5>
          <p><b>Attendance Forecast:</b> {data.predictedAttendanceRateNextWeek * 100}%</p>
          <p><b>Spending Forecast:</b> ${data.predictedSpendingNextWeek}</p>
          <p><b>Advice:</b> {data.personalAdvice}</p>
          <p><b>Budget Tip:</b> {data.budgetingTip}</p>
        </div>
      )}
    </div>
  );
};

export default ParentStudentPredictions;
