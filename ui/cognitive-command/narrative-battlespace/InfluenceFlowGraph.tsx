import React from 'react';
import type { InfluenceFlow } from '../types';

export function InfluenceFlowGraph() {
  return (
    <div className="space-y-3">
      <span className="text-xs text-zinc-500">Influence propagation pathways</span>
      <div className="rounded border border-zinc-800 p-3 min-h-[120px]">
        <p className="text-xs text-zinc-500">Directed graph of influence flows between narrative clusters. Shows push, pull, amplify, and counter relationships with strength indicators. Identifies amplification nodes.</p>
      </div>
    </div>
  );
}
