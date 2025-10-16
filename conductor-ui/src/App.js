import React, { useState, useEffect } from 'react';
import './App.css';

function App() {
  const [health, setHealth] = useState('checking...');
  const [metrics, setMetrics] = useState(null);

  useEffect(() => {
    // Check health
    fetch('/healthz')
      .then((res) => res.text())
      .then((data) => setHealth(data))
      .catch((err) => setHealth('Error: ' + err.message));

    // Get metrics
    fetch('/metrics')
      .then((res) => res.text())
      .then((data) => setMetrics(data.split('\n').slice(0, 10).join('\n')))
      .catch((err) => console.error('Metrics error:', err));
  }, []);

  return (
    <div className="App">
      <header className="App-header">
        <h1>🎭 Maestro Conductor</h1>
        <p>Intelligence Analysis Platform - Development Environment</p>

        <div style={{ marginTop: '2rem', textAlign: 'left' }}>
          <h3>Health Status:</h3>
          <pre
            style={{
              background: '#f0f0f0',
              padding: '1rem',
              borderRadius: '4px',
            }}
          >
            {health}
          </pre>

          {metrics && (
            <>
              <h3>Metrics Sample:</h3>
              <pre
                style={{
                  background: '#f0f0f0',
                  padding: '1rem',
                  borderRadius: '4px',
                  fontSize: '0.8em',
                }}
              >
                {metrics}
              </pre>
            </>
          )}
        </div>

        <div style={{ marginTop: '2rem' }}>
          <h3>Development Links:</h3>
          <ul style={{ listStyle: 'none', padding: 0 }}>
            <li>
              <a
                href="http://localhost:8080/healthz"
                target="_blank"
                rel="noopener noreferrer"
              >
                API Health
              </a>
            </li>
            <li>
              <a
                href="http://localhost:8080/metrics"
                target="_blank"
                rel="noopener noreferrer"
              >
                API Metrics
              </a>
            </li>
            <li>
              <a
                href="http://localhost:9090"
                target="_blank"
                rel="noopener noreferrer"
              >
                Prometheus
              </a>
            </li>
            <li>
              <a
                href="http://localhost:3001"
                target="_blank"
                rel="noopener noreferrer"
              >
                Grafana
              </a>
            </li>
            <li>
              <a
                href="http://localhost:16686"
                target="_blank"
                rel="noopener noreferrer"
              >
                Jaeger
              </a>
            </li>
            <li>
              <a
                href="http://localhost:7474"
                target="_blank"
                rel="noopener noreferrer"
              >
                Neo4j Browser
              </a>
            </li>
          </ul>
        </div>
      </header>
    </div>
  );
}

export default App;
