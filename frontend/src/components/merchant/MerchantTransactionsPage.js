import React from "react";
import MerchantTransactions from "./MerchantTransactions";

const MerchantTransactionsPage = () => {
  const user = JSON.parse(localStorage.getItem("user"));

  if (!user || !user.userId) return <p>Loading...</p>;

  return (
    <div className="container-fluid">
      <h2>My Transactions</h2>
      <MerchantTransactions merchantUserId={user.userId} />
    </div>
  );
};

export default MerchantTransactionsPage;
