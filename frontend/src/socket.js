// // socket.js
// import { io } from "socket.io-client";

// export const socket = io("http://localhost:5000", {
//   transports: ["websocket"],
//   reconnection: true,
//   reconnectionAttempts: Infinity,
//   reconnectionDelay: 1000,
//   timeout: 20000
// });
// frontend/src/socket.js
import { io } from "socket.io-client";

const socket = io("http://localhost:5000", {
  transports: ["websocket"],
  reconnection: true,
  reconnectionAttempts: Infinity,
  reconnectionDelay: 1000,
  timeout: 20000,
});

export default socket;
