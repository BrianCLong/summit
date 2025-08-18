import { useState, useEffect } from 'react';
import Graph from './Graph';
import TimelinePanel from './TimelinePanel';
import './App.css';

function App() {
  const [graphData, setGraphData] = useState({ nodes: [], edges: [] });
  const [neighborhoodMode, setNeighborhoodMode] = useState(false);
  const [events, setEvents] = useState([]);

  useEffect(() => {
    fetch('/api/graph')
      .then((res) => res.json())
      .then((data) => {
        const formattedNodes = data.nodes.map((n) => ({
          data: {
            id: n.id,
            label: n.properties.text || n.properties.name,
            type: n.label,
            deception_score: n.properties.deception_score || 0
          }
        }));
        const formattedEdges = data.edges.map((e) => ({
          data: { source: e.source, target: e.target, label: e.type }
        }));
        setGraphData({ nodes: formattedNodes, edges: formattedEdges });
      })
      .catch((err) => console.error('Failed to fetch graph data:', err));
  }, []);

  useEffect(() => {
    fetch('/api/agent-actions')
      .then((res) => res.json())
      .then((data) => setEvents(data))
      .catch((err) => console.error('Failed to fetch agent actions:', err));
  }, []);

  return (
    <div className="App">
      <header className="App-header">
        <h1>IntelGraph</h1>
        <button onClick={() => setNeighborhoodMode((m) => !m)}>
          {neighborhoodMode ? 'Show Full Graph' : 'Neighborhood Mode'}
        </button>
      </header>
      <main>
        <Graph elements={graphData} neighborhoodMode={neighborhoodMode} />
        <TimelinePanel events={events} />
      </main>
    </div>
  );
}

export default App;
