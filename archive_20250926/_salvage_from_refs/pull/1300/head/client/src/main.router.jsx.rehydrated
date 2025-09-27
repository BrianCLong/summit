import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App.router.jsx';
import './styles/globals.css';

console.log('🚀 Starting Router IntelGraph App...');

// Global error handlers
window.addEventListener('error', (event) => {
  console.error('🚨 GLOBAL ERROR:', event.error);
});

window.addEventListener('unhandledrejection', (event) => {
  console.error('🚨 UNHANDLED PROMISE REJECTION:', event.reason);
});

const root = document.getElementById('root');

if (!root) {
  console.error('❌ CRITICAL: Root element not found!');
} else {
  try {
    console.log('📍 Creating React root with full navigation stack...');

    ReactDOM.createRoot(root).render(
      <React.StrictMode>
        <App />
      </React.StrictMode>,
    );

    console.log('✅ Router app rendered successfully');
  } catch (error) {
    console.error('❌ CRITICAL ERROR during render:', error);

    root.innerHTML = `
      <div style="padding: 20px; background: #ffcdd2; border: 2px solid #f44336; border-radius: 8px; margin: 20px; font-family: Arial;">
        <h1 style="color: #d32f2f;">❌ Router App Failed</h1>
        <p><strong>Error:</strong> ${error.message}</p>
        <pre style="background: #f5f5f5; padding: 10px; overflow: auto;">${error.stack}</pre>
      </div>
    `;
  }
}
