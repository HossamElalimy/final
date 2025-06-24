// frontend/src/index.js
import React from 'react';
import { createRoot } from 'react-dom/client';
import './index.css';
import App from './App';
import reportWebVitals from './reportWebVitals';

import SocketProvider from './contexts/SocketProvider'; // ✅ import provider

const container = document.getElementById('root');
const root = createRoot(container);
root.render(
  <React.StrictMode>
    <SocketProvider> {/* ✅ Wrap entire app */}
      <App />
    </SocketProvider>
  </React.StrictMode>
);

reportWebVitals();
