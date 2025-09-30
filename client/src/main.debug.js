// Debug script to identify what's preventing React from mounting

console.log('🔍 Starting debug script...');

// Test 1: Check if DOM is ready
console.log('📝 Step 1: DOM readiness');
if (document.readyState === 'loading') {
  console.log('⏳ DOM is still loading...');
  document.addEventListener('DOMContentLoaded', () => {
    console.log('✅ DOM loaded');
  });
} else {
  console.log('✅ DOM is ready');
}

// Test 2: Check if root element exists
console.log('📝 Step 2: Root element check');
const root = document.getElementById('root');
if (root) {
  console.log('✅ Root element found:', root);
  root.innerHTML =
    '<div style="padding: 20px; background: #ffeb3b; border: 2px solid #f57f17;"><h1>🔍 Debug Mode Active</h1><p>Root element found and accessible!</p></div>';
} else {
  console.error('❌ Root element not found!');
}

// Test 3: Try to import React
console.log('📝 Step 3: React import test');
try {
  import('react')
    .then((React) => {
      console.log('✅ React imported successfully:', React);

      // Test 4: Try to import ReactDOM
      console.log('📝 Step 4: ReactDOM import test');
      import('react-dom/client')
        .then((ReactDOM) => {
          console.log('✅ ReactDOM imported successfully:', ReactDOM);

          // Test 5: Try to create React root
          console.log('📝 Step 5: React root creation test');
          try {
            const reactRoot = ReactDOM.createRoot(root);
            console.log('✅ React root created successfully:', reactRoot);

            // Test 6: Try to render simple component
            console.log('📝 Step 6: Simple component render test');
            const TestComponent = React.createElement(
              'div',
              {
                style: {
                  padding: '20px',
                  background: '#4caf50',
                  color: 'white',
                  border: '2px solid #2e7d32',
                },
              },
              [
                React.createElement('h1', { key: 'title' }, '🎉 React Mounted Successfully!'),
                React.createElement('p', { key: 'desc' }, 'This means React is working correctly.'),
                React.createElement('p', { key: 'time' }, `Timestamp: ${new Date().toISOString()}`),
              ],
            );

            reactRoot.render(TestComponent);
            console.log('✅ Component rendered successfully!');
          } catch (renderError) {
            console.error('❌ React render failed:', renderError);
            root.innerHTML = `<div style="padding: 20px; background: #f44336; color: white;"><h1>❌ React Render Failed</h1><pre>${renderError.message}</pre></div>`;
          }
        })
        .catch((reactDOMError) => {
          console.error('❌ ReactDOM import failed:', reactDOMError);
          root.innerHTML = `<div style="padding: 20px; background: #ff9800; color: white;"><h1>❌ ReactDOM Import Failed</h1><pre>${reactDOMError.message}</pre></div>`;
        });
    })
    .catch((reactError) => {
      console.error('❌ React import failed:', reactError);
      root.innerHTML = `<div style="padding: 20px; background: #e91e63; color: white;"><h1>❌ React Import Failed</h1><pre>${reactError.message}</pre></div>`;
    });
} catch (importError) {
  console.error('❌ Dynamic import not supported:', importError);
  root.innerHTML = `<div style="padding: 20px; background: #9c27b0; color: white;"><h1>❌ Dynamic Import Failed</h1><pre>${importError.message}</pre></div>`;
}

// Test 7: Check for global errors
console.log('📝 Step 7: Setting up global error handlers');
window.addEventListener('error', (event) => {
  console.error('🚨 Global error:', event.error);
  if (root) {
    root.innerHTML += `<div style="margin: 10px 0; padding: 10px; background: #d32f2f; color: white;"><strong>Global Error:</strong> ${event.error.message}</div>`;
  }
});

window.addEventListener('unhandledrejection', (event) => {
  console.error('🚨 Unhandled promise rejection:', event.reason);
  if (root) {
    root.innerHTML += `<div style="margin: 10px 0; padding: 10px; background: #7b1fa2; color: white;"><strong>Promise Rejection:</strong> ${event.reason}</div>`;
  }
});

console.log('🔍 Debug script setup complete. Check the page and console for results.');
