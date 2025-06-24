import React, { useState } from "react";
import axios from "axios";
import { useNavigate } from "react-router-dom";

const Login = () => {
  const [form, setForm] = useState({ email: "", password: "" });
  const [message, setMessage] = useState("");
  const navigate = useNavigate();
  const [blockMessage, setBlockMessage] = useState(""); // For blocked users


  const handleChange = (e) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setMessage("");
    setBlockMessage("");
  
    try {
      const res = await axios.post("http://localhost:5000/api/auth/login", form);
  
      const user = res.data.user;
      const finalUser = {
        ...user,
        userId: user.userId || user._id, // 🧠 fallback to _id if userId is missing
        
      };
      console.log("✅ Full login response:", res.data);
      console.log("✅ Saving user:", finalUser);
      
      localStorage.setItem("token", res.data.token);
      localStorage.setItem("user", JSON.stringify(finalUser));
  
      if (finalUser.role === "admin") {
        navigate("/admin/home");
      }
      else if (finalUser.role === "student") {
        navigate("/student/home"); // <-- Add this for students
       } else if (finalUser.role === "teacher") {
        navigate("/teacher/home");
      }else if (finalUser.role === "parent") {
        navigate("/parent/home");
      } else if (finalUser.role === "merchant") {
        navigate("/merchant/home");   // ✅ ADD THIS LINE
      }else {
        navigate("/dashboard"); // fallback for unknown roles
      }
    } catch (err) {
      if (err.response?.status === 403) {
        setBlockMessage(err.response.data.error);
      } else {
        setMessage(err.response?.data?.error || "Login failed");
      }
    }
  };
  
  

  return (
    <div className="bg-gradient-primary" style={{ minHeight: "100vh" }}>
      {/* Import CSS from Bootstrap Studio */}
      <link rel="stylesheet" href="/assets/bootstrap/css/bootstrap.min.css" />
      <link rel="stylesheet" href="/assets/fonts/fontawesome-all.min.css" />
      <link rel="stylesheet" href="/assets/css/Login-Form-Clean.css" />
      <link rel="stylesheet" href="/assets/css/styles.min.css" />

      <div className="container py-5">
        <div className="row justify-content-center">
          <div className="col-md-6 col-lg-5">
            <div className="card shadow-lg my-5">
              <div className="card-body p-5">
                <div className="text-center">
                  <h4 className="text-dark mb-4">Welcome Back!</h4>
                </div>
                <form className="user" onSubmit={handleSubmit}>
                  <div className="mb-3">
                    <input
                      type="email"
                      className="form-control form-control-user"
                      id="exampleInputEmail"
                      aria-describedby="emailHelp"
                      placeholder="Enter Email Address..."
                      name="email"
                      onChange={handleChange}
                      required
                    />
                  </div>
                  <div className="mb-3">
                    <input
                      type="password"
                      className="form-control form-control-user"
                      id="exampleInputPassword"
                      placeholder="Password"
                      name="password"
                      onChange={handleChange}
                      required
                    />
                  </div>
                  <div className="mb-3">
                    <div className="form-check">
                      <input className="form-check-input" type="checkbox" id="rememberMe" />
                      <label className="form-check-label" htmlFor="rememberMe">
                        Remember Me
                      </label>
                    </div>
                  </div>
                  <button type="submit" className="btn btn-primary d-block btn-user w-100">
                    Login
                  </button>
                  {message && (
                    <div className="alert alert-danger mt-3 text-center py-2" role="alert">
                      {message}
                    </div>
                  )}
                </form>
                <hr />
                <div className="text-center">Forgot Password?
                  <a className="small" href="/"> Click Here</a>
                  <br />
                 
                </div>
              </div>
            </div>
            <div className="text-center text-white">
              <small>© RFID Attendance System</small>
            </div>
          </div>
        </div>
      </div>

      {/* Scripts for Bootstrap JS */}
      <script src="/assets/bootstrap/js/bootstrap.min.js"></script>
      {blockMessage && (
  <div className="modal d-block" style={{ backgroundColor: "rgba(0,0,0,0.5)", backdropFilter: "blur(6px)", zIndex: 9999 }}>
    <div className="modal-dialog modal-dialog-centered">
      <div className="modal-content" style={{ background: "rgba(255,255,255,0.15)", borderRadius: "12px", padding: "25px", border: "1px solid rgba(255,255,255,0.3)", color: "#fff" }}>
        <div className="modal-header border-0">
          <h5 className="modal-title text-danger">🚫 Access Blocked</h5>
        </div>
        <div className="modal-body">
          <p>{blockMessage}</p>
        </div>
        <div className="modal-footer border-0">
          <button className="btn btn-outline-light" onClick={() => setBlockMessage("")}>Close</button>
        </div>
      </div>
    </div>
  </div>
)}

    </div>
  );
};

export default Login;
