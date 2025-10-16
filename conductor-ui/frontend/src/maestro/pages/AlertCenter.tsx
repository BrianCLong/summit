import React, { useEffect, useMemo, useState } from 'react';
import { api } from '../api';
import { canonSig } from '../utils/canonSig';
import PlaybookDialog from '../components/PlaybookDialog';

export default function AlertCenter() {
  const { getAlertCenterEvents, getIncidents } = api();
  const [since, setSince] = useState(6 * 3600 * 1000);
  const [filterType, setFilterType] = useState<
    'all' | 'ci' | 'slo' | 'forecast'
  >('all');
  const [filterSev, setFilterSev] = useState<'all' | 'info' | 'warn' | 'page'>(
    'all',
  );
  const [rows, setRows] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [mode, setMode] = useState<'events' | 'incidents'>('events');
  const [inc, setInc] = useState<any[]>([]);
  const [pb, setPb] = useState<{
    open: boolean;
    sig: string;
    provider: string;
  } | null>(null);

  const refresh = () => {
    setLoading(true);
    getAlertCenterEvents({ sinceMs: since })
      .then((r) => setRows(r.events || []))
      .finally(() => setLoading(false));
  };
  useEffect(() => {
    refresh();
  }, [since]);
  useEffect(() => {
    if (mode === 'incidents') {
      getIncidents({ sinceMs: since }).then((r) => setInc(r.incidents || []));
    }
  }, [mode, since]);

  const filtered = useMemo(
    () =>
      rows.filter(
        (e: any) =>
          (filterType === 'all' || e.type === filterType) &&
          (filterSev === 'all' || e.severity === filterSev),
      ),
    [rows, filterType, filterSev],
  );

  return (
    <section className="space-y-3 p-4" aria-label="Alert Center">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold">Alert Center</h1>
        <div className="flex gap-2">
          <button
            className={`rounded px-2 py-1 text-sm ${mode === 'events' ? 'bg-slate-800 text-white' : 'border'}`}
            onClick={() => setMode('events')}
          >
            Events
          </button>
          <button
            className={`rounded px-2 py-1 text-sm ${mode === 'incidents' ? 'bg-slate-800 text-white' : 'border'}`}
            onClick={() => setMode('incidents')}
          >
            Incidents
          </button>
          <button
            className="rounded border px-2 py-1 text-sm"
            onClick={refresh}
            disabled={loading}
          >
            Refresh
          </button>
        </div>
      </div>

      <div className="flex items-end gap-3">
        <label className="text-sm">
          Window&nbsp;
          <select
            className="rounded border px-2 py-1"
            value={since}
            onChange={(e) => setSince(Number(e.target.value))}
          >
            <option value={3600000}>1h</option>
            <option value={3 * 3600000}>3h</option>
            <option value={6 * 3600000}>6h</option>
            <option value={24 * 3600000}>24h</option>
          </select>
        </label>
        <label className="text-sm">
          Type&nbsp;
          <select
            className="rounded border px-2 py-1"
            value={filterType}
            onChange={(e) => setFilterType(e.target.value as any)}
          >
            <option value="all">All</option>
            <option value="ci">CI</option>
            <option value="slo">SLO</option>
            <option value="forecast">Forecast</option>
          </select>
        </label>
        <label className="text-sm">
          Severity&nbsp;
          <select
            className="rounded border px-2 py-1"
            value={filterSev}
            onChange={(e) => setFilterSev(e.target.value as any)}
          >
            <option value="all">All</option>
            <option value="info">Info</option>
            <option value="warn">Warn</option>
            <option value="page">Page</option>
          </select>
        </label>
      </div>

      {mode === 'events' ? (
        <div role="region" aria-live="polite" className="rounded-2xl border">
          <table className="w-full text-sm">
            <thead>
              <tr>
                <th>Time</th>
                <th>Severity</th>
                <th>Type</th>
                <th>Title</th>
                <th>Link</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((e: any) => (
                <tr key={e.id}>
                  <td>{new Date(e.ts).toLocaleString()}</td>
                  <td>
                    <span
                      className={`rounded px-2 py-0.5 text-white text-xs ${e.severity === 'page' ? 'bg-red-600' : e.severity === 'warn' ? 'bg-amber-500' : 'bg-slate-500'}`}
                    >
                      {String(e.severity).toUpperCase()}
                    </span>
                  </td>
                  <td>
                    <span className="rounded border px-2 py-0.5 text-xs">
                      {e.type}
                    </span>
                  </td>
                  <td>
                    {e.title}
                    <button
                      className="ml-2 text-blue-600 underline"
                      onClick={() => {
                        const provider =
                          e.type === 'forecast'
                            ? 'llm'
                            : e.type === 'ci'
                              ? 'ci'
                              : 'other';
                        setPb({
                          open: true,
                          sig: canonSig(e.title || ''),
                          provider,
                        });
                      }}
                    >
                      Playbook
                    </button>
                  </td>
                  <td>
                    {e.link ? (
                      <a
                        href={e.link}
                        target="_blank"
                        rel="noreferrer"
                        className="text-blue-600 underline"
                      >
                        open
                      </a>
                    ) : (
                      '-'
                    )}
                  </td>
                </tr>
              ))}
              {!filtered.length && (
                <tr>
                  <td colSpan={5} className="p-3 text-center text-gray-500">
                    {loading ? 'Loading…' : 'No events'}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      ) : (
        <div role="region" aria-live="polite" className="rounded-2xl border">
          <table className="w-full text-sm">
            <thead>
              <tr>
                <th>Time window</th>
                <th>Tenant</th>
                <th>Severity</th>
                <th>Events</th>
                <th>Details</th>
              </tr>
            </thead>
            <tbody>
              {inc.map((g: any) => (
                <tr key={g.id}>
                  <td>
                    {new Date(g.startTs).toLocaleTimeString()}–
                    {new Date(g.endTs).toLocaleTimeString()}
                  </td>
                  <td>{g.tenant}</td>
                  <td>
                    <span
                      className={`rounded px-2 py-0.5 text-white text-xs ${g.severity === 'page' ? 'bg-red-600' : g.severity === 'warn' ? 'bg-amber-500' : 'bg-slate-500'}`}
                    >
                      {String(g.severity).toUpperCase()}
                    </span>
                  </td>
                  <td>{g.count}</td>
                  <td>
                    <details>
                      <summary className="cursor-pointer text-blue-600 underline">
                        view
                      </summary>
                      <ul className="ml-6 list-disc">
                        {g.events.map((e: any) => (
                          <li key={e.id}>
                            {String(e.type).toUpperCase()} — {e.title}{' '}
                            {e.link ? (
                              <a
                                className="text-blue-600 underline"
                                href={e.link}
                                target="_blank"
                                rel="noreferrer"
                              >
                                (open)
                              </a>
                            ) : null}
                          </li>
                        ))}
                      </ul>
                    </details>
                  </td>
                </tr>
              ))}
              {!inc.length && (
                <tr>
                  <td colSpan={5} className="p-3 text-center text-gray-500">
                    No incidents
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}
      {pb?.open && (
        <PlaybookDialog
          open
          onClose={() => setPb(null)}
          sig={pb.sig}
          providerGuess={pb.provider}
        />
      )}
    </section>
  );
}
