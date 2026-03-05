import React from 'react';
import { TaskFeed } from './components/TaskFeed';

function App() {
  return (
    <div style={{ padding: '20px', fontFamily: 'system-ui, sans-serif', background: '#f9f9f9', minHeight: '100vh' }}>
      <header style={{ borderBottom: '1px solid #ddd', marginBottom: '20px', paddingBottom: '10px' }}>
        <h1 style={{ margin: 0, color: '#333' }}>Switchboard Console</h1>
        <p style={{ margin: 0, color: '#666' }}>Governance & Approval Queue</p>
      </header>
      <main>
        <TaskFeed />
      </main>
    </div>
  );
}

export default App;
