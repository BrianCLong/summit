'use client';

import { useState } from 'react';

export default function SearchBar({ onSearch }: { onSearch: (q: string) => void }) {
  const [q, setQ] = useState('');

  const handleSearch = () => {
    onSearch(q);
  };

  return (
    <div className="p-2 flex gap-2">
      <input
        className="border p-1 w-full"
        value={q}
        onChange={(e) => setQ(e.target.value)}
        placeholder="Search entities..."
        onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
      />
      <button className="bg-blue-500 text-white px-4 py-1 rounded" onClick={handleSearch}>
        Search
      </button>
    </div>
  );
}
