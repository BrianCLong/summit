import React from 'react';

export function QuickActionLauncher() {
  return (
    <div className="space-y-2">
      <h3 className="text-xs font-semibold text-zinc-300">Quick Actions</h3>
      <div className="grid grid-cols-2 gap-2">
        {[
          { label: 'New Mission', shortcut: 'Alt+N' },
          { label: 'Run Forecast', shortcut: 'Alt+F' },
          { label: 'Create Intervention', shortcut: 'Alt+I' },
          { label: 'Launch Agent', shortcut: 'Alt+A' },
        ].map((action) => (
          <button
            key={action.label}
            className="flex items-center justify-between rounded border border-zinc-800 bg-zinc-900 px-3 py-2 text-xs text-zinc-400 transition-colors hover:border-zinc-700 hover:text-zinc-300"
          >
            <span>{action.label}</span>
            <kbd className="rounded bg-zinc-800 px-1 text-[10px] text-zinc-600">{action.shortcut}</kbd>
          </button>
        ))}
      </div>
    </div>
  );
}
