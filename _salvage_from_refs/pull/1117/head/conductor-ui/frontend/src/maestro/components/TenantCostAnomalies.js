import { jsx as _jsx, jsxs as _jsxs } from 'react/jsx-runtime';
import { useEffect, useState } from 'react';
import { api } from '../api';
export default function TenantCostAnomalies({ tenant }) {
  const { getTenantCostAnomalies } = api();
  const [z, setZ] = useState(3.0);
  const [data, setData] = useState(null);
  useEffect(() => {
    getTenantCostAnomalies(tenant, 24 * 3600 * 1000, 60 * 60 * 1000, z).then(setData);
  }, [tenant, z]);
  const anomalies = data?.anomalies || [];
  return _jsxs('section', {
    className: 'space-y-3 rounded-2xl border p-4',
    'aria-label': 'Cost anomalies',
    children: [
      _jsxs('div', {
        className: 'flex items-center gap-3',
        children: [
          _jsx('h2', { className: 'font-medium', children: 'Anomalies' }),
          _jsxs('label', {
            className: 'flex items-center gap-2 text-sm',
            children: [
              'Z-threshold',
              _jsx('input', {
                type: 'number',
                step: '0.1',
                className: 'w-24 rounded border px-2 py-1',
                value: z,
                onChange: (e) => setZ(Number(e.target.value)),
              }),
            ],
          }),
          _jsxs('div', {
            className: 'text-sm text-gray-600',
            children: [
              '\u03BC=',
              data?.mean,
              ' \u03C3=',
              data?.std,
              ' (z\u2265',
              data?.threshold,
              ')',
            ],
          }),
        ],
      }),
      _jsx('div', {
        className: 'rounded border',
        children: _jsxs('table', {
          className: 'w-full text-sm',
          children: [
            _jsx('thead', {
              children: _jsxs('tr', {
                children: [
                  _jsx('th', { children: 'Time' }),
                  _jsx('th', { children: 'USD' }),
                  _jsx('th', { children: 'z' }),
                ],
              }),
            }),
            _jsxs('tbody', {
              children: [
                anomalies.map((a) =>
                  _jsxs(
                    'tr',
                    {
                      children: [
                        _jsx('td', { children: new Date(a.ts).toLocaleTimeString() }),
                        _jsxs('td', { children: ['$', (+a.usd).toFixed(3)] }),
                        _jsx('td', { children: a.z }),
                      ],
                    },
                    a.ts,
                  ),
                ),
                !anomalies.length &&
                  _jsx('tr', {
                    children: _jsx('td', {
                      colSpan: 3,
                      className: 'p-3 text-center text-gray-500',
                      children: 'No anomalies',
                    }),
                  }),
              ],
            }),
          ],
        }),
      }),
    ],
  });
}
