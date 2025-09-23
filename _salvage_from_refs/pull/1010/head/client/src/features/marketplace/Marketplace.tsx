import React, { useState } from 'react';

export default function Marketplace() {
  const [byRep, setByRep] = useState(true);
  const items = [
    { publisher: 'pubA', score: 0.9 },
    { publisher: 'pubB', score: 0.5 },
  ];
  const sorted = [...items].sort((a, b) => (byRep ? b.score - a.score : 0));
  return (
    <div>
      <label>
        <input type="checkbox" checked={byRep} onChange={() => setByRep(!byRep)} /> sort by
        reputation
      </label>
      <ul>
        {sorted.map(i => (
          <li key={i.publisher}>{i.publisher} ({i.score.toFixed(2)})</li>
        ))}
      </ul>
    </div>
  );
}
