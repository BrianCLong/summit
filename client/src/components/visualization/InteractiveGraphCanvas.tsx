import React, { useRef, useEffect, useState, useCallback } from 'react';
import { useToast } from '../ToastContainer';

interface Node {
  id: string;
  label: string;
  type:
    | 'person'
    | 'organization'
    | 'ip'
    | 'email'
    | 'document'
    | 'event'
    | 'location';
  x: number;
  y: number;
  vx?: number;
  vy?: number;
  size: number;
  color: string;
  risk: number;
  confidence: number;
  metadata?: {
    [key: string]: any;
  };
  selected?: boolean;
  highlighted?: boolean;
}

interface Edge {
  id: string;
  source: string;
  target: string;
  type: 'communication' | 'financial' | 'location' | 'association' | 'temporal';
  weight: number;
  label?: string;
  color: string;
  metadata?: {
    [key: string]: any;
  };
}

interface GraphData {
  nodes: Node[];
  edges: Edge[];
}

interface InteractiveGraphCanvasProps {
  data: GraphData;
  width?: number;
  height?: number;
  onNodeClick?: (node: Node) => void;
  onNodeHover?: (node: Node | null) => void;
  onSelectionChange?: (selectedNodes: Node[]) => void;
  physics?: boolean;
  layoutAlgorithm?: 'force' | 'circular' | 'hierarchical' | 'grid';
  filters?: {
    nodeTypes?: string[];
    edgeTypes?: string[];
    minRisk?: number;
    minConfidence?: number;
  };
  className?: string;
}

const InteractiveGraphCanvas: React.FC<InteractiveGraphCanvasProps> = ({
  data,
  width = 800,
  height = 600,
  onNodeClick,
  onNodeHover,
  onSelectionChange,
  physics = true,
  layoutAlgorithm = 'force',
  filters,
  className = '',
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animationRef = useRef<number | null>(null);
  const [nodes, setNodes] = useState<Node[]>([]);
  const [edges, setEdges] = useState<Edge[]>([]);
  const [selectedNodes, setSelectedNodes] = useState<Set<string>>(new Set());
  const [hoveredNode, setHoveredNode] = useState<Node | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [dragNode, setDragNode] = useState<Node | null>(null);
  const [transform, setTransform] = useState({ x: 0, y: 0, scale: 1 });
  const [fps, setFps] = useState(60);

  const toast = useToast();

  // Initialize and filter data
  useEffect(() => {
    let filteredNodes = data.nodes;
    let filteredEdges = data.edges;

    if (filters) {
      if (filters.nodeTypes && filters.nodeTypes.length > 0) {
        filteredNodes = filteredNodes.filter((node) =>
          filters.nodeTypes!.includes(node.type),
        );
      }

      if (filters.minRisk !== undefined) {
        filteredNodes = filteredNodes.filter(
          (node) => node.risk >= filters.minRisk!,
        );
      }

      if (filters.minConfidence !== undefined) {
        filteredNodes = filteredNodes.filter(
          (node) => node.confidence >= filters.minConfidence!,
        );
      }

      // Filter edges to only include those between remaining nodes
      const nodeIds = new Set(filteredNodes.map((n) => n.id));
      filteredEdges = filteredEdges.filter(
        (edge) => nodeIds.has(edge.source) && nodeIds.has(edge.target),
      );

      if (filters.edgeTypes && filters.edgeTypes.length > 0) {
        filteredEdges = filteredEdges.filter((edge) =>
          filters.edgeTypes!.includes(edge.type),
        );
      }
    }

    // Apply layout algorithm
    const layoutedNodes = applyLayout(
      filteredNodes,
      filteredEdges,
      layoutAlgorithm,
      width,
      height,
    );

    setNodes(layoutedNodes);
    setEdges(filteredEdges);
  }, [data, filters, layoutAlgorithm, width, height]);

  // Apply layout algorithms
  const applyLayout = useCallback(
    (
      nodes: Node[],
      edges: Edge[],
      algorithm: string,
      width: number,
      height: number,
    ): Node[] => {
      const layoutedNodes = [...nodes];

      switch (algorithm) {
        case 'circular':
          const radius = Math.min(width, height) * 0.3;
          const centerX = width / 2;
          const centerY = height / 2;

          layoutedNodes.forEach((node, i) => {
            const angle = (i / layoutedNodes.length) * 2 * Math.PI;
            node.x = centerX + radius * Math.cos(angle);
            node.y = centerY + radius * Math.sin(angle);
          });
          break;

        case 'grid':
          const cols = Math.ceil(Math.sqrt(layoutedNodes.length));
          const cellWidth = width / cols;
          const cellHeight = height / Math.ceil(layoutedNodes.length / cols);

          layoutedNodes.forEach((node, i) => {
            node.x = (i % cols) * cellWidth + cellWidth / 2;
            node.y = Math.floor(i / cols) * cellHeight + cellHeight / 2;
          });
          break;

        case 'hierarchical':
          // Simple hierarchical layout based on node connections
          const levels = new Map<string, number>();
          const visited = new Set<string>();

          // Find root nodes (nodes with no incoming edges)
          const hasIncoming = new Set(edges.map((e) => e.target));
          const rootNodes = layoutedNodes.filter((n) => !hasIncoming.has(n.id));

          // BFS to assign levels
          const queue = rootNodes.map((n) => ({ node: n, level: 0 }));
          rootNodes.forEach((n) => levels.set(n.id, 0));

          while (queue.length > 0) {
            const { node, level } = queue.shift()!;

            if (visited.has(node.id)) continue;
            visited.add(node.id);

            const outgoingEdges = edges.filter((e) => e.source === node.id);
            outgoingEdges.forEach((edge) => {
              const targetNode = layoutedNodes.find(
                (n) => n.id === edge.target,
              );
              if (targetNode && !visited.has(targetNode.id)) {
                const newLevel = level + 1;
                if (
                  !levels.has(targetNode.id) ||
                  levels.get(targetNode.id)! > newLevel
                ) {
                  levels.set(targetNode.id, newLevel);
                  queue.push({ node: targetNode, level: newLevel });
                }
              }
            });
          }

          // Position nodes based on levels
          const levelGroups = new Map<number, Node[]>();
          layoutedNodes.forEach((node) => {
            const level = levels.get(node.id) || 0;
            if (!levelGroups.has(level)) {
              levelGroups.set(level, []);
            }
            levelGroups.get(level)!.push(node);
          });

          const maxLevel = Math.max(...Array.from(levels.values()));
          const levelHeight = height / (maxLevel + 1);

          levelGroups.forEach((nodesInLevel, level) => {
            const y = (level + 0.5) * levelHeight;
            const nodeWidth = width / nodesInLevel.length;

            nodesInLevel.forEach((node, i) => {
              node.x = (i + 0.5) * nodeWidth;
              node.y = y;
            });
          });
          break;

        case 'force':
        default:
          // Initialize with random positions if not set
          layoutedNodes.forEach((node) => {
            if (node.x === undefined || node.y === undefined) {
              node.x = Math.random() * width;
              node.y = Math.random() * height;
            }
            node.vx = node.vx || 0;
            node.vy = node.vy || 0;
          });
          break;
      }

      return layoutedNodes;
    },
    [],
  );

  // Physics simulation for force-directed layout
  const applyPhysics = useCallback(() => {
    if (!physics || layoutAlgorithm !== 'force') return;

    const alpha = 0.1;
    const linkStrength = 0.1;
    const repelStrength = 500;
    const centerForce = 0.01;

    // Apply forces
    setNodes((prevNodes) => {
      const newNodes = [...prevNodes];

      // Center force
      const centerX = width / 2;
      const centerY = height / 2;

      newNodes.forEach((node) => {
        const dx = centerX - node.x;
        const dy = centerY - node.y;
        node.vx = (node.vx || 0) + dx * centerForce;
        node.vy = (node.vy || 0) + dy * centerForce;
      });

      // Repulsion between nodes
      for (let i = 0; i < newNodes.length; i++) {
        for (let j = i + 1; j < newNodes.length; j++) {
          const nodeA = newNodes[i];
          const nodeB = newNodes[j];

          const dx = nodeB.x - nodeA.x;
          const dy = nodeB.y - nodeA.y;
          const distance = Math.sqrt(dx * dx + dy * dy) + 0.1;

          const force = repelStrength / (distance * distance);
          const fx = (dx / distance) * force;
          const fy = (dy / distance) * force;

          nodeA.vx = (nodeA.vx || 0) - fx;
          nodeA.vy = (nodeA.vy || 0) - fy;
          nodeB.vx = (nodeB.vx || 0) + fx;
          nodeB.vy = (nodeB.vy || 0) + fy;
        }
      }

      // Link forces
      edges.forEach((edge) => {
        const sourceNode = newNodes.find((n) => n.id === edge.source);
        const targetNode = newNodes.find((n) => n.id === edge.target);

        if (sourceNode && targetNode) {
          const dx = targetNode.x - sourceNode.x;
          const dy = targetNode.y - sourceNode.y;
          const distance = Math.sqrt(dx * dx + dy * dy) + 0.1;
          const targetDistance = 100 * edge.weight;

          const force = (distance - targetDistance) * linkStrength;
          const fx = (dx / distance) * force;
          const fy = (dy / distance) * force;

          sourceNode.vx = (sourceNode.vx || 0) + fx;
          sourceNode.vy = (sourceNode.vy || 0) + fy;
          targetNode.vx = (targetNode.vx || 0) - fx;
          targetNode.vy = (targetNode.vy || 0) - fy;
        }
      });

      // Update positions
      newNodes.forEach((node) => {
        if (!dragNode || node.id !== dragNode.id) {
          node.vx = (node.vx || 0) * 0.8; // Damping
          node.vy = (node.vy || 0) * 0.8;
          node.x += (node.vx || 0) * alpha;
          node.y += (node.vy || 0) * alpha;

          // Keep nodes within bounds
          node.x = Math.max(node.size, Math.min(width - node.size, node.x));
          node.y = Math.max(node.size, Math.min(height - node.size, node.y));
        }
      });

      return newNodes;
    });
  }, [physics, layoutAlgorithm, edges, width, height, dragNode]);

  // Mouse interaction handlers
  const getMousePos = (event: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current!;
    const rect = canvas.getBoundingClientRect();
    return {
      x: (event.clientX - rect.left - transform.x) / transform.scale,
      y: (event.clientY - rect.top - transform.y) / transform.scale,
    };
  };

  const findNodeAtPosition = (x: number, y: number): Node | null => {
    return (
      nodes.find((node) => {
        const dx = x - node.x;
        const dy = y - node.y;
        const distance = Math.sqrt(dx * dx + dy * dy);
        return distance <= node.size + 2;
      }) || null
    );
  };

  const handleMouseDown = (event: React.MouseEvent<HTMLCanvasElement>) => {
    const pos = getMousePos(event);
    const node = findNodeAtPosition(pos.x, pos.y);

    if (node) {
      setDragNode(node);
      setIsDragging(true);

      if (event.ctrlKey || event.metaKey) {
        // Multi-select
        const newSelected = new Set(selectedNodes);
        if (newSelected.has(node.id)) {
          newSelected.delete(node.id);
        } else {
          newSelected.add(node.id);
        }
        setSelectedNodes(newSelected);
        onSelectionChange?.(nodes.filter((n) => newSelected.has(n.id)));
      } else {
        // Single select
        setSelectedNodes(new Set([node.id]));
        onSelectionChange?.([node]);
      }

      onNodeClick?.(node);
    } else {
      // Clear selection if clicking on empty space
      setSelectedNodes(new Set());
      onSelectionChange?.([]);
    }
  };

  const handleMouseMove = (event: React.MouseEvent<HTMLCanvasElement>) => {
    const pos = getMousePos(event);

    if (isDragging && dragNode) {
      setNodes((prevNodes) =>
        prevNodes.map((node) =>
          node.id === dragNode.id
            ? { ...node, x: pos.x, y: pos.y, vx: 0, vy: 0 }
            : node,
        ),
      );
      setDragNode((prev) => (prev ? { ...prev, x: pos.x, y: pos.y } : null));
    } else {
      // Handle hover
      const node = findNodeAtPosition(pos.x, pos.y);
      if (node !== hoveredNode) {
        setHoveredNode(node);
        onNodeHover?.(node);
      }
    }
  };

  const handleMouseUp = () => {
    setIsDragging(false);
    setDragNode(null);
  };

  const handleWheel = (event: React.WheelEvent<HTMLCanvasElement>) => {
    event.preventDefault();
    const delta = event.deltaY * -0.01;
    const newScale = Math.min(Math.max(0.1, transform.scale + delta), 3);

    setTransform((prev) => ({
      ...prev,
      scale: newScale,
    }));
  };

  // Rendering
  const draw = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Clear canvas
    ctx.save();
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.restore();

    // Apply transform
    ctx.save();
    ctx.translate(transform.x, transform.y);
    ctx.scale(transform.scale, transform.scale);

    // Draw edges
    edges.forEach((edge) => {
      const sourceNode = nodes.find((n) => n.id === edge.source);
      const targetNode = nodes.find((n) => n.id === edge.target);

      if (sourceNode && targetNode) {
        ctx.strokeStyle = edge.color;
        ctx.lineWidth = edge.weight * 2;
        ctx.globalAlpha = 0.6;

        ctx.beginPath();
        ctx.moveTo(sourceNode.x, sourceNode.y);
        ctx.lineTo(targetNode.x, targetNode.y);
        ctx.stroke();

        // Draw arrow head
        const dx = targetNode.x - sourceNode.x;
        const dy = targetNode.y - sourceNode.y;
        const angle = Math.atan2(dy, dx);
        const arrowLength = 10;

        const endX = targetNode.x - Math.cos(angle) * targetNode.size;
        const endY = targetNode.y - Math.sin(angle) * targetNode.size;

        ctx.beginPath();
        ctx.moveTo(endX, endY);
        ctx.lineTo(
          endX - arrowLength * Math.cos(angle - Math.PI / 6),
          endY - arrowLength * Math.sin(angle - Math.PI / 6),
        );
        ctx.moveTo(endX, endY);
        ctx.lineTo(
          endX - arrowLength * Math.cos(angle + Math.PI / 6),
          endY - arrowLength * Math.sin(angle + Math.PI / 6),
        );
        ctx.stroke();

        // Draw edge label if exists
        if (edge.label) {
          const midX = (sourceNode.x + targetNode.x) / 2;
          const midY = (sourceNode.y + targetNode.y) / 2;

          ctx.font = '12px Arial';
          ctx.fillStyle = '#666';
          ctx.globalAlpha = 0.8;
          ctx.textAlign = 'center';
          ctx.fillText(edge.label, midX, midY - 5);
        }
      }
    });

    // Draw nodes
    nodes.forEach((node) => {
      const isSelected = selectedNodes.has(node.id);
      const isHovered = hoveredNode?.id === node.id;

      ctx.globalAlpha = 1;

      // Draw selection highlight
      if (isSelected || isHovered) {
        ctx.strokeStyle = isSelected ? '#007bff' : '#ffc107';
        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.arc(node.x, node.y, node.size + 3, 0, 2 * Math.PI);
        ctx.stroke();
      }

      // Draw node
      ctx.fillStyle = node.color;
      ctx.beginPath();
      ctx.arc(node.x, node.y, node.size, 0, 2 * Math.PI);
      ctx.fill();

      // Draw node border
      ctx.strokeStyle = '#333';
      ctx.lineWidth = 1;
      ctx.stroke();

      // Draw risk indicator
      if (node.risk > 7) {
        ctx.fillStyle = '#dc3545';
        ctx.beginPath();
        ctx.arc(
          node.x + node.size - 3,
          node.y - node.size + 3,
          4,
          0,
          2 * Math.PI,
        );
        ctx.fill();
      }

      // Draw label
      ctx.font = '12px Arial';
      ctx.fillStyle = '#333';
      ctx.textAlign = 'center';
      ctx.fillText(node.label, node.x, node.y + node.size + 15);

      // Draw metadata on hover
      if (isHovered && node.metadata) {
        const tooltip = `${node.type} | Risk: ${node.risk}/10 | Conf: ${Math.round(node.confidence)}%`;
        const textWidth = ctx.measureText(tooltip).width;

        ctx.fillStyle = 'rgba(0,0,0,0.8)';
        ctx.fillRect(
          node.x - textWidth / 2 - 5,
          node.y - node.size - 35,
          textWidth + 10,
          20,
        );

        ctx.fillStyle = 'white';
        ctx.font = '11px Arial';
        ctx.textAlign = 'center';
        ctx.fillText(tooltip, node.x, node.y - node.size - 20);
      }
    });

    ctx.restore();

    // Draw FPS counter
    ctx.fillStyle = '#666';
    ctx.font = '12px monospace';
    ctx.fillText(`FPS: ${fps}`, 10, 20);
    ctx.fillText(`Nodes: ${nodes.length} | Edges: ${edges.length}`, 10, 35);
    ctx.fillText(`Scale: ${transform.scale.toFixed(2)}x`, 10, 50);
  }, [nodes, edges, selectedNodes, hoveredNode, transform, fps]);

  // Animation loop
  useEffect(() => {
    let frameCount = 0;
    let lastTime = performance.now();

    const animate = () => {
      const currentTime = performance.now();
      frameCount++;

      if (currentTime - lastTime >= 1000) {
        setFps(Math.round((frameCount * 1000) / (currentTime - lastTime)));
        frameCount = 0;
        lastTime = currentTime;
      }

      applyPhysics();
      draw();
      animationRef.current = requestAnimationFrame(animate);
    };

    animationRef.current = requestAnimationFrame(animate);

    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
    };
  }, [applyPhysics, draw]);

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      switch (event.key) {
        case 'Delete':
        case 'Backspace':
          if (selectedNodes.size > 0) {
            // Remove selected nodes (in real app, this would trigger a callback)
            toast.info(
              'Delete Nodes',
              `Would delete ${selectedNodes.size} selected nodes`,
            );
          }
          break;
        case 'a':
          if (event.ctrlKey || event.metaKey) {
            event.preventDefault();
            setSelectedNodes(new Set(nodes.map((n) => n.id)));
            onSelectionChange?.(nodes);
          }
          break;
        case 'Escape':
          setSelectedNodes(new Set());
          onSelectionChange?.([]);
          break;
        case 'f':
          // Fit to view
          setTransform({ x: 0, y: 0, scale: 1 });
          break;
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [selectedNodes, nodes, onSelectionChange, toast]);

  return (
    <div className={`interactive-graph-canvas relative ${className}`}>
      <canvas
        ref={canvasRef}
        width={width}
        height={height}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onWheel={handleWheel}
        style={{
          cursor: isDragging ? 'grabbing' : hoveredNode ? 'pointer' : 'grab',
          border: '1px solid #ddd',
          borderRadius: '8px',
        }}
      />

      {/* Graph Controls */}
      <div className="absolute top-2 right-2 bg-white rounded-lg shadow-lg p-2 space-x-2">
        <button
          onClick={() =>
            setTransform((prev) => ({
              ...prev,
              scale: Math.min(prev.scale * 1.2, 3),
            }))
          }
          className="px-2 py-1 bg-gray-100 hover:bg-gray-200 rounded text-sm"
          title="Zoom In"
        >
          🔍+
        </button>
        <button
          onClick={() =>
            setTransform((prev) => ({
              ...prev,
              scale: Math.max(prev.scale / 1.2, 0.1),
            }))
          }
          className="px-2 py-1 bg-gray-100 hover:bg-gray-200 rounded text-sm"
          title="Zoom Out"
        >
          🔍-
        </button>
        <button
          onClick={() => setTransform({ x: 0, y: 0, scale: 1 })}
          className="px-2 py-1 bg-gray-100 hover:bg-gray-200 rounded text-sm"
          title="Reset View"
        >
          📐
        </button>
      </div>

      {/* Selection Info */}
      {selectedNodes.size > 0 && (
        <div className="absolute bottom-2 left-2 bg-white rounded-lg shadow-lg p-3">
          <div className="text-sm font-medium">
            {selectedNodes.size} node{selectedNodes.size !== 1 ? 's' : ''}{' '}
            selected
          </div>
          <div className="text-xs text-gray-500 mt-1">
            Press Delete to remove • Ctrl+A to select all • Esc to clear
          </div>
        </div>
      )}

      {/* Node Tooltip */}
      {hoveredNode && (
        <div className="absolute bottom-2 right-2 bg-black text-white rounded-lg p-2 text-sm max-w-xs">
          <div className="font-medium">{hoveredNode.label}</div>
          <div className="text-xs opacity-75">
            Type: {hoveredNode.type} | Risk: {hoveredNode.risk}/10 | Confidence:{' '}
            {Math.round(hoveredNode.confidence)}%
          </div>
        </div>
      )}
    </div>
  );
};

export default InteractiveGraphCanvas;
