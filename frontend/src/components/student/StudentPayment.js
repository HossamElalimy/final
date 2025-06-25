import React, { useEffect, useState, useContext } from "react";
import axios from "axios";
import SocketContext from "../../contexts/SocketContext";
import { ToastContainer, toast } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";

const StudentPayments = () => {
  const [merchants, setMerchants] = useState([]);
  const [modalOpen, setModalOpen] = useState(false);
  const [selectedMerchant, setSelectedMerchant] = useState(null);
  const [merchantItems, setMerchantItems] = useState([]);
  const socket = useContext(SocketContext);
  const user = JSON.parse(localStorage.getItem("user"));

  const fetchMerchants = async () => {
    try {
      const res = await axios.get("http://localhost:5000/api/users/merchants");
      setMerchants(res.data || []);
    } catch (err) {
      console.error("Error fetching merchants:", err);
      toast.error("Failed to fetch merchants");
    }
  };

  const handleBuy = async (item) => {
    const quantity = 1; // Or ask user for quantity
    const studentUserId = user.userId;
    const merchantUserId = selectedMerchant.userId;

    try {
      const res = await axios.post("http://localhost:5000/api/transactions/purchase", {
        studentUserId,
        merchantUserId,
        itemName: item.name,
        quantity,
      });
      toast.success("Purchase successful!");
      fetchMerchantItems(merchantUserId);
    } catch (err) {
      toast.error(err.response?.data?.error || "Purchase failed");
    }
  };

  const fetchMerchantItems = async (userId) => {
    try {
      const res = await axios.get(`http://localhost:5000/api/users/${userId}/items`);
      setMerchantItems(res.data.items || []);
      setModalOpen(true);
    } catch (err) {
      console.error("Error fetching merchant items:", err);
      toast.error("Failed to load merchant items");
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

  const openModal = (merchant) => {
    setSelectedMerchant(merchant);
    fetchMerchantItems(merchant.userId);
  };

  const closeModal = () => {
    setModalOpen(false);
    setMerchantItems([]);
    setSelectedMerchant(null);
  };

  return (
    <div className="container mt-4">
      <ToastContainer position="top-right" autoClose={3000} />
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
          {merchants.length === 0 ? (
            <tr>
              <td colSpan={3} className="text-center">
                No merchants found.
              </td>
            </tr>
          ) : (
            merchants.map((merchant) => (
              <tr key={merchant._id}>
                <td>{merchant.userId}</td>
                <td>{merchant.fullName}</td>
                <td>
                  <button className="btn btn-primary" onClick={() => openModal(merchant)}>
                    Browse
                  </button>
                </td>
              </tr>
            ))
          )}
        </tbody>
      </table>

      {modalOpen && (
        <div
          className="modal fade show d-block"
          tabIndex="-1"
          role="dialog"
          style={{ backgroundColor: "rgba(0,0,0,0.5)" }}
        >
          <div className="modal-dialog modal-lg" role="document">
            <div className="modal-content">
              <div className="modal-header">
                <h5 className="modal-title">Items from {selectedMerchant?.fullName}</h5>
                <button type="button" className="btn-close" aria-label="Close" onClick={closeModal} />
              </div>
              <div className="modal-body">
                {merchantItems.length === 0 ? (
                  <p>No items available.</p>
                ) : (
                  <table className="table table-striped">
                    <thead>
                      <tr>
                        <th>Name</th>
                        <th>Quantity</th>
                        <th>Action</th> {/* New column */}
                      </tr>
                    </thead>
                    <tbody>
                      {merchantItems.map((item, i) => (
                        <tr key={i}>
                          <td>{item.name}</td>
                          <td>{item.quantity}</td>
                          <td>
                            <button
                              className="btn btn-success btn-sm"
                              onClick={() => handleBuy(item)}
                              disabled={item.quantity === 0}
                            >
                              Buy
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
              </div>
              <div className="modal-footer">
                <button className="btn btn-secondary" onClick={closeModal}>
                  Close
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default StudentPayments;
