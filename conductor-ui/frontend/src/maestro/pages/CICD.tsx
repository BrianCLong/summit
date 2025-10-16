import React, { useEffect, useMemo, useState } from 'react';
import CiSummary, { CiAnnotation } from '../components/CiSummary';
import RefreshIcon from '@mui/icons-material/Refresh';
import { IconButton, MenuItem, Select, TextField } from '@mui/material';
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  Legend,
} from 'recharts';
import { api } from '../api';

function setQuery(params: Record<string, string | number | undefined>) {
  const url = new URL(location.href);
  Object.entries(params).forEach(([k, v]) => {
    if (v === undefined || v === '') url.searchParams.delete(k);
    else url.searchParams.set(k, String(v));
  });
  history.replaceState(
    null,
    '',
    `${url.pathname}${url.search}${location.hash}`,
  );
}

export default function CICD() {
  const { getCIAnnotationsGlobal } = api();
  const url = new URL(location.href);
  const [level, setLevel] = useState(url.searchParams.get('level') || 'all');
  const [repo, setRepo] = useState(url.searchParams.get('repo') || '');
  const [since, setSince] = useState<number>(
    Number(url.searchParams.get('since') || 24 * 3600 * 1000),
  );
  const [rows, setRows] = useState<CiAnnotation[]>([]);
  const [loading, setLoading] = useState(false);
  const [trends, setTrends] = useState<any[]>([]);

  const refresh = () => {
    setLoading(true);
    getCIAnnotationsGlobal({
      sinceMs: since,
      level: level === 'all' ? undefined : level,
      repo: repo || undefined,
    })
      .then((r: any) => setRows(r.annotations || []))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    setQuery({ level, repo, since });
    refresh();
    // fetch trends
    (async () => {
      try {
        const r = await (api() as any).getCITrends({
          sinceMs: since,
          stepMs: 60 * 60 * 1000,
        });
        setTrends(
          (r.buckets || []).map((b: any) => ({
            time: new Date(b.ts).toLocaleTimeString(),
            ...b,
          })),
        );
      } catch {}
    })();
  }, [level, repo, since]);

  const link = (a: CiAnnotation) =>
    a.url
      ? a.url
      : a.repo && a.sha
        ? `https://github.com/${a.repo}/commit/${a.sha}`
        : undefined;

  const pathCol = (a: CiAnnotation) =>
    a.path ? `${a.path}${a.startLine ? `:${a.startLine}` : ''}` : '-';

  return (
    <section className="space-y-3 p-4" aria-label="CICD annotations">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold">CI Annotations</h1>
        <IconButton aria-label="Refresh" onClick={refresh} disabled={loading}>
          <RefreshIcon />
        </IconButton>
      </div>

      <CiSummary annotations={rows} />
      <div className="rounded-2xl border p-3">
        <div className="mb-2 text-sm text-gray-600">CI annotations trend</div>
        <div style={{ height: 220 }}>
          <ResponsiveContainer>
            <AreaChart data={trends}>
              <XAxis dataKey="time" hide />
              <YAxis allowDecimals={false} />
              <Tooltip />
              <Legend />
              <Area dataKey="failure" name="Failures" />
              <Area dataKey="warning" name="Warnings" />
              <Area dataKey="notice" name="Notices" />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </div>

      <div className="flex items-end gap-3">
        <Select
          value={level}
          onChange={(e) => setLevel(e.target.value as string)}
          size="small"
          aria-label="Level filter"
        >
          <MenuItem value="all">All</MenuItem>
          <MenuItem value="notice">Notice</MenuItem>
          <MenuItem value="warning">Warning</MenuItem>
          <MenuItem value="failure">Failure</MenuItem>
        </Select>
        <TextField
          size="small"
          label="Repo (owner/name)"
          value={repo}
          onChange={(e) => setRepo(e.target.value)}
        />
        <Select
          value={since}
          onChange={(e) => setSince(Number(e.target.value))}
          size="small"
          aria-label="Since filter"
        >
          <MenuItem value={3600000}>Last 1h</MenuItem>
          <MenuItem value={6 * 3600000}>Last 6h</MenuItem>
          <MenuItem value={24 * 3600000}>Last 24h</MenuItem>
          <MenuItem value={7 * 24 * 3600000}>Last 7d</MenuItem>
        </Select>
      </div>

      <div role="region" aria-live="polite" aria-relevant="additions text">
        <table className="w-full border text-sm">
          <thead>
            <tr>
              <th>Time</th>
              <th>Level</th>
              <th>Repo</th>
              <th>Run</th>
              <th>Path</th>
              <th>Message</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((a) => (
              <tr key={a.id}>
                <td>{new Date(a.ts).toLocaleString()}</td>
                <td>{a.level}</td>
                <td>{a.repo || '-'}</td>
                <td>
                  <a
                    href={`/maestro/runs/${a.runId}`}
                    className="text-blue-600 underline"
                  >
                    {a.runId.slice(0, 8)}
                  </a>
                </td>
                <td>{pathCol(a)}</td>
                <td>
                  {link(a) ? (
                    <a
                      href={link(a)!}
                      target="_blank"
                      rel="noreferrer"
                      className="text-blue-600 underline"
                    >
                      {a.message}
                    </a>
                  ) : (
                    a.message
                  )}
                </td>
              </tr>
            ))}
            {!rows.length && (
              <tr>
                <td colSpan={6} className="p-4 text-center text-gray-500">
                  {loading ? 'Loading…' : 'No annotations'}
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </section>
  );
}
