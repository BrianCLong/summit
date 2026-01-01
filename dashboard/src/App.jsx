import React, { useState, useEffect } from 'react';
import StatusCards from './StatusCards.jsx';
import MetricsCharts from './MetricsCharts.jsx';
import AcceptanceCriteria from './AcceptanceCriteria.jsx';
import GoNoGoDecision from './GoNoGoDecision.jsx';
import './App.css';

const App = () => {
  const [lastUpdated, setLastUpdated] = useState(new Date());

  useEffect(() => {
    // Update timestamp every minute
    const interval = setInterval(() => {
      setLastUpdated(new Date());
    }, 60000);

    return () => clearInterval(interval);
  }, []);

  return (
    <div className="app">
      <header className="header">
        <h1>IntelGraph GA Core</h1>
        <p>Go/No-Go Dashboard - Release Readiness Metrics</p>
      </header>

      <div className="container">
        <StatusCards />
        <MetricsCharts />
        <AcceptanceCriteria />
        <GoNoGoDecision />
        
        <div className="last-updated">
          Last updated: {lastUpdated.toLocaleString()}
        </div>
      </div>
    </div>
  );
};

export default App;