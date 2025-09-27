import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App.working.jsx'
import './styles/globals.css'

console.log('🚀 IntelGraph Platform Starting (Working Version)...');

try {
  const root = document.getElementById('root');
  if (!root) {
    console.error('❌ Root element not found');
    throw new Error('Root element not found');
  }
  
  console.log('✅ Root element found, creating React root...');
  
  ReactDOM.createRoot(root).render(
    <React.StrictMode>
      <App />
    </React.StrictMode>,
  );
  
  console.log('✅ React app rendered successfully');
  
} catch (error) {
  console.error('❌ Failed to mount React app:', error);
  
  // Fallback HTML
  const root = document.getElementById('root');
  if (root) {
    root.innerHTML = `
      <div style="padding: 20px; background: #ffebee; border: 2px solid #f44336; border-radius: 8px; margin: 20px;">
        <h1 style="color: #d32f2f;">❌ React App Failed to Mount</h1>
        <p><strong>Error:</strong> ${error.message}</p>
        <p><strong>Stack:</strong></p>
        <pre style="background: #f5f5f5; padding: 10px; overflow: auto;">${error.stack}</pre>
        <p><em>Check the browser console for more details.</em></p>
      </div>
    `;
  }
}