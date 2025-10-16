import React, { useEffect, useState } from 'react';
import { api } from '../api';

export default function ModelAnomalyPanels({ tenant }: { tenant: string }) {
  const { getModelCostAnomalies } = api();
  const [items, setItems] = useState<any[]>([]);
  useEffect(() => {
    getModelCostAnomalies(tenant).then((r) => setItems(r.items || []));
  }, [tenant]);
  return (
    <section
      className="space-y-3 rounded-2xl border p-4"
      aria-label="Model anomalies"
    >
      <h2 className="font-medium">Per-model anomalies</h2>
      <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
        {items.map((it, idx) => (
          <div key={idx} className="rounded-xl border p-3 text-sm">
            <div className="mb-1 text-gray-600">
              {it.provider} / <span className="font-medium">{it.model}</span> —
              z={it.z}
            </div>
            <div className="text-xs text-slate-600">last: ${it.last}</div>
          </div>
        ))}
        {!items.length && (
          <div className="p-3 text-sm text-gray-500">No data</div>
        )}
      </div>
    </section>
  );
}
