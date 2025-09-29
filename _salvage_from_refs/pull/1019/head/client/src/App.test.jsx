import React from 'react';

function TestApp() {
  return (
    <div style={{ padding: '20px', backgroundColor: 'lightblue' }}>
      <h1>IntelGraph Test App</h1>
      <p>If you can see this, React is working!</p>
      <div style={{ backgroundColor: 'white', padding: '10px', margin: '10px 0' }}>
        <strong>Test Status:</strong> React app successfully mounted!
      </div>
    </div>
  );
}

export default TestApp;