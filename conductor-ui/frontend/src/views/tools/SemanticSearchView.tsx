// conductor-ui/frontend/src/views/tools/SemanticSearchView.tsx
import React, { useState } from 'react';

const semanticSearch = async (query: string): Promise<any> => {
  const res = await fetch('/api/knowledge/query/semantic', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ natural_language_query: query }),
  });
  return res.json();
};

export const SemanticSearchView = () => {
  const [query, setQuery] = useState('What is our strategy for PII?');
  const [results, setResults] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  const handleSearch = async () => {
    setIsLoading(true);
    const res = await semanticSearch(query);
    setResults(res.results || []);
    setIsLoading(false);
  };

  return (
    <div>
      <h1>Semantic Search</h1>
      <input
        type="text"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        style={{ width: '400px' }}
      />
      <button onClick={handleSearch} disabled={isLoading}>
        {isLoading ? 'Searching...' : 'Ask'}
      </button>
      <div>
        {results.map((r, i) => (
          <div
            key={i}
            style={{
              border: '1px solid #eee',
              padding: '8px',
              margin: '8px 0',
            }}
          >
            <strong>
              {r.path} (Score: {r.score.toFixed(2)})
            </strong>
            <p>{r.summary}</p>
          </div>
        ))}
      </div>
    </div>
  );
};
