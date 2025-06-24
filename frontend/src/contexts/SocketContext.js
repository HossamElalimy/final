// frontend/src/contexts/SocketContext.js
import React, { createContext } from "react";
import socket from "../socket"; // ✅ default import

const SocketContext = createContext(socket);
export default SocketContext;
