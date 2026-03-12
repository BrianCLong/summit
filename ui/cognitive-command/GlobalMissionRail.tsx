import React from 'react';
import { useCommandContext } from './CommandContextProvider';
import type { CommandMode } from './types';

const MODES: { mode: CommandMode; label: string; shortcut: string }[] = [
  { mode: 'observe', label: 'OBS', shortcut: '1' },
  { mode: 'investigate', label: 'INV', shortcut: '2' },
  { mode: 'forecast', label: 'FCT', shortcut: '3' },
  { mode: 'simulate', label: 'SIM', shortcut: '4' },
  { mode: 'intervene', label: 'INT', shortcut: '5' },
  { mode: 'govern', label: 'GOV', shortcut: '6' },
];

const MODE_COLORS: Record<CommandMode, string> = {
  observe: 'bg-cyan-500',
  investigate: 'bg-amber-500',
  forecast: 'bg-violet-500',
  simulate: 'bg-emerald-500',
  intervene: 'bg-rose-500',
  govern: 'bg-blue-500',
};

export function GlobalMissionRail() {
  const { state, setMode } = useCommandContext();

  React.useEffect(() => {
    function handleKey(e: KeyboardEvent) {
      if (e.altKey && !e.ctrlKey && !e.metaKey) {
        const entry = MODES.find((m) => m.shortcut === e.key);
        if (entry) {
          e.preventDefault();
          setMode(entry.mode);
        }
      }
    }
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [setMode]);

  return (
    <nav className="flex w-14 flex-col items-center gap-1 border-r border-zinc-800 bg-zinc-900 py-3" role="navigation" aria-label="Command modes">
      {MODES.map(({ mode, label, shortcut }) => {
        const isActive = state.context.activeMode === mode;
        return (
          <button
            key={mode}
            onClick={() => setMode(mode)}
            className={`group relative flex h-10 w-10 items-center justify-center rounded-lg text-xs font-bold transition-colors ${
              isActive ? `${MODE_COLORS[mode]} text-white` : 'text-zinc-500 hover:bg-zinc-800 hover:text-zinc-300'
            }`}
            title={`${mode.charAt(0).toUpperCase() + mode.slice(1)} mode (Alt+${shortcut})`}
            aria-pressed={isActive}
          >
            {label}
          </button>
        );
      })}
    </nav>
  );
}
