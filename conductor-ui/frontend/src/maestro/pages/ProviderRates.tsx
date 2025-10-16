import React, { useEffect, useState } from 'react';
import { api } from '../api';

export default function ProviderRates() {
  const { getProviderUsage, setProviderLimit } = api();
  const [items, setItems] = useState<any[]>([]);
  const [win, setWin] = useState(3600 * 1000);
  const refresh = () =>
    getProviderUsage(win).then((r) => setItems(r.items || []));
  useEffect(() => {
    refresh();
    const t = setInterval(refresh, 5000);
    return () => clearInterval(t);
  }, [win]);

  return (
    <section className="space-y-3 p-4" aria-label="Provider rate limits">
      <div className="flex items-center gap-3">
        <h1 className="text-xl font-semibold">Provider Rates</h1>
        <select
          className="rounded border px-2 py-1"
          value={win}
          onChange={(e) => setWin(Number(e.target.value))}
          aria-label="Window"
        >
          <option value={3600000}>1h</option>
          <option value={6 * 3600000}>6h</option>
          <option value={24 * 3600000}>24h</option>
        </select>
      </div>

      <table className="w-full border text-sm">
        <thead>
          <tr>
            <th>Provider</th>
            <th>RPM</th>
            <th>Limit</th>
            <th>Drop</th>
            <th>p95 (ms)</th>
            <th>Actions</th>
          </tr>
        </thead>
        <tbody>
          {items.map((it) => (
            <tr key={it.provider}>
              <td>{it.provider}</td>
              <td>{it.rpm}</td>
              <td>{it.limit}</td>
              <td>{(it.dropRate * 100).toFixed(0)}%</td>
              <td>{it.p95ms}</td>
              <td>
                <button
                  className="mr-2 text-blue-600 underline"
                  onClick={async () => {
                    const rpm = Number(
                      prompt(
                        `Set RPM limit for ${it.provider}`,
                        String(it.limit),
                      ) || it.limit,
                    );
                    if (!Number.isFinite(rpm) || rpm <= 0) return;
                    await setProviderLimit(it.provider, rpm);
                    refresh();
                  }}
                >
                  Set limit
                </button>
                {it.rpm > it.limit && (
                  <span className="text-xs text-red-600">THROTTLING</span>
                )}
              </td>
            </tr>
          ))}
          {!items.length && (
            <tr>
              <td colSpan={6} className="p-3 text-center text-gray-500">
                No providers
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </section>
  );
}
