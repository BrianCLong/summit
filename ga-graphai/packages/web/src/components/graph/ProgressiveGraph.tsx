import React, { useEffect, useMemo, useRef, useState } from 'react';

export interface GraphNode {
  id: string;
  label: string;
  x: number;
  y: number;
  radius?: number;
  color?: string;
}

export interface GraphEdge {
  id: string;
  from: string;
  to: string;
}

export interface ProgressiveGraphProps {
  nodes: GraphNode[];
  edges: GraphEdge[];
  initialBatchSize?: number;
  frameBudgetMs?: number;
  onHoverNode?: (id: string | null) => void;
  onSelectNode?: (id: string) => void;
  onRenderComplete?: (elapsedMs: number) => void;
}

type FrameHandle = number | undefined;
const DEFAULT_BATCH_SIZE = 80;
const DEFAULT_FRAME_BUDGET = 18;
const LOD_THRESHOLD = 320;
const MAX_BATCH_SIZE = 320;

function scheduleFrame(fn: () => void): FrameHandle {
  if (typeof requestAnimationFrame !== 'undefined') {
    return requestAnimationFrame(fn);
  }
  return setTimeout(fn, 16) as unknown as number;
}

function cancelFrame(handle: FrameHandle): void {
  if (handle === undefined) {
    return;
  }
  if (typeof cancelAnimationFrame !== 'undefined') {
    cancelAnimationFrame(handle);
    return;
  }
  clearTimeout(handle as unknown as number);
}

export function ProgressiveGraph({
  nodes,
  edges,
  initialBatchSize = DEFAULT_BATCH_SIZE,
  frameBudgetMs = DEFAULT_FRAME_BUDGET,
  onHoverNode,
  onSelectNode,
  onRenderComplete,
}: ProgressiveGraphProps): JSX.Element {
  const [renderedCount, setRenderedCount] = useState(() =>
    Math.min(initialBatchSize, nodes.length),
  );
  const [lodMode, setLodMode] = useState<'detailed' | 'compact'>(
    nodes.length > LOD_THRESHOLD ? 'compact' : 'detailed',
  );
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [hoveredId, setHoveredId] = useState<string | null>(null);
  const frameRef = useRef<FrameHandle>();

  useEffect(() => {
    setRenderedCount(Math.min(initialBatchSize, nodes.length));
    setLodMode(nodes.length > LOD_THRESHOLD ? 'compact' : 'detailed');

    let cancelled = false;
    let currentCount = Math.min(initialBatchSize, nodes.length);
    let batchSize = initialBatchSize;
    const start = performance.now();

    const step = () => {
      if (cancelled) return;
      const elapsed = performance.now() - start;
      const nextBatch = Math.min(batchSize * 1.5, MAX_BATCH_SIZE);
      batchSize = Math.max(Math.round(nextBatch), 1);
      currentCount = Math.min(currentCount + batchSize, nodes.length);
      setRenderedCount(currentCount);

      if (elapsed > frameBudgetMs && nodes.length > LOD_THRESHOLD) {
        // Switch to compact mode and fast-forward to finish to keep DOM/canvas load capped
        setLodMode('compact');
        currentCount = nodes.length;
        setRenderedCount(currentCount);
        onRenderComplete?.(performance.now() - start);
        return;
      }

      if (currentCount < nodes.length) {
        frameRef.current = scheduleFrame(step);
      } else {
        onRenderComplete?.(performance.now() - start);
      }
    };

    frameRef.current = scheduleFrame(step);
    return () => {
      cancelled = true;
      cancelFrame(frameRef.current);
    };
  }, [nodes, initialBatchSize, frameBudgetMs, onRenderComplete]);

  const visibleNodes = useMemo(() => {
    return nodes.slice(0, renderedCount);
  }, [nodes, renderedCount]);

  const visibleNodeIds = useMemo(() => {
    return new Set(visibleNodes.map((node) => node.id));
  }, [visibleNodes]);

  const visibleEdges = useMemo(() => {
    return edges.filter(
      (edge) => visibleNodeIds.has(edge.from) && visibleNodeIds.has(edge.to),
    );
  }, [edges, visibleNodeIds]);

  const handleHover = (id: string | null) => {
    setHoveredId(id);
    onHoverNode?.(id);
  };

  const handleSelect = (id: string) => {
    setSelectedId(id);
    onSelectNode?.(id);
  };

  const nodeLabel = (node: GraphNode, index: number): string => {
    if (lodMode === 'compact' && index > 40) {
      return node.label.slice(0, 8) + '…';
    }
    return node.label;
  };

  return (
    <div
      role="region"
      aria-label="Progressive graph"
      style={{ position: 'relative', width: '100%', height: '100%' }}
    >
      <svg
        aria-hidden="true"
        width="100%"
        height="100%"
        style={{ position: 'absolute', inset: 0, pointerEvents: 'none' }}
      >
        {visibleEdges.map((edge) => {
          const from = nodes.find((node) => node.id === edge.from);
          const to = nodes.find((node) => node.id === edge.to);
          if (!from || !to) return null;
          return (
            <line
              key={edge.id}
              x1={from.x}
              y1={from.y}
              x2={to.x}
              y2={to.y}
              stroke="#cbd5e1"
              strokeWidth={1}
            />
          );
        })}
      </svg>
      <div
        aria-live="polite"
        style={{ position: 'absolute', inset: 0 }}
        data-rendered-count={renderedCount}
        data-lod={lodMode}
      >
        {visibleNodes.map((node, index) => (
          <button
            key={node.id}
            type="button"
            data-node-id={node.id}
            onMouseEnter={() => handleHover(node.id)}
            onMouseLeave={() => handleHover(null)}
            onFocus={() => handleHover(node.id)}
            onBlur={() => handleHover(null)}
            onClick={() => handleSelect(node.id)}
            onKeyDown={(event) => {
              if (event.key === 'Enter' || event.key === ' ') {
                event.preventDefault();
                handleSelect(node.id);
              }
            }}
            aria-pressed={selectedId === node.id}
            aria-label={`Node ${node.label}`}
            tabIndex={0}
            style={{
              position: 'absolute',
              left: node.x,
              top: node.y,
              width: (node.radius ?? 8) * 2,
              height: (node.radius ?? 8) * 2,
              borderRadius: '9999px',
              border: hoveredId === node.id ? '2px solid #2563eb' : '1px solid #cbd5e1',
              background: selectedId === node.id ? '#dbeafe' : '#f8fafc',
              color: '#0f172a',
              fontSize: lodMode === 'compact' ? 10 : 12,
              padding: lodMode === 'compact' ? '2px 4px' : '4px 8px',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              whiteSpace: 'nowrap',
              cursor: 'pointer',
            }}
          >
            {nodeLabel(node, index)}
          </button>
        ))}
      </div>
    </div>
  );
}
