import React from "react";
import { layers } from "../data";
import { useTriPane } from "./EventBus";

export function ExplainPanel() {
  const { state } = useTriPane();
  return (
    <aside
      className="rounded-2xl border border-accent/40 bg-ink/70 p-4 shadow-inner"
      aria-labelledby="explain-heading"
    >
      <p className="text-sm uppercase tracking-wide text-accent">Explain this view</p>
      <h3 id="explain-heading" className="text-lg font-semibold">
        Provenance &amp; confidence
      </h3>
      <p className="mt-2 text-sm text-sand/80">
        The system summarizes why these signals are co-visualized and how reliable each pane is
        under the current filters.
      </p>
      <dl className="mt-3 space-y-2 text-sm">
        <div className="flex items-start justify-between gap-2">
          <dt className="text-sand/80">Time window</dt>
          <dd className="font-semibold text-sand">
            {state.timeRange.start}h → {state.timeRange.end}h
          </dd>
        </div>
        <div className="flex items-start justify-between gap-2">
          <dt className="text-sand/80">Layers</dt>
          <dd className="text-right text-sand">
            {state.activeLayers
              .map((layer) => layers.find((l) => l.id === layer)?.label ?? layer)
              .join(", ")}
          </dd>
        </div>
        <div className="flex items-start justify-between gap-2">
          <dt className="text-sand/80">Geofence</dt>
          <dd className="text-right text-sand">{state.geofence ?? "None"}</dd>
        </div>
        <div className="flex items-start justify-between gap-2">
          <dt className="text-sand/80">Pins</dt>
          <dd className="text-right text-sand">{state.pinnedNodes.length || "None"}</dd>
        </div>
      </dl>
      <div className="mt-4 space-y-2" role="list">
        <p className="text-xs text-sand/70">
          Hover to see provenance. High contrast tooltips meet WCAG AAA.
        </p>
        {state.pinnedNodes.map((pin) => (
          <div
            key={pin}
            role="listitem"
            className="rounded-lg border border-sand/20 bg-horizon/60 px-3 py-2 text-sm"
          >
            <span className="font-semibold">{pin}</span>
            <abbr
              className="ml-2 cursor-help text-xs text-sand/70 underline decoration-dotted"
              title="Pinned items remain in graph + map even if the brush hides them. Confidence derived from source telemetry latency."
            >
              provenance
            </abbr>
          </div>
        ))}
        {state.pinnedNodes.length === 0 && (
          <p className="rounded-lg border border-dashed border-sand/20 bg-horizon/60 px-3 py-2 text-sm text-sand/70">
            Pin a node to preserve its context across panes.
          </p>
        )}
      </div>
    </aside>
  );
}
