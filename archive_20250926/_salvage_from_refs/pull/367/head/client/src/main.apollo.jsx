import React from "react";
import ReactDOM from "react-dom/client";
import App from "./App.apollo.jsx";
import "./styles/globals.css";

const root = document.getElementById("root");

if (!root) {
  document.body.innerHTML = `
    <div style="padding: 20px; background: #ffcdd2; border: 2px solid #f44336; border-radius: 8px; margin: 20px; font-family: Arial;">
      <h1 style="color: #d32f2f;">❌ Apollo App Failed</h1>
      <p><strong>Root element not found!</strong></p>
    </div>
  `;
} else {
  try {
    ReactDOM.createRoot(root).render(
      <React.StrictMode>
        <App />
      </React.StrictMode>,
    );
  } catch (error) {
    root.innerHTML = `
      <div style="padding: 20px; background: #ffcdd2; border: 2px solid #f44336; border-radius: 8px; margin: 20px; font-family: Arial;">
        <h1 style="color: #d32f2f;">❌ Apollo App Failed</h1>
        <p><strong>Error:</strong> ${error.message}</p>
        <pre style="background: #f5f5f5; padding: 10px; overflow: auto;">${error.stack}</pre>
      </div>
    `;
  }
}
