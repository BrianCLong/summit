import React from 'react';
import type { HistoricalAnalog } from '../types';

export function HistoricalAnalogsPanel() {
  return (
    <div className="space-y-3">
      <span className="text-xs text-zinc-500">Relevant historical analogs by similarity</span>
      <div className="rounded border border-zinc-800 p-3 min-h-[120px]">
        <p className="text-xs text-zinc-500">Historical analog cards will display here with similarity scores, key parallels, key differences, and outcomes. Helps answer: which analogs matter?</p>
      </div>
    </div>
  );
}
