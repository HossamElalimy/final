  import React, { useEffect, useState } from "react";
  import axios from "axios";
  import { useContext } from "react";
  import SocketContext from "../../contexts/SocketContext"; // adjust path if needed
  



  const AdminUsers = () => {
    
    const [users, setUsers] = useState([]);
    const [showDelete, setShowDelete] = useState(false);
    const [deleteId, setDeleteId] = useState(null);
    const [showCreate, setShowCreate] = useState(false);
    const [showEdit, setShowEdit] = useState(false);
    const [editForm, setEditForm] = useState(null);
    const [showView, setShowView] = useState(false);
    const [viewUser, setViewUser] = useState(null);
    const [showLoginFields, setShowLoginFields] = useState(false);
    const [message, setMessage] = useState(""); // For error message
    const [successMessage, setSuccessMessage] = useState(""); // For success messages
    const [searchQuery, setSearchQuery] = useState("");
    const [studentList, setStudentList] = useState([]);
    const [walletInfo, setWalletInfo] = useState(null);
    const [amount, setAmount] = useState(0);
    const [searchInput, setSearchInput] = useState("");
const [filterRole, setFilterRole] = useState("");
const [filterStatus, setFilterStatus] = useState("");
const [userSuggestions, setUserSuggestions] = useState([]);
const socket = useContext(SocketContext);





    
    const [createForm, setCreateForm] = useState({
      username: "",
      fullName: "", // New Full Name field
      email: "",
      password: "",
      confirmPassword: "",
      phoneNumber: "",
      role: "student",
      status: "active",
      faculty: "",
      year: "",
      merchantName: "", // Only for merchant users
      merchantType: "", // Only for merchant users
      studentID: "", // This will store the ID of the student if the role is parent
    });
    
    const clearCreateForm = () => {
      setCreateForm({
        username: "",
        fullName: "",
        email: "",
        password: "",
        confirmPassword: "",
        phoneNumber: "",
        role: "",
        status: "active",
        faculty: "",
        year: "",
        merchantName: "",
        merchantType: "",
        studentIDs: []

      });
    };

    const handleBalanceUpdate = async (actionType) => {
      if (!walletInfo || !amount) return;
    
      try {
        // ✅ Prepare payload
        const payload = {
          transactionId: `TX${Date.now()}`,
          userId: walletInfo.userID || walletInfo.userId,
          action: actionType,
          amount: Number(amount),
        };
    
        // ✅ Only add merchant data for purchases
        if (actionType === "purchase") {
          payload.merchantId = "M01"; // Replace with actual logic if needed
          payload.merchantName = "Cafeteria";
          payload.items = []; // Optional items array
        }
    
        // ✅ Send update request
        await axios.put(
          `http://localhost:5000/api/wallet/${walletInfo.walletID}`,
          payload
        );
    
        // ✅ Fetch updated wallet and transactions
        const updatedWallet = await axios.get(
          `http://localhost:5000/api/wallet/${walletInfo.userID}`
        );
        const updatedTx = await axios.get(
          `http://localhost:5000/api/wallet/transactions/${walletInfo.walletID}`
        );
    
        // ✅ Update state and show confirmation
        setWalletInfo({ ...updatedWallet.data, transactions: updatedTx.data });
        setAmount(0);
        setSuccessMessage(`Balance ${actionType === "add" ? "added" : "deducted"} successfully!`);
        setTimeout(() => setSuccessMessage(""), 2000);
      } catch (err) {
        console.error("Balance update error:", err);
        setMessage("Error updating balance.");
      }
    };
    
    
    
    
    
    const [currentUser, setCurrentUser] = useState(null);

    const fetchUsers = async () => {
      try {
        const res = await axios.get("http://localhost:5000/api/users/search", {
          params: {
            query: searchInput,        // ← supports autocomplete
            role: filterRole || undefined,    // ← only sends if selected
            status: filterStatus || undefined // ← only sends if selected
          }
        });
        const all = res.data;
        let user = null;
        try {
          user = JSON.parse(localStorage.getItem("user"));
        } catch (err) {
          console.error("Failed to parse user from localStorage", err);
        }
        
        const sorted = user && user._id
          ? [
              all.find((u) => u._id === user._id),
              ...all.filter((u) => u._id !== user._id),
            ].filter(Boolean)
          : all;
        

        setUsers(sorted);
      } catch (err) {
        console.error("Error fetching users:", err);
      }
    };
    
    
    // Handle Wallet Click (to manage wallet)
    const handleWalletClick = async (userId, userRole, userCustomId) => {
      try {
        const res = await axios.get(`http://localhost:5000/api/wallet/${userId}`);
        const tx = await axios.get(`http://localhost:5000/api/wallet/transactions/${res.data.walletID}`);
        setWalletInfo({ ...res.data, transactions: tx.data })
      } catch (err) {
        if (err.response?.status === 404) {
          // Show create option
          const prefixMap = {
            student: "S", teacher: "T", admin: "A",
            merchant: "M", parent: "P", dean: "D",
            vice_dean: "V", secretary: "SC"
          };
          const prefix = prefixMap[userRole] || "U";
          const walletID = `${prefix}W${userCustomId}`;
    
          setWalletInfo({ walletID, userId, balance: null }); // Null balance = not yet created
        }
      }
    };
    
    

    // Handle Add or Deduct Balance in Wallet
    const handleBalanceChange = async (actionType) => {
      try {
        const response = await axios.put(
          `http://localhost:5000/api/wallet/${walletInfo.walletID}`,
          {
            action: actionType,
            amount: Number(amount),
            userId: walletInfo.userID,         // ✅ Required by schema
            merchantId: "M01",                 // ✅ Set based on your logic
            merchantName: "Cafeteria",         // ✅ Set based on your logic
            items: []                          // optional
          }
        );
        
        // success toast or update state
      } catch (err) {
        console.error("Balance update error:", err);
        alert("Error updating balance.");
      }
    };
    
    

    // Handle Create Wallet for User
    const handleCreateWallet = async (userId) => {
      try {
        const res = await axios.post("http://localhost:5000/api/wallet/create", {
          userID: userId,
        });
    
        // ✅ Fetch full wallet info (with correct fields)
        const fullWallet = await axios.get(`http://localhost:5000/api/wallet/${userId}`);
        const tx = await axios.get(`http://localhost:5000/api/wallet/transactions/${fullWallet.data.walletID}`);
    
        // ✅ Set walletInfo with full data needed for transactions
        setWalletInfo({ ...fullWallet.data, transactions: tx.data });
      } catch (err) {
        console.error("Error creating wallet:", err);
      }
    };
    

    // Search and link a student when creating a parent user

    const handleSearchStudent = async (query) => {
      if (query) {
        try {
          const res = await axios.get(
            `http://localhost:5000/api/users/search?query=${query}`
          );
          setStudentList(res.data); // Populate the student list with search results
        } catch (err) {
          console.error("Error searching students:", err);
          setMessage("Error searching students.");
        }
      } else {
        setStudentList([]); // Clear list if search is empty
      }
    };

    const handleStudentSelect = (student) => {
      // When a student is selected, set their ID in the form and clear the search results
      setCreateForm({
        ...createForm,
        studentID: student.userId,
      });
      setStudentList([]); // Clear the student list
    };

    const handleCreateChange = (e) => {
      setCreateForm({ ...createForm, [e.target.name]: e.target.value });
    };

    const handleEditChange = (e) => {
      setEditForm({ ...editForm, [e.target.name]: e.target.value });
    };

    // Username Validation (at least 6 characters, no special characters, no spaces)
    const validateUsername = (username) => {
      const usernameRegex = /^[a-zA-Z0-9_]{6,}$/; // At least 6 characters, no spaces or special characters
      const noSpaces = !/\s/.test(username); // Check if there's no space in the username
      return usernameRegex.test(username) && noSpaces; // Username should also not have spaces
    };

    // Email Validation (standard email format)
    const validateEmail = (email) => {
      const emailRegex = /^[a-zA-Z0-9._-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,6}$/;
      return emailRegex.test(email);
    };

    // Password Validation (at least 6 chars, 1 uppercase, 1 number)
    const validatePassword = (password) => {
      const passwordRegex = /^(?=.*[A-Z])(?=.*\d)[A-Za-z\d]{6,}$/;
      return passwordRegex.test(password);
    };

    // Handle Create User Submit
    const handleCreateSubmit = async (e) => {
      e.preventDefault();
      if (!createForm.role) {
        setMessage("Please select a role.");
        return;
      }
      

      // Check if 'studentID' is required for parents
      if (createForm.role === "parent" && (!createForm.studentIDs || createForm.studentIDs.length === 0)) {
        setMessage("Please link at least one student to this parent.");
        return;
      }
      

      if (createForm.role === "student") {
        if (!createForm.faculty || !createForm.year) {
          setMessage("Faculty and Year of Study are required for student role.");
          return;
        }
      }

      if (["dean", "vice_dean"].includes(createForm.role)) {
        if (!createForm.faculty || !createForm.status) {
          setMessage("Faculty and Status are required for Dean or Vice Dean role.");
          return;
        }
      }
      
      // Validate fullName
      if (!createForm.fullName) {
        setMessage("Full Name is required.");
        return;
      }
      // Validate Inputs
      if (!validateUsername(createForm.username)) {
        setMessage(
          "Username must be at least 6 characters, with no spaces or special characters."
        );
        return;
      }

      if (!validateEmail(createForm.email)) {
        setMessage(
          "Please enter a valid email address (e.g., user@example.com)."
        );
        return;
      }

      if (!validatePassword(createForm.password)) {
        setMessage(
          "Password must be at least 6 characters, and contain at least one uppercase letter and one number."
        );
        return;
      }

      if (createForm.password !== createForm.confirmPassword) {
        setMessage("Passwords do not match.");
        return;
      }

      try {
        const existingUser = await axios.get("http://localhost:5000/api/users/search");

        const isUsernameTaken = existingUser.data.some(
          (user) => user.username === createForm.username
        );
        const isEmailTaken = existingUser.data.some(
          (user) => user.email === createForm.email
        );

        if (isUsernameTaken) {
          setMessage("Username already exists.");
          return;
        }

        if (isEmailTaken) {
          setMessage("Email already exists.");
          return;
        }

        // POST request to create user
        const userData = {
          ...createForm,
          merchantName:
            createForm.role === "merchant" ? createForm.merchantName : undefined,
          merchantType:
            createForm.role === "merchant" ? createForm.merchantType : undefined,
            studentIDs:
            createForm.role === "parent" ? createForm.studentIDs : undefined,
           // Only for parent role
        };

        if (
          createForm.role === "merchant" &&
          (!createForm.merchantName || !createForm.merchantType)
        ) {
          setMessage("Merchant Name and Merchant Type are required.");
          return;
        }
        console.log("Form Data before submit:", createForm);
        await axios.post("http://localhost:5000/api/users", createForm);
        setShowCreate(false);
        setCreateForm({
          username: "",
          fullName: "", // New Full Name field reset
          email: "",
          password: "",
          confirmPassword: "",
          phoneNumber: "",
          role: "student",
          status: "active",
          faculty: "",
          year: "",
          merchantName: "",
          merchantType: "",
          studentID: "", // Reset studentID after creation
        });
        fetchUsers();
        setSuccessMessage("User created successfully.");
        setTimeout(() => setSuccessMessage(""), 2000); // Hide success message after 2 seconds
      } catch (err) {
        setMessage(
          "Error creating user: " + err.response?.data?.error || err.message
        );
      }
    };
    // Search students based on the user input
    const handleSearchChange = (e) => {
      const query = e.target.value;
      setCreateForm({ ...createForm, studentID: query }); // Update student ID in form
      handleSearchStudent(query); // Trigger search based on query
    };

    const handleEditSubmit = async (e) => {
      e.preventDefault();
      const updatedData = { ...editForm };

      // Remove password if empty (don't send to backend)
  if (!updatedData.password) {
    delete updatedData.password;
  }

    // Send studentIDs only if role is parent
    if (updatedData.role !== "parent") {
      delete updatedData.studentIDs;
    }
      // Validate fullName
      if (!editForm.fullName) {
        setMessage("Full Name is required.");
        return;
      }
      if (editForm.role === "parent") {
        updatedData.studentIDs = editForm.studentIDs;
      }
      
      // Validate faculty and year for student role
      if (editForm.role === "student") {
        if (!editForm.faculty || !editForm.year) {
          setMessage("Faculty and Year of Study are required for student role.");
          return;
        }
      }
      // Validate Username
      if (!validateUsername(editForm.username)) {
        setMessage(
          "Username must be at least 6 characters, with no spaces or special characters."
        );
        return;
      }

      if (editForm.password && editForm.password !== "") {
        if (!validatePassword(editForm.password)) {
          setMessage(
            "Password must be at least 6 characters, and contain at least one uppercase letter and one number."
          );
          return;
        }
        updatedData.password = editForm.password; // Only update the password if it's filled
      } else {
        delete updatedData.password; // Do not send password if not changed
      }

      // Add merchantName and merchantType if the role is merchant
      if (editForm.role === "merchant") {
        updatedData.merchantName = editForm.merchantName;
        updatedData.merchantType = editForm.merchantType;
      }

      try {
        await axios.put(
          `http://localhost:5000/api/users/${editForm._id}`,
          updatedData
        );
        setShowEdit(false);
        setSuccessMessage("User updated successfully.");
        setTimeout(() => setSuccessMessage(""), 2000); // Hide success message after 2 seconds
        fetchUsers();
      } catch (err) {
        setMessage(
          "Error updating user: " + (err.response?.data?.error || err.message)
        );
      }
    };

    const openEdit = (user) => {
      setEditForm({
        ...user,
        password: "", // Don't show password field by default
        confirmPassword: "", // Don't show confirm password field by default
      });
      setShowEdit(true);
      setShowLoginFields(false);
    };

    const openDeleteModal = (id) => {
      setDeleteId(id);
      setShowDelete(true);
    };

    const confirmDelete = async () => {
      try {
        await axios.delete(`http://localhost:5000/api/users/${deleteId}`);
        setShowDelete(false);
        setSuccessMessage("User deleted successfully.");
        fetchUsers();
        setTimeout(() => setSuccessMessage(""), 2000); // Hide success message after 2 seconds
      } catch (err) {
        console.error("Error deleting user:", err);
      }
    };

    const viewDetails = (user) => {
      setViewUser(user);
      setShowView(true);
    };
    useEffect(() => {
      if (!socket) return;
    
      const handleNewUser = (newUser) => {
        setUsers((prev) => [newUser, ...prev]);
      };
    
      const handleUserDeleted = (deletedId) => {
        setUsers((prev) => prev.filter((u) => u._id !== deletedId));
      };
    
      const handleUserUpdated = (updatedUser) => {
        setUsers((prev) =>
          prev.map((u) => (u._id === updatedUser._id ? updatedUser : u))
        );
      };
    
      socket.on("userCreated", handleNewUser);
      socket.on("userDeleted", handleUserDeleted);
      socket.on("userUpdated", handleUserUpdated);
    
      return () => {
        socket.off("userCreated", handleNewUser);
        socket.off("userDeleted", handleUserDeleted);
        socket.off("userUpdated", handleUserUpdated);
      };
    }, [socket]);
    
    
    useEffect(() => {
      const user = JSON.parse(localStorage.getItem("user"));
      setCurrentUser(user);
      fetchUsers();
      const fetchSuggestions = async () => {
        if (searchInput.trim() === "") {
          setUserSuggestions([]);
          return;
        }
        try {
          const res = await axios.get("http://localhost:5000/api/users/search", {
            params: { query: searchInput }
          });
          setUserSuggestions(res.data);
        } catch (err) {
          console.error("Suggestion fetch failed:", err);
          setUserSuggestions([]);
        }
      };
    
      const delayDebounce = setTimeout(fetchSuggestions, 300); // 300ms debounce
      return () => clearTimeout(delayDebounce);
      const scripts = [
        "/assets/bootstrap/js/bootstrap.min.js",
        "/assets/js/bs-init.js",
        "/assets/js/theme.js",
      ];
      scripts.forEach((src) => {
        const script = document.createElement("script");
        script.src = src;
        script.async = true;
        document.body.appendChild(script);
      });

      return () => {
        scripts.forEach((src) => {
          const el = document.querySelector(`script[src="${src}"]`);
          if (el) document.body.removeChild(el);
        });
      };
    }, [searchInput, filterRole, filterStatus]);

    return (
      <div id="page-top">
        {/* Include stylesheets */}
        <link rel="stylesheet" href="/assets/bootstrap/css/bootstrap.min.css" />
        <link rel="stylesheet" href="/assets/fonts/fontawesome-all.min.css" />
        <link rel="stylesheet" href="/assets/css/styles.min.css" />
        {/* Code for table, user management, and wallet interaction */}
        <div className="container-fluid py-4">
          <div className="d-flex justify-content-between align-items-center mb-4">
            <h3 className="text-dark mb-0">Users Table</h3>
            <button
    className="btn btn-success"
    onClick={() => {
      clearCreateForm();
      setMessage("");
      setShowCreate(true);
    }}
  >
    <i className="fas fa-plus me-1"></i> Create New User
  </button>

          </div>
          <div className="d-flex gap-2 mb-3 flex-wrap">
  <input
    type="text"
    className="form-control"
    style={{ maxWidth: "200px" }}
    placeholder="Search by ID or Name"
    value={searchInput}
    onChange={(e) => setSearchInput(e.target.value)}
  />
  {userSuggestions.length > 0 && (
  <ul className="list-group position-absolute" style={{ zIndex: 9999, width: "200px" }}>
    {userSuggestions.map((user) => (
      <li
        key={user._id}
        className="list-group-item list-group-item-action"
        onClick={() => {
          setSearchInput(user.userId); // or user.fullName
          setUserSuggestions([]);
        }}
      >
        {user.userId} - {user.fullName}
      </li>
    ))}
  </ul>
)}

  <select className="form-select" style={{ maxWidth: "150px" }} value={filterRole} onChange={(e) => setFilterRole(e.target.value)}>
    <option value="">All Roles</option>
    <option value="admin">Admin</option>
    <option value="student">Student</option>
    <option value="teacher">Teacher</option>
    <option value="parent">Parent</option>
    <option value="merchant">Merchant</option>
    <option value="dean">Dean</option>
    <option value="vice_dean">Vice Dean</option>
    <option value="secretary">Secretary</option>
  </select>
  <select className="form-select" style={{ maxWidth: "150px" }} value={filterStatus} onChange={(e) => setFilterStatus(e.target.value)}>
    <option value="">All Statuses</option>
    <option value="active">Active</option>
    <option value="blocked">Blocked</option>
  </select>
 
  <button
    className="btn btn-outline-danger"
    onClick={() => {
      setSearchInput("");
      setFilterRole("");
      setFilterStatus("");
      fetchUsers();
    }}
  >
    Clear
  </button>
</div>

          <div className="card shadow">
            <div className="card-header py-3">
              <p className="text-primary m-0 fw-bold">User Info</p>
            </div>
            <div className="card-body">
              <div className="table-responsive table mt-2">
                <table className="table my-0">
                  <thead>
                    <tr>
                      <th>User ID</th>
                      <th>Username</th>
                      <th>Email</th>
                      <th>Role</th>
                      <th>Joined</th>
                      <th>Status</th>
                      <th>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {users.map((user) => (
                      <tr
                        key={user._id}
                        onClick={() => viewDetails(user)}
                        style={{ cursor: "pointer" }}
                      >
                        <td>{user.userId || "-"}</td>
                        <td>
  {user.fullName}
  {currentUser && user._id === currentUser._id && (
    <span className="text-muted"> (You)</span>
  )}
</td>

                        <td>{user.email}</td>
                        <td>{user.role}</td>
                        <td>
  {user.createdAt && !isNaN(new Date(user.createdAt)) 
    ? new Date(user.createdAt).toLocaleDateString() 
    : "N/A"}
</td>

                        <td>
                          <span
                            className={`badge ${
                              user.status === "blocked"
                                ? "bg-danger"
                                : "bg-success"
                            }`}
                          >
                            {user.status}
                          </span>
                        </td>
                        <td>
                        <button
  className="btn btn-outline-info btn-sm"
  onClick={() => handleWalletClick(user._id, user.role, user.userId)}
>
  <i className="fas fa-wallet"></i> Manage Wallet
</button>


                        </td>
                        <td>
                          <button
                            className="btn btn-sm btn-primary me-2"
                            onClick={() => openEdit(user)}
                          >
                            <i className="fas fa-edit"></i>
                          </button>
                          <button
                            className="btn btn-sm btn-danger"
                            onClick={() => openDeleteModal(user._id)}
                          >
                            <i className="fas fa-trash-alt"></i>
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>

            {/* Wallet Management Popup */}
            {walletInfo && (
  <div className="modal d-block" style={{ backgroundColor: "rgba(0,0,0,0.5)", backdropFilter: "blur(6px)", zIndex: 9999 }}>
    <div className="modal-dialog modal-dialog-centered">
      <div className="modal-content" style={{ background: "rgba(255,255,255,0.8)", border: "none" }}>
        <div className="modal-header">
          <h5 className="modal-title">Wallet Information</h5>
        </div>
        <div className="modal-body">
        {walletInfo.balance !== null ? (
  <>
    <p><strong>Wallet ID:</strong> {walletInfo.walletID}</p>
    <p><strong>Balance:</strong> ${walletInfo.balance}</p>
    <input
  type="number"
  className="form-control mb-2"
  value={amount}
  onChange={(e) => setAmount(e.target.value)}
  placeholder="Enter amount"
/>
<div className="d-flex gap-2">
  <button
    className="btn btn-success"
    onClick={() => handleBalanceUpdate("add")}
    disabled={!amount || isNaN(amount) || Number(amount) <= 0}
  >
    ➕ Add Balance
  </button>
  <button
    className="btn btn-danger"
    onClick={() => handleBalanceUpdate("deduct")}
    disabled={!amount || isNaN(amount) || Number(amount) <= 0}
  >
    ➖ Deduct Balance
  </button>
</div>



  </>
) : (
  <>
    <p className="text-muted">⚠️ No wallet found for this user.</p>
    <button className="btn btn-primary mb-2" onClick={() => handleCreateWallet(walletInfo.userId)}>
      Create Wallet
    </button>
  </>
)}
{walletInfo?.transactions && (
  
  <>
  {walletInfo.transactions.length === 0 ? (
  <p className="text-muted">No transactions yet.</p>
) : (
  <ul className="list-group"></ul>
)}

    <h6 className="mt-4">Transaction History</h6>
    <ul className="list-group">
      {walletInfo.transactions.map((tx, i) => (
        <li key={i} className="list-group-item d-flex justify-content-between align-items-center">
          <span>
            {tx.action === "add" ? "➕" : "➖"} ${tx.amount}
          </span>
          <span className="text-muted" style={{ fontSize: "0.8em" }}>
            {new Date(tx.timestamp).toLocaleString()}
          </span>
        </li>
      ))}
    </ul>
  </>
)}


        </div>
        <div className="modal-footer">
          <button className="btn btn-secondary" onClick={() => setWalletInfo(null)}>Close</button>
        </div>
      </div>
    </div>
  </div>
)}



        {/* Error Modal */}
  {message && (
    <div className="modal d-block" style={{ backgroundColor: "rgba(0,0,0,0.5)", backdropFilter: "blur(6px)", zIndex: 9999 }}>
      <div className="modal-dialog modal-dialog-centered">
        <div className="modal-content" style={{ background: "rgba(255,255,255,0.9)", border: "none" }}>
          <div className="modal-header">
            <h5 className="modal-title text-danger">Error</h5>
          </div>
          <div className="modal-body">
            <p>{message}</p>
          </div>
          <div className="modal-footer">
            <button className="btn btn-secondary" onClick={() => setMessage("")}>Close</button>
          </div>
        </div>
      </div>
    </div>
  )}  
          {/* Success Confirmation Popup */}
          {successMessage && (
            <div
              className="position-fixed top-0 right-0 p-4"
              style={{ zIndex: 9999 }}
            >
              <div className="alert alert-success" role="alert">
                {successMessage}
              </div>
            </div>
          )}

          {/* Delete Modal */}
          {showDelete && (
            <div
              className="modal d-block"
              style={{
                backgroundColor: "rgba(0,0,0,0.5)",
                backdropFilter: "blur(6px)",
              }}
            >
              <div className="modal-dialog modal-dialog-centered">
                <div
                  className="modal-content"
                  style={{ background: "rgba(255,255,255,0.9)", border: "none" }}
                >
                  <div className="modal-header">
                    <h5 className="modal-title text-danger">Confirm Delete</h5>
                  </div>
                  <div className="modal-body">
                    <p>Are you sure you want to delete this user?</p>
                  </div>
                  <div className="modal-footer">
    <button className="btn btn-secondary" onClick={() => setShowDelete(false)}>No</button>
    <button className="btn btn-danger" onClick={confirmDelete}>Delete</button>
  </div>
                </div>
              </div>
            </div>
          )}

          {/* Create Modal */}
          {showCreate && (
            <div
              className="modal d-block"
              style={{
                backgroundColor: "rgba(0,0,0,0.4)",
                backdropFilter: "blur(6px)",
                zIndex: 9998,
              }}
            >
              <div className="modal-dialog modal-dialog-centered">
                <form
                  onSubmit={handleCreateSubmit}
                  className="modal-content"
                  style={{ background: "rgba(255,255,255,0.9)", border: "none" }}
                >
                  <div className="modal-header">
                    <h5 className="modal-title text-success">Create New User</h5>
                  </div>
                  <div className="modal-body">
                  <label className="form-label">Username</label>
  <input
    className="form-control mb-2"
    name="username"
    placeholder="Username"
    onChange={handleCreateChange}
    required
  />

  <label className="form-label">Full Name</label>
  <input
    className="form-control mb-2"
    name="fullName"
    placeholder="Full Name"
    onChange={handleCreateChange}
    required
  />
  <label className="form-label">Email</label>
                    <input
                      className="form-control mb-2"
                      name="email"
                      type="email"
                      placeholder="Email"
                      onChange={handleCreateChange}
                      required
                    />
                    <label className="form-label">Password</label>
                    <input
                      className="form-control mb-2"
                      name="password"
                      type="password"
                      placeholder="Password"
                      onChange={handleCreateChange}
                      required
                    />
                    <label className="form-label">Confirm Password</label>
                    <input
                      className="form-control mb-2"
                      name="confirmPassword"
                      type="password"
                      placeholder="Confirm Password"
                      onChange={handleCreateChange}
                      required
                    />
                  {createForm.password !== createForm.confirmPassword &&
    createForm.confirmPassword && (
      <div className="text-danger mb-2">
        Passwords do not match
      </div>
  )}

                      <label className="form-label">Phone Number</label>
                    <input
                      className="form-control mb-2"
                      name="phoneNumber"
                      placeholder="Phone Number"
                      onChange={handleCreateChange}
                      required
                    />
                    <label className="form-label">Role</label>
                    <select
                      className="form-select mb-2"
                      name="role"
                      onChange={handleCreateChange}
                      value={createForm.role}
                    >
                        <option value="">-- Select Role --</option>
                      <option value="student">Student</option>
                      <option value="teacher">Teacher</option>
                      <option value="parent">Parent</option>
                      <option value="admin">Admin</option>
                      <option value="merchant">Merchant</option>
                      <option value="dean">Dean</option>
                      <option value="vice_dean">Vice Dean</option>
                      <option value="secretary">Secretary</option>

                    </select>
                  

                     
                    {["student", "dean", "vice_dean", "secretary"].includes(createForm.role) && (
  <>
    <label className="form-label">Faculty</label>
    <select
      className="form-select mb-2"
      name="faculty"
      value={createForm.faculty}
      onChange={handleCreateChange}
    >
      <option value="">-- Select Faculty --</option>
      <option value="Dentistry">Dentistry</option>
      <option value="Pharmacy">Pharmacy</option>
      <option value="Biotechnology">Biotechnology</option>
      <option value="Engineering">Engineering</option>
      <option value="Computer Science">Computer Science</option>
      <option value="Mass Communication">Mass Communication</option>
      <option value="Management Sciences">Management Sciences</option>
      <option value="Arts and Design">Arts and Design</option>
      <option value="Languages">Languages</option>
      <option value="Physiotherapy">Physical Therapy</option>
    </select>

    {createForm.role === "student" && (
      <>
        <label className="form-label">Year of Study</label>
        <input
          className="form-control mb-2"
          name="year"
          value={createForm.year}
          placeholder="Year of Study"
          onChange={handleCreateChange}
        />
      </>
    )}
  </>
)}





                    {/* Merchant Fields for Merchant Role */}
                    {createForm.role === "merchant" && (
                      <>
                      <label className="form-label">Merchant Name</label>
                        <input
                          className="form-control mb-2"
                          name="merchantName"
                          placeholder="Merchant Name"
                          onChange={handleCreateChange}
                          value={createForm.merchantName}
                        />
                        <label className="form-label">Mrchant Type</label>
                        <input
                          className="form-control mb-2"
                          name="merchantType"
                          placeholder="Merchant Type"
                          onChange={handleCreateChange}
                          value={createForm.merchantType}
                        />
                      </>
                    )}

{createForm.role === "parent" && (
  <div>
    <label className="form-label">Add Child (Search)</label>
    <input
      className="form-control mb-2"
      placeholder="Search Student ID or Name"
      value={searchQuery}
      onChange={(e) => {
        setSearchQuery(e.target.value);
        handleSearchStudent(e.target.value);
      }}
    />

    {studentList.length > 0 && (
      <ul className="list-group mb-2">
        {studentList.map((student) => (
          <li key={student._id} className="list-group-item d-flex justify-content-between align-items-center">
            {student.userId} - {student.fullName}
            <button
              type="button"
              className="btn btn-sm btn-success"
              onClick={() => {
                if (!createForm.studentIDs.includes(student.userId)) {
                  setCreateForm({
                    ...createForm,
                    studentIDs: [...createForm.studentIDs, student.userId],
                  });
                }
              }}
            >
              ➕ Add
            </button>
          </li>
        ))}
      </ul>
    )}

    <label className="form-label">Linked Students</label>
    <ul className="list-group">
      {createForm.studentIDs.map((id, index) => (
        <li key={index} className="list-group-item d-flex justify-content-between align-items-center">
          {id}
          <button
            type="button"
            className="btn btn-sm btn-outline-danger"
            onClick={() => {
              const updatedList = createForm.studentIDs.filter((_, i) => i !== index);
              setCreateForm({ ...createForm, studentIDs: updatedList });
            }}
          >
             <span role="img" aria-label="Remove">❌</span> Remove
          </button>
        </li>
      ))}
    </ul>
  </div>
)}

  <label className="form-label">Status</label>
                    <select
                      className="form-select mb-2"
                      name="status"
                      onChange={handleCreateChange}
                      value={createForm.status}
                    >
                        <option value="">-- Select Status --</option>
                      <option value="active">Active</option>
                      <option value="blocked">Blocked</option>
                    </select>
                  </div>
                  <div className="modal-footer">
                    <button
                      type="button"
                      className="btn btn-secondary"
                      onClick={() => {
                        clearCreateForm();
                        setShowCreate(false);
                        setMessage("");
                      }}
                      
                    >
                      Cancel
                    </button>
                    <button type="submit" className="btn btn-success">
                      Create
                    </button>
                  </div>
                </form>
              </div>
            </div>
          )}

          {/* Edit Modal */}
          {showEdit && editForm && (
            <div
              className="modal d-block"
              style={{
                backgroundColor: "rgba(0,0,0,0.5)",
                backdropFilter: "blur(6px)",
              }}
            >
              <div className="modal-dialog modal-dialog-centered">
                <form
                  onSubmit={handleEditSubmit}
                  className="modal-content"
                  style={{ background: "rgba(255,255,255,0.9)", border: "none" }}
                >
                  <div className="modal-header">
                    <h5 className="modal-title text-primary">Edit User</h5>
                  </div>
                  <div className="modal-body">
                    <label>Username</label>
                    <input
                      className="form-control mb-2"
                      name="username"
                      value={editForm.username}
                      onChange={handleEditChange}
                      required
                    />
                    <label>Full Name</label>
                    <input
                      className="form-control mb-2"
                      name="fullName"
                      value={editForm.fullName}
                      onChange={handleEditChange}
                      required
                    />

                    <label>Role</label>
                    <select
  className="form-select mb-2"
  name="role"
  value={editForm.role}
  onChange={handleEditChange}
>
  <option value="">-- Select Role --</option>
  <option value="student">Student</option>
  <option value="teacher">Teacher</option>
  <option value="parent">Parent</option>
  <option value="admin">Admin</option>
  <option value="merchant">Merchant</option>
  <option value="dean">Dean</option>
  <option value="vice_dean">Vice Dean</option>
  <option value="secretary">Secretary</option>
</select>


                    <label>Phone Number</label>
                    <input
                      className="form-control mb-2"
                      name="phoneNumber"
                      value={editForm.phoneNumber}
                      onChange={handleEditChange}
                      placeholder="Phone number"
                      required
                    />

{["student", "dean", "vice_dean", "secretary"].includes(editForm.role) && (
  <>
    <label className="form-label">Faculty</label>
    <select
      className="form-select mb-2"
      name="faculty"
      value={editForm.faculty || ""}
      onChange={handleEditChange}
    >
      <option value="">-- Select Faculty --</option>
      <option value="Dentistry">Dentistry</option>
      <option value="Pharmacy">Pharmacy</option>
      <option value="Biotechnology">Biotechnology</option>
      <option value="Engineering">Engineering</option>
      <option value="Computer Science">Computer Science</option>
      <option value="Mass Communication">Mass Communication</option>
      <option value="Management Sciences">Management Sciences</option>
      <option value="Arts and Design">Arts and Design</option>
      <option value="Languages">Languages</option>
      <option value="Physiotherapy">Physical Therapy</option>
    </select>

    {editForm.role === "student" && (
      <>
        <label className="form-label">Year of Study</label>
        <input
          className="form-control mb-2"
          name="year"
          value={editForm.year || ""}
          onChange={handleEditChange}
          placeholder="Year of Study"
        />
      </>
    )}
  </>
)}

                    {editForm.role === "parent" && (
  <div>
    <label className="form-label">Add Child (Search)</label>
    <input
      className="form-control mb-2"
      placeholder="Search Student ID or Name"
      value={searchQuery}
      onChange={(e) => {
        setSearchQuery(e.target.value);
        handleSearchStudent(e.target.value);
      }}
    />

    {studentList.length > 0 && (
      <ul className="list-group mb-2">
        {studentList.map((student) => (
          <li key={student._id} className="list-group-item d-flex justify-content-between align-items-center">
            {student.userId} - {student.fullName}
            <button
              type="button"
              className="btn btn-sm btn-success"
              onClick={() => {
                if (!editForm.studentIDs.includes(student.userId)) {
                  setEditForm({
                    ...editForm,
                    studentIDs: [...editForm.studentIDs, student.userId],
                  });
                }
              }}
            >
              ➕ Add
            </button>
          </li>
        ))}
      </ul>
    )}

    <label className="form-label">Linked Students</label>
    <ul className="list-group">
      {editForm.studentIDs.map((id, index) => (
        <li key={index} className="list-group-item d-flex justify-content-between align-items-center">
          {id}
          <button
            type="button"
            className="btn btn-sm btn-outline-danger"
            onClick={() => {
              const updatedList = editForm.studentIDs.filter((_, i) => i !== index);
              setEditForm({ ...editForm, studentIDs: updatedList });
            }}
          >
            ❌ Remove
          </button>
        </li>
      ))}
    </ul>
  </div>
)}


                    {editForm.role === "merchant" && (
                      <>
                        <input
                          className="form-control mb-2"
                          name="merchantName"
                          placeholder="Merchant Name"
                          onChange={handleEditChange}
                          value={editForm.merchantName || ""}
                        />
                        <input
                          className="form-control mb-2"
                          name="merchantType"
                          placeholder="Merchant Type"
                          onChange={handleEditChange}
                          value={editForm.merchantType || ""}
                        />
                      </>
                    )}

                    <label>Status</label>
                    <select
                      className="form-select mb-2"
                      name="status"
                      value={editForm.status}
                      onChange={handleEditChange}
                    >
                      
                      <option value="active">Active</option>
                      <option value="blocked">Blocked</option>
                    </select>

                    {showLoginFields && (
                      <>
                        <label>Email</label>
                        <input
                          className="form-control mb-2"
                          name="email"
                          value={editForm.email}
                          onChange={handleEditChange}
                        />

                        <label>New Password</label>
                        <input
                          className="form-control mb-2"
                          name="password"
                          placeholder="New Password"
                          onChange={handleEditChange}
                        />

                        <label>Confirm New Password</label>
                        <input
                          className="form-control mb-2"
                          name="confirmPassword"
                          type="password"
                          placeholder="Confirm New Password"
                          onChange={handleEditChange}
                        />
                        {editForm.password !== editForm.confirmPassword &&
                          editForm.confirmPassword && (
                            <span className="text-danger">
                              Passwords do not match
                            </span>
                          )}
                      </>
                    )}
                  </div>
                  <div className="d-flex justify-content-between">
                    <button
                      type="button"
                      className="btn btn-secondary"
                      onClick={() => setShowEdit(false)}
                    >
                      Cancel
                    </button>
                    <button
                      type="button"
                      className="btn btn-outline-dark"
                      onClick={() => setShowLoginFields(!showLoginFields)}
                    >
                      {showLoginFields ? "Hide Login Info" : "Change Login Info"}
                    </button>
                    <button type="submit" className="btn btn-primary">
                      Save
                    </button>
                  </div>
                </form>
              </div>
            </div>
          )}
        </div>
      </div>
    );
  };

  export default AdminUsers;
