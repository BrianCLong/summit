import React, { useState } from 'react';

const GraphExplorer = () => {
  const [cypher, setCypher] = useState('');
  const [results, setResults] = useState<any>(null);

  const handleQuery = async () => {
    try {
        const res = await fetch('/api/intelgraph/query', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${localStorage.getItem('token')}`
            },
            body: JSON.stringify({ dsl: { start: { type: 'Actor' } } }) // Mock DSL
        });
        const data = await res.json();
        setResults(data);
    } catch (e) {
        console.error(e);
    }
  };

  return (
    <div className="p-4 bg-gray-900 text-white h-full overflow-auto">
      <h2 className="text-xl font-bold mb-4">IntelGraph Explorer</h2>
      <div className="flex gap-2 mb-4">
        <button onClick={handleQuery} className="bg-blue-600 px-4 py-2 rounded hover:bg-blue-500">
            Load All Actors (Test DSL)
        </button>
      </div>
      <div className="bg-gray-800 p-4 rounded">
          <pre>{JSON.stringify(results, null, 2)}</pre>
      </div>
    </div>
  );
};

export default GraphExplorer;
