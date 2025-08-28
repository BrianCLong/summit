import React from 'react';
import { createRoot } from 'react-dom/client';
import App from './App.apollo.jsx'; // Import App from App.apollo.jsx
import { installToastBus } from './lib/toastBus';
import './styles/globals.css';
import { initWebVitals } from './utils/webVitals.js';

console.log('🚀 Starting Full IntelGraph Router App...');

// Global error handlers
window.addEventListener('error', (event) => {
  console.error('🚨 GLOBAL ERROR:', event.error);
});

window.addEventListener('unhandledrejection', (event) => {
  console.error('🚨 UNHANDLED PROMISE REJECTION:', event.reason);
});

// Optional guard (prevents a silent blank on chunk load failure)
window.addEventListener('error', (e) => {
  const msg = String(e?.message || '');
  if (msg.includes('Loading chunk') || msg.includes('Importing a module script failed')) {
    // eslint-disable-next-line no-console
    console.warn('[Runtime] chunk load failed, forcing reload');
    location.reload();
  }
});

const container = document.getElementById('root');

if (!container) {
  throw new Error('Missing #root element');
}

installToastBus();
createRoot(container).render(<App />); // Render App from App.apollo.jsx

initWebVitals();
