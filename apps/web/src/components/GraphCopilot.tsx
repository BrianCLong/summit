import React, { useState } from 'react';

export const GraphCopilot: React.FC = () => {
  const [query, setQuery] = useState('');
  const [response, setResponse] = useState<string | null>(null);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (query.toLowerCase().includes('high risk')) {
      setResponse('Highlighting 42 High Risk nodes...');
    } else {
      setResponse('I did not understand that command.');
    }
  };

  return (
    <div className="p-4 border rounded shadow-lg bg-slate-800 text-white w-full max-w-md">
      <h3 className="text-lg font-bold mb-2">Graph Copilot</h3>
      <form onSubmit={handleSubmit} className="flex gap-2">
        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Ask the graph..."
          className="flex-1 p-2 rounded text-black"
        />
        <button type="submit" className="bg-blue-600 px-4 py-2 rounded hover:bg-blue-500">
          Ask
        </button>
      </form>
      {response && (
        <div className="mt-4 p-2 bg-slate-700 rounded animate-pulse">
          {response}
        </div>
      )}
    </div>
  );
};
