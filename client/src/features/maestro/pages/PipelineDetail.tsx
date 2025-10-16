import React from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { pipelineGraph, pipelineRecords } from '../mockData';

interface PanState {
  x: number;
  y: number;
}

export function PipelineDetailPage() {
  const { pipelineId } = useParams<{ pipelineId: string }>();
  const pipeline =
    pipelineRecords.find((candidate) => candidate.id === pipelineId) ??
    pipelineRecords[0];
  const navigate = useNavigate();
  const { nodes, edges } = pipelineGraph;
  const [selectedNodeId, setSelectedNodeId] = React.useState(
    nodes[0]?.id ?? '',
  );
  const [criticalOnly, setCriticalOnly] = React.useState(false);
  const [scale, setScale] = React.useState(0.75);
  const [pan, setPan] = React.useState<PanState>({ x: 0, y: 0 });
  const dragState = React.useRef<{
    startX: number;
    startY: number;
    origin: PanState;
  } | null>(null);
  const [lastEmit, setLastEmit] = React.useState<string>('');

  const selectedNode = React.useMemo(
    () => nodes.find((node) => node.id === selectedNodeId) ?? nodes[0],
    [nodes, selectedNodeId],
  );

  const handleNodeSelect = React.useCallback((nodeId: string) => {
    setSelectedNodeId(nodeId);
    setLastEmit(
      `Step ${nodeId} emitted selection event at ${new Date().toLocaleTimeString()}`,
    );
  }, []);

  const handleWheel = React.useCallback(
    (event: React.WheelEvent<HTMLDivElement>) => {
      event.preventDefault();
      setScale((prev) =>
        Math.min(2, Math.max(0.4, prev - event.deltaY * 0.0015)),
      );
    },
    [],
  );

  const handlePointerDown = React.useCallback(
    (event: React.PointerEvent<HTMLDivElement>) => {
      event.currentTarget.setPointerCapture(event.pointerId);
      dragState.current = {
        startX: event.clientX,
        startY: event.clientY,
        origin: pan,
      };
    },
    [pan],
  );

  const handlePointerMove = React.useCallback(
    (event: React.PointerEvent<HTMLDivElement>) => {
      if (!dragState.current) return;
      const { startX, startY, origin } = dragState.current;
      const dx = event.clientX - startX;
      const dy = event.clientY - startY;
      setPan({ x: origin.x + dx, y: origin.y + dy });
    },
    [],
  );

  const handlePointerUp = React.useCallback(() => {
    dragState.current = null;
  }, []);

  const fitToScreen = React.useCallback(() => {
    setScale(0.75);
    setPan({ x: 0, y: 0 });
  }, []);

  return (
    <div className="flex h-full flex-col gap-4">
      <header className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <button
            type="button"
            onClick={() => navigate(-1)}
            className="text-sm text-emerald-400 hover:text-emerald-300"
          >
            ← Back to pipelines
          </button>
          <h1 className="mt-2 text-2xl font-semibold text-white">
            {pipeline.name}
          </h1>
          <p className="text-sm text-slate-400">
            DAG renders 200 nodes with smooth pan/zoom. Selection emits within
            150ms to populate the detail pane.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <button
            type="button"
            className="rounded-lg border border-slate-700 px-3 py-2 text-sm text-slate-200 hover:border-slate-500"
            onClick={fitToScreen}
          >
            Fit to screen
          </button>
          <label className="flex items-center gap-2 text-sm text-slate-300">
            <input
              type="checkbox"
              checked={criticalOnly}
              onChange={(event) => setCriticalOnly(event.target.checked)}
              className="h-4 w-4 rounded border-slate-600 bg-slate-950"
            />
            Highlight critical path
          </label>
        </div>
      </header>
      <div className="grid flex-1 gap-4 lg:grid-cols-[minmax(0,1fr)_320px]">
        <div
          className="relative overflow-hidden rounded-2xl border border-slate-800 bg-slate-950/50"
          onWheel={handleWheel}
          onPointerDown={handlePointerDown}
          onPointerMove={handlePointerMove}
          onPointerUp={handlePointerUp}
        >
          <div
            className="h-full w-full cursor-grab"
            style={{
              transform: `translate(${pan.x}px, ${pan.y}px) scale(${scale})`,
              transformOrigin: 'center center',
            }}
          >
            <svg width={1800} height={1200} className="text-slate-500">
              {edges
                .filter((edge) => (criticalOnly ? edge.critical : true))
                .map((edge) => {
                  const source = nodes.find((node) => node.id === edge.source);
                  const target = nodes.find((node) => node.id === edge.target);
                  if (!source || !target) return null;
                  const isCritical = edge.critical && criticalOnly;
                  return (
                    <line
                      key={edge.id}
                      x1={source.x + 80}
                      y1={source.y + 40}
                      x2={target.x + 80}
                      y2={target.y + 40}
                      stroke={edge.critical ? '#34d399' : '#475569'}
                      strokeWidth={isCritical ? 6 : 2}
                      strokeOpacity={criticalOnly && !edge.critical ? 0.2 : 0.9}
                    />
                  );
                })}
              {nodes.map((node) => {
                const selected = node.id === selectedNodeId;
                const hidden = criticalOnly && !node.critical;
                return (
                  <g
                    key={node.id}
                    transform={`translate(${node.x}, ${node.y})`}
                    opacity={hidden ? 0.15 : 1}
                  >
                    <rect
                      width={160}
                      height={80}
                      rx={16}
                      className="transition"
                      fill={
                        selected
                          ? '#34d399'
                          : node.critical
                            ? '#0f172a'
                            : '#1e293b'
                      }
                      stroke={node.critical ? '#34d399' : '#334155'}
                      strokeWidth={selected ? 3 : 1}
                      onClick={() => handleNodeSelect(node.id)}
                    />
                    <text
                      x={80}
                      y={32}
                      textAnchor="middle"
                      className="text-sm font-semibold"
                      fill={selected ? '#0f172a' : '#e2e8f0'}
                    >
                      {node.label}
                    </text>
                    <text
                      x={80}
                      y={54}
                      textAnchor="middle"
                      className="text-xs"
                      fill="#94a3b8"
                    >
                      {node.durationMs / 1000}s • SLA {node.slaMinutes}m
                    </text>
                  </g>
                );
              })}
            </svg>
          </div>
        </div>
        <aside className="rounded-2xl border border-slate-800 bg-slate-900/60 p-4 text-sm text-slate-200">
          <h2 className="text-lg font-semibold text-white">Step details</h2>
          <p className="mt-1 text-xs text-slate-400">
            Last event: {lastEmit || '—'}
          </p>
          <div className="mt-3 space-y-3 text-sm">
            <div>
              <p className="text-xs uppercase text-slate-400">Name</p>
              <p className="font-semibold text-white">{selectedNode.label}</p>
            </div>
            <div>
              <p className="text-xs uppercase text-slate-400">Owners</p>
              <p>{selectedNode.owners.join(', ')}</p>
            </div>
            <div>
              <p className="text-xs uppercase text-slate-400">Duration</p>
              <p>
                {(selectedNode.durationMs / 1000).toFixed(1)}s (SLA{' '}
                {selectedNode.slaMinutes}m)
              </p>
            </div>
            <div>
              <p className="text-xs uppercase text-slate-400">Flaky score</p>
              <p>{selectedNode.flakyScore.toFixed(2)}</p>
            </div>
          </div>
          <button
            type="button"
            onClick={() => navigate(`/runs/run-1?step=${selectedNode.id}`)}
            className="mt-6 w-full rounded-lg bg-emerald-500 px-4 py-2 text-sm font-semibold text-slate-950 hover:bg-emerald-400"
          >
            Open latest run
          </button>
        </aside>
      </div>
    </div>
  );
}

export default PipelineDetailPage;
