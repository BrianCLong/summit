import React, { useEffect, useState } from 'react';
import { getAlertCenterEvents } from '../api';
import { Link } from 'react-router-dom';

export default function AlertCenterCorrelated() {
  const [filters, setFilters] = useState<{
    type?: string;
    severity?: string;
    tenant?: string;
    provider?: string;
  }>({});
  const [events, setEvents] = useState<any[]>([]);
  const [err, setErr] = useState<string | null>(null);

  const load = () =>
    getAlertCenterEvents(filters)
      .then(setEvents)
      .catch((e) => setErr(String(e)));
  useEffect(() => {
    load();
  }, [filters]);

  return (
    <div className="p-6 space-y-3">
      <h1 className="text-2xl font-semibold">AlertCenter</h1>
      <div className="flex gap-2">
        <input
          className="border rounded px-2 py-1"
          placeholder="type"
          value={filters.type || ''}
          onChange={(e) =>
            setFilters({ ...filters, type: e.target.value || undefined })
          }
        />
        <input
          className="border rounded px-2 py-1"
          placeholder="severity"
          value={filters.severity || ''}
          onChange={(e) =>
            setFilters({ ...filters, severity: e.target.value || undefined })
          }
        />
        <input
          className="border rounded px-2 py-1"
          placeholder="tenant"
          value={filters.tenant || ''}
          onChange={(e) =>
            setFilters({ ...filters, tenant: e.target.value || undefined })
          }
        />
        <input
          className="border rounded px-2 py-1"
          placeholder="provider"
          value={filters.provider || ''}
          onChange={(e) =>
            setFilters({ ...filters, provider: e.target.value || undefined })
          }
        />
        <button className="border rounded px-3 py-1" onClick={load}>
          Refresh
        </button>
      </div>

      <table className="w-full text-sm border rounded">
        <thead className="bg-gray-50">
          <tr>
            <th className="text-left px-2 py-1">Time</th>
            <th className="text-left px-2 py-1">Type</th>
            <th className="text-left px-2 py-1">Severity</th>
            <th className="text-left px-2 py-1">Source</th>
            <th className="text-left px-2 py-1">Run</th>
            <th className="text-left px-2 py-1">Provider</th>
            <th className="text-left px-2 py-1">Tenant</th>
          </tr>
        </thead>
        <tbody>
          {events.map((e, i) => (
            <tr key={i} className="border-t">
              <td className="px-2 py-1">{new Date(e.at).toLocaleString()}</td>
              <td className="px-2 py-1">{e.type}</td>
              <td className="px-2 py-1">{e.severity}</td>
              <td className="px-2 py-1">{e.source || '-'}</td>
              <td className="px-2 py-1">
                {e.runId ? (
                  <Link className="underline" to={`/maestro/runs/${e.runId}`}>
                    #{e.runId}
                  </Link>
                ) : (
                  '-'
                )}
              </td>
              <td className="px-2 py-1">{e.provider || '-'}</td>
              <td className="px-2 py-1">{e.tenant || '-'}</td>
            </tr>
          ))}
        </tbody>
      </table>
      {err && <div className="text-red-600 text-sm">{err}</div>}
    </div>
  );
}
