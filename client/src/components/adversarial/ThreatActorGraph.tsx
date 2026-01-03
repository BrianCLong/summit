import React, { useState, useMemo, useRef, useEffect } from 'react';
import type { ThreatGraph, GraphNode, GraphEdge, GraphNodeType, GraphRelationType } from './types';

export interface ThreatActorGraphProps {
  graph: ThreatGraph;
  onSelectNode?: (node: GraphNode) => void;
  onSelectEdge?: (edge: GraphEdge) => void;
  selectedNodeId?: string;
  highlightedNodeIds?: string[];
  layout?: 'force' | 'radial' | 'hierarchical';
  showMinimap?: boolean;
  className?: string;
}

const nodeTypeColors: Record<GraphNodeType, string> = {
  adversary: '#8B5CF6',
  technique: '#F59E0B',
  malware: '#EF4444',
  tool: '#10B981',
  campaign: '#3B82F6',
  target: '#EC4899',
  ioc: '#6366F1',
};

const nodeTypeIcons: Record<GraphNodeType, string> = {
  adversary: '\u{1F3AD}',
  technique: '\u2699\uFE0F',
  malware: '\u{1F41B}',
  tool: '\u{1F527}',
  campaign: '\u{1F3AF}',
  target: '\u{1F3E2}',
  ioc: '\u{1F50D}',
};

const relationTypeLabels: Record<GraphRelationType, string> = {
  uses: 'uses',
  targets: 'targets',
  attributed_to: 'attributed to',
  associated_with: 'associated with',
  variant_of: 'variant of',
  delivers: 'delivers',
};

interface NodePosition {
  x: number;
  y: number;
  vx: number;
  vy: number;
}

export const ThreatActorGraph: React.FC<ThreatActorGraphProps> = ({
  graph,
  onSelectNode,
  onSelectEdge,
  selectedNodeId,
  highlightedNodeIds = [],
  layout = 'force',
  showMinimap = true,
  className = '',
}) => {
  const svgRef = useRef<SVGSVGElement>(null);
  const [positions, setPositions] = useState<Record<string, NodePosition>>({});
  const [hoveredNode, setHoveredNode] = useState<GraphNode | null>(null);
  const [hoveredEdge, setHoveredEdge] = useState<GraphEdge | null>(null);
  const [zoom, setZoom] = useState(1);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const [filterNodeType, setFilterNodeType] = useState<GraphNodeType | 'all'>('all');
  const [searchQuery, setSearchQuery] = useState('');

  const width = 800;
  const height = 600;
  const nodeRadius = 24;

  // Initialize positions
  useEffect(() => {
    const newPositions: Record<string, NodePosition> = {};

    graph.nodes.forEach((node, index) => {
      if (layout === 'radial') {
        const angle = (2 * Math.PI * index) / graph.nodes.length;
        const radius = 200;
        newPositions[node.id] = {
          x: width / 2 + radius * Math.cos(angle),
          y: height / 2 + radius * Math.sin(angle),
          vx: 0,
          vy: 0,
        };
      } else if (layout === 'hierarchical') {
        const typeOrder: GraphNodeType[] = [
          'adversary',
          'campaign',
          'technique',
          'malware',
          'tool',
          'target',
          'ioc',
        ];
        const level = typeOrder.indexOf(node.type);
        const nodesAtLevel = graph.nodes.filter((n) => n.type === node.type);
        const indexAtLevel = nodesAtLevel.indexOf(node);
        newPositions[node.id] = {
          x: 100 + (indexAtLevel * (width - 200)) / Math.max(nodesAtLevel.length - 1, 1),
          y: 50 + level * 80,
          vx: 0,
          vy: 0,
        };
      } else {
        newPositions[node.id] = {
          x: Math.random() * (width - 100) + 50,
          y: Math.random() * (height - 100) + 50,
          vx: 0,
          vy: 0,
        };
      }
    });

    setPositions(newPositions);
  }, [graph.nodes, layout, width, height]);

  // Force-directed layout simulation
  useEffect(() => {
    if (layout !== 'force' || Object.keys(positions).length === 0) return;

    let animationId: number;
    let iteration = 0;
    const maxIterations = 100;

    const simulate = () => {
      if (iteration >= maxIterations) return;

      setPositions((prev) => {
        const next = { ...prev };

        // Repulsion between nodes
        graph.nodes.forEach((node1) => {
          graph.nodes.forEach((node2) => {
            if (node1.id === node2.id) return;
            const dx = next[node2.id].x - next[node1.id].x;
            const dy = next[node2.id].y - next[node1.id].y;
            const distance = Math.sqrt(dx * dx + dy * dy) || 1;
            const force = 5000 / (distance * distance);
            next[node1.id].vx -= (dx / distance) * force;
            next[node1.id].vy -= (dy / distance) * force;
          });
        });

        // Attraction along edges
        graph.edges.forEach((edge) => {
          if (!next[edge.source] || !next[edge.target]) return;
          const dx = next[edge.target].x - next[edge.source].x;
          const dy = next[edge.target].y - next[edge.source].y;
          const distance = Math.sqrt(dx * dx + dy * dy) || 1;
          const force = (distance - 100) * 0.01;
          next[edge.source].vx += (dx / distance) * force;
          next[edge.source].vy += (dy / distance) * force;
          next[edge.target].vx -= (dx / distance) * force;
          next[edge.target].vy -= (dy / distance) * force;
        });

        // Center gravity
        graph.nodes.forEach((node) => {
          next[node.id].vx += (width / 2 - next[node.id].x) * 0.001;
          next[node.id].vy += (height / 2 - next[node.id].y) * 0.001;
        });

        // Apply velocity and damping
        graph.nodes.forEach((node) => {
          next[node.id].x += next[node.id].vx * 0.5;
          next[node.id].y += next[node.id].vy * 0.5;
          next[node.id].vx *= 0.8;
          next[node.id].vy *= 0.8;

          // Boundary constraints
          next[node.id].x = Math.max(nodeRadius, Math.min(width - nodeRadius, next[node.id].x));
          next[node.id].y = Math.max(nodeRadius, Math.min(height - nodeRadius, next[node.id].y));
        });

        return next;
      });

      iteration++;
      animationId = requestAnimationFrame(simulate);
    };

    animationId = requestAnimationFrame(simulate);

    return () => cancelAnimationFrame(animationId);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [layout, graph.nodes.length, graph.edges.length]);

  const filteredNodes = useMemo(() => {
    return graph.nodes.filter((node) => {
      if (filterNodeType !== 'all' && node.type !== filterNodeType) return false;
      if (searchQuery) {
        const query = searchQuery.toLowerCase();
        return node.label.toLowerCase().includes(query);
      }
      return true;
    });
  }, [graph.nodes, filterNodeType, searchQuery]);

  const filteredEdges = useMemo(() => {
    const nodeIds = new Set(filteredNodes.map((n) => n.id));
    return graph.edges.filter(
      (edge) => nodeIds.has(edge.source) && nodeIds.has(edge.target)
    );
  }, [graph.edges, filteredNodes]);

  const handleMouseDown = (e: React.MouseEvent) => {
    if (e.target === svgRef.current) {
      setIsDragging(true);
      setDragStart({ x: e.clientX - pan.x, y: e.clientY - pan.y });
    }
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (isDragging) {
      setPan({
        x: e.clientX - dragStart.x,
        y: e.clientY - dragStart.y,
      });
    }
  };

  const handleMouseUp = () => {
    setIsDragging(false);
  };

  const handleWheel = (e: React.WheelEvent) => {
    e.preventDefault();
    const delta = e.deltaY > 0 ? 0.9 : 1.1;
    setZoom((z) => Math.max(0.5, Math.min(2, z * delta)));
  };

  const stats = useMemo(() => {
    const byType: Record<string, number> = {};
    graph.nodes.forEach((node) => {
      byType[node.type] = (byType[node.type] || 0) + 1;
    });
    return {
      nodes: graph.nodes.length,
      edges: graph.edges.length,
      byType,
    };
  }, [graph]);

  return (
    <div className={`bg-white rounded-lg border border-gray-200 ${className}`} data-testid="threat-actor-graph">
      {/* Header */}
      <div className="p-4 border-b border-gray-200">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-gray-900">Threat Actor Relationships</h2>
          <div className="flex items-center gap-4 text-sm text-gray-500">
            <span>{stats.nodes} nodes</span>
            <span>{stats.edges} relationships</span>
          </div>
        </div>

        {/* Controls */}
        <div className="flex flex-wrap gap-3">
          <input
            type="text"
            placeholder="Search nodes..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="px-3 py-2 border border-gray-300 rounded-md text-sm"
          />
          <select
            value={filterNodeType}
            onChange={(e) => setFilterNodeType(e.target.value as GraphNodeType | 'all')}
            className="px-3 py-2 border border-gray-300 rounded-md text-sm"
          >
            <option value="all">All Types</option>
            <option value="adversary">Adversaries</option>
            <option value="technique">Techniques</option>
            <option value="malware">Malware</option>
            <option value="tool">Tools</option>
            <option value="campaign">Campaigns</option>
            <option value="target">Targets</option>
            <option value="ioc">IOCs</option>
          </select>
          <div className="flex items-center gap-2">
            <button
              className="px-3 py-2 border border-gray-300 rounded-md text-sm hover:bg-gray-50"
              onClick={() => setZoom((z) => Math.min(2, z * 1.2))}
            >
              +
            </button>
            <span className="text-sm text-gray-600">{Math.round(zoom * 100)}%</span>
            <button
              className="px-3 py-2 border border-gray-300 rounded-md text-sm hover:bg-gray-50"
              onClick={() => setZoom((z) => Math.max(0.5, z / 1.2))}
            >
              -
            </button>
            <button
              className="px-3 py-2 border border-gray-300 rounded-md text-sm hover:bg-gray-50"
              onClick={() => {
                setZoom(1);
                setPan({ x: 0, y: 0 });
              }}
            >
              Reset
            </button>
          </div>
        </div>
      </div>

      {/* Legend */}
      <div className="px-4 py-2 border-b border-gray-200 flex flex-wrap gap-3">
        {Object.entries(nodeTypeColors).map(([type, color]) => (
          <div key={type} className="flex items-center gap-1 text-xs">
            <span className="w-3 h-3 rounded-full" style={{ backgroundColor: color }} />
            <span className="text-gray-600 capitalize">{type}</span>
            {stats.byType[type] && (
              <span className="text-gray-400">({stats.byType[type]})</span>
            )}
          </div>
        ))}
      </div>

      {/* Graph */}
      <div className="relative" style={{ height: height }}>
        <svg
          ref={svgRef}
          width="100%"
          height={height}
          className="cursor-move"
          onMouseDown={handleMouseDown}
          onMouseMove={handleMouseMove}
          onMouseUp={handleMouseUp}
          onMouseLeave={handleMouseUp}
          onWheel={handleWheel}
        >
          <g transform={`translate(${pan.x}, ${pan.y}) scale(${zoom})`}>
            {/* Edges */}
            {filteredEdges.map((edge) => {
              const sourcePos = positions[edge.source];
              const targetPos = positions[edge.target];
              if (!sourcePos || !targetPos) return null;

              const isHighlighted =
                hoveredNode?.id === edge.source ||
                hoveredNode?.id === edge.target ||
                selectedNodeId === edge.source ||
                selectedNodeId === edge.target;

              return (
                <g key={edge.id}>
                  <line
                    x1={sourcePos.x}
                    y1={sourcePos.y}
                    x2={targetPos.x}
                    y2={targetPos.y}
                    stroke={isHighlighted ? '#3B82F6' : '#CBD5E1'}
                    strokeWidth={isHighlighted ? 2 : 1}
                    strokeDasharray={edge.type === 'associated_with' ? '4,4' : undefined}
                    className="cursor-pointer"
                    onMouseEnter={() => setHoveredEdge(edge)}
                    onMouseLeave={() => setHoveredEdge(null)}
                    onClick={() => onSelectEdge?.(edge)}
                  />
                  {/* Arrow */}
                  <polygon
                    points="0,-4 8,0 0,4"
                    fill={isHighlighted ? '#3B82F6' : '#CBD5E1'}
                    transform={`translate(${(sourcePos.x + targetPos.x) / 2}, ${
                      (sourcePos.y + targetPos.y) / 2
                    }) rotate(${
                      (Math.atan2(targetPos.y - sourcePos.y, targetPos.x - sourcePos.x) * 180) /
                      Math.PI
                    })`}
                  />
                </g>
              );
            })}

            {/* Nodes */}
            {filteredNodes.map((node) => {
              const pos = positions[node.id];
              if (!pos) return null;

              const isSelected = selectedNodeId === node.id;
              const isHighlighted = highlightedNodeIds.includes(node.id);
              const isHovered = hoveredNode?.id === node.id;

              return (
                <g
                  key={node.id}
                  transform={`translate(${pos.x}, ${pos.y})`}
                  className="cursor-pointer"
                  onMouseEnter={() => setHoveredNode(node)}
                  onMouseLeave={() => setHoveredNode(null)}
                  onClick={() => onSelectNode?.(node)}
                  data-testid={`node-${node.id}`}
                >
                  {/* Selection ring */}
                  {(isSelected || isHighlighted) && (
                    <circle
                      r={nodeRadius + 4}
                      fill="none"
                      stroke={isSelected ? '#3B82F6' : '#FBBF24'}
                      strokeWidth={2}
                    />
                  )}
                  {/* Node circle */}
                  <circle
                    r={nodeRadius}
                    fill={nodeTypeColors[node.type]}
                    stroke="white"
                    strokeWidth={2}
                    opacity={isHovered ? 1 : 0.9}
                  />
                  {/* Icon */}
                  <text
                    textAnchor="middle"
                    dominantBaseline="central"
                    fontSize="14"
                    fill="white"
                  >
                    {nodeTypeIcons[node.type]}
                  </text>
                  {/* Label */}
                  <text
                    y={nodeRadius + 12}
                    textAnchor="middle"
                    fontSize="10"
                    fill="#374151"
                    className="pointer-events-none"
                  >
                    {node.label.length > 15 ? `${node.label.slice(0, 15)}...` : node.label}
                  </text>
                </g>
              );
            })}
          </g>
        </svg>

        {/* Minimap */}
        {showMinimap && (
          <div className="absolute bottom-4 right-4 w-32 h-24 bg-white border border-gray-200 rounded shadow-sm overflow-hidden">
            <svg width="100%" height="100%" viewBox={`0 0 ${width} ${height}`}>
              {filteredNodes.map((node) => {
                const pos = positions[node.id];
                if (!pos) return null;
                return (
                  <circle
                    key={node.id}
                    cx={pos.x}
                    cy={pos.y}
                    r={4}
                    fill={nodeTypeColors[node.type]}
                  />
                );
              })}
              <rect
                x={-pan.x / zoom}
                y={-pan.y / zoom}
                width={width / zoom}
                height={height / zoom}
                fill="none"
                stroke="#3B82F6"
                strokeWidth={2}
              />
            </svg>
          </div>
        )}

        {/* Tooltip */}
        {(hoveredNode || hoveredEdge) && (
          <div className="absolute top-4 left-4 p-3 bg-white border border-gray-200 rounded-lg shadow-lg max-w-xs">
            {hoveredNode && (
              <>
                <div className="flex items-center gap-2 mb-2">
                  <span
                    className="w-3 h-3 rounded-full"
                    style={{ backgroundColor: nodeTypeColors[hoveredNode.type] }}
                  />
                  <span className="font-medium text-gray-900">{hoveredNode.label}</span>
                </div>
                <div className="text-xs text-gray-500 capitalize mb-2">
                  Type: {hoveredNode.type}
                </div>
                {Object.entries(hoveredNode.properties).slice(0, 3).map(([key, value]) => (
                  <div key={key} className="text-xs text-gray-600">
                    <span className="text-gray-500">{key}:</span> {String(value)}
                  </div>
                ))}
              </>
            )}
            {hoveredEdge && (
              <>
                <div className="text-sm font-medium text-gray-900 mb-1">
                  {relationTypeLabels[hoveredEdge.type]}
                </div>
                <div className="text-xs text-gray-600">
                  {graph.nodes.find((n) => n.id === hoveredEdge.source)?.label} \u2192{' '}
                  {graph.nodes.find((n) => n.id === hoveredEdge.target)?.label}
                </div>
              </>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default ThreatActorGraph;
