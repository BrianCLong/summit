import React, { useEffect, useState } from 'react';
import LineTimeseries from '../components/charts/LineTimeseries';
import { getTenantCostForecast, getTenantCostAnomalies } from '../api';

export default function TenantForecastChart() {
  const [series, setSeries] = useState<{ x: string; y: number }[]>([]);
  const [anom, setAnom] = useState<any[]>([]);
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    Promise.all([getTenantCostForecast?.(), getTenantCostAnomalies?.()])
      .then(([f, a]) => {
        const s = (f?.points || []).map((p: any) => ({
          x: new Date(p.ts).toLocaleTimeString(),
          y: p.value,
        }));
        setSeries(s);
        setAnom(a || []);
      })
      .catch((e) => setErr(String(e)));
  }, []);

  return (
    <div className="p-6 space-y-3">
      <h1 className="text-2xl font-semibold">Tenant Costs</h1>
      <LineTimeseries
        title="Forecast (EMA)"
        data={series}
        ariaLabel="Tenant cost forecast EMA"
      />
      <section className="border rounded p-3">
        <h3 className="font-medium">Anomalies</h3>
        <ul className="text-sm mt-2">
          {anom.map((row: any, i: number) => (
            <li key={i}>
              {row.reason || 'anomaly'} — z={row.z?.toFixed?.(2) ?? row.z}
            </li>
          ))}
        </ul>
      </section>
      {err && <div className="text-red-600 text-sm">{err}</div>}
    </div>
  );
}
