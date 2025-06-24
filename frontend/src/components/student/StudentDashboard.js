import React, { useEffect, useState } from "react";
import axios from "axios";

const StudentDashboard = () => {
  const [studentData, setStudentData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Assume you save logged-in user info in localStorage as 'user'
  const user = JSON.parse(localStorage.getItem("user"));

  useEffect(() => {
    if (!user) return;

    const fetchStudentData = async () => {
      try {
        setLoading(true);
        // Assuming your backend has a route to get user data by ID
        const res = await axios.get(`http://localhost:5000/api/users/${user._id}`);
        setStudentData(res.data);
      } catch (err) {
        setError("Failed to load student data.");
      } finally {
        setLoading(false);
      }
    };

    fetchStudentData();
    
  }, [user]);

  if (loading) return <p>Loading your dashboard...</p>;
  if (error) return <p>{error}</p>;

  return (
    <div className="container mt-4">
      <h2>Welcome, {studentData.fullName} ({studentData.userId})</h2>
      <p>Faculty: {studentData.faculty}</p>
      <p>Year of Study: {studentData.year}</p>
      {/* Add more student-specific info here */}
      <p>Student panel coming soon 🧑‍🎓</p>
    </div>
  );
};

export default StudentDashboard;
