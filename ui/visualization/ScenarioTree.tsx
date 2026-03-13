import React from 'react';

export interface ScenarioNode {
  id: string;
  label: string;
  probability?: number;
  value?: number;
  children?: ScenarioNode[];
  status?: 'default' | 'selected' | 'optimal' | 'suboptimal';
}

export interface ScenarioTreeProps {
  root: ScenarioNode;
  onNodeSelect?: (nodeId: string) => void;
  width?: number | string;
  height?: number;
  className?: string;
}

/**
 * ScenarioTree — Branching scenario visualization.
 *
 * Renders decision trees with probability annotations,
 * outcome coloring, and interactive path selection.
 * Production implementation uses d3-hierarchy for layout.
 */
export const ScenarioTree: React.FC<ScenarioTreeProps> = ({
  root,
  onNodeSelect,
  width = '100%',
  height = 400,
  className = '',
}) => {
  const statusColors: Record<string, string> = {
    default: '#7c8591',
    selected: '#5b9cff',
    optimal: '#28a745',
    suboptimal: '#d29922',
  };

  const renderNode = (node: ScenarioNode, x: number, y: number, level: number, maxWidth: number): React.ReactNode => {
    const hasChildren = node.children && node.children.length > 0;
    const childCount = node.children?.length ?? 0;
    const childWidth = maxWidth / Math.max(childCount, 1);

    return (
      <g key={node.id}>
        {/* Node circle */}
        <circle
          cx={x} cy={y} r={20}
          fill={statusColors[node.status || 'default']}
          opacity={0.2}
          stroke={statusColors[node.status || 'default']}
          strokeWidth={2}
          className="cursor-pointer"
          onClick={() => onNodeSelect?.(node.id)}
        />
        <text x={x} y={y + 4} textAnchor="middle" fontSize={9} fill="var(--color-fg-primary, #e6edf3)" fontWeight="bold">
          {node.label.slice(0, 6)}
        </text>
        {node.probability !== undefined && (
          <text x={x} y={y - 28} textAnchor="middle" fontSize={8} fill="var(--color-fg-tertiary, #484f58)">
            {(node.probability * 100).toFixed(0)}%
          </text>
        )}

        {/* Children */}
        {hasChildren && node.children!.map((child, i) => {
          const childX = x - (maxWidth / 2) + childWidth * (i + 0.5);
          const childY = y + 80;
          return (
            <g key={child.id}>
              <line
                x1={x} y1={y + 20} x2={childX} y2={childY - 20}
                stroke="var(--color-border-default, #30363d)"
                strokeWidth={1.5}
                strokeDasharray={child.status === 'suboptimal' ? '4,4' : undefined}
              />
              {renderNode(child, childX, childY, level + 1, childWidth)}
            </g>
          );
        })}
      </g>
    );
  };

  return (
    <div className={`border border-border-default rounded-lg overflow-hidden bg-bg-primary ${className}`} style={{ width }}>
      <svg width="100%" height={height} viewBox={`0 0 800 ${height}`}>
        {renderNode(root, 400, 40, 0, 700)}
      </svg>
    </div>
  );
};
