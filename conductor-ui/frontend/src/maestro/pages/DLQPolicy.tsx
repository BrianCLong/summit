import React, { useEffect, useState } from 'react';
import { api } from '../api';

export default function DLQPolicy() {
  const { getDLQPolicy, putDLQPolicy, getDLQAudit } = api();
  const [p, setP] = useState<any>(null);
  const [audit, setAudit] = useState<any[]>([]);
  const [allowKinds, setAllowKinds] = useState<string>('');
  const [allowSigs, setAllowSigs] = useState<string>('');

  const refresh = () => {
    getDLQPolicy().then((policy) => {
      setP(policy);
      setAllowKinds(policy.allowKinds?.join(',') || '');
      setAllowSigs(policy.allowSignatures?.join(',') || '');
    });
    getDLQAudit().then((a) => setAudit(a.items || []));
  };
  useEffect(() => {
    refresh();
  }, []);

  if (!p) return <div className="p-4">Loading…</div>;

  return (
    <section className="space-y-3" aria-label="DLQ policy">
      <div className="space-y-3 rounded-2xl border p-4">
        <div className="flex items-center gap-3">
          <label className="flex items-center gap-2">
            <input
              type="checkbox"
              checked={p.enabled}
              onChange={(e) => setP({ ...p, enabled: e.target.checked })}
            />{' '}
            <span>Enabled</span>
          </label>
          <label className="flex items-center gap-2">
            <input
              type="checkbox"
              checked={p.dryRun}
              onChange={(e) => setP({ ...p, dryRun: e.target.checked })}
            />{' '}
            <span>Dry-run</span>
          </label>
          <label className="flex items-center gap-2">
            Max replays/min
            <input
              type="number"
              className="w-24 rounded border px-2 py-1"
              value={p.maxReplaysPerMinute}
              onChange={(e) =>
                setP({ ...p, maxReplaysPerMinute: Number(e.target.value) })
              }
            />
          </label>
        </div>
        <label className="block text-sm">Allow kinds (CSV)</label>
        <input
          className="w-full rounded border px-2 py-1"
          value={allowKinds}
          onChange={(e) => setAllowKinds(e.target.value)}
        />
        <label className="block text-sm">
          Allow signatures (CSV; substring match on normalized signature)
        </label>
        <input
          className="w-full rounded border px-2 py-1"
          value={allowSigs}
          onChange={(e) => setAllowSigs(e.target.value)}
        />
        <div className="flex gap-2">
          <button
            className="rounded bg-blue-600 px-3 py-2 text-white"
            onClick={async () => {
              const body = {
                ...p,
                allowKinds: allowKinds
                  .split(',')
                  .map((s) => s.trim())
                  .filter(Boolean),
                allowSignatures: allowSigs
                  .split(',')
                  .map((s) => s.trim())
                  .filter(Boolean),
              };
              await putDLQPolicy(body);
              refresh();
            }}
          >
            Save
          </button>
          <button className="rounded border px-3 py-2" onClick={refresh}>
            Refresh
          </button>
        </div>
      </div>

      <div className="rounded-2xl border p-4">
        <h2 className="mb-2 font-medium">Recent policy actions</h2>
        <table className="w-full text-sm">
          <thead>
            <tr>
              <th>Time</th>
              <th>Action</th>
              <th>Details</th>
            </tr>
          </thead>
          <tbody>
            {audit.map((a, i) => (
              <tr key={i}>
                <td>{new Date(a.ts).toLocaleString()}</td>
                <td>{a.action}</td>
                <td>
                  <pre className="max-w-[720px] whitespace-pre-wrap break-all text-xs">
                    {JSON.stringify(a.details, null, 2)}
                  </pre>
                </td>
              </tr>
            ))}
            {!audit.length && (
              <tr>
                <td colSpan={3} className="p-3 text-center text-gray-500">
                  No audit entries
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </section>
  );
}
