import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App.simple.jsx';

console.log('🎯 Starting SIMPLE IntelGraph App...');

// Add extra debugging
console.log('📍 Environment check:');
console.log('- React:', React);
console.log('- ReactDOM:', ReactDOM);
console.log('- document.readyState:', document.readyState);
console.log('- window.location:', window.location.href);

const root = document.getElementById('root');
console.log('📍 Root element:', root);

if (!root) {
  console.error('❌ CRITICAL: Root element not found!');
  document.body.innerHTML = '<h1 style="color: red;">❌ Root element not found!</h1>';
} else {
  console.log('✅ Root element found:', root.outerHTML);

  try {
    console.log('📍 Creating React root...');
    const reactRoot = ReactDOM.createRoot(root);
    console.log('✅ React root created:', reactRoot);

    console.log('📍 Rendering App component...');
    reactRoot.render(<App />);
    console.log('✅ App component rendered!');

    // Verify content was added
    setTimeout(() => {
      console.log('📍 Post-render check - Root innerHTML length:', root.innerHTML.length);
      if (root.innerHTML.length > 0) {
        console.log('✅ SUCCESS: Content was rendered to the DOM!');
      } else {
        console.error('❌ FAILURE: No content in root element after render');
      }
    }, 100);
  } catch (error) {
    console.error('❌ CRITICAL ERROR during render:', error);
    root.innerHTML = `
      <div style="padding: 20px; background: #ffcdd2; border: 2px solid #f44336;">
        <h1>❌ React Render Error</h1>
        <p><strong>Error:</strong> ${error.message}</p>
        <pre>${error.stack}</pre>
      </div>
    `;
  }
}

// Global error handlers
window.addEventListener('error', (event) => {
  console.error('🚨 GLOBAL ERROR:', event.error);
});

window.addEventListener('unhandledrejection', (event) => {
  console.error('🚨 UNHANDLED PROMISE REJECTION:', event.reason);
});

console.log('📍 main.simple.jsx execution complete');
