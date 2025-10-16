// conductor-ui/frontend/src/components/knowledge/ExpertFinder.tsx
import React, { useState } from 'react';

const findExpert = async (filePath: string): Promise<any> => {
  const res = await fetch('/api/knowledge/query/structural', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      structural_query: { type: 'find_owner', path: filePath },
    }),
  });
  return res.json();
};

export const ExpertFinder = () => {
  const [filePath, setFilePath] = useState('services/lsc-service/src/index.ts');
  const [result, setResult] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(false);

  const handleFind = async () => {
    setIsLoading(true);
    const res = await findExpert(filePath);
    setResult(res);
    setIsLoading(false);
  };

  return (
    <div>
      <h4>Expert Finder</h4>
      <input
        type="text"
        value={filePath}
        onChange={(e) => setFilePath(e.target.value)}
        style={{ width: '300px' }}
      />
      <button onClick={handleFind} disabled={isLoading}>
        {isLoading ? 'Finding...' : 'Find Expert'}
      </button>
      {result && (
        <div>
          <p>
            <strong>Suggested Owner:</strong> {result.results[0].owner}
          </p>
          <p>
            <strong>Reasoning:</strong> {result.results[0].reasoning}
          </p>
        </div>
      )}
    </div>
  );
};
