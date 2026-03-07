import React, { useMemo, useState } from "react";
import { useTriPane } from "./EventBus";

export function SavedViewsPanel() {
  const { state, dispatch } = useTriPane();
  const [name, setName] = useState("Analyst snapshot");
  const sorted = useMemo(
    () =>
      [...state.savedViews].sort(
        (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
      ),
    [state.savedViews]
  );

  return (
    <div className="rounded-2xl border border-sand/20 bg-horizon/40 p-4 shadow-inner">
      <div className="flex items-center justify-between gap-3">
        <div>
          <p className="text-sm uppercase tracking-wide text-sand/80">Saved views</p>
          <h3 className="text-lg font-semibold">Restore graph + map + timeline</h3>
        </div>
        <button
          className="rounded-full border border-accent/60 bg-accent/10 px-3 py-1 text-sm text-accent"
          onClick={() => dispatch({ type: "saveView", payload: name })}
        >
          Save view
        </button>
      </div>
      <label className="mt-3 block text-sm" htmlFor="view-name">
        Name
      </label>
      <input
        id="view-name"
        value={name}
        onChange={(e) => setName(e.target.value)}
        className="mt-1 w-full rounded-lg border border-sand/20 bg-ink px-3 py-2 text-sm"
        aria-describedby="view-name-hint"
      />
      <p id="view-name-hint" className="text-xs text-sand/70">
        Saved views preserve time brush, layer filters, geofence, focus, pins, and layout mode.
      </p>
      <div className="mt-3 space-y-2" role="list">
        {sorted.map((view) => (
          <button
            key={view.id}
            className="flex w-full items-center justify-between rounded-lg border border-sand/20 bg-ink/50 px-3 py-2 text-left text-sm hover:border-accent focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-offset-midnight"
            onClick={() => dispatch({ type: "loadView", payload: view.id })}
          >
            <div>
              <p className="font-semibold">{view.snapshot.name}</p>
              <p className="text-xs text-sand/70">
                {view.snapshot.timeRange.start}h → {view.snapshot.timeRange.end}h ·{" "}
                {view.snapshot.activeLayers.length} layers · {view.snapshot.pinnedNodes.length} pins
                · {view.snapshot.layoutMode} layout
              </p>
            </div>
            <div className="flex flex-col items-end gap-1">
              <span className="rounded bg-horizon px-2 py-1 text-[11px] text-sand/70">Restore</span>
              <span className="text-[10px] uppercase tracking-wide text-sand/50">
                v{view.version} · {new Date(view.createdAt).toLocaleTimeString()}
              </span>
            </div>
          </button>
        ))}
      </div>
    </div>
  );
}
