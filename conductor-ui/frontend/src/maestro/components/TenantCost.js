import { jsx as _jsx, jsxs as _jsxs } from 'react/jsx-runtime';
import { useEffect, useState } from 'react';
import { api } from '../api';
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
} from 'recharts';
export default function TenantCost({ tenant }) {
  const { getTenantCostSummary, getTenantCostSeries } = api();
  const [sum, setSum] = useState(null);
  const [series, setSeries] = useState([]);
  const [windowMs, setWindowMs] = useState(24 * 3600 * 1000);
  useEffect(() => {
    getTenantCostSummary(tenant, windowMs)
      .then(setSum)
      .catch(() => setSum(null));
  }, [tenant, windowMs]);
  useEffect(() => {
    getTenantCostSeries(tenant, windowMs)
      .then((r) => setSeries(r.points || []))
      .catch(() => setSeries([]));
  }, [tenant, windowMs]);
  return _jsxs('section', {
    className: 'space-y-3',
    'aria-label': `Cost for tenant ${tenant}`,
    children: [
      _jsxs('div', {
        className: 'flex items-center gap-2',
        children: [
          _jsx('label', {
            htmlFor: 'win',
            className: 'text-sm',
            children: 'Window',
          }),
          _jsxs('select', {
            id: 'win',
            className: 'rounded border px-2 py-1',
            value: windowMs,
            onChange: (e) => setWindowMs(Number(e.target.value)),
            children: [
              _jsx('option', { value: 3600000, children: 'Last 1h' }),
              _jsx('option', { value: 6 * 3600000, children: 'Last 6h' }),
              _jsx('option', { value: 24 * 3600000, children: 'Last 24h' }),
              _jsx('option', { value: 7 * 24 * 3600000, children: 'Last 7d' }),
            ],
          }),
        ],
      }),
      _jsxs('div', {
        className: 'flex items-center justify-between rounded-2xl border p-4',
        children: [
          _jsxs('div', {
            children: [
              _jsx('div', {
                className: 'text-sm text-gray-500',
                children: 'Total spend',
              }),
              _jsxs('div', {
                className: 'text-3xl font-semibold',
                children: ['$', sum?.totalUsd?.toFixed?.(2) ?? '—'],
              }),
            ],
          }),
          _jsxs('div', {
            className: 'text-sm text-gray-500',
            children: [
              'Tenant: ',
              _jsx('span', { className: 'font-medium', children: tenant }),
            ],
          }),
        ],
      }),
      _jsxs('div', {
        className: 'rounded-2xl border p-3',
        children: [
          _jsx('div', {
            className: 'mb-2 text-sm text-gray-600',
            children: 'Spend over time',
          }),
          _jsx('div', {
            style: { height: 220 },
            children: _jsx(ResponsiveContainer, {
              children: _jsxs(AreaChart, {
                data: series.map((p) => ({
                  time: new Date(p.ts).toLocaleTimeString(),
                  usd: Number(p.usd),
                })),
                children: [
                  _jsx(XAxis, { dataKey: 'time', hide: true }),
                  _jsx(YAxis, {}),
                  _jsx(Tooltip, {}),
                  _jsx(Area, { type: 'monotone', dataKey: 'usd' }),
                ],
              }),
            }),
          }),
        ],
      }),
      _jsxs('div', {
        className: 'grid grid-cols-1 gap-3 md:grid-cols-2',
        children: [
          _jsxs('div', {
            className: 'rounded-2xl border p-3',
            children: [
              _jsx('div', {
                className: 'mb-2 text-sm text-gray-600',
                children: 'By pipeline',
              }),
              _jsxs('table', {
                className: 'w-full text-sm',
                children: [
                  _jsx('thead', {
                    children: _jsxs('tr', {
                      children: [
                        _jsx('th', { children: 'Pipeline' }),
                        _jsx('th', { children: 'USD' }),
                      ],
                    }),
                  }),
                  _jsxs('tbody', {
                    children: [
                      (sum?.byPipeline || []).map((r) =>
                        _jsxs(
                          'tr',
                          {
                            children: [
                              _jsx('td', { children: r.pipeline }),
                              _jsxs('td', {
                                children: ['$', r.usd.toFixed(2)],
                              }),
                            ],
                          },
                          r.pipeline,
                        ),
                      ),
                      !(sum?.byPipeline || []).length &&
                        _jsx('tr', {
                          children: _jsx('td', {
                            colSpan: 2,
                            className: 'p-2 text-center text-gray-500',
                            children: 'No data',
                          }),
                        }),
                    ],
                  }),
                ],
              }),
            ],
          }),
          _jsxs('div', {
            className: 'rounded-2xl border p-3',
            children: [
              _jsx('div', {
                className: 'mb-2 text-sm text-gray-600',
                children: 'By model/provider',
              }),
              _jsxs('table', {
                className: 'w-full text-sm',
                children: [
                  _jsx('thead', {
                    children: _jsxs('tr', {
                      children: [
                        _jsx('th', { children: 'Provider' }),
                        _jsx('th', { children: 'Model' }),
                        _jsx('th', { children: 'USD' }),
                      ],
                    }),
                  }),
                  _jsxs('tbody', {
                    children: [
                      (sum?.byModelProvider || []).map((r, i) =>
                        _jsxs(
                          'tr',
                          {
                            children: [
                              _jsx('td', { children: r.provider }),
                              _jsx('td', { children: r.model }),
                              _jsxs('td', {
                                children: ['$', r.usd.toFixed(2)],
                              }),
                            ],
                          },
                          i,
                        ),
                      ),
                      !(sum?.byModelProvider || []).length &&
                        _jsx('tr', {
                          children: _jsx('td', {
                            colSpan: 3,
                            className: 'p-2 text-center text-gray-500',
                            children: 'No data',
                          }),
                        }),
                    ],
                  }),
                ],
              }),
            ],
          }),
        ],
      }),
      _jsx('div', {
        className: 'rounded-2xl border',
        children: _jsxs('table', {
          className: 'w-full text-sm',
          children: [
            _jsx('thead', {
              children: _jsxs('tr', {
                children: [
                  _jsx('th', { children: 'Run' }),
                  _jsx('th', { children: 'Pipeline' }),
                  _jsx('th', { children: 'Start' }),
                  _jsx('th', { children: 'Duration' }),
                  _jsx('th', { children: 'Tokens' }),
                  _jsx('th', { children: 'USD' }),
                ],
              }),
            }),
            _jsxs('tbody', {
              children: [
                (sum?.recentRuns || []).map((r) =>
                  _jsxs(
                    'tr',
                    {
                      children: [
                        _jsx('td', {
                          children: _jsx('a', {
                            href: `#/maestro/runs/${r.runId}`,
                            className: 'text-blue-600 underline',
                            children: r.runId.slice(0, 8),
                          }),
                        }),
                        _jsx('td', { children: r.pipeline }),
                        _jsx('td', {
                          children: new Date(r.startedAt).toLocaleString(),
                        }),
                        _jsxs('td', {
                          children: [Math.round(r.durationMs / 1000), 's'],
                        }),
                        _jsx('td', { children: r.tokens }),
                        _jsxs('td', { children: ['$', r.usd.toFixed(2)] }),
                      ],
                    },
                    r.runId,
                  ),
                ),
                !(sum?.recentRuns || []).length &&
                  _jsx('tr', {
                    children: _jsx('td', {
                      colSpan: 6,
                      className: 'p-3 text-center text-gray-500',
                      children: 'No recent runs',
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
