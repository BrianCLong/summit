import React from 'react';
import type { StateTransition } from '../types';

export function StateTransitionExplorer() {
  return (
    <div className="space-y-3">
      <span className="text-xs text-zinc-500">Explore observed and projected state transitions</span>
      <div className="rounded border border-zinc-800 p-3 min-h-[120px]">
        <p className="text-xs text-zinc-500">Transition path explorer: shows what changed, what is driving changes, what is most likely next, and where leverage points exist.</p>
      </div>
    </div>
  );
}
