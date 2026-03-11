import React, { useMemo, useState } from 'react';

const COMMANDS = [
  'Search entities',
  'Run graph query',
  'Launch agent',
  'Open investigation',
  'Trigger simulation',
];

export function WarRoomCommandPalette() {
  const [query, setQuery] = useState('');
  const filtered = useMemo(
    () => COMMANDS.filter((command) => command.toLowerCase().includes(query.toLowerCase())),
    [query],
  );

  return (
    <section>
      <h4>Command Palette</h4>
      <input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Type a command..." />
      <ul>
        {filtered.map((command) => (
          <li key={command}>{command}</li>
        ))}
      </ul>
    </section>
  );
}
