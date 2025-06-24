// frontend/src/contexts/SocketProvider.js
import React, { useMemo } from "react";
import SocketContext from "./SocketContext";
import socket from "../socket"; // ✅ default import

const SocketProvider = ({ children }) => {
  const memoizedSocket = useMemo(() => socket, []);
  return (
    <SocketContext.Provider value={memoizedSocket}>
      {children}
    </SocketContext.Provider>
  );
};

export default SocketProvider;
