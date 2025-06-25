import React, { useEffect, useState } from "react";
import axios from "axios";

// Simple toaster component
const Toaster = ({ message, type, onClose }) => {
  if (!message) return null;
  const bgColor = type === "error" ? "bg-danger" : "bg-success";
  return (
    <div className={`toast show position-fixed top-0 end-0 m-3 ${bgColor} text-white`} role="alert" aria-live="assertive" aria-atomic="true" style={{ zIndex: 1050 }}>
      <div className="toast-header">
        <strong className="me-auto">{type === "error" ? "Error" : "Success"}</strong>
        <button type="button" className="btn-close btn-close-white" onClick={onClose}></button>
      </div>
      <div className="toast-body">{message}</div>
    </div>
  );
};

const MerchantItems = () => {
  const [merchant, setMerchant] = useState(null);
  const [items, setItems] = useState([]);
  const user = JSON.parse(localStorage.getItem("user"));
  const [newItem, setNewItem] = useState({
    name: "",
    quantity: 0,
    sold: 0,
    costPrice: 0,
    sellingPrice: 0,
    category: "",
  });
  const [editIndex, setEditIndex] = useState(null); // index of item being edited
  const [editItem, setEditItem] = useState(null);   // clone of the item being edited
  const [toaster, setToaster] = useState({ message: "", type: "success" });

  const API_BASE = "http://localhost:5000/api/users";

  const fetchItems = async () => {
    try {
      const res = await axios.get(`${API_BASE}/${user.userId}/items`);
      setItems(res.data.items || []);
    } catch (err) {
      console.error("❌ Failed to fetch items:", err);
      showToast("Failed to load items", "error");
    }
  };

  const showToast = (message, type = "success") => {
    setToaster({ message, type });
    setTimeout(() => setToaster({ message: "", type }), 3000);
  };

  const handleChange = (field, value, isEdit = false) => {
    if (isEdit) {
      setEditItem((prev) => ({ ...prev, [field]: value }));
    } else {
      setNewItem((prev) => ({ ...prev, [field]: value }));
    }
  };

  const handleAddItem = async () => {
    if (!merchant || !merchant.userId) {
      alert("Merchant not loaded.");
      return;
    }

    if (!newItem.name || !newItem.quantity || !newItem.costPrice || !newItem.sellingPrice) {
      alert("Please fill all required fields");
      return;
    }

    const updatedItems = [...items, newItem];

    try {
      await axios.put(`${API_BASE}/${merchant.userId}/items`, { items: updatedItems });
      setNewItem({ name: "", quantity: 0, sold: 0, costPrice: 0, sellingPrice: 0, category: "" });
      fetchItems();
      showToast("Item added successfully!");
    } catch (err) {
      console.error("Failed to add item:", err);
      showToast("Failed to add item", "error");
    }
  };

  const handleDelete = async (index) => {
    if (!merchant || !merchant.userId) return;

    const updatedItems = [...items];
    updatedItems.splice(index, 1);

    try {
      await axios.put(`${API_BASE}/${merchant.userId}/items`, { items: updatedItems });
      fetchItems();
      showToast("Item deleted successfully!");
    } catch (err) {
      console.error("Failed to delete item:", err);
      showToast("Failed to delete item", "error");
    }
  };

  // Start editing an item
  const startEdit = (index) => {
    setEditIndex(index);
    setEditItem({ ...items[index] });
  };

  // Cancel editing
  const cancelEdit = () => {
    setEditIndex(null);
    setEditItem(null);
  };

  // Save edited item
  const saveEdit = async () => {
    if (!editItem.name || !editItem.quantity || !editItem.costPrice || !editItem.sellingPrice) {
      alert("Please fill all required fields");
      return;
    }
    const updatedItems = [...items];
    updatedItems[editIndex] = editItem;

    try {
      await axios.put(`${API_BASE}/${merchant.userId}/items`, { items: updatedItems });
      fetchItems();
      setEditIndex(null);
      setEditItem(null);
      showToast("Item updated successfully!");
    } catch (err) {
      console.error("Failed to update item:", err);
      showToast("Failed to update item", "error");
    }
  };

  useEffect(() => {
    const stored = localStorage.getItem("user");
    if (stored) {
      const user = JSON.parse(stored);
      if (user && user.userId) setMerchant(user);
    }
  }, []);

  useEffect(() => {
    fetchItems();
  }, []);

  return (
    <div className="container-fluid py-4">
      <h4 className="fw-bold text-primary mb-4">📦 My Items</h4>

      {/* Add New Item */}
      <div className="card p-3 mb-4">
        <h5 className="fw-bold mb-3">Add New Item</h5>
        <div className="row g-3">
          <div className="col-md-2">
            <label className="form-label">Item Name</label>
            <input className="form-control" value={newItem.name} onChange={(e) => handleChange("name", e.target.value)} />
          </div>
          <div className="col-md-2">
            <label className="form-label">Quantity</label>
            <input type="number" className="form-control" value={newItem.quantity} onChange={(e) => handleChange("quantity", Number(e.target.value))} />
          </div>
          <div className="col-md-2">
            <label className="form-label">Cost Price</label>
            <input type="number" className="form-control" value={newItem.costPrice} onChange={(e) => handleChange("costPrice", Number(e.target.value))} />
          </div>
          <div className="col-md-2">
            <label className="form-label">Selling Price</label>
            <input type="number" className="form-control" value={newItem.sellingPrice} onChange={(e) => handleChange("sellingPrice", Number(e.target.value))} />
          </div>
          <div className="col-md-2">
            <label className="form-label">Category</label>
            <input className="form-control" value={newItem.category} onChange={(e) => handleChange("category", e.target.value)} />
          </div>
          <div className="col-md-2">
            <label className="form-label invisible">Add</label>
            <button className="btn btn-success w-100" onClick={handleAddItem}>➕ Add</button>
          </div>
        </div>
      </div>

      {/* Items Table */}
      <div className="card p-3">
        <h5 className="fw-bold mb-3">Item List</h5>
        <div className="table-responsive">
          <table className="table table-striped table-hover align-middle">
            <thead className="table-light">
              <tr>
                <th>#</th>
                <th>Name</th>
                <th>Quantity</th>
                <th>Sold</th>
                <th>Cost</th>
                <th>Price</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {items.length === 0 ? (
                <tr>
                  <td colSpan="7" className="text-center">No items found.</td>
                </tr>
              ) : (
                items.map((item, i) => (
                  <tr key={i}>
                    <td>{i + 1}</td>
                    <td>
                      {editIndex === i ? (
                        <input
                          type="text"
                          className="form-control"
                          value={editItem.name}
                          onChange={(e) => handleChange("name", e.target.value, true)}
                        />
                      ) : (
                        item.name
                      )}
                    </td>
                    <td>
                      {editIndex === i ? (
                        <input
                          type="number"
                          className="form-control"
                          value={editItem.quantity}
                          onChange={(e) => handleChange("quantity", Number(e.target.value), true)}
                        />
                      ) : (
                        item.quantity
                      )}
                    </td>
                    <td>{item.sold}</td>
                    <td>
                      {editIndex === i ? (
                        <input
                          type="number"
                          className="form-control"
                          value={editItem.costPrice}
                          onChange={(e) => handleChange("costPrice", Number(e.target.value), true)}
                        />
                      ) : (
                        `EGP ${item.costPrice}`
                      )}
                    </td>
                    <td>
                      {editIndex === i ? (
                        <input
                          type="number"
                          className="form-control"
                          value={editItem.sellingPrice}
                          onChange={(e) => handleChange("sellingPrice", Number(e.target.value), true)}
                        />
                      ) : (
                        `EGP ${item.sellingPrice}`
                      )}
                    </td>
                    <td>
                      {editIndex === i ? (
                        <>
                          <button className="btn btn-sm btn-success me-2" onClick={saveEdit}>💾 Save</button>
                          <button className="btn btn-sm btn-secondary" onClick={cancelEdit}>❌ Cancel</button>
                        </>
                      ) : (
                        <>
                          <button className="btn btn-sm btn-outline-primary me-2" onClick={() => startEdit(i)}>✏️ Edit</button>
                          <button className="btn btn-sm btn-outline-danger" onClick={() => handleDelete(i)}>🗑</button>
                        </>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      <Toaster message={toaster.message} type={toaster.type} onClose={() => setToaster({ message: "", type: "success" })} />
    </div>
  );
};

export default MerchantItems;
