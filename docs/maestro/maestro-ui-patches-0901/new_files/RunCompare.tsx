import React, { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';

type NodeDelta = {
  id: string;
  changed: boolean;
  reason?: string;
  durationDeltaMs?: number;
  costDelta?: number;
};
type CompareResponse = {
  currentRunId: string;
  previousRunId: string;
  durationDeltaMs: number;
  costDelta: number;
  nodes: NodeDelta[];
};

async function fetchCompare(runId: string): Promise<CompareResponse> {
  const base =
    (window as any).__MAESTRO_CFG__?.gatewayBase ?? '/api/maestro/v1';
  const res = await fetch(`${base}/runs/${runId}/compare/previous`);
  if (!res.ok) throw new Error('Failed to compare');
  return res.json();
}

export default function RunComparePage() {
  const { id } = useParams<{ id: string }>();
  const [data, setData] = useState<CompareResponse | null>(null);
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    if (!id) return;
    fetchCompare(id)
      .then(setData)
      .catch((e) => setErr(String(e)));
  }, [id]);

  if (err) return <div className="p-6 text-red-600">Error: {err}</div>;
  if (!data) return <div className="p-6">Loading…</div>;

  return (
    <div className="p-6 space-y-4">
      <header className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">
          Run {data.currentRunId} vs {data.previousRunId}
        </h1>
        <Link to={`/maestro/runs/${data.currentRunId}`} className="underline">
          Back to run
        </Link>
      </header>

      <section className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="border rounded-xl p-4">
          <h2 className="font-medium">Totals</h2>
          <ul className="text-sm mt-2">
            <li>Duration Δ: {Math.round(data.durationDeltaMs)} ms</li>
            <li>Cost Δ: ${data.costDelta.toFixed(4)}</li>
          </ul>
        </div>
        <div className="border rounded-xl p-4">
          <h2 className="font-medium">Changed Nodes</h2>
          <ul className="text-sm mt-2 max-h-[40vh] overflow-auto pr-2">
            {data.nodes
              .filter((n) => n.changed)
              .map((n) => (
                <li key={n.id} className="border rounded p-2 mb-2">
                  <div className="font-mono">{n.id}</div>
                  <div>{n.reason || 'Changed'}</div>
                  <div>
                    Duration Δ: {n.durationDeltaMs ?? 0} ms · Cost Δ:{' '}
                    {n.costDelta ?? 0}
                  </div>
                </li>
              ))}
          </ul>
        </div>
      </section>
    </div>
  );
}
