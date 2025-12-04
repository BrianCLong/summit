import React, { useState } from 'react';
import { runMaestroRequest, MaestroRunResponse } from '../../lib/api/maestro';

interface Props {
  userId: string;
}

export const MaestroRunConsole: React.FC<Props> = ({ userId }) => {
  const [requestText, setRequestText] = useState('');
  const [data, setData] = useState<MaestroRunResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleRun = async () => {
    setLoading(true);
    setError(null);
    try {
      const result = await runMaestroRequest({ userId, requestText });
      setData(result);
    } catch (err: any) {
      setError(err.message || 'An error occurred');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="p-4 border rounded shadow">
      <h2 className="text-xl font-bold mb-4">Maestro Run Console</h2>
      <textarea
        className="w-full p-2 border rounded mb-2"
        placeholder="describe what you want"
        value={requestText}
        onChange={(e) => setRequestText(e.target.value)}
        rows={4}
      />
      <button
        onClick={handleRun}
        disabled={loading || !requestText}
        className="bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600 disabled:opacity-50"
      >
        {loading ? 'Running...' : 'run with maestro'}
      </button>

      {error && <div className="mt-4 text-red-500">{error}</div>}

      {data && (
        <div className="mt-4 space-y-4">
          <div className="p-2 bg-gray-100 rounded">
            <div>Run ID: {data.run.id}</div>
            <div>Cost: ${data.costSummary.totalCostUSD.toFixed(4)}</div>
          </div>

          <div>
            <h3 className="font-semibold">Tasks</h3>
            {data.tasks.map(task => (
              <div key={task.id} className="border-l-2 border-blue-500 pl-2 my-2">
                <div>{task.description}</div>
                <div className="text-sm text-gray-500">{task.status}</div>
              </div>
            ))}
          </div>

          <div>
            <h3 className="font-semibold">Results</h3>
            {data.results.map((res, i) => (
              <div key={i} className="mt-2">
                 <div className="font-medium">{res.task.description}</div>
                 {res.artifact && (
                   <div className="bg-slate-50 p-2 rounded mt-1 font-mono text-sm">
                     {res.artifact.data}
                   </div>
                 )}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};
