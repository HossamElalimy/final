// frontend/src/components/parent/FundWalletPage.js
import React, { useEffect, useState, useContext } from "react";
import axios from "axios";
import { toast } from "react-toastify";
import SocketContext from "../../contexts/SocketContext";

const FundWalletPage = () => {
  const parent = JSON.parse(localStorage.getItem("user"));
  const socket = useContext(SocketContext);
  const [students, setStudents] = useState([]);
  const [selectedStudentId, setSelectedStudentId] = useState("");
  const [amount, setAmount] = useState("");

  useEffect(() => {
    const fetch = async () => {
      const res = await axios.get(`http://localhost:5000/api/parent/summary/${parent.userId}`);
      setStudents(res.data);
    };
    fetch();
  }, [parent.userId]);

  const handleFund = async () => {
    if (!selectedStudentId || !amount || Number(amount) <= 0) {
      return toast.error("Please select student and enter valid amount.");
    }
  
   
  
    try {
        await axios.put(`http://localhost:5000/api/wallet/SW${selectedStudentId}`, {
            action: "add",
            amount: Number(amount),
            userId: selectedStudentId
          });
          
  
      toast.success("Wallet funded successfully!");
      socket.emit("wallet-update", { userId: selectedStudentId });
  
      setAmount("");
    } catch (err) {
      console.error(err);
      toast.error("Failed to fund wallet.");
    }
  };
  
  

  return (
    <div className="container mt-5">
      <h3 className="fw-bold mb-4 text-primary">Fund Student Wallet</h3>

      <div className="card p-4 shadow">
        <div className="mb-3">
          <label className="form-label">Select Student</label>
          <select className="form-select" value={selectedStudentId} onChange={(e) => setSelectedStudentId(e.target.value)}>
            <option value="">-- Select --</option>
            {students.map((s) => (
              <option key={s.studentId} value={s.studentId}>{s.studentName}</option>
            ))}
          </select>
        </div>

        <div className="mb-3">
          <label className="form-label">Amount (EGP)</label>
          <input
            type="number"
            className="form-control"
            placeholder="Enter amount"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
          />
        </div>

        <button className="btn btn-success w-100" onClick={handleFund}>
          <i className="fas fa-wallet me-2"></i> Fund Wallet
        </button>
      </div>
    </div>
  );
};

export default FundWalletPage;
