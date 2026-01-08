import React from "react";
import { geofences, layers, nodes } from "../data";
import { useTriPane } from "./EventBus";

export function MapPane() {
  const { state, dispatch } = useTriPane();
  const { geofence, activeLayers, timeRange } = state;

  const filteredNodes = nodes.filter((node) => {
    const withinTime = node.timestamp >= timeRange.start && node.timestamp <= timeRange.end;
    return (
      withinTime && activeLayers.includes(node.layer) && (!geofence || node.geofence === geofence)
    );
  });

  const counts = layers.map((layer) => ({
    ...layer,
    total: filteredNodes.filter((node) => node.layer === layer.id).length,
  }));

  return (
    <section
      aria-labelledby="map-heading"
      className="flex flex-col gap-3 rounded-2xl border border-sand/20 bg-horizon/40 p-4 shadow-inner"
    >
      <div className="flex items-center justify-between gap-4">
        <div>
          <p className="text-sm uppercase tracking-wide text-sand/80">Map</p>
          <h2 id="map-heading" className="text-lg font-semibold">
            Layers &amp; geofences
          </h2>
        </div>
        <div className="flex items-center gap-2 text-sm" aria-live="polite">
          <span className="rounded-md bg-ink px-3 py-1">{filteredNodes.length} items in view</span>
        </div>
      </div>
      <div className="grid gap-3 md:grid-cols-2">
        <div className="rounded-lg border border-sand/20 bg-ink/50 p-3">
          <h3 className="font-semibold text-sm">Geofences</h3>
          <p className="text-xs text-sand/70">
            Toggle a geofence to lock focus; press again to clear. Active window: {timeRange.start}h
            → {timeRange.end}h.
          </p>
          <div className="mt-2 flex flex-wrap gap-2" role="list">
            {geofences.map((fence) => {
              const isActive = geofence === fence.id;
              return (
                <button
                  key={fence.id}
                  role="listitem"
                  className={`rounded-lg border px-3 py-2 text-left text-sm transition focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-offset-ink ${
                    isActive
                      ? "border-accent bg-accent/15 text-accent"
                      : "border-sand/20 bg-horizon"
                  }`}
                  aria-pressed={isActive}
                  onClick={() =>
                    dispatch({ type: "setGeofence", payload: isActive ? null : fence.id })
                  }
                >
                  <p className="font-semibold">{fence.name}</p>
                  <p className="text-xs text-sand/70">{fence.description}</p>
                </button>
              );
            })}
          </div>
        </div>
        <div className="rounded-lg border border-sand/20 bg-ink/50 p-3">
          <h3 className="font-semibold text-sm">Layers</h3>
          <p className="text-xs text-sand/70">
            Press space or enter to toggle layers; counts respect the active brush.
          </p>
          <div className="mt-3 space-y-2" role="group" aria-label="Map layers">
            {counts.map((layer) => {
              const enabled = activeLayers.includes(layer.id);
              return (
                <label
                  key={layer.id}
                  className={`flex cursor-pointer items-center justify-between gap-3 rounded-md border px-3 py-2 transition ${
                    enabled ? "border-accent bg-accent/10" : "border-sand/20 bg-horizon"
                  }`}
                >
                  <div>
                    <span className="block font-semibold">{layer.label}</span>
                    <span className="text-xs text-sand/70">{layer.description}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span
                      className="rounded bg-ink px-2 py-1 text-xs"
                      aria-label={`${layer.total} items`}
                    >
                      {layer.total}
                    </span>
                    <input
                      type="checkbox"
                      className="h-4 w-4 accent-accent"
                      checked={enabled}
                      onChange={() => dispatch({ type: "toggleLayer", payload: layer.id })}
                      aria-checked={enabled}
                    />
                  </div>
                </label>
              );
            })}
          </div>
        </div>
      </div>
      <div className="rounded-xl border border-sand/20 bg-ink/60 p-4">
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="text-sm font-semibold">Spatial playback</p>
            <p className="text-xs text-sand/70">
              Timeline brush replays on-map counts for rapid triage.
            </p>
          </div>
          <div className="flex gap-2 text-xs text-sand/70">
            <span className="inline-flex items-center gap-1 rounded-full bg-horizon px-2 py-1">
              <span className="h-2 w-2 rounded-full bg-accent" /> Active
            </span>
            <span className="inline-flex items-center gap-1 rounded-full bg-horizon px-2 py-1">
              <span className="h-2 w-2 rounded-full bg-sand/50" /> Muted
            </span>
          </div>
        </div>
        <div className="mt-4 grid grid-cols-3 gap-4" role="list">
          {geofences.map((fence) => {
            const fenceNodes = filteredNodes.filter((node) => node.geofence === fence.id);
            return (
              <div
                key={`geo-${fence.id}`}
                role="listitem"
                className={`rounded-lg border ${fence.color} bg-horizon/60 p-3`}
              >
                <p className="font-semibold text-sm">{fence.name}</p>
                <p className="text-xs text-sand/70">{fenceNodes.length} signals</p>
                <div className="mt-2 space-y-1 text-xs text-sand/80">
                  {fenceNodes.map((node) => (
                    <div key={node.id} className="flex justify-between">
                      <span>{node.label}</span>
                      <span className="text-sand/60">{node.timestamp}h</span>
                    </div>
                  ))}
                  {fenceNodes.length === 0 && (
                    <p className="text-sand/60">No items in this window.</p>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
