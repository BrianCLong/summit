import React, { useEffect, useState } from 'react';
import { api } from '../api';

export default function TenantCostAnomalies({ tenant }: { tenant: string }) {
  const { getTenantCostAnomalies } = api();
  const [z, setZ] = useState<number>(3.0);
  const [data, setData] = useState<any>(null);
  useEffect(() => {
    getTenantCostAnomalies(tenant, 24 * 3600 * 1000, 60 * 60 * 1000, z).then(
      setData,
    );
  }, [tenant, z]);
  const anomalies = data?.anomalies || [];
  return (
    <section
      className="space-y-3 rounded-2xl border p-4"
      aria-label="Cost anomalies"
    >
      <div className="flex items-center gap-3">
        <h2 className="font-medium">Anomalies</h2>
        <label className="flex items-center gap-2 text-sm">
          Z-threshold
          <input
            type="number"
            step="0.1"
            className="w-24 rounded border px-2 py-1"
            value={z}
            onChange={(e) => setZ(Number(e.target.value))}
          />
        </label>
        <div className="text-sm text-gray-600">
          μ={data?.mean} σ={data?.std} (z≥{data?.threshold})
        </div>
      </div>
      <div className="rounded border">
        <table className="w-full text-sm">
          <thead>
            <tr>
              <th>Time</th>
              <th>USD</th>
              <th>z</th>
            </tr>
          </thead>
          <tbody>
            {anomalies.map((a: any) => (
              <tr key={a.ts}>
                <td>{new Date(a.ts).toLocaleTimeString()}</td>
                <td>${(+a.usd).toFixed(3)}</td>
                <td>{a.z}</td>
              </tr>
            ))}
            {!anomalies.length && (
              <tr>
                <td colSpan={3} className="p-3 text-center text-gray-500">
                  No anomalies
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </section>
  );
}
