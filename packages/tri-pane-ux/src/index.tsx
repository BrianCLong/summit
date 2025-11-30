import React, { useState } from 'react';

export interface TriPaneState {
  selectedNodes: string[];
  timeRange: [Date, Date];
  mapBounds: any;
}

export const TriPaneLayout: React.FC = () => {
  const [state, setState] = useState<TriPaneState>({
    selectedNodes: [],
    timeRange: [new Date(), new Date()],
    mapBounds: null,
  });

  return (
    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '10px', height: '100vh' }}>
      <div style={{ border: '1px solid #ccc', padding: '10px' }}>
        <h3>Graph</h3>
        <p>Selected: {state.selectedNodes.join(', ')}</p>
      </div>
      <div style={{ border: '1px solid #ccc', padding: '10px' }}>
        <h3>Timeline</h3>
        <p>Range: {state.timeRange[0].toISOString()} - {state.timeRange[1].toISOString()}</p>
      </div>
      <div style={{ border: '1px solid #ccc', padding: '10px' }}>
        <h3>Map</h3>
        <p>Bounds: {JSON.stringify(state.mapBounds)}</p>
      </div>
      <div style={{ gridColumn: '1 / -1', border: '1px solid #ccc', padding: '10px' }}>
        <h4>Explain this View</h4>
        <p>Lineage: Why these entities are visible (policy, lineage, topology)</p>
        <p>Metrics: Betweenness, communities</p>
        <p>What changed: Diff between saved views</p>
      </div>
    </div>
  );
};

export default TriPaneLayout;
