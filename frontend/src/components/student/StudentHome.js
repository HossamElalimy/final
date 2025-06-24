import React, { useEffect, useState, useContext } from "react";
import axios from "axios";
import StudentStatCard from "./StudentStatCard";
import SocketContext from "../../contexts/SocketContext"; // ✅ Make sure you use context
import StudentCharts from "./StudentCharts";



const StudentHome = () => {
  const [summary, setSummary] = useState(null);
  const [timingToday, setTimingToday] = useState([]);
const [ongoingLectures, setOngoingLectures] = useState(0);
const [upcomingToday, setUpcomingToday] = useState(0);
const [spendingMode, setSpendingMode] = useState("all");

const [attendanceStats, setAttendanceStats] = useState(null);

const fetchAttendanceStats = async () => {
  try {
    const res = await axios.get(`http://localhost:5000/api/student/attendance-stats/${user.userId}`);
    setAttendanceStats(res.data);
  } catch (err) {
    console.error("❌ Error fetching attendance stats:", err);
  }
};



  const socket = useContext(SocketContext);
  const user = JSON.parse(localStorage.getItem("user"));

  const fetchSummary = async () => {
    try {
      if (!user || !user.userId) return;
      const res = await axios.get(`http://localhost:5000/api/student/summary/${user.userId}`);
      console.log("📥 Summary received in frontend:", res.data); // ADD THIS
 

      setSummary(res.data);
      setTimingToday(res.data.timingToday || []);
      console.log("✅ FULL RESPONSE:", res.data);

    } catch (err) {
      console.error("❌ Error fetching student summary:", err);
      setSummary("error");
      
    }
  };

  useEffect(() => {
    fetchAttendanceStats();
  }, []);
  
  useEffect(() => {
    const interval = setInterval(() => {
      fetchSummary();
    }, 15000); // every 15s
  
    return () => clearInterval(interval); // ✅ clear on unmount
  }, []);
  
  useEffect(() => {
    const interval = setInterval(() => {
      const now = new Date();
      const nowHour = now.getHours();
      const nowMinute = now.getMinutes();
  
      let ongoing = 0;
      let upcoming = 0;
  
      timingToday.forEach(timing => {
        const [sh, sm] = timing.timeStart.split(":").map(Number);
        const [eh, em] = timing.timeEnd.split(":").map(Number);
  
        const nowTime = nowHour * 60 + nowMinute;
        const start = sh * 60 + sm;
        const end = eh * 60 + em;
  
        if (nowTime >= start && nowTime <= end) {
          ongoing++;
        } else if (nowTime < start) {
          upcoming++;
        }
      });
  
      setOngoingLectures(ongoing);
      setUpcomingToday(upcoming);
    }, 15000); // refresh every 15s
  
    return () => clearInterval(interval);
  }, [timingToday]);

  useEffect(() => {
    fetchSummary(); // initial load

    if (!socket) return;

    const handleWalletUpdate = (data) => {
      if (data.userID === user._id) {
        console.log("🔄 Wallet updated - Refreshing student dashboard");
        fetchSummary();
      }
    };

    const handleTransactionUpdate = (data) => {
      if (data.userId === user.userId) {
        console.log("🔄 Transaction updated - Refreshing student dashboard");
        fetchSummary();
      }
    };

    socket.on("walletUpdated", handleWalletUpdate);
    socket.on("transactionUpdated", handleTransactionUpdate);

    return () => {
      socket.off("walletUpdated", handleWalletUpdate);
      socket.off("transactionUpdated", handleTransactionUpdate);
    };
  }, [socket]);
  useEffect(() => {
    if (!socket) return;
  
    const handleConnect = () => {
      console.log("🟢 Connected to socket:", socket.id);
    };
    const handleDisconnect = () => {
      console.warn("🔴 Disconnected from socket");
    };
  
    const handleWalletUpdate = (data) => {
      if (data.userID === user._id) {
        console.log("📢 Real-time Wallet Update received:", data);
        fetchSummary();
      }
    };
  
    const handleTransactionUpdate = (data) => {
      if (data.userId === user.userId) {
        console.log("📢 Real-time Transaction Update received:", data);
        fetchSummary();
      }
    };
  
    socket.on("connect", handleConnect);
    socket.on("disconnect", handleDisconnect);
    socket.on("walletUpdated", handleWalletUpdate);
    socket.on("transactionUpdated", handleTransactionUpdate);
  
    return () => {
      socket.off("connect", handleConnect);
      socket.off("disconnect", handleDisconnect);
      socket.off("walletUpdated", handleWalletUpdate);
      socket.off("transactionUpdated", handleTransactionUpdate);
    };
  }, [socket]);
  
 
  
  if (summary === "error") return <p className="text-danger text-center mt-5">Failed to load student data.</p>;
  if (!summary) return <p className="text-center text-muted mt-5">Loading...</p>;
  const attended = attendanceStats?.attendedLectures || 0;
  const absent = attendanceStats?.absentLectures || 0;
  const late = attendanceStats?.lateLectures || 0;
  const total = attendanceStats?.totalLectures || 0;
  const missed = attendanceStats?.missedLectures || 0;
  const attendanceRate = attendanceStats?.attendanceRate || 0;
  const lateRate = attendanceStats?.lateRate || 0;
  
  


  return (
    <div className="container-fluid">
      <h4 className="mb-4 text-gray-800">Student Dashboard</h4>
      <div className="row g-4 mb-4">
        <StudentStatCard
          title="My Wallet Balance"
          value={
            summary.walletBalance === null || summary.walletBalance === undefined
              ? "You Don't Have Wallet"
              : `EGP ${summary.walletBalance}`
          }
          iconClass="fas fa-wallet"
          textColor={
            summary.walletBalance === null || summary.walletBalance === undefined
              ? "danger"
              : "primary"
          }
        />
        <StudentStatCard title="Total Purchased" value={`EGP ${summary.totalPurchased}`} iconClass="fas fa-shopping-cart" textColor="success" />

        <StudentStatCard title="Total Transactions" value={summary.totalTransactions} iconClass="fas fa-list" textColor="info" />
        <StudentStatCard title="Transactions Today" value={summary.transactionsToday} iconClass="fas fa-credit-card" textColor="primary" />
        <StudentStatCard title="Purchases Today" value={summary.purchasesToday} iconClass="fas fa-shopping-basket" textColor="success" />
        <StudentStatCard title="Total Courses" value={summary.totalCourses} iconClass="fas fa-book-open" textColor="dark" />
        <StudentStatCard title="Lectures Attended" value={attended} iconClass="fas fa-check-circle" textColor="success" />
        <StudentStatCard title="Lectures Absent" value={absent} iconClass="fas fa-times-circle" textColor="danger" />
        <StudentStatCard title="Lectures Today (Ended)" value={summary.endedToday} iconClass="fas fa-calendar-check" textColor="secondary" />
        <StudentStatCard title="Lectures Today (Upcoming)" value={summary.upcomingToday} iconClass="fas fa-hourglass-start" textColor="warning" />
        <StudentStatCard
  title="Lectures Late"
  value={late}
  iconClass="fas fa-clock"
  textColor="warning"
/>
<StudentStatCard
  title="Lectures Missed / Total"
  value={`${missed} / ${total}`}
  iconClass="fas fa-percentage"
  textColor="secondary"
/>


<StudentStatCard
  title="Attendance Rate"
  value={`${attendanceRate}%`}
  iconClass="fas fa-chart-line"
  textColor="info"
/>

<StudentStatCard
  title="Late Rate"
  value={`${lateRate}%`}
  iconClass="fas fa-hourglass-half"
  textColor="warning"
/>




        <StudentStatCard title="Ongoing Lectures" value={summary.ongoingLectures} iconClass="fas fa-spinner" textColor="info" />
        <StudentStatCard title="Total Added" value={`EGP ${summary.addedAmount}`} iconClass="fas fa-plus-circle" textColor="success"/>
        <StudentStatCard title="Total Deducted" value={`EGP ${summary.deductedAmount}`} iconClass="fas fa-minus-circle" textColor="danger"/>
      </div>
      <StudentCharts mode={spendingMode} />


    </div>
  );
};

export default StudentHome;
