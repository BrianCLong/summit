import React from "react";
import ReactDOM from "react-dom/client";
import App from "./App.basic.jsx";

function initializeApp() {
  const root = document.getElementById("root");
  if (!root) {
    document.body.innerHTML = `
      <div style="padding: 20px; background: #ffcdd2; border: 2px solid #f44336; margin: 20px; border-radius: 8px;">
        <h1 style="color: #d32f2f;">❌ Critical Error</h1>
        <p><strong>Root element not found!</strong></p>
        <p>The element with id="root" could not be found in the DOM.</p>
        <pre>document.body.innerHTML: ${document.body.innerHTML}</pre>
      </div>
    `;
    return;
  }

  try {
    ReactDOM.createRoot(root).render(
      <React.StrictMode>
        <App />
      </React.StrictMode>,
    );
  } catch (error) {
    root.innerHTML = `
      <div style="padding: 20px; background: #ffcdd2; border: 2px solid #f44336; border-radius: 8px; margin: 20px; font-family: Arial;">
        <h1 style="color: #d32f2f;">❌ React Initialization Failed</h1>
        <p><strong>Error:</strong> ${error.message}</p>
        <details style="margin-top: 20px;">
          <summary>Error Details</summary>
          <pre style="background: #f5f5f5; padding: 10px; margin: 10px 0; overflow: auto; border-radius: 4px;">${error.stack}</pre>
        </details>
        <p><em>Check the browser console for more details.</em></p>
      </div>
    `;
  }
}

if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", initializeApp);
} else {
  initializeApp();
}
