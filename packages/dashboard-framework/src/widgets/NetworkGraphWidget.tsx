import React from 'react';
import { NetworkGraphWidgetConfig } from '../types';

export interface NetworkGraphWidgetProps {
  config: NetworkGraphWidgetConfig;
  nodes?: any[];
  edges?: any[];
  onNodeClick?: (node: any) => void;
  onEdgeClick?: (edge: any) => void;
}

export function NetworkGraphWidget({
  config,
  nodes = [],
  edges = [],
  onNodeClick,
  onEdgeClick,
}: NetworkGraphWidgetProps) {
  const { layout = 'force', physics = true, clustering = false } = config;

  // Placeholder implementation - actual would use Cytoscape.js or D3-force
  return (
    <div className="network-graph-widget" style={containerStyle}>
      <svg width="100%" height="100%" viewBox="0 0 400 300">
        {/* Simple placeholder visualization */}
        <g transform="translate(200, 150)">
          {/* Draw some placeholder edges */}
          {edges.slice(0, 20).map((edge, i) => {
            const angle1 = (i * 2 * Math.PI) / Math.max(edges.length, 1);
            const angle2 = ((i + 1) * 2 * Math.PI) / Math.max(edges.length, 1);
            return (
              <line
                key={`edge-${i}`}
                x1={Math.cos(angle1) * 80}
                y1={Math.sin(angle1) * 80}
                x2={Math.cos(angle2) * 80}
                y2={Math.sin(angle2) * 80}
                stroke="#d1d5db"
                strokeWidth={1}
              />
            );
          })}
          {/* Draw placeholder nodes */}
          {nodes.slice(0, 20).map((node, i) => {
            const angle = (i * 2 * Math.PI) / Math.max(nodes.length, 1);
            const r = 80;
            return (
              <circle
                key={`node-${i}`}
                cx={Math.cos(angle) * r}
                cy={Math.sin(angle) * r}
                r={8}
                fill="#3b82f6"
                stroke="white"
                strokeWidth={2}
                style={{ cursor: 'pointer' }}
                onClick={() => onNodeClick?.(node)}
              />
            );
          })}
          {/* Center node */}
          {nodes.length > 0 && (
            <circle cx={0} cy={0} r={12} fill="#10b981" stroke="white" strokeWidth={2} />
          )}
        </g>
        {/* Info text */}
        <text x="200" y="280" textAnchor="middle" fill="#6b7280" fontSize={12}>
          {nodes.length} nodes | {edges.length} edges | {layout} layout
        </text>
      </svg>
    </div>
  );
}

const containerStyle: React.CSSProperties = {
  width: '100%',
  height: '100%',
  backgroundColor: '#fafafa',
  borderRadius: '4px',
};
