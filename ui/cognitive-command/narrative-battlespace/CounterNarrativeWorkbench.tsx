import React, { useState } from 'react';
import type { CounterNarrative } from '../types';

export function CounterNarrativeWorkbench() {
  const [activeTab, setActiveTab] = useState<'planned' | 'active' | 'completed'>('active');

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2">
        {(['planned', 'active', 'completed'] as const).map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`rounded px-2 py-0.5 text-xs transition-colors ${
              activeTab === tab ? 'bg-blue-600 text-white' : 'bg-zinc-800 text-zinc-400 hover:bg-zinc-700'
            }`}
          >
            {tab.charAt(0).toUpperCase() + tab.slice(1)}
          </button>
        ))}
      </div>
      <div className="rounded border border-zinc-800 p-3 min-h-[120px]">
        <p className="text-xs text-zinc-500">Design and track counter-narrative responses. Compare adversarial vs defensive narratives with effectiveness metrics. Supports creating new counter-narrative campaigns.</p>
      </div>
    </div>
  );
}
