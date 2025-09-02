import { jsx as _jsx, jsxs as _jsxs } from 'react/jsx-runtime';
import { useEffect, useState } from 'react';
export default function ErrorBudgetBurn({ pipeline }) {
  const [burn, setBurn] = useState(null);
  useEffect(() => {
    const fast = Math.max(0.5, Math.random() * 1.6);
    const slow = Math.max(0.3, Math.random() * 1.2);
    setBurn({ fast, slow });
  }, [pipeline]);
  const badge = (x) => (x >= 2 ? 'bg-red-600' : x >= 1 ? 'bg-amber-500' : 'bg-emerald-600');
  return _jsxs('div', {
    className: 'grid grid-cols-1 gap-3 md:grid-cols-2',
    children: [
      _jsx(Card, {
        title: 'Fast burn (1h)',
        value: `${burn?.fast?.toFixed(2) ?? '—'}x`,
        cls: badge(burn?.fast || 0),
      }),
      _jsx(Card, {
        title: 'Slow burn (6h)',
        value: `${burn?.slow?.toFixed(2) ?? '—'}x`,
        cls: badge(burn?.slow || 0),
      }),
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
