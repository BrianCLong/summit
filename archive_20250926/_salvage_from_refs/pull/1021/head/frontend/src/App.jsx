import { useState, useEffect } from 'react'
import Graph from './Graph'
import './App.css'

function App() {
  const [graphData, setGraphData] = useState({ nodes: [], edges: [] });

  useEffect(() => {
    fetch('/api/graph')
      .then((res) => res.json())
      .then((data) => {
        const formattedNodes = data.nodes.map(n => ({ data: { id: n.id, label: n.properties.text || n.properties.name, type: n.label } }));
        const formattedEdges = data.edges.map(e => ({ data: { source: e.source, target: e.target, label: e.type } }));
        setGraphData({ nodes: formattedNodes, edges: formattedEdges });
      })
      .catch(err => console.error("Failed to fetch graph data:", err));
  }, []);

  return (
    <div className="App">
      <header className="App-header">
        <h1>IntelGraph</h1>
      </header>
      <main>
        <Graph elements={graphData} />
      </main>
    </div>
  )
}

export default App
