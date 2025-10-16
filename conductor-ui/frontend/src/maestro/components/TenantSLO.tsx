import React, { useEffect, useState } from 'react';
import { api } from '../api';

export default function TenantSLO({ tenant }: { tenant: string }) {
  const { getSLOSummaryByTenant } = api();
  const [s, setS] = useState<any>(null);
  useEffect(() => {
    getSLOSummaryByTenant(tenant)
      .then(setS)
      .catch(() => setS(null));
  }, [tenant]);
  if (!s) return <div className="rounded-2xl border p-4 text-sm">No data</div>;
  const badge = (x: number) =>
    x >= 2 ? 'bg-red-600' : x >= 1 ? 'bg-amber-500' : 'bg-emerald-600';
  return (
    <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
      <Card
        title={`Fast burn (${s.windowFast})`}
        value={`${s.fastBurn.toFixed(2)}x`}
        cls={badge(s.fastBurn)}
      />
      <Card
        title={`Slow burn (${s.windowSlow})`}
        value={`${s.slowBurn.toFixed(2)}x`}
        cls={badge(s.slowBurn)}
      />
      <Card
        title="SLO"
        value={`${(s.slo * 100).toFixed(2)}%`}
        cls="bg-slate-600"
      />
    </div>
  );
}
function Card({
  title,
  value,
  cls,
}: {
  title: string;
  value: string;
  cls: string;
}) {
  return (
    <div className="rounded-2xl border p-4">
      <div className="mb-1 text-sm text-gray-500">{title}</div>
      <div className="text-2xl font-semibold">{value}</div>
      <span
        className={`mt-2 inline-block rounded px-2 py-0.5 text-xs text-white ${cls}`}
        aria-live="polite"
      >
        {cls.includes('emerald')
          ? 'HEALTHY'
          : cls.includes('amber')
            ? 'ALERT'
            : 'PAGE'}
      </span>
    </div>
  );
}
