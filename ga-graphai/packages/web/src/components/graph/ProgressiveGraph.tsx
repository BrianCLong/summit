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
const EDGE_MULTIPLIER_CAP = 3;
const MIN_COMPACT_BATCH = 8;

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
  const [isRendering, setIsRendering] = useState(nodes.length > 0);
  const frameRef = useRef<FrameHandle>();

  useEffect(() => {
    setRenderedCount(Math.min(initialBatchSize, nodes.length));
    setLodMode(nodes.length > LOD_THRESHOLD ? 'compact' : 'detailed');
    setIsRendering(nodes.length > 0);

    let cancelled = false;
    let currentCount = Math.min(initialBatchSize, nodes.length);
    let batchSize = initialBatchSize;
    let currentLod: 'detailed' | 'compact' =
      nodes.length > LOD_THRESHOLD ? 'compact' : 'detailed';
    const start = performance.now();

    const step = () => {
      if (cancelled) return;
      const frameStart = performance.now();
      let advanced = false;

      while (
        currentCount < nodes.length &&
        performance.now() - frameStart < frameBudgetMs
      ) {
        const nextBatch = Math.min(batchSize * 1.4, MAX_BATCH_SIZE);
        batchSize = Math.max(
          Math.round(nextBatch),
          currentLod === 'compact' ? MIN_COMPACT_BATCH : 1,
        );
        currentCount = Math.min(currentCount + batchSize, nodes.length);
        advanced = true;
      }

      if (!advanced && nodes.length > LOD_THRESHOLD && currentLod === 'detailed') {
        currentLod = 'compact';
        setLodMode(currentLod);
        batchSize = Math.max(Math.round(initialBatchSize * 0.75), MIN_COMPACT_BATCH);
      }

      setRenderedCount(currentCount);

      if (currentCount < nodes.length) {
        frameRef.current = scheduleFrame(step);
      } else {
        setIsRendering(false);
        onRenderComplete?.(performance.now() - start);
      }
    };

    frameRef.current = scheduleFrame(step);
    return () => {
      cancelled = true;
      cancelFrame(frameRef.current);
      setIsRendering(false);
    };
  }, [nodes, initialBatchSize, frameBudgetMs, onRenderComplete]);

  const visibleNodes = useMemo(() => {
    return nodes.slice(0, renderedCount);
  }, [nodes, renderedCount]);

  const nodeLookup = useMemo(() => {
    return new Map(nodes.map((node) => [node.id, node]));
  }, [nodes]);

  const visibleNodeIds = useMemo(() => {
    return new Set(visibleNodes.map((node) => node.id));
  }, [visibleNodes]);

  const visibleEdges = useMemo(() => {
    const eligible = edges.filter(
      (edge) => visibleNodeIds.has(edge.from) && visibleNodeIds.has(edge.to),
    );
    if (lodMode === 'compact') {
      const cap = Math.min(
        eligible.length,
        Math.max(visibleNodes.length * EDGE_MULTIPLIER_CAP, LOD_THRESHOLD),
      );
      return eligible.slice(0, cap);
    }
    return eligible;
  }, [edges, visibleNodeIds, lodMode, visibleNodes.length]);

  const progressLabel = useMemo(() => {
    const total = nodes.length || 1;
    const percent = Math.min(100, Math.round((renderedCount / total) * 100));
    return `${renderedCount} of ${nodes.length} nodes rendered (${percent}%)`;
  }, [nodes.length, renderedCount]);

  const ariaBusy = isRendering && renderedCount < nodes.length;

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
      aria-busy={ariaBusy}
      data-render-progress={renderedCount}
      data-lod={lodMode}
      style={{ position: 'relative', width: '100%', height: '100%' }}
    >
      <span
        aria-live="polite"
        style={{
          position: 'absolute',
          width: 1,
          height: 1,
          padding: 0,
          margin: -1,
          overflow: 'hidden',
          clip: 'rect(0, 0, 0, 0)',
          border: 0,
        }}
      >
        {progressLabel}
      </span>
      <svg
        aria-hidden="true"
        width="100%"
        height="100%"
        style={{ position: 'absolute', inset: 0, pointerEvents: 'none' }}
      >
        {visibleEdges.map((edge) => {
          const from = nodeLookup.get(edge.from);
          const to = nodeLookup.get(edge.to);
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
