import React, { useState, useEffect, useRef, useMemo } from 'react';
import { useCommandContext } from '../CommandContextProvider';
import type { CommandAction } from '../types';

const DEFAULT_ACTIONS: CommandAction[] = [
  { id: 'open-mission', label: 'Open Mission', category: 'navigation', shortcut: 'Alt+M', action: 'navigate', params: { target: 'mission' } },
  { id: 'open-entity', label: 'Open Entity', category: 'navigation', shortcut: 'Alt+E', action: 'navigate', params: { target: 'entity' } },
  { id: 'run-forecast', label: 'Run Forecast', category: 'analysis', shortcut: 'Alt+F', action: 'forecast' },
  { id: 'compare-scenarios', label: 'Compare Scenarios', category: 'analysis', action: 'compare' },
  { id: 'launch-agents', label: 'Launch Agent Fleet', category: 'agents', action: 'launch-fleet' },
  { id: 'pause-agents', label: 'Pause Agent Fleet', category: 'agents', action: 'pause-fleet' },
  { id: 'inspect-narrative', label: 'Inspect Narrative Terrain', category: 'narrative', action: 'inspect-narrative' },
  { id: 'create-intervention', label: 'Create Intervention Plan', category: 'decision', action: 'create-intervention' },
  { id: 'route-insight', label: 'Route Insight to Mission', category: 'insights', action: 'route-insight' },
  { id: 'open-governance', label: 'Open Governance Gate', category: 'governance', action: 'open-gate' },
  { id: 'save-layout', label: 'Save Current Layout', category: 'workspace', shortcut: 'Ctrl+Shift+S', action: 'save-layout' },
  { id: 'mode-observe', label: 'Switch to Observe Mode', category: 'modes', shortcut: 'Alt+1', action: 'set-mode', params: { mode: 'observe' } },
  { id: 'mode-investigate', label: 'Switch to Investigate Mode', category: 'modes', shortcut: 'Alt+2', action: 'set-mode', params: { mode: 'investigate' } },
  { id: 'mode-forecast', label: 'Switch to Forecast Mode', category: 'modes', shortcut: 'Alt+3', action: 'set-mode', params: { mode: 'forecast' } },
  { id: 'mode-simulate', label: 'Switch to Simulate Mode', category: 'modes', shortcut: 'Alt+4', action: 'set-mode', params: { mode: 'simulate' } },
  { id: 'mode-intervene', label: 'Switch to Intervene Mode', category: 'modes', shortcut: 'Alt+5', action: 'set-mode', params: { mode: 'intervene' } },
  { id: 'mode-govern', label: 'Switch to Govern Mode', category: 'modes', shortcut: 'Alt+6', action: 'set-mode', params: { mode: 'govern' } },
];

export function CognitiveCommandPalette() {
  const { state, closeCommandPalette, setMode } = useCommandContext();
  const [query, setQuery] = useState('');
  const [selectedIndex, setSelectedIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);

  const filtered = useMemo(() => {
    if (!query) return DEFAULT_ACTIONS;
    const lower = query.toLowerCase();
    return DEFAULT_ACTIONS.filter(
      (a) => a.label.toLowerCase().includes(lower) || a.category.toLowerCase().includes(lower)
    );
  }, [query]);

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  useEffect(() => {
    setSelectedIndex(0);
  }, [query]);

  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key === 'Escape') {
      closeCommandPalette();
    } else if (e.key === 'ArrowDown') {
      e.preventDefault();
      setSelectedIndex((i) => Math.min(i + 1, filtered.length - 1));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setSelectedIndex((i) => Math.max(i - 1, 0));
    } else if (e.key === 'Enter' && filtered[selectedIndex]) {
      executeAction(filtered[selectedIndex]);
    }
  }

  function executeAction(action: CommandAction) {
    if (action.action === 'set-mode' && action.params?.mode) {
      setMode(action.params.mode as any);
    }
    closeCommandPalette();
  }

  if (!state.isCommandPaletteOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center pt-[15vh]" onClick={closeCommandPalette}>
      <div className="absolute inset-0 bg-black/60" />
      <div
        className="relative w-full max-w-lg rounded-xl border border-zinc-700 bg-zinc-900 shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center border-b border-zinc-800 px-4">
          <span className="text-zinc-500 mr-2 text-sm">&gt;</span>
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Type a command..."
            className="h-12 flex-1 bg-transparent text-sm text-zinc-100 outline-none placeholder:text-zinc-600"
          />
          <kbd className="rounded bg-zinc-800 px-1.5 py-0.5 text-[10px] text-zinc-500">ESC</kbd>
        </div>
        <div className="max-h-72 overflow-auto py-2">
          {filtered.map((action, i) => (
            <button
              key={action.id}
              onClick={() => executeAction(action)}
              className={`flex w-full items-center justify-between px-4 py-2 text-left text-sm transition-colors ${
                i === selectedIndex ? 'bg-zinc-800 text-zinc-100' : 'text-zinc-400 hover:bg-zinc-800/50'
              }`}
            >
              <div className="flex items-center gap-3">
                <span className="rounded bg-zinc-800 px-1.5 py-0.5 text-[10px] text-zinc-500">{action.category}</span>
                <span>{action.label}</span>
              </div>
              {action.shortcut && (
                <kbd className="rounded bg-zinc-800 px-1.5 py-0.5 text-[10px] text-zinc-500">{action.shortcut}</kbd>
              )}
            </button>
          ))}
          {filtered.length === 0 && (
            <div className="px-4 py-6 text-center text-sm text-zinc-600">No matching commands</div>
          )}
        </div>
      </div>
    </div>
  );
}
