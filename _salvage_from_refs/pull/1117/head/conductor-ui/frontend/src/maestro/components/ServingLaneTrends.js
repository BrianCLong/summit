import { jsx as _jsx, jsxs as _jsxs } from 'react/jsx-runtime';
import { useEffect, useState } from 'react';
import { api } from '../api';
import { ResponsiveContainer, LineChart, Line, XAxis, YAxis, Tooltip, Legend } from 'recharts';
export default function ServingLaneTrends() {
  const { getServingMetrics } = api();
  const [data, setData] = useState([]);
  useEffect(() => {
    (async () => {
      try {
        const r = await getServingMetrics();
        const s = (r.series || []).map((p) => ({ t: new Date(p.ts).toLocaleTimeString(), ...p }));
        setData(s);
      } catch {}
    })();
  }, []);
  if (!data.length) return null;
  return _jsxs('div', {
    className: 'grid grid-cols-1 gap-3 md:grid-cols-3',
    children: [
      _jsx(Card, { title: 'Queue depth', children: _jsx(Chart, { data: data, k: 'qDepth' }) }),
      _jsx(Card, { title: 'Batch size', children: _jsx(Chart, { data: data, k: 'batch' }) }),
      _jsx(Card, { title: 'KV cache hit', children: _jsx(Chart, { data: data, k: 'kvHit' }) }),
    ],
  });
}
function Chart({ data, k }) {
  return _jsx('div', {
    style: { height: 140 },
    children: _jsx(ResponsiveContainer, {
      children: _jsxs(LineChart, {
        data: data,
        children: [
          _jsx(XAxis, { dataKey: 't', hide: true }),
          _jsx(YAxis, {}),
          _jsx(Tooltip, {}),
          _jsx(Legend, {}),
          _jsx(Line, { type: 'monotone', dataKey: k, dot: false }),
        ],
      }),
    }),
  });
}
function Card({ title, children }) {
  return _jsxs('div', {
    className: 'rounded-2xl border p-3',
    children: [_jsx('div', { className: 'mb-2 text-sm text-gray-600', children: title }), children],
  });
}
