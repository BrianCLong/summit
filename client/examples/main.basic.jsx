import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App.basic.jsx';

console.log('🚀 Starting Basic IntelGraph App...');

// Detailed logging for debugging
console.log('📍 Environment check:');
console.log('- React version:', React.version);
console.log('- ReactDOM:', ReactDOM);
console.log('- document.readyState:', document.readyState);
console.log('- window.location:', window.location.href);

// Global error handlers
window.addEventListener('error', (event) => {
  console.error('🚨 GLOBAL ERROR:', event.error);
  console.error('📍 Error details:', {
    message: event.message,
    filename: event.filename,
    lineno: event.lineno,
    colno: event.colno,
    stack: event.error?.stack,
  });
});

window.addEventListener('unhandledrejection', (event) => {
  console.error('🚨 UNHANDLED PROMISE REJECTION:', event.reason);
});

// Wait for DOM to be ready
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initializeApp);
} else {
  initializeApp();
}

function initializeApp() {
  console.log('📍 Initializing app...');

  const root = document.getElementById('root');
  console.log('📍 Root element:', root);

  if (!root) {
    console.error('❌ CRITICAL: Root element not found!');
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

  console.log('✅ Root element found:', {
    id: root.id,
    tagName: root.tagName,
    className: root.className,
    innerHTML: root.innerHTML.substring(0, 100),
  });

  try {
    console.log('📍 Creating React root...');
    const reactRoot = ReactDOM.createRoot(root);
    console.log('✅ React root created successfully');

    console.log('📍 Rendering App component...');
    reactRoot.render(
      <React.StrictMode>
        <App />
      </React.StrictMode>,
    );
    console.log('✅ App component render called successfully');

    // Verify rendering after a short delay
    setTimeout(() => {
      const currentContent = root.innerHTML;
      console.log('📍 Post-render verification:');
      console.log('- Root innerHTML length:', currentContent.length);
      console.log('- Root innerHTML preview:', currentContent.substring(0, 200));

      if (currentContent.length > 50) {
        console.log('✅ SUCCESS: React content has been rendered to the DOM!');
      } else {
        console.error('❌ WARNING: Root element appears to be empty after render');
      }
    }, 1000);
  } catch (error) {
    console.error('❌ CRITICAL ERROR during React initialization:', error);
    console.error('Error stack:', error.stack);

    // Fallback error display
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

console.log('📍 main.basic.jsx script execution completed');
