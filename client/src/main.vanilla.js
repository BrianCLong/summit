// Pure vanilla JavaScript test - no React
console.log('🧪 VANILLA JS TEST STARTING...');

console.log('Environment:', {
  userAgent: navigator.userAgent,
  url: window.location.href,
  readyState: document.readyState,
});

// Test 1: Direct DOM manipulation
const root = document.getElementById('root');
console.log('Root element:', root);

if (root) {
  console.log('✅ Root found, adding content directly...');

  root.innerHTML = `
    <div style="padding: 40px; background: linear-gradient(45deg, #FF6B6B, #4ECDC4); color: white; font-family: Arial, sans-serif; min-height: 100vh;">
      <div style="background: rgba(255,255,255,0.1); padding: 30px; border-radius: 15px; backdrop-filter: blur(10px);">
        <h1 style="margin: 0 0 20px 0;">🧪 VANILLA JS TEST SUCCESS!</h1>
        <p style="font-size: 18px; margin-bottom: 20px;">✅ Direct DOM manipulation is working</p>
        
        <div style="background: rgba(76,175,80,0.3); padding: 20px; border-radius: 10px; margin: 20px 0;">
          <h2>🔍 Debug Information</h2>
          <ul>
            <li>✅ HTML page loaded</li>
            <li>✅ JavaScript execution working</li>
            <li>✅ DOM manipulation successful</li>
            <li>✅ CSS styling applied</li>
            <li>🕐 Timestamp: ${new Date().toLocaleString()}</li>
            <li>📍 URL: ${window.location.href}</li>
          </ul>
        </div>
        
        <div style="background: rgba(255,193,7,0.3); padding: 20px; border-radius: 10px; margin: 20px 0;">
          <h2>⚠️ Problem Analysis</h2>
          <p>Since vanilla JavaScript works but React doesn't, the issue is likely:</p>
          <ul>
            <li>React library loading failure</li>
            <li>Module import/export issues</li>
            <li>Vite configuration problems</li>
            <li>ES modules compatibility</li>
          </ul>
        </div>
        
        <button onclick="testReactImport()" style="background: rgba(255,255,255,0.2); border: 1px solid rgba(255,255,255,0.3); padding: 12px 24px; border-radius: 8px; color: white; font-size: 16px; cursor: pointer;">
          🧪 Test React Import
        </button>
        
        <div id="react-test" style="margin-top: 20px;"></div>
      </div>
    </div>
  `;

  console.log('✅ Content added to DOM');

  // Add the test function to global scope
  window.testReactImport = function () {
    console.log('🧪 Testing React import...');
    const testDiv = document.getElementById('react-test');

    import('react')
      .then((React) => {
        console.log('✅ React imported:', React);
        testDiv.innerHTML =
          '<div style="background: rgba(76,175,80,0.3); padding: 15px; border-radius: 8px; margin-top: 10px;"><strong>✅ React import successful!</strong><br/>Version: ' +
          (React.version || 'Unknown') +
          '</div>';

        // Test ReactDOM
        return import('react-dom/client');
      })
      .then((ReactDOM) => {
        console.log('✅ ReactDOM imported:', ReactDOM);
        testDiv.innerHTML +=
          '<div style="background: rgba(76,175,80,0.3); padding: 15px; border-radius: 8px; margin-top: 10px;"><strong>✅ ReactDOM import successful!</strong></div>';

        // Try to create a React element
        return import('react').then((React) => {
          const element = React.createElement(
            'div',
            {
              style: {
                background: 'rgba(33,150,243,0.3)',
                padding: '15px',
                borderRadius: '8px',
                marginTop: '10px',
              },
            },
            '🎉 React element created successfully!',
          );

          const tempRoot = ReactDOM.createRoot(
            testDiv.querySelector('#temp-react') ||
              (() => {
                const div = document.createElement('div');
                div.id = 'temp-react';
                testDiv.appendChild(div);
                return div;
              })(),
          );

          tempRoot.render(element);
          console.log('✅ React element rendered!');
        });
      })
      .catch((error) => {
        console.error('❌ React import/render failed:', error);
        testDiv.innerHTML =
          '<div style="background: rgba(244,67,54,0.3); padding: 15px; border-radius: 8px; margin-top: 10px;"><strong>❌ React test failed:</strong><br/>' +
          error.message +
          '</div>';
      });
  };
} else {
  console.error('❌ Root element not found!');
  document.body.innerHTML =
    '<h1 style="color: red; font-family: Arial;">❌ ROOT ELEMENT NOT FOUND</h1>';
}

console.log('🧪 Vanilla JS test complete');
