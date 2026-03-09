import React, { useEffect, useState } from 'react';
export default function SmartSearch() {
  const [q, setQ] = useState('');
  const [hits, setHits] = useState<any[]>([]);
  useEffect(() => {
    const t = setTimeout(async () => {
      if (q.length < 2) return setHits([]);
      try {
        const res = await fetch(`/api/search?q=${encodeURIComponent(q)}`);
        setHits(await res.json());
      } catch {
        setHits([]);
      }
    }, 150);
    return () => clearTimeout(t);
  }, [q]);
  return (
    <div className="smartsearch">
      <input
        aria-label="Search"
        placeholder="Search docs…"
        value={q}
        onChange={(e) => setQ(e.target.value)}
      />
      {hits.length > 0 && (
        <ul className="smartsearch-results">
          {hits.map((h) => (
            <li key={h.path}>
              <a href={h.path}>
                <strong>{h.title}</strong>
                <br />
                <small>{h.snippet}</small>
              </a>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
