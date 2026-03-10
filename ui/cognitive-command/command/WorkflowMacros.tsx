import React from 'react';
import type { WorkflowMacro } from '../types';

export function WorkflowMacros() {
  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h3 className="text-xs font-semibold text-zinc-300">Saved Macros</h3>
        <button className="rounded bg-zinc-800 px-2 py-1 text-xs text-zinc-400 hover:bg-zinc-700">+ New</button>
      </div>
      <div className="rounded border border-zinc-800 p-3 min-h-[80px]">
        <p className="text-xs text-zinc-500">Saved workflow macros: multi-step command sequences that can be executed with a single shortcut. Supports operator favorites and slash commands.</p>
      </div>
    </div>
  );
}
