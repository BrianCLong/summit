// conductor-ui/frontend/src/views/GraphExplorerView.tsx
// Appending Server-Saved Views functionality
import React, { useState, useEffect, useCallback } from 'react';
import { SloHintBadge } from '../components/graph/SloHintBadge';

type Node = { id: string; label: string; type: string };
type Edge = { id: string; source: string; target: string };
type SavedView = { id: string; name: string; nodes: Node[]; edges: Edge[] };

const fetchGraphNeighbors = async (
  nodeId: string,
): Promise<{ nodes: Node[]; edges: Edge[]; latencyMs: number }> => {
  console.log(`Fetching neighbors for ${nodeId}...`);
  await new Promise((res) => setTimeout(res, 350));
  return {
    nodes: [{ id: `neighbor-${Math.random()}`, label: 'Neighbor', type: 'IP' }],
    edges: [
      {
        id: `edge-${Math.random()}`,
        source: nodeId,
        target: `neighbor-${Math.random()}`,
      },
    ],
    latencyMs: 350,
  };
};

const fetchSavedViews = async (): Promise<SavedView[]> => {
  return [
    { id: 'view-1', name: 'My Saved Investigation', nodes: [], edges: [] },
  ];
};

export const GraphExplorerView = () => {
  const [query, setQuery] = useState('');
  const [nodes, setNodes] = useState<Node[]>([
    { id: 'start-node', label: 'Start Node', type: 'Domain' },
  ]);
  const [edges, setEdges] = useState<Edge[]>([]);
  const [latency, setLatency] = useState<number | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [savedViews, setSavedViews] = useState<SavedView[]>([]);

  useEffect(() => {
    fetchSavedViews().then(setSavedViews);
  }, []);

  const handleExpandNode = useCallback(async (nodeId: string) => {
    setIsLoading(true);
    const result = await fetchGraphNeighbors(nodeId);
    setNodes((prev) => [...prev, ...result.nodes]);
    setEdges((prev) => [...prev, ...result.edges]);
    setLatency(result.latencyMs);
    setIsLoading(false);
  }, []);

  return (
    <div>
      <h1>Graph Explorer</h1>
      <div>
        <h3>Saved Views</h3>
        <ul>
          {savedViews.map((v) => (
            <li key={v.id}>{v.name}</li>
          ))}
        </ul>
        <button>Save Current View</button>
      </div>
      <hr />
      <div style={{ marginBottom: '1rem' }}>
        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search for an entity..."
        />
        <button onClick={() => handleExpandNode(query)}>Search & Expand</button>
      </div>

      {isLoading && <p>Loading...</p>}
      {latency !== null && <SloHintBadge latencyMs={latency} sloMs={300} />}

      <div
        style={{
          border: '1px solid grey',
          height: '500px',
          position: 'relative',
        }}
      >
        <p style={{ padding: '1rem' }}>Graph visualization area.</p>
        <ul>
          {nodes.map((n) => (
            <li key={n.id}>
              {n.label} ({n.type})
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
};
