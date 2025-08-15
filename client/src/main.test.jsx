import React from 'react'
import ReactDOM from 'react-dom/client'
import TestApp from './App.test.jsx'

console.log('🚀 Starting IntelGraph Test App...');

try {
  const root = document.getElementById('root');
  if (!root) {
    console.error('❌ Root element not found!');
  } else {
    console.log('✅ Root element found, mounting React app...');
    ReactDOM.createRoot(root).render(<TestApp />);
    console.log('✅ React app mounted successfully!');
  }
} catch (error) {
  console.error('❌ Error mounting React app:', error);
}