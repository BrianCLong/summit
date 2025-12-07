import React, { useEffect, useMemo, useState } from 'react';
import { geofences, layers } from '../data';
import { useTriPane } from './EventBus';

interface PaletteAction {
  id: string;
  label: string;
  hint?: string;
  shortcut?: string;
  run: () => void;
}

export function CommandPalette() {
  const { state, dispatch } = useTriPane();
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');

  useEffect(() => {
    const handleKey = (event: KeyboardEvent) => {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === 'k') {
        event.preventDefault();
        setOpen((prev) => !prev);
      }
      if (event.key === 'Escape') {
        setOpen(false);
      }
    };
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, []);

  const actions: PaletteAction[] = useMemo(
    () => [
      {
        id: 'save-view',
        label: 'Save current view',
        hint: 'Capture time brush + filters',
        shortcut: '↵',
        run: () => {
          const name = `View ${state.savedViews.length + 1}`;
          dispatch({ type: 'saveView', payload: name });
          setQuery('');
          setOpen(false);
        }
      },
      ...layers.map((layer) => ({
        id: `layer-${layer.id}`,
        label: `${state.activeLayers.includes(layer.id) ? 'Disable' : 'Enable'} ${layer.label}`,
        hint: layer.description,
        run: () => dispatch({ type: 'toggleLayer', payload: layer.id })
      })),
      ...geofences.map((fence) => ({
        id: `geofence-${fence.id}`,
        label: `Focus ${fence.name}`,
        hint: fence.description,
        run: () => dispatch({ type: 'setGeofence', payload: fence.id })
      })),
      {
        id: 'clear-geofence',
        label: 'Clear geofence',
        run: () => dispatch({ type: 'setGeofence', payload: null })
      }
    ],
    [dispatch, state.activeLayers, state.savedViews.length]
  );

  const filtered = actions.filter((action) => action.label.toLowerCase().includes(query.toLowerCase()));

  return (
    <div>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="rounded-full border border-sand/20 bg-ink px-3 py-1 text-sm text-sand/80 transition hover:border-accent focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-offset-midnight"
        aria-haspopup="dialog"
      >
        ⌘K Command palette
      </button>
      {open && (
        <div
          role="dialog"
          aria-modal="true"
          aria-label="Command palette"
          className="fixed inset-0 z-50 flex items-start justify-center bg-black/60 p-4"
        >
          <div className="w-full max-w-xl rounded-2xl border border-sand/20 bg-midnight/95 p-4 shadow-lg">
            <div className="flex items-center justify-between">
              <input
                autoFocus
                aria-label="Command search"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                className="w-full rounded-lg border border-sand/20 bg-ink px-3 py-2 text-sand"
                placeholder="Jump to action, toggle layers, or save the view"
              />
              <button
                type="button"
                className="ml-2 rounded-full border border-sand/20 px-2 py-1 text-xs text-sand/70"
                onClick={() => setOpen(false)}
              >
                Esc
              </button>
            </div>
            <ul className="mt-3 max-h-72 space-y-2 overflow-y-auto" role="listbox">
              {filtered.map((action) => (
                <li key={action.id} className="rounded-lg border border-sand/10 bg-horizon/60">
                  <button
                    className="flex w-full items-start justify-between gap-3 rounded-lg px-3 py-2 text-left text-sm hover:bg-accent/20 focus-visible:bg-accent/20"
                    onClick={() => {
                      action.run();
                      setOpen(false);
                    }}
                  >
                    <div>
                      <p className="font-semibold text-sand">{action.label}</p>
                      {action.hint && <p className="text-xs text-sand/70">{action.hint}</p>}
                    </div>
                    {action.shortcut && <span className="rounded bg-ink px-2 py-1 text-[11px] text-sand/70">{action.shortcut}</span>}
                  </button>
                </li>
              ))}
              {filtered.length === 0 && (
                <li className="rounded-lg border border-sand/10 bg-horizon/60 px-3 py-2 text-sm text-sand/70">No actions.</li>
              )}
            </ul>
          </div>
        </div>
      )}
    </div>
  );
}
