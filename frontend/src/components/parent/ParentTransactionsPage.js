// frontend/src/components/parent/ParentTransactionPage.js
import React, { useEffect, useState, useContext } from "react";
import { useParams, useNavigate } from "react-router-dom";
import axios from "axios";
import moment from "moment";
import SocketContext from "../../contexts/SocketContext";

const ParentTransactionPage = () => {
  const { studentId, studentName } = useParams();
  const [transactions, setTransactions] = useState([]);
  const navigate = useNavigate();
  const socket = useContext(SocketContext);

  const fetchTransactions = async () => {
    try {
      const res = await axios.get(`http://localhost:5000/api/parent/transactions/${studentId}`);
      setTransactions(res.data);
    } catch (err) {
      console.error("Failed to fetch transactions", err);
    }
  };

  useEffect(() => {
    fetchTransactions();
    if (!socket) return;

    socket.on("transaction-update", fetchTransactions);
    return () => socket.off("transaction-update", fetchTransactions);
  }, [socket, studentId]);

  return (
    <div className="container mt-5">
      <div className="d-flex justify-content-between align-items-center mb-4">
        <h3 className="fw-bold text-primary">{studentName}'s Transaction History</h3>
        <button className="btn btn-secondary" onClick={() => navigate("/parent/home")}>
          ← Back
        </button>
      </div>

      <div className="card shadow">
        <div className="card-body table-responsive">
          <table className="table table-bordered table-hover align-middle">
            <thead className="table-light text-center">
              <tr>
                <th>Date</th>
                <th>Time</th>
                <th>Merchant / Type</th>
                <th>Items</th>
                <th>Amount (EGP)</th>
              </tr>
            </thead>
            <tbody>
              {transactions.length === 0 ? (
                <tr>
                  <td colSpan="5" className="text-center text-muted">No transactions found.</td>
                </tr>
              ) : (
                transactions.map((t, idx) => (
                  <tr key={idx} className="text-center">
                    <td>{moment(t.timestamp).format("YYYY-MM-DD")}</td>
                    <td>{moment(t.timestamp).format("HH:mm")}</td>
                    <td>
                      {t.action === "purchase" ? t.merchantName : (
                        <span className={`text-${t.action === "add" ? "success" : "danger"}`}>
                          {t.action.toUpperCase()}
                        </span>
                      )}
                    </td>
                    <td>{t.items?.join(", ") || "—"}</td>
                    <td>{t.amount}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default ParentTransactionPage;
