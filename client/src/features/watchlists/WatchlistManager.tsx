import React, { useState } from 'react';

export default function WatchlistManager() {
  const [lists, setLists] = useState<any[]>([]);
  const add = () =>
    setLists([
      ...lists,
      { id: Date.now().toString(), name: 'New', members: [] },
    ]);
  return (
    <div>
      <button onClick={add}>New Watchlist</button>
      <ul>
        {lists.map((l) => (
          <li key={l.id}>{l.name}</li>
        ))}
      </ul>
    </div>
  );
}
