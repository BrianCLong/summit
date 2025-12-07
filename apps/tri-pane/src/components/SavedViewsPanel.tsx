import React, { useState } from 'react';
import { useTriPane } from './EventBus';

export function SavedViewsPanel() {
  const { state, dispatch } = useTriPane();
  const [name, setName] = useState('Analyst snapshot');

  return (
    <div className="rounded-2xl border border-sand/20 bg-horizon/40 p-4 shadow-inner">
      <div className="flex items-center justify-between gap-3">
        <div>
          <p className="text-sm uppercase tracking-wide text-sand/80">Saved views</p>
          <h3 className="text-lg font-semibold">Restore graph + map + timeline</h3>
        </div>
        <button
          className="rounded-full border border-accent/60 bg-accent/10 px-3 py-1 text-sm text-accent"
          onClick={() => dispatch({ type: 'saveView', payload: name })}
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
        Saved views preserve time brush, layer filters, geofence, focus, and pins.
      </p>
      <div className="mt-3 space-y-2" role="list">
        {state.savedViews.map((view) => (
          <button
            key={view.name}
            className="flex w-full items-center justify-between rounded-lg border border-sand/20 bg-ink/50 px-3 py-2 text-left text-sm hover:border-accent focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-offset-midnight"
            onClick={() => dispatch({ type: 'loadView', payload: view.name })}
          >
            <div>
              <p className="font-semibold">{view.name}</p>
              <p className="text-xs text-sand/70">
                {view.timeRange.start}h → {view.timeRange.end}h · {view.activeLayers.length} layers · {view.pinnedNodes.length}{' '}
                pins
              </p>
            </div>
            <span className="rounded bg-horizon px-2 py-1 text-[11px] text-sand/70">Restore</span>
          </button>
        ))}
      </div>
    </div>
  );
}
