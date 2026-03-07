import React, { useMemo } from "react";
import { edges, layers, nodes } from "../data";
import { useTriPane } from "./EventBus";

function getLayout(nodeIds: string[], layoutMode: string) {
  const spacingX = 170;
  const spacingY = 120;
  const startX = 110;
  const startY = 80;
  if (layoutMode === "timeline") {
    const layerOrder = layers.map((layer) => layer.id);
    const width = 420;
    return nodeIds.reduce<Record<string, { x: number; y: number }>>((acc, id, idx) => {
      const node = nodes.find((n) => n.id === id);
      const layerIndex = node ? layerOrder.indexOf(node.layer) : idx;
      const x = startX + ((node?.timestamp ?? idx) / 24) * width;
      acc[id] = { x, y: startY + layerIndex * spacingY };
      return acc;
    }, {});
  }

  return nodeIds.reduce<Record<string, { x: number; y: number }>>((acc, id, idx) => {
    const column = idx % 3;
    const row = Math.floor(idx / 3);
    acc[id] = { x: startX + column * spacingX, y: startY + row * spacingY };
    return acc;
  }, {});
}

export function GraphPane() {
  const { state, dispatch } = useTriPane();
  const { timeRange, activeLayers, pinnedNodes, geofence, filterText, focusNodeId, layoutMode } =
    state;

  const visibleNodes = useMemo(() => {
    return nodes.filter((node) => {
      const withinTime = node.timestamp >= timeRange.start && node.timestamp <= timeRange.end;
      const layerAllowed = activeLayers.includes(node.layer);
      const fenceOk = !geofence || node.geofence === geofence;
      const matchesFilter = node.label.toLowerCase().includes(filterText.toLowerCase());
      const pinned = pinnedNodes.includes(node.id);
      return (withinTime && layerAllowed && fenceOk && matchesFilter) || pinned;
    });
  }, [timeRange, activeLayers, geofence, filterText, pinnedNodes]);

  const layout = useMemo(
    () =>
      getLayout(
        visibleNodes.map((n) => n.id),
        layoutMode
      ),
    [visibleNodes, layoutMode]
  );

  const visibleEdges = edges.filter(
    (edge) => layout[edge.source] !== undefined && layout[edge.target] !== undefined
  );

  const focus = visibleNodes.find((n) => n.id === focusNodeId);

  return (
    <section
      aria-labelledby="graph-heading"
      className="flex flex-col gap-3 rounded-2xl border border-sand/20 bg-horizon/40 p-4 shadow-inner"
    >
      <div className="flex items-center justify-between gap-4">
        <div>
          <p className="text-sm uppercase tracking-wide text-sand/80">Graph Canvas</p>
          <h2 id="graph-heading" className="text-lg font-semibold">
            Connections and anomalies
          </h2>
        </div>
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2" role="group" aria-label="Graph layout mode">
            <button
              type="button"
              className={`rounded-full border px-3 py-1 text-xs transition focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-offset-ink ${
                layoutMode === "grid"
                  ? "border-accent bg-accent/15 text-accent"
                  : "border-sand/20 bg-horizon text-sand/80"
              }`}
              aria-pressed={layoutMode === "grid"}
              onClick={() => dispatch({ type: "setLayoutMode", payload: "grid" })}
            >
              Grid
            </button>
            <button
              type="button"
              className={`rounded-full border px-3 py-1 text-xs transition focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-offset-ink ${
                layoutMode === "timeline"
                  ? "border-accent bg-accent/15 text-accent"
                  : "border-sand/20 bg-horizon text-sand/80"
              }`}
              aria-pressed={layoutMode === "timeline"}
              onClick={() => dispatch({ type: "setLayoutMode", payload: "timeline" })}
            >
              Timeline
            </button>
          </div>
          <label className="text-sm" htmlFor="graph-filter">
            Filter labels
          </label>
          <input
            id="graph-filter"
            value={filterText}
            onChange={(e) => dispatch({ type: "setFilterText", payload: e.target.value })}
            className="rounded-md border border-sand/20 bg-ink px-3 py-1 text-sm"
            aria-describedby="graph-filter-help"
          />
        </div>
      </div>
      <p id="graph-filter-help" className="text-xs text-sand/70">
        Pin nodes to lock them in view. Expand reveals neighbor links and provenance context. Active
        window: {timeRange.start}h → {timeRange.end}h.
      </p>
      <div className="relative overflow-hidden rounded-xl border border-sand/10 bg-ink/60">
        <svg
          role="img"
          aria-label="Relationship graph"
          className="h-80 w-full"
          viewBox="0 0 600 320"
        >
          <defs>
            <linearGradient id="edgeGradient" x1="0" x2="1" y1="0" y2="0">
              <stop offset="0%" stopColor="#38bdf8" stopOpacity="0.4" />
              <stop offset="100%" stopColor="#38bdf8" stopOpacity="0.8" />
            </linearGradient>
          </defs>
          {visibleEdges.map((edge) => {
            const from = layout[edge.source];
            const to = layout[edge.target];
            if (!from || !to) return null;
            return (
              <line
                key={edge.id}
                x1={from.x}
                y1={from.y}
                x2={to.x}
                y2={to.y}
                stroke="url(#edgeGradient)"
                strokeWidth={2 + edge.strength}
                className="transition-all duration-150 ease-in-out"
              />
            );
          })}
          {visibleNodes.map((node) => {
            const position = layout[node.id];
            const pinned = pinnedNodes.includes(node.id);
            return (
              <g key={node.id} transform={`translate(${position.x}, ${position.y})`}>
                <circle
                  r={22}
                  className={`cursor-pointer fill-accent/80 ${pinned ? "stroke-4 stroke-sand" : "stroke-2 stroke-sand/60"}`}
                  tabIndex={0}
                  aria-label={`${node.label} (${node.layer}) confidence ${Math.round(node.confidence * 100)}%`}
                  onFocus={() => dispatch({ type: "setFocusNode", payload: node.id })}
                  onClick={() => dispatch({ type: "setFocusNode", payload: node.id })}
                />
                <text
                  className="select-none text-[11px] font-semibold fill-sand"
                  textAnchor="middle"
                  y={4}
                >
                  {node.label}
                </text>
                <text className="text-[10px] fill-sand/80" textAnchor="middle" y={18}>
                  {node.layer}
                </text>
              </g>
            );
          })}
        </svg>
        <div className="absolute inset-0 pointer-events-none bg-gradient-to-b from-transparent via-transparent to-midnight/30" />
      </div>
      <div className="grid gap-3 md:grid-cols-2">
        <div className="rounded-lg border border-sand/20 bg-ink/50 p-3">
          <h3 className="font-semibold text-sm">Pins</h3>
          <div className="flex flex-wrap gap-2" role="list">
            {visibleNodes.map((node) => (
              <button
                key={`pin-${node.id}`}
                className={`rounded-full border px-3 py-1 text-xs transition focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-offset-ink ${
                  pinnedNodes.includes(node.id)
                    ? "border-accent bg-accent/20 text-accent"
                    : "border-sand/30 bg-horizon"
                }`}
                aria-pressed={pinnedNodes.includes(node.id)}
                onClick={() => dispatch({ type: "togglePin", payload: node.id })}
              >
                {pinnedNodes.includes(node.id) ? "Pinned" : "Pin"} {node.label}
              </button>
            ))}
            {visibleNodes.length === 0 && (
              <p className="text-sm text-sand/70" role="status">
                No nodes match the filters.
              </p>
            )}
          </div>
        </div>
        <div className="rounded-lg border border-sand/20 bg-ink/50 p-3">
          <h3 className="font-semibold text-sm">Expand &amp; Provenance</h3>
          {focus ? (
            <div className="space-y-1 text-sm">
              <p className="font-semibold text-accent">{focus.label}</p>
              <p className="text-sand/80">Layer: {focus.layer}</p>
              <p className="text-sand/80">Provenance: {focus.provenance}</p>
              <p className="text-sand/80">Confidence: {(focus.confidence * 100).toFixed(0)}%</p>
              <p className="text-sand/80">Neighbors: {focus.neighbors.join(", ")}</p>
              <div className="flex gap-2 pt-2">
                {focus.neighbors.map((neighborId) => (
                  <button
                    key={`expand-${neighborId}`}
                    className="rounded-md border border-accent/60 bg-accent/10 px-3 py-1 text-xs text-accent"
                    onClick={() => dispatch({ type: "setFocusNode", payload: neighborId })}
                  >
                    Expand {neighborId}
                  </button>
                ))}
              </div>
            </div>
          ) : (
            <p className="text-sm text-sand/70">Select a node to see provenance and expand.</p>
          )}
        </div>
      </div>
    </section>
  );
}
