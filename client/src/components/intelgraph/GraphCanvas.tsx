import React from 'react';

interface Node {
  id: string;
  label: string;
}

interface Edge {
  id: string;
  sourceId: string;
  targetId: string;
  type: string;
}

interface GraphCanvasProps {
  nodes: Node[];
  edges: Edge[];
}

export const GraphCanvas: React.FC<GraphCanvasProps> = ({ nodes, edges }) => {
  return (
    <div className="intelgraph-canvas border p-4 h-96 bg-gray-50 flex items-center justify-center">
      <p className="text-gray-500">
        Graph Canvas (Mock Rendering)<br />
        Nodes: {nodes.length} | Edges: {edges.length}
      </p>
    </div>
  );
};
