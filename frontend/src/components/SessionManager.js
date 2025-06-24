import React, { useEffect, useRef, useState, useCallback } from "react";
import { useNavigate } from "react-router-dom";

const SessionManager = () => {
  const navigate = useNavigate();
  const warningTimeoutRef = useRef(null);
  const logoutTimeoutRef = useRef(null);
  const [showWarning, setShowWarning] = useState(false);

  const logout = useCallback(() => {
    localStorage.removeItem("user");
    setShowWarning(false);
    navigate("/");
  }, [navigate]);

  const resetTimers = useCallback(() => {
    clearTimeout(warningTimeoutRef.current);
    clearTimeout(logoutTimeoutRef.current);
    setShowWarning(false);

      // Show warning at 4 minutes (240000ms)
    warningTimeoutRef.current = setTimeout(() => {
      setShowWarning(true);
    }, 4 * 60 * 1000);

    // Logout at 5 minutes (300000ms)
    logoutTimeoutRef.current = setTimeout(() => {
      logout();
    }, 5 * 60 * 1000);
  }, [logout]);

  useEffect(() => {
    const user = JSON.parse(localStorage.getItem("user"));
    if (!user) return;

    const activityEvents = ["mousemove", "keydown", "click", "scroll"];
    activityEvents.forEach((event) =>
      window.addEventListener(event, resetTimers)
    );

    resetTimers(); // Start timers on mount

    return () => {
      activityEvents.forEach((event) =>
        window.removeEventListener(event, resetTimers)
      );
      clearTimeout(warningTimeoutRef.current);
      clearTimeout(logoutTimeoutRef.current);
    };
  }, [resetTimers]);

  return (
    showWarning && (
        <div
        style={{
          position: "fixed",
          top: "30%",
          left: "50%",
          transform: "translate(-50%, -50%)",
          background: "rgba(255, 255, 255, 0.6)",  
          backdropFilter: "blur(6px)",
          padding: "2rem",
          borderRadius: "12px",
          boxShadow: "0 0 20px rgba(0,0,0,0.2)",
          zIndex: 9999,
          textAlign: "center",
          maxWidth: "400px"
        }}
      >
        <h5><span role="img" aria-label="warning">⚠️</span> Are you still there?</h5>
        <p>Your session will expire soon due to inactivity. <span role="img" aria-label="cross">❌</span></p>
      </div>
      
    )
  );
};

export default SessionManager;
