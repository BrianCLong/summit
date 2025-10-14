console.log('🧪 MINIMAL TEST STARTING...');

// Test 1: Basic JavaScript
console.log('✅ JavaScript execution works');

// Test 2: DOM access
const root = document.getElementById('root');
console.log('Root element:', root);

// Test 3: Direct innerHTML
if (root) {
  root.innerHTML = '<h1 style="color: blue; font-family: Arial;">🧪 MINIMAL TEST WORKING!</h1>';
  console.log('✅ Direct DOM manipulation works');
} else {
  console.error('❌ Root element not found');
}

// Test 4: Try importing React
console.log('🧪 Testing React import...');

// Use dynamic import to catch errors
import('react').then(React => {
  console.log('✅ React imported successfully:', React);
  
  // Test React.createElement
  const element = React.createElement('div', {
    style: { padding: '20px', background: 'green', color: 'white' }
  }, '✅ React createElement works!');
  
  console.log('React element created:', element);
  
  // Import ReactDOM
  return import('react-dom/client').then(ReactDOM => {
    console.log('✅ ReactDOM imported successfully');
    
    // Try to render
    const reactRoot = ReactDOM.createRoot(root);
    reactRoot.render(element);
    
    console.log('✅ React render attempted');
  });
  
}).catch(error => {
  console.error('❌ React import/render failed:', error);
  
  if (root) {
    root.innerHTML += `
      <div style="background: red; color: white; padding: 20px; margin-top: 10px;">
        <h2>❌ React Import Failed</h2>
        <p>Error: ${error.message}</p>
        <pre>${error.stack}</pre>
      </div>
    `;
  }
});

console.log('🧪 Minimal test setup complete');