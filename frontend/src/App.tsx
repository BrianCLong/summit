import { useState, useEffect } from 'react';
import Graph from './Graph';
import TimelinePanel from './TimelinePanel';
import CoworkPanel from './CoworkPanel';
import './App.css';

interface EventItem {
  id: string;
  action: string;
  confidence: number;
  result: string;
}

interface NodeElement {
  data: {
    id: string;
    label: string;
    type: string;
    deception_score: number;
  };
}

interface EdgeElement {
  data: {
    source: string;
    target: string;
    label: string;
  };
  classes?: string;
  id?: string;
}

interface GraphData {
  nodes: NodeElement[];
  edges: EdgeElement[];
}

function App() {
  const [graphData, setGraphData] = useState<GraphData>({
    nodes: [],
    edges: [],
  });
  const [neighborhoodMode, setNeighborhoodMode] = useState<boolean>(false);
  const [showCowork, setShowCowork] = useState<boolean>(false);
  const [events, setEvents] = useState<EventItem[]>([]);

  // Forecast state
  const [showForecast, setShowForecast] = useState<boolean>(false);
  const [forecastEdges, setForecastEdges] = useState<EdgeElement[]>([]);
  const [forecastIndex, setForecastIndex] = useState<number>(0);

  useEffect(() => {
    fetch('/api/graph')
      .then((res) => res.json())
      .then((data) => {
        const formattedNodes = data.nodes.map((n: any) => ({
          data: {
            id: n.id,
            label: n.properties.text || n.properties.name,
            type: n.label,
            deception_score: n.properties.deception_score || 0,
          },
        }));
        const formattedEdges = data.edges.map((e: any) => ({
          data: { source: e.source, target: e.target, label: e.type },
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

  const toggleForecast = () => {
    const next = !showForecast;
    setShowForecast(next);
    if (next && forecastEdges.length === 0) {
      const entityId = graphData.nodes[0]?.data.id;
      if (!entityId) return;
      fetch(
        `/api/forecast/graph?entity_id=${entityId}&past_days=14&future_days=30`,
      )
        .then((res) => res.json())
        .then((data) => {
          const formatted = data.edges.map((e: any, idx: number) => ({
            data: {
              source: e.source,
              target: e.target,
              label: `ETA: ${e.timestamp}`,
            },
            classes: 'forecast',
            id: `forecast-${idx}`,
          }));
          setForecastEdges(formatted);
          setForecastIndex(formatted.length - 1);
        })
        .catch((err) => console.error('Failed to fetch forecast:', err));
    }
  };

  const displayedForecastEdges = showForecast
    ? forecastEdges.slice(0, forecastIndex + 1)
    : [];
  const combinedEdges = graphData.edges.concat(displayedForecastEdges);

  return (
    <div className="App">
      <header className="App-header">
        <h1>IntelGraph</h1>
        <div style={{ display: 'flex', gap: '10px' }}>
          <button onClick={() => setNeighborhoodMode((m) => !m)}>
            {neighborhoodMode ? 'Show Full Graph' : 'Neighborhood Mode'}
          </button>
          {!showCowork && (
            <button onClick={toggleForecast}>
              {showForecast ? 'Hide Forecast' : 'Forecast View'}
            </button>
          )}
          <button
            onClick={() => {
               setShowCowork((s) => !s);
               if (!showCowork) setShowForecast(false); // Disable forecast when entering cowork
            }}
            style={{ backgroundColor: showCowork ? '#da552f' : undefined }}
          >
            {showCowork ? 'Exit Cowork' : 'Cowork View'}
          </button>
        </div>
      </header>
      <main>
        {showCowork ? (
          <CoworkPanel events={events} />
        ) : (
          <>
            <Graph elements={{ nodes: graphData.nodes, edges: combinedEdges }} neighborhoodMode={neighborhoodMode} />
            {showForecast && forecastEdges.length > 0 && (
              <input
                type="range"
                min="0"
                max={forecastEdges.length - 1}
                value={forecastIndex}
                onChange={(e) => setForecastIndex(Number(e.target.value))}
                style={{
                  position: 'absolute',
                  bottom: '20px',
                  left: '50%',
                  transform: 'translateX(-50%)',
                  zIndex: 1000,
                  width: '300px'
                }}
              />
            )}
            <TimelinePanel events={events} />
          </>
        )}
      </main>
    </div>
  );
}

export default App;
