import { useState, useEffect } from 'react';
import Graph from './Graph';
import TimelinePanel from './TimelinePanel';
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
}

interface GraphData {
  nodes: NodeElement[];
  edges: EdgeElement[];
}

interface RawNode {
  id?: string;
  label?: string;
  properties?: {
    text?: string;
    name?: string;
    deception_score?: number;
  };
}

interface RawEdge {
  source?: string;
  target?: string;
  type?: string;
}

interface RawGraphResponse {
  nodes?: RawNode[];
  edges?: RawEdge[];
}

const asArray = <T,>(value: T[] | unknown): T[] =>
  Array.isArray(value) ? value : [];

function App() {
  const [graphData, setGraphData] = useState<GraphData>({
    nodes: [],
    edges: [],
  });
  const [neighborhoodMode, setNeighborhoodMode] = useState<boolean>(false);
  const [events, setEvents] = useState<EventItem[]>([]);

  useEffect(() => {
    fetch('/api/graph')
      .then((res) => res.json())
      .then((data: RawGraphResponse) => {
        const formattedNodes = asArray<RawNode>(data?.nodes).map((n) => ({
          data: {
            id: n.id || '',
            label: n.properties?.text || n.properties?.name || n.id || '',
            type: n.label || 'unknown',
            deception_score: n.properties?.deception_score || 0,
          },
        }));
        const formattedEdges = asArray<RawEdge>(data?.edges)
          .filter((e) => Boolean(e.source) && Boolean(e.target))
          .map((e) => ({
            data: {
              source: e.source as string,
              target: e.target as string,
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
      .then((data: unknown) => setEvents(asArray<EventItem>(data)))
      .catch(() => setEvents([]));
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
