import { jsx as _jsx, jsxs as _jsxs } from 'react/jsx-runtime';
import { useEffect, useState } from 'react';
import { api } from '../api';
import { ResponsiveContainer, AreaChart, Area, XAxis, YAxis, Tooltip } from 'recharts';
export default function DLQSignatures() {
  const { getDLQSignatures, getDLQSignatureTimeSeries, getDLQPolicy, putDLQPolicy } = api();
  const [rows, setRows] = useState([]);
  const [sel, setSel] = useState(null);
  const [series, setSeries] = useState([]);
  useEffect(() => {
    getDLQSignatures().then((r) => setRows(r.signatures || []));
  }, []);
  useEffect(() => {
    if (sel) getDLQSignatureTimeSeries(sel).then((r) => setSeries(r.points || []));
  }, [sel]);
  async function allowSignature(sig) {
    const pol = await getDLQPolicy();
    const list = new Set(pol.allowSignatures || []);
    if (list.has(sig)) return alert('Already allowed');
    list.add(sig);
    await putDLQPolicy({ allowSignatures: Array.from(list) });
    alert('Signature added to allowlist');
  }
  async function removeSignature(sig) {
    const pol = await getDLQPolicy();
    const list = new Set(pol.allowSignatures || []);
    if (!list.has(sig)) return alert('Not in allowlist');
    list.delete(sig);
    await putDLQPolicy({ allowSignatures: Array.from(list) });
    alert('Signature removed from allowlist');
  }
  return _jsxs('section', {
    className: 'space-y-3 p-4',
    'aria-label': 'DLQ signatures',
    children: [
      _jsx('h1', { className: 'text-xl font-semibold', children: 'DLQ Signatures' }),
      _jsxs('table', {
        className: 'w-full border text-sm',
        children: [
          _jsx('thead', {
            children: _jsxs('tr', {
              children: [
                _jsx('th', { children: 'Count' }),
                _jsx('th', { children: 'Trend' }),
                _jsx('th', { children: 'Last seen' }),
                _jsx('th', { children: 'Signature' }),
                _jsx('th', { children: 'Actions' }),
              ],
            }),
          }),
          _jsxs('tbody', {
            children: [
              rows.map((r) =>
                _jsxs(
                  'tr',
                  {
                    children: [
                      _jsx('td', { children: r.count }),
                      _jsx('td', { children: r.trend === 1 ? '↑' : r.trend === -1 ? '↓' : '→' }),
                      _jsx('td', { children: new Date(r.lastTs).toLocaleString() }),
                      _jsx('td', {
                        className: 'max-w-[560px] truncate',
                        title: r.sig,
                        children: r.sig,
                      }),
                      _jsxs('td', {
                        children: [
                          _jsx('button', {
                            className: 'mr-2 text-blue-600 underline',
                            onClick: () => setSel(r.sig),
                            children: 'Trend',
                          }),
                          _jsx('button', {
                            className: 'mr-2 text-blue-600 underline',
                            onClick: () => allowSignature(r.sig),
                            children: 'Allow auto-replay',
                          }),
                          _jsx('button', {
                            className: 'text-red-600 underline',
                            onClick: () => removeSignature(r.sig),
                            children: 'Remove',
                          }),
                        ],
                      }),
                    ],
                  },
                  r.sig,
                ),
              ),
              !rows.length &&
                _jsx('tr', {
                  children: _jsx('td', {
                    colSpan: 5,
                    className: 'p-4 text-center text-gray-500',
                    children: 'No signatures yet',
                  }),
                }),
            ],
          }),
        ],
      }),
      sel &&
        _jsxs('div', {
          className: 'rounded-2xl border p-3',
          children: [
            _jsxs('div', {
              className: 'mb-2 text-sm text-gray-600',
              children: ['Signature trend: ', _jsx('code', { children: sel })],
            }),
            _jsx('div', {
              style: { height: 240 },
              children: _jsx(ResponsiveContainer, {
                children: _jsxs(AreaChart, {
                  data: series.map((p) => ({
                    time: new Date(p.ts).toLocaleTimeString(),
                    count: p.count,
                  })),
                  children: [
                    _jsx(XAxis, { dataKey: 'time', hide: true }),
                    _jsx(YAxis, { allowDecimals: false }),
                    _jsx(Tooltip, {}),
                    _jsx(Area, { dataKey: 'count', type: 'monotone' }),
                  ],
                }),
              }),
            }),
          ],
        }),
    ],
  });
}
