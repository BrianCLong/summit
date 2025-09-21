import { useState, useEffect } from 'react'
import { useDispatch, useSelector } from 'react-redux'
import Graph from './Graph'
import AiOverlayToggle from './AiOverlayToggle'
import './App.css'

function App() {
  const dispatch = useDispatch()
  const graphData = useSelector((s) => ({ nodes: s.nodes, edges: s.edges }))
  const aiOverlay = useSelector((s) => s.aiOverlay)
  const insightNodes = useSelector((s) => s.insightNodes)
  const [neighborhoodMode, setNeighborhoodMode] = useState(false)

  useEffect(() => {
    fetch('/api/graph')
      .then((res) => res.json())
      .then((data) => {
        const formattedNodes = data.nodes.map((n) => ({
          data: { id: n.id, label: n.properties.text || n.properties.name, type: n.label }
        }))
        const formattedEdges = data.edges.map((e) => ({
          data: { source: e.source, target: e.target, label: e.type }
        }))
        dispatch({ type: 'INIT_GRAPH', payload: { nodes: formattedNodes, edges: formattedEdges } })
      })
      .catch((err) => console.error('Failed to fetch graph data:', err))
  }, [dispatch])

  return (
    <div className="App">
      <header className="App-header">
        <h1>IntelGraph</h1>
        <button onClick={() => setNeighborhoodMode((m) => !m)}>
          {neighborhoodMode ? 'Show Full Graph' : 'Neighborhood Mode'}
        </button>
        <AiOverlayToggle />
      </header>
      <main>
        <Graph
          elements={graphData}
          neighborhoodMode={neighborhoodMode}
          aiOverlay={aiOverlay}
          insightNodes={insightNodes}
        />
      </main>
    </div>
  );
}

export default App;
