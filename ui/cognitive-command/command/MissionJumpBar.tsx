import React, { useState } from 'react';

export function MissionJumpBar() {
  const [query, setQuery] = useState('');

  return (
    <div className="flex items-center gap-2">
      <span className="text-xs text-zinc-500">Jump to:</span>
      <input
        type="text"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        placeholder="Mission, entity, or forecast..."
        className="rounded border border-zinc-700 bg-zinc-900 px-3 py-1.5 text-xs text-zinc-300 outline-none placeholder:text-zinc-600 focus:border-cyan-700"
      />
    </div>
  );
}
