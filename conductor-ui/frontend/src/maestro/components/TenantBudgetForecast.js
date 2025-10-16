import { jsx as _jsx, jsxs as _jsxs } from 'react/jsx-runtime';
import { useEffect, useState } from 'react';
import { api } from '../api';
export default function TenantBudgetForecast({ tenant }) {
  const { getTenantBudget, putTenantBudget, getTenantCostForecast } = api();
  const [budget, setBudget] = useState(100);
  const [alpha, setAlpha] = useState(0.5);
  const [hours, setHours] = useState(48);
  const [f, setF] = useState(null);
  async function refresh(useBudget) {
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
  return _jsxs('section', {
    className: 'space-y-3 rounded-2xl border p-4',
    'aria-label': 'Budget forecast',
    children: [
      _jsxs('div', {
        className: 'flex flex-wrap items-center gap-3 text-sm',
        children: [
          _jsx('div', {
            className: `rounded px-2 py-1 text-white ${statusCls}`,
            children: f?.risk || '—',
          }),
          _jsxs('div', {
            children: [
              'Projected month:',
              ' ',
              _jsxs('span', {
                className: 'font-semibold',
                children: ['$', f?.projectedMonthUsd?.toFixed?.(2) ?? '—'],
              }),
              ' vs budget ',
              _jsxs('span', {
                className: 'font-semibold',
                children: ['$', f?.budgetUsd?.toFixed?.(2) ?? '—'],
              }),
            ],
          }),
          _jsxs('label', {
            className: 'flex items-center gap-2',
            children: [
              'Alpha',
              _jsx('input', {
                type: 'number',
                step: '0.1',
                min: 0.1,
                max: 0.9,
                className: 'w-20 rounded border px-2 py-1',
                value: alpha,
                onChange: (e) =>
                  setAlpha(
                    Math.min(0.9, Math.max(0.1, Number(e.target.value))),
                  ),
              }),
            ],
          }),
          _jsxs('label', {
            className: 'flex items-center gap-2',
            children: [
              'Hours',
              _jsxs('select', {
                className: 'rounded border px-2 py-1',
                value: hours,
                onChange: (e) => setHours(Number(e.target.value)),
                children: [
                  _jsx('option', { value: 24, children: '24' }),
                  _jsx('option', { value: 48, children: '48' }),
                  _jsx('option', { value: 72, children: '72' }),
                ],
              }),
            ],
          }),
          _jsxs('label', {
            className: 'flex items-center gap-2',
            children: [
              'Budget ($)',
              _jsx('input', {
                type: 'number',
                className: 'w-28 rounded border px-2 py-1',
                value: budget,
                onChange: (e) => setBudget(Number(e.target.value)),
              }),
            ],
          }),
          _jsx('button', {
            className: 'rounded border px-3 py-2',
            onClick: () => refresh(budget),
            children: 'Recalculate',
          }),
          _jsx('button', {
            className: 'rounded bg-blue-600 px-3 py-2 text-white',
            onClick: async () => {
              await putTenantBudget(tenant, budget);
              await refresh(budget);
            },
            children: 'Save budget',
          }),
        ],
      }),
      _jsxs('div', {
        className: 'text-xs text-slate-600',
        children: ['Hourly average (rough): ', f?.hourlyAvg ?? '—'],
      }),
    ],
  });
}
