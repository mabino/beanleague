import React from 'react';
import ReactDOM from 'react-dom/client';
import { App } from './App.jsx';
import { AuthProvider } from './context/AuthContext';
import { LiveEventsProvider } from './context/LiveEventsContext';
import './index.css';

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <AuthProvider>
      <LiveEventsProvider>
        <App />
      </LiveEventsProvider>
    </AuthProvider>
  </React.StrictMode>
);
