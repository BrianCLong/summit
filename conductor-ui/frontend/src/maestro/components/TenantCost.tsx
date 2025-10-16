import React, { useEffect, useState } from 'react';
import { api } from '../api';
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
} from 'recharts';

export default function TenantCost({ tenant }: { tenant: string }) {
  const { getTenantCostSummary, getTenantCostSeries } = api();
  const [sum, setSum] = useState<any>(null);
  const [series, setSeries] = useState<any[]>([]);
  const [windowMs, setWindowMs] = useState<number>(24 * 3600 * 1000);

  useEffect(() => {
    getTenantCostSummary(tenant, windowMs)
      .then(setSum)
      .catch(() => setSum(null));
  }, [tenant, windowMs]);
  useEffect(() => {
    getTenantCostSeries(tenant, windowMs)
      .then((r) => setSeries(r.points || []))
      .catch(() => setSeries([]));
  }, [tenant, windowMs]);

  return (
    <section className="space-y-3" aria-label={`Cost for tenant ${tenant}`}>
      <div className="flex items-center gap-2">
        <label htmlFor="win" className="text-sm">
          Window
        </label>
        <select
          id="win"
          className="rounded border px-2 py-1"
          value={windowMs}
          onChange={(e) => setWindowMs(Number(e.target.value))}
        >
          <option value={3600000}>Last 1h</option>
          <option value={6 * 3600000}>Last 6h</option>
          <option value={24 * 3600000}>Last 24h</option>
          <option value={7 * 24 * 3600000}>Last 7d</option>
        </select>
      </div>

      <div className="flex items-center justify-between rounded-2xl border p-4">
        <div>
          <div className="text-sm text-gray-500">Total spend</div>
          <div className="text-3xl font-semibold">
            ${sum?.totalUsd?.toFixed?.(2) ?? '—'}
          </div>
        </div>
        <div className="text-sm text-gray-500">
          Tenant: <span className="font-medium">{tenant}</span>
        </div>
      </div>

      <div className="rounded-2xl border p-3">
        <div className="mb-2 text-sm text-gray-600">Spend over time</div>
        <div style={{ height: 220 }}>
          <ResponsiveContainer>
            <AreaChart
              data={series.map((p: any) => ({
                time: new Date(p.ts).toLocaleTimeString(),
                usd: Number(p.usd),
              }))}
            >
              <XAxis dataKey="time" hide />
              <YAxis />
              <Tooltip />
              <Area type="monotone" dataKey="usd" />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
        <div className="rounded-2xl border p-3">
          <div className="mb-2 text-sm text-gray-600">By pipeline</div>
          <table className="w-full text-sm">
            <thead>
              <tr>
                <th>Pipeline</th>
                <th>USD</th>
              </tr>
            </thead>
            <tbody>
              {(sum?.byPipeline || []).map((r: any) => (
                <tr key={r.pipeline}>
                  <td>{r.pipeline}</td>
                  <td>${r.usd.toFixed(2)}</td>
                </tr>
              ))}
              {!(sum?.byPipeline || []).length && (
                <tr>
                  <td colSpan={2} className="p-2 text-center text-gray-500">
                    No data
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
        <div className="rounded-2xl border p-3">
          <div className="mb-2 text-sm text-gray-600">By model/provider</div>
          <table className="w-full text-sm">
            <thead>
              <tr>
                <th>Provider</th>
                <th>Model</th>
                <th>USD</th>
              </tr>
            </thead>
            <tbody>
              {(sum?.byModelProvider || []).map((r: any, i: number) => (
                <tr key={i}>
                  <td>{r.provider}</td>
                  <td>{r.model}</td>
                  <td>${r.usd.toFixed(2)}</td>
                </tr>
              ))}
              {!(sum?.byModelProvider || []).length && (
                <tr>
                  <td colSpan={3} className="p-2 text-center text-gray-500">
                    No data
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      <div className="rounded-2xl border">
        <table className="w-full text-sm">
          <thead>
            <tr>
              <th>Run</th>
              <th>Pipeline</th>
              <th>Start</th>
              <th>Duration</th>
              <th>Tokens</th>
              <th>USD</th>
            </tr>
          </thead>
          <tbody>
            {(sum?.recentRuns || []).map((r: any) => (
              <tr key={r.runId}>
                <td>
                  <a
                    href={`#/maestro/runs/${r.runId}`}
                    className="text-blue-600 underline"
                  >
                    {r.runId.slice(0, 8)}
                  </a>
                </td>
                <td>{r.pipeline}</td>
                <td>{new Date(r.startedAt).toLocaleString()}</td>
                <td>{Math.round(r.durationMs / 1000)}s</td>
                <td>{r.tokens}</td>
                <td>${r.usd.toFixed(2)}</td>
              </tr>
            ))}
            {!(sum?.recentRuns || []).length && (
              <tr>
                <td colSpan={6} className="p-3 text-center text-gray-500">
                  No recent runs
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </section>
  );
}
