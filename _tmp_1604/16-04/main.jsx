import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import './index.css';

// ✅ IMPORT THIS
import { GoogleOAuthProvider } from "@react-oauth/google";

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>

    {/* ✅ WRAP YOUR APP HERE */}
    <GoogleOAuthProvider clientId="964718439815-khi9p4vkuo5000j08p20s5l5hcvo5t08.apps.googleusercontent.com">
      <App />
    </GoogleOAuthProvider>

  </React.StrictMode>
);