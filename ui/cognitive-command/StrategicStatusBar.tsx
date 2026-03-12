import React from 'react';
import { useCommandContext } from './CommandContextProvider';

export function StrategicStatusBar() {
  const { state, toggleCommandPalette } = useCommandContext();
  const mode = state.context.activeMode;

  return (
    <header className="flex h-10 items-center justify-between border-b border-zinc-800 bg-zinc-900 px-4" role="banner">
      <div className="flex items-center gap-3">
        <span className="text-sm font-bold tracking-wider text-cyan-400">SUMMIT</span>
        <span className="text-xs text-zinc-500">|</span>
        <span className="text-xs font-semibold uppercase text-zinc-300">Cognitive Command Center</span>
      </div>

      <div className="flex items-center gap-4">
        <div className="flex items-center gap-2">
          <span className="text-xs text-zinc-500">MODE:</span>
          <span className="rounded bg-zinc-800 px-2 py-0.5 text-xs font-bold uppercase text-cyan-400">{mode}</span>
        </div>

        {state.context.activeMissionId && (
          <div className="flex items-center gap-2">
            <span className="text-xs text-zinc-500">MISSION:</span>
            <span className="text-xs text-zinc-300">{state.context.activeMissionId}</span>
          </div>
        )}

        <button
          onClick={toggleCommandPalette}
          className="flex items-center gap-1.5 rounded border border-zinc-700 px-2 py-1 text-xs text-zinc-400 transition-colors hover:border-zinc-600 hover:text-zinc-300"
        >
          <span>Command</span>
          <kbd className="rounded bg-zinc-800 px-1 text-[10px] text-zinc-500">⌘K</kbd>
        </button>

        <div className="flex items-center gap-1.5">
          <div className="h-2 w-2 rounded-full bg-emerald-500" title="System operational" />
          <span className="text-xs text-zinc-500">{new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
        </div>
      </div>
    </header>
  );
}
