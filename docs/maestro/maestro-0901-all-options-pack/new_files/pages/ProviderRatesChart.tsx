import React, { useEffect, useState } from 'react';
import LineTimeseries from '../components/charts/LineTimeseries';
import { getProviderUsage } from '../api';

export default function ProviderRatesChart() {
  const [series, setSeries] = useState<{ x: string; y: number }[]>([]);
  const [limit, setLimit] = useState<number | null>(null);
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    const load = () =>
      getProviderUsage?.({ windowMs: 60_000 })
        .then((r: any) => {
          const points = (r?.series || []).map((p: any) => ({
            x: new Date(p.ts).toLocaleTimeString(),
            y: p.rpm,
          }));
          setSeries(points);
          setLimit(r?.limit ?? null);
        })
        .catch((e) => setErr(String(e)));
    load();
    const h = setInterval(load, 5000);
    return () => clearInterval(h);
  }, []);

  return (
    <div className="p-6 space-y-3">
      <h1 className="text-2xl font-semibold">Provider Rates</h1>
      <LineTimeseries
        title="Requests per minute"
        data={series}
        ariaLabel="Provider RPM over time"
      />
      {limit != null && (
        <div className="text-sm text-gray-600">Current limit: {limit} rpm</div>
      )}
      {err && <div className="text-red-600 text-sm">{err}</div>}
    </div>
  );
}
