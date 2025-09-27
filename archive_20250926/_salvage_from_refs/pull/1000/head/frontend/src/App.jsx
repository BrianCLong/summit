import { useState, useEffect } from "react";
import Graph from "./Graph";
import AdminPanel from "./AdminPanel";
import "./App.css";

function App() {
  const [graphData, setGraphData] = useState({ nodes: [], edges: [] });
  const [neighborhoodMode, setNeighborhoodMode] = useState(false);
  const [forecastMode, setForecastMode] = useState(false);
  const [forecastEdges, setForecastEdges] = useState([]);
  const [timeline, setTimeline] = useState(0);
  const [showAdmin, setShowAdmin] = useState(false);

  useEffect(() => {
    fetch("/api/graph")
      .then((res) => res.json())
      .then((data) => {
        const formattedNodes = data.nodes.map((n) => ({
          data: {
            id: n.id,
            label: n.properties.text || n.properties.name,
            type: n.label,
          },
        }));
        const formattedEdges = data.edges.map((e) => ({
          data: { source: e.source, target: e.target, label: e.type },
        }));
        setGraphData({ nodes: formattedNodes, edges: formattedEdges });
      })
      .catch((err) => console.error("Failed to fetch graph data:", err));
  }, []);

  const combinedEdges = [
    ...graphData.edges,
    ...forecastEdges.slice(0, timeline).map((e, idx) => ({
      data: {
        id: `f-${idx}`,
        source: e.source,
        target: e.target,
        label: `ETA: ${e.timestamp}`,
      },
      classes: "forecast",
    })),
  ];

  return (
    <div className="App">
      <header className="App-header">
        <h1>IntelGraph</h1>
        <button onClick={() => setNeighborhoodMode((m) => !m)}>
          {neighborhoodMode ? "Show Full Graph" : "Neighborhood Mode"}
        </button>
        <button
          onClick={() => {
            const next = !forecastMode;
            setForecastMode(next);
            if (next && forecastEdges.length === 0) {
              fetch("/api/forecast/graph", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                  entity_id: "a",
                  past_window: 14,
                  future_window: 30,
                }),
              })
                .then((res) => res.json())
                .then((data) => {
                  setForecastEdges(data.edges || []);
                  setTimeline(data.edges.length);
                })
                .catch((err) =>
                  console.error("Failed to fetch forecast:", err),
                );
            }
          }}
        >
          {forecastMode ? "Hide Forecast" : "Forecast View"}
        </button>
        <button onClick={() => setShowAdmin((s) => !s)}>Admin Panel</button>
      </header>
      <main>
        {forecastMode && (
          <input
            type="range"
            min="0"
            max={forecastEdges.length}
            value={timeline}
            onChange={(e) => setTimeline(Number(e.target.value))}
          />
        )}
        <Graph
          elements={{ nodes: graphData.nodes, edges: combinedEdges }}
          neighborhoodMode={neighborhoodMode}
        />
        {showAdmin && <AdminPanel />}
      </main>
    </div>
  );
}

export default App;
