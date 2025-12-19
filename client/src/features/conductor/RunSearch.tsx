import React, { useMemo, useState } from 'react';
import { Alert } from '@mui/material';
import { useAuthorization } from '../../auth/withAuthorization';

interface RunHit {
  runId: string;
  status: string;
  startedAt: string;
  tenant: string;
  summary: string;
}

export default function RunSearch() {
  const [hits, setHits] = useState<RunHit[]>([]);
  const [q, setQ] = useState({
    tenant: '',
    status: '',
    stepType: '',
    since: '',
    until: '',
  });
  const [error, setError] = useState('');
  const { canAccess, getTenantForAction, tenantId } = useAuthorization();
  const action = 'run:read';
  const scopedTenant = useMemo(
    () => getTenantForAction(action, q.tenant || tenantId),
    [action, getTenantForAction, q.tenant, tenantId],
  );
  const isAuthorized = canAccess(action, scopedTenant);

  async function search() {
    const tenantScope = getTenantForAction(action, q.tenant || tenantId);
    if (!canAccess(action, tenantScope)) {
      setError('You are not allowed to search runs for this tenant.');
      setHits([]);
      return;
    }
    setError('');
    const r = await fetch('/graphql', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        query: `{ searchRuns(q:${JSON.stringify({
          ...q,
          tenant: tenantScope,
        })}){ runId status startedAt tenant summary } }`,
      }),
    });
    const j = await r.json();
    setHits(j.data?.searchRuns || []);
  }
  return (
    <div className="p-4 rounded-2xl shadow">
      <h3 className="text-lg font-semibold">Run Search</h3>
      {error && (
        <Alert severity="warning" className="mb-2" data-testid="run-search-denied">
          {error}
        </Alert>
      )}
      <div className="grid grid-cols-5 gap-2 mb-2">
        <input
          placeholder="tenant"
          className="border rounded px-2 py-1"
          onChange={(e) => setQ({ ...q, tenant: e.target.value })}
        />
        <input
          placeholder="status"
          className="border rounded px-2 py-1"
          onChange={(e) => setQ({ ...q, status: e.target.value })}
        />
        <input
          placeholder="stepType"
          className="border rounded px-2 py-1"
          onChange={(e) => setQ({ ...q, stepType: e.target.value })}
        />
        <input
          placeholder="since ISO"
          className="border rounded px-2 py-1"
          onChange={(e) => setQ({ ...q, since: e.target.value })}
        />
        <input
          placeholder="until ISO"
          className="border rounded px-2 py-1"
          onChange={(e) => setQ({ ...q, until: e.target.value })}
        />
      </div>
      <button
        onClick={search}
        className="px-3 py-1 rounded-2xl shadow"
        disabled={!isAuthorized}
        data-testid="run-search-submit"
      >
        Search
      </button>
      <table className="w-full text-sm mt-3">
        <thead>
          <tr>
            <th>Run</th>
            <th>Status</th>
            <th>Tenant</th>
            <th>Started</th>
          </tr>
        </thead>
        <tbody>
          {hits.map((h: RunHit) => (
            <tr key={h.runId} className="border-b">
              <td className="font-mono">{String(h.runId).slice(0, 8)}</td>
              <td>{h.status}</td>
              <td>{h.tenant}</td>
              <td>{h.startedAt}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
