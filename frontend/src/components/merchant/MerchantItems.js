import React, { useEffect, useState } from "react";
import axios from "axios";
import MerchantLayout from "./MerchantLayout";

const MerchantItems = () => {
  const [merchant, setMerchant] = useState(null);
  const [items, setItems] = useState([]);
  const [newItem, setNewItem] = useState({
    name: "",
    quantity: 0,
    sold: 0,
    costPrice: 0,
    sellingPrice: 0,
    category: "",
    imageUrl: ""
  });

  const handleChange = (field, value) => {
    setNewItem((prev) => ({ ...prev, [field]: value }));
  };

  const handleFileUpload = (e) => {
    const file = e.target.files[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setNewItem((prev) => ({ ...prev, imageUrl: reader.result }));
      };
      reader.readAsDataURL(file);
    }
  };

  const fetchItems = async () => {
    try {
      const res = await axios.get(`http://localhost:5000/api/users/search?query=${merchant.userId}&role=merchant`);
      if (res.data.length > 0) {
        setItems(res.data[0].items || []);
      }
    } catch (err) {
      console.error("❌ Failed to load items", err);
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
      const res = await axios.put(`http://localhost:5000/api/merchant-items/${merchant.userId}/items`, {
        items: updatedItems
      });
      setItems(res.data.items || []);
      setNewItem({
        name: "",
        quantity: 0,
        sold: 0,
        costPrice: 0,
        sellingPrice: 0,
        category: "",
        imageUrl: ""
      });
    } catch (err) {
      console.error("Failed to add item:", err);
    }
  };

  const handleDelete = async (index) => {
    if (!merchant || !merchant.userId) return;

    const updatedItems = [...items];
    updatedItems.splice(index, 1);
    try {
      const res = await axios.put(`http://localhost:5000/api/merchant-items/${merchant.userId}/items`, {
        items: updatedItems
      });
      setItems(res.data.items || []);
    } catch (err) {
      console.error("Failed to delete item:", err);
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
    if (merchant) fetchItems();
  }, [merchant]);

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
            <label className="form-label">Image</label>
            <input type="file" className="form-control" accept="image/*" onChange={handleFileUpload} />
          </div>
          {newItem.imageUrl && (
            <div className="col-md-12">
              <img src={newItem.imageUrl} alt="Preview" style={{ height: "100px", marginTop: "10px" }} />
            </div>
          )}
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
          <table className="table table-striped table-hover">
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
                <tr><td colSpan="7" className="text-center">No items found.</td></tr>
              ) : (
                items.map((item, i) => (
                  <tr key={i}>
                    <td>{i + 1}</td>
                    <td>{item.name}</td>
                    <td>{item.quantity}</td>
                    <td>{item.sold}</td>
                    <td>EGP {item.costPrice}</td>
                    <td>EGP {item.sellingPrice}</td>
                    <td>
                      <button className="btn btn-sm btn-outline-danger" onClick={() => handleDelete(i)}>🗑</button>
                    </td>
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

export default MerchantItems;
