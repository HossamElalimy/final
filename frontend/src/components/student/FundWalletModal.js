import React, { useState } from "react";
import axios from "axios";
import { Modal, Button, Form } from "react-bootstrap";
import { toast } from "react-toastify";

const FundWalletModal = ({ show, onHide, walletId, onFundSuccess }) => {

  const [visaNo, setVisaNo] = useState("");
  const [expiryDate, setExpiryDate] = useState("");
  const [cvv, setCvv] = useState("");
  const [balance, setBalance] = useState("");

  const handleFund = async () => {
    try {
        const res = await axios.post("http://localhost:5000/api/wallet/fund", {
            visaNo,
            expiryDate,
            cvv,
            balance: Number(balance), // ensure numeric
            walletId: walletId || null
          });
          
          if (res.data.message.includes("successfully")) {
            toast.success(res.data.message);
            onHide();
            onFundSuccess?.(); // ✅ trigger refresh in parent
          }
          

    } catch (err) {
      console.error("❌ Fund error:", err);
      toast.error(err.response?.data?.message || "Funding failed");
    }
  };

  return (
    <Modal show={show} onHide={onHide} centered>
      <Modal.Header closeButton>
        <Modal.Title>💳 Fund Wallet</Modal.Title>
      </Modal.Header>
      <Modal.Body>
        <Form>
          <Form.Group>
            <Form.Label>Visa Number</Form.Label>
            <Form.Control
              type="text"
              value={visaNo}
              onChange={(e) => setVisaNo(e.target.value)}
              placeholder="1234-5678-9012-3456"
            />
          </Form.Group>
          <Form.Group>
            <Form.Label>Expiry Date</Form.Label>
            <Form.Control
  type="text"
  value={expiryDate}
  onChange={(e) => {
    let value = e.target.value.replace(/\D/g, ""); // keep only digits
    if (value.length >= 3) {
      value = value.slice(0, 2) + "/" + value.slice(2, 4); // auto-format as MM/YY
    }
    setExpiryDate(value);
  }}
  maxLength={5}
  placeholder="MM/YY"
/>

          </Form.Group>
          <Form.Group>
            <Form.Label>CVV</Form.Label>
            <Form.Control
              type="text"
              value={cvv}
              onChange={(e) => setCvv(e.target.value)}
              placeholder="123"
            />
          </Form.Group>
          <Form.Group>
            <Form.Label>Amount (EGP)</Form.Label>
            <Form.Control
              type="number"
              value={balance}
              onChange={(e) => setBalance(e.target.value)}
            />
          </Form.Group>
        </Form>
      </Modal.Body>
      <Modal.Footer>
        <Button variant="secondary" onClick={onHide}>
          Cancel
        </Button>
        <Button variant="success" onClick={handleFund}>
          Fund Now
        </Button>
      </Modal.Footer>
    </Modal>
  );
};

export default FundWalletModal;
