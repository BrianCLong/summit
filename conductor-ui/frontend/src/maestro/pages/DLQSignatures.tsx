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

export default function DLQSignatures() {
  const {
    getDLQSignatures,
    getDLQSignatureTimeSeries,
    getDLQPolicy,
    putDLQPolicy,
  } = api();
  const [rows, setRows] = useState<any[]>([]);
  const [sel, setSel] = useState<string | null>(null);
  const [series, setSeries] = useState<any[]>([]);

  useEffect(() => {
    getDLQSignatures().then((r) => setRows(r.signatures || []));
  }, []);
  useEffect(() => {
    if (sel)
      getDLQSignatureTimeSeries(sel).then((r) => setSeries(r.points || []));
  }, [sel]);

  async function allowSignature(sig: string) {
    const pol = await getDLQPolicy();
    const list = new Set(pol.allowSignatures || []);
    if (list.has(sig)) return alert('Already allowed');
    list.add(sig);
    await putDLQPolicy({ allowSignatures: Array.from(list) });
    alert('Signature added to allowlist');
  }

  async function removeSignature(sig: string) {
    const pol = await getDLQPolicy();
    const list = new Set(pol.allowSignatures || []);
    if (!list.has(sig)) return alert('Not in allowlist');
    list.delete(sig);
    await putDLQPolicy({ allowSignatures: Array.from(list) });
    alert('Signature removed from allowlist');
  }

  return (
    <section className="space-y-3 p-4" aria-label="DLQ signatures">
      <h1 className="text-xl font-semibold">DLQ Signatures</h1>
      <table className="w-full border text-sm">
        <thead>
          <tr>
            <th>Count</th>
            <th>Trend</th>
            <th>Last seen</th>
            <th>Signature</th>
            <th>Actions</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((r: any) => (
            <tr key={r.sig}>
              <td>{r.count}</td>
              <td>{r.trend === 1 ? '↑' : r.trend === -1 ? '↓' : '→'}</td>
              <td>{new Date(r.lastTs).toLocaleString()}</td>
              <td className="max-w-[560px] truncate" title={r.sig}>
                {r.sig}
              </td>
              <td>
                <button
                  className="mr-2 text-blue-600 underline"
                  onClick={() => setSel(r.sig)}
                >
                  Trend
                </button>
                <button
                  className="mr-2 text-blue-600 underline"
                  onClick={() => allowSignature(r.sig)}
                >
                  Allow auto-replay
                </button>
                <button
                  className="text-red-600 underline"
                  onClick={() => removeSignature(r.sig)}
                >
                  Remove
                </button>
              </td>
            </tr>
          ))}
          {!rows.length && (
            <tr>
              <td colSpan={5} className="p-4 text-center text-gray-500">
                No signatures yet
              </td>
            </tr>
          )}
        </tbody>
      </table>

      {sel && (
        <div className="rounded-2xl border p-3">
          <div className="mb-2 text-sm text-gray-600">
            Signature trend: <code>{sel}</code>
          </div>
          <div style={{ height: 240 }}>
            <ResponsiveContainer>
              <AreaChart
                data={series.map((p: any) => ({
                  time: new Date(p.ts).toLocaleTimeString(),
                  count: p.count,
                }))}
              >
                <XAxis dataKey="time" hide />
                <YAxis allowDecimals={false} />
                <Tooltip />
                <Area dataKey="count" type="monotone" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}
    </section>
  );
}
