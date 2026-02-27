import { useState, useEffect } from 'react';
import Graph from './Graph';
import TimelinePanel from './TimelinePanel';
import './App.css';

const asArray = (value) => (Array.isArray(value) ? value : []);

function App() {
  const [graphData, setGraphData] = useState({ nodes: [], edges: [] });
  const [neighborhoodMode, setNeighborhoodMode] = useState(false);
  const [events, setEvents] = useState([]);
  const [showForecast, setShowForecast] = useState(false);
  const [forecastEdges, setForecastEdges] = useState([]);
  const [forecastIndex, setForecastIndex] = useState(0);

  useEffect(() => {
    fetch('/api/graph')
      .then((res) => res.json())
      .then((data) => {
        const formattedNodes = asArray(data?.nodes).map((n) => ({
          data: {
            id: n?.id || '',
            label: n?.properties?.text || n?.properties?.name || n?.id || '',
            type: n?.label || 'unknown',
            deception_score: n?.properties?.deception_score || 0,
          },
        }));
        const formattedEdges = asArray(data?.edges)
          .filter((e) => e?.source && e?.target)
          .map((e) => ({
            data: {
              source: e.source,
              target: e.target,
              label: e.type || 'related_to',
            },
          }));
        setGraphData({ nodes: formattedNodes, edges: formattedEdges });
      })
      .catch(() => setGraphData({ nodes: [], edges: [] }));
  }, []);

  useEffect(() => {
    fetch('/api/agent-actions')
      .then((res) => res.json())
      .then((data) => setEvents(asArray(data)))
      .catch(() => setEvents([]));
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
          const formatted = asArray(data?.edges).map((e, idx) => ({
            data: {
              source: e?.source,
              target: e?.target,
              label: `ETA: ${e?.timestamp || 'Unknown'}`,
            },
            classes: 'forecast',
            id: `forecast-${idx}`,
          }));
          setForecastEdges(formatted);
          setForecastIndex(formatted.length - 1);
        })
        .catch(() => {
          setForecastEdges([]);
          setForecastIndex(0);
        });
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
        <button
          onClick={() => setNeighborhoodMode((m) => !m)}
          aria-pressed={neighborhoodMode}
        >
          {neighborhoodMode ? 'Show Full Graph' : 'Neighborhood Mode'}
        </button>
        <button onClick={toggleForecast} aria-pressed={showForecast}>
          {showForecast ? 'Hide Forecast' : 'Forecast View'}
        </button>
      </header>
      <main>
        <Graph
          elements={{ nodes: graphData.nodes, edges: combinedEdges }}
          neighborhoodMode={neighborhoodMode}
        />
        {showForecast && forecastEdges.length > 0 && (
          <div style={{ padding: '10px 0' }}>
            <label
              htmlFor="forecast-slider"
              style={{ display: 'block', marginBottom: '5px' }}
            >
              Forecast Timeline:{' '}
              {forecastEdges[forecastIndex]?.data?.label?.replace(
                'ETA: ',
                '',
              ) || 'Unknown'}
            </label>
            <input
              id="forecast-slider"
              type="range"
              min="0"
              max={forecastEdges.length - 1}
              value={forecastIndex}
              onChange={(e) => setForecastIndex(Number(e.target.value))}
              style={{ width: '100%' }}
              aria-valuemin={0}
              aria-valuemax={forecastEdges.length - 1}
              aria-valuenow={forecastIndex}
              aria-valuetext={forecastEdges[forecastIndex]?.data?.label}
            />
          </div>
        )}
        <TimelinePanel events={events} />
      </main>
    </div>
  );
}

export default App;
