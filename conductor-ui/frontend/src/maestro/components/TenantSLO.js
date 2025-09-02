import { jsx as _jsx, jsxs as _jsxs } from 'react/jsx-runtime';
import { useEffect, useState } from 'react';
import { api } from '../api';
export default function TenantSLO({ tenant }) {
  const { getSLOSummaryByTenant } = api();
  const [s, setS] = useState(null);
  useEffect(() => {
    getSLOSummaryByTenant(tenant)
      .then(setS)
      .catch(() => setS(null));
  }, [tenant]);
  if (!s) return _jsx('div', { className: 'rounded-2xl border p-4 text-sm', children: 'No data' });
  const badge = (x) => (x >= 2 ? 'bg-red-600' : x >= 1 ? 'bg-amber-500' : 'bg-emerald-600');
  return _jsxs('div', {
    className: 'grid grid-cols-1 gap-3 md:grid-cols-3',
    children: [
      _jsx(Card, {
        title: `Fast burn (${s.windowFast})`,
        value: `${s.fastBurn.toFixed(2)}x`,
        cls: badge(s.fastBurn),
      }),
      _jsx(Card, {
        title: `Slow burn (${s.windowSlow})`,
        value: `${s.slowBurn.toFixed(2)}x`,
        cls: badge(s.slowBurn),
      }),
      _jsx(Card, { title: 'SLO', value: `${(s.slo * 100).toFixed(2)}%`, cls: 'bg-slate-600' }),
    ],
  });
}
function Card({ title, value, cls }) {
  return _jsxs('div', {
    className: 'rounded-2xl border p-4',
    children: [
      _jsx('div', { className: 'mb-1 text-sm text-gray-500', children: title }),
      _jsx('div', { className: 'text-2xl font-semibold', children: value }),
      _jsx('span', {
        className: `mt-2 inline-block rounded px-2 py-0.5 text-xs text-white ${cls}`,
        'aria-live': 'polite',
        children: cls.includes('emerald') ? 'HEALTHY' : cls.includes('amber') ? 'ALERT' : 'PAGE',
      }),
    ],
  });
}
