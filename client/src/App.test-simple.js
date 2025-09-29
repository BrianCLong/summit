import React from 'react';

function App() {
  console.log('🧪 Simple test app rendering...');
  
  return (
    <div style={{ 
      padding: '40px', 
      background: 'linear-gradient(135deg, #e3f2fd 0%, #f5f5f5 100%)',
      minHeight: '100vh',
      fontFamily: 'Arial, sans-serif'
    }}>
      <h1 style={{ color: '#1976d2' }}>🚀 IntelGraph Platform - Test Mode</h1>
      <p style={{ fontSize: '18px', color: '#666' }}>
        ✅ React is working! If you can see this, the basic app is functional.
      </p>
      <div style={{ 
        background: 'white', 
        padding: '20px', 
        borderRadius: '8px', 
        boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
        marginTop: '20px'
      }}>
        <h2>🔧 Debug Information</h2>
        <ul>
          <li>✅ HTML loaded successfully</li>
          <li>✅ JavaScript execution working</li>
          <li>✅ React component rendering</li>
          <li>✅ CSS styles applied</li>
          <li>🕐 Timestamp: {new Date().toLocaleString()}</li>
        </ul>
      </div>
      <button 
        onClick={() => alert('Button click works! 🎉')}
        style={{
          background: '#1976d2',
          color: 'white',
          padding: '12px 24px',
          border: 'none',
          borderRadius: '4px',
          fontSize: '16px',
          cursor: 'pointer',
          marginTop: '20px'
        }}
      >
        🧪 Test Interaction
      </button>
    </div>
  );
}

export default App;