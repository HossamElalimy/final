import React, { useEffect, useState, useContext } from "react";
import axios from "axios";
import SocketContext from "../../contexts/SocketContext"; // Make sure this is provided in App



const StudentPayments = () => {
  const [merchants, setMerchants] = useState([]);
  const socket = useContext(SocketContext);



  const fetchMerchants = async () => {
    try {
      const res = await axios.get("http://localhost:5000/api/merchants");
      setMerchants(res.data);
    } catch (err) {
      console.error("Error fetching merchants:", err);
    }
  };

  useEffect(() => {
    fetchMerchants();

    if (socket) {
      socket.on("merchant-updated", fetchMerchants);
    }

    return () => {
      if (socket) {
        socket.off("merchant-updated", fetchMerchants);
      }
    };
  }, [socket]);

  return (
    <div className="container mt-4">
      <h2>Available Merchants</h2>
      <table className="table table-bordered glassy-table mt-3">
        <thead>
          <tr>
            <th>Merchant ID</th>
            <th>Merchant Name</th>
            <th>Action</th>
          </tr>
        </thead>
        <tbody>
          {merchants.map((merchant) => (
            <tr key={merchant._id}>
              <td>{merchant.userId}</td>
              <td>{merchant.fullName}</td>
              <td>
                <button
                  className="btn btn-primary"
                  onClick={() =>
                    (window.location.href = `/student/merchant/${merchant.userId}`)
                  }
                >
                  Browse
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};

export default StudentPayments;
