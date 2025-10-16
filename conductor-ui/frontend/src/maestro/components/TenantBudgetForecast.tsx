import React, { useEffect, useState } from 'react';
import { api } from '../api';

export default function TenantBudgetForecast({ tenant }: { tenant: string }) {
  const { getTenantBudget, putTenantBudget, getTenantCostForecast } = api();
  const [budget, setBudget] = useState<number>(100);
  const [alpha, setAlpha] = useState<number>(0.5);
  const [hours, setHours] = useState<number>(48);
  const [f, setF] = useState<any>(null);

  async function refresh(useBudget?: number) {
    const b = useBudget ?? (await getTenantBudget(tenant)).monthlyUsd;
    setBudget(b);
    const res = await getTenantCostForecast(tenant, hours, alpha, b);
    setF(res);
  }
  useEffect(() => {
    refresh().catch(() => {});
  }, [tenant, alpha, hours]);

  const statusCls =
    f?.risk === 'BREACH'
      ? 'bg-red-600'
      : f?.risk === 'WARN'
        ? 'bg-amber-500'
        : 'bg-emerald-600';

  return (
    <section
      className="space-y-3 rounded-2xl border p-4"
      aria-label="Budget forecast"
    >
      <div className="flex flex-wrap items-center gap-3 text-sm">
        <div className={`rounded px-2 py-1 text-white ${statusCls}`}>
          {f?.risk || '—'}
        </div>
        <div>
          Projected month:{' '}
          <span className="font-semibold">
            ${f?.projectedMonthUsd?.toFixed?.(2) ?? '—'}
          </span>{' '}
          vs budget{' '}
          <span className="font-semibold">
            ${f?.budgetUsd?.toFixed?.(2) ?? '—'}
          </span>
        </div>
        <label className="flex items-center gap-2">
          Alpha
          <input
            type="number"
            step="0.1"
            min={0.1}
            max={0.9}
            className="w-20 rounded border px-2 py-1"
            value={alpha}
            onChange={(e) =>
              setAlpha(Math.min(0.9, Math.max(0.1, Number(e.target.value))))
            }
          />
        </label>
        <label className="flex items-center gap-2">
          Hours
          <select
            className="rounded border px-2 py-1"
            value={hours}
            onChange={(e) => setHours(Number(e.target.value))}
          >
            <option value={24}>24</option>
            <option value={48}>48</option>
            <option value={72}>72</option>
          </select>
        </label>
        <label className="flex items-center gap-2">
          Budget ($)
          <input
            type="number"
            className="w-28 rounded border px-2 py-1"
            value={budget}
            onChange={(e) => setBudget(Number(e.target.value))}
          />
        </label>
        <button
          className="rounded border px-3 py-2"
          onClick={() => refresh(budget)}
        >
          Recalculate
        </button>
        <button
          className="rounded bg-blue-600 px-3 py-2 text-white"
          onClick={async () => {
            await putTenantBudget(tenant, budget);
            await refresh(budget);
          }}
        >
          Save budget
        </button>
      </div>
      <div className="text-xs text-slate-600">
        Hourly average (rough): {f?.hourlyAvg ?? '—'}
      </div>
    </section>
  );
}
