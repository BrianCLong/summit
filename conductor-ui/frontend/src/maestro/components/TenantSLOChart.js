import { jsxs as _jsxs, jsx as _jsx } from 'react/jsx-runtime';
import { useEffect, useState } from 'react';
import { api } from '../api';
import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  Legend,
  ReferenceLine,
} from 'recharts';
export default function TenantSLOChart({ tenant }) {
  const { getSLOTimeSeriesByTenant } = api();
  const [data, setData] = useState([]);
  useEffect(() => {
    getSLOTimeSeriesByTenant(tenant).then((r) => {
      setData(
        r.points.map((p) => ({
          time: new Date(p.ts).toLocaleTimeString(),
          ...p,
        })),
      );
    });
  }, [tenant]);
  return _jsxs('div', {
    className: 'rounded-2xl border p-3',
    children: [
      _jsxs('div', {
        className: 'mb-2 text-sm text-gray-600',
        children: ['Tenant \u201C', tenant, '\u201D \u2014 burn over time'],
      }),
      _jsx('div', {
        style: { height: 260 },
        children: _jsx(ResponsiveContainer, {
          children: _jsxs(LineChart, {
            data: data,
            children: [
              _jsx(XAxis, { dataKey: 'time', hide: true }),
              _jsx(YAxis, { domain: [0, 'dataMax+0.5'] }),
              _jsx(Tooltip, {}),
              _jsx(Legend, {}),
              _jsx(ReferenceLine, { y: 1, strokeDasharray: '3 3' }),
              _jsx(ReferenceLine, { y: 2, strokeDasharray: '3 3' }),
              _jsx(Line, {
                type: 'monotone',
                dot: false,
                dataKey: 'fastBurn',
                name: 'Fast burn (1h)',
              }),
              _jsx(Line, {
                type: 'monotone',
                dot: false,
                dataKey: 'slowBurn',
                name: 'Slow burn (6h)',
              }),
            ],
          }),
        }),
      }),
    ],
  });
}
