import React from 'react';
import ReactDOM from 'react-dom/client';
import axios from 'axios';
import App from './App.tsx';
import './print.css';

// Set up dynamic baseURL for axios when running in Capacitor/Android native app
if (typeof window !== 'undefined') {
  const isCapacitor = 
    window.location.protocol === 'capacitor:' || 
    window.location.protocol === 'http:' && (
      window.location.hostname === 'localhost' || 
      window.location.hostname === '127.0.0.1'
    ) && window.location.port !== '3000' && window.location.port !== '5173';

  if (isCapacitor) {
    // Falls back to the hosted application server URL so that API requests go to the cloud instead of localhost inside Android
    axios.defaults.baseURL = 'https://ais-pre-h52vlplfgwg47lkpy4v447-191932253384.asia-southeast1.run.app';
  }
}

const rootElement = document.getElementById('root');
if (!rootElement) {
  throw new Error("Could not find root element to mount to");
}

const root = ReactDOM.createRoot(rootElement);
root.render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);