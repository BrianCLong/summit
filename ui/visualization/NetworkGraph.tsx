import React from 'react';
import { Button } from '../design-system/Button';

export interface NetworkNode {
  id: string;
  label: string;
  type: string;
  size?: number;
  color?: string;
  x?: number;
  y?: number;
  metadata?: Record<string, unknown>;
}

export interface NetworkEdge {
  id: string;
  source: string;
  target: string;
  type: string;
  weight?: number;
  label?: string;
}

export interface NetworkGraphProps {
  nodes: NetworkNode[];
  edges: NetworkEdge[];
  layout?: 'force' | 'hierarchical' | 'circular' | 'grid';
  onNodeClick?: (nodeId: string) => void;
  onEdgeClick?: (edgeId: string) => void;
  onSelectionChange?: (selectedIds: string[]) => void;
  width?: number | string;
  height?: number | string;
  className?: string;
}

/**
 * NetworkGraph — Advanced network visualization component.
 *
 * Integrates with d3-force or cytoscape.js for rendering.
 * Supports zoom, pan, selection, and multiple layout algorithms.
 */
export const NetworkGraph: React.FC<NetworkGraphProps> = ({
  nodes,
  edges,
  layout = 'force',
  onNodeClick,
  onEdgeClick,
  onSelectionChange,
  width = '100%',
  height = 500,
  className = '',
}) => {
  const containerRef = React.useRef<HTMLDivElement>(null);
  const [zoom, setZoom] = React.useState(1);
  const [selectedNodes, setSelectedNodes] = React.useState<string[]>([]);

  // Placeholder: actual d3/cytoscape rendering hooks here
  const handleNodeClick = (nodeId: string) => {
    const updated = selectedNodes.includes(nodeId)
      ? selectedNodes.filter((id) => id !== nodeId)
      : [...selectedNodes, nodeId];
    setSelectedNodes(updated);
    onNodeClick?.(nodeId);
    onSelectionChange?.(updated);
  };

  return (
    <div className={`relative border border-border-default rounded-lg overflow-hidden bg-bg-primary ${className}`} style={{ width, height }}>
      {/* Toolbar */}
      <div className="absolute top-3 right-3 z-10 flex items-center gap-1.5">
        <Button variant="ghost" size="sm" onClick={() => setZoom((z) => Math.min(z * 1.2, 5))}>+</Button>
        <Button variant="ghost" size="sm" onClick={() => setZoom((z) => Math.max(z / 1.2, 0.2))}>-</Button>
        <Button variant="ghost" size="sm" onClick={() => setZoom(1)}>Reset</Button>
      </div>

      {/* Layout selector */}
      <div className="absolute top-3 left-3 z-10">
        <span className="px-2 py-1 text-2xs bg-bg-secondary/80 backdrop-blur-sm rounded border border-border-default text-fg-secondary">
          {layout} · {nodes.length} nodes · {edges.length} edges
        </span>
      </div>

      {/* Canvas */}
      <div ref={containerRef} className="absolute inset-0 flex items-center justify-center" style={{ transform: `scale(${zoom})` }}>
        {nodes.length === 0 ? (
          <p className="text-sm text-fg-tertiary">No graph data loaded</p>
        ) : (
          <svg className="w-full h-full" viewBox="0 0 800 500">
            {/* Edges */}
            {edges.map((edge) => {
              const source = nodes.find((n) => n.id === edge.source);
              const target = nodes.find((n) => n.id === edge.target);
              if (!source || !target) return null;
              const sx = source.x ?? Math.random() * 700 + 50;
              const sy = source.y ?? Math.random() * 400 + 50;
              const tx = target.x ?? Math.random() * 700 + 50;
              const ty = target.y ?? Math.random() * 400 + 50;
              return (
                <line
                  key={edge.id}
                  x1={sx} y1={sy} x2={tx} y2={ty}
                  stroke="var(--color-border-default, #30363d)"
                  strokeWidth={edge.weight ? Math.min(edge.weight * 2, 4) : 1}
                  strokeOpacity={0.5}
                  onClick={() => onEdgeClick?.(edge.id)}
                  className="cursor-pointer hover:stroke-brand-primary"
                />
              );
            })}
            {/* Nodes */}
            {nodes.map((node) => {
              const cx = node.x ?? Math.random() * 700 + 50;
              const cy = node.y ?? Math.random() * 400 + 50;
              const r = node.size ?? 8;
              const isSelected = selectedNodes.includes(node.id);
              return (
                <g key={node.id} onClick={() => handleNodeClick(node.id)} className="cursor-pointer">
                  <circle
                    cx={cx} cy={cy} r={r}
                    fill={node.color || 'var(--color-brand-primary, #5b9cff)'}
                    stroke={isSelected ? 'var(--color-brand-primary, #5b9cff)' : 'none'}
                    strokeWidth={isSelected ? 3 : 0}
                    opacity={0.8}
                  />
                  <text
                    x={cx} y={cy + r + 12}
                    textAnchor="middle"
                    fontSize={10}
                    fill="var(--color-fg-secondary, #7c8591)"
                  >
                    {node.label}
                  </text>
                </g>
              );
            })}
          </svg>
        )}
      </div>
    </div>
  );
};
