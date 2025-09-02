import { jsx as _jsx, jsxs as _jsxs } from 'react/jsx-runtime';
import { useEffect, useState } from 'react';
import { api } from '../api';
export default function ProviderRates() {
  const { getProviderUsage, setProviderLimit } = api();
  const [items, setItems] = useState([]);
  const [win, setWin] = useState(3600 * 1000);
  const refresh = () => getProviderUsage(win).then((r) => setItems(r.items || []));
  useEffect(() => {
    refresh();
    const t = setInterval(refresh, 5000);
    return () => clearInterval(t);
  }, [win]);
  return _jsxs('section', {
    className: 'space-y-3 p-4',
    'aria-label': 'Provider rate limits',
    children: [
      _jsxs('div', {
        className: 'flex items-center gap-3',
        children: [
          _jsx('h1', { className: 'text-xl font-semibold', children: 'Provider Rates' }),
          _jsxs('select', {
            className: 'rounded border px-2 py-1',
            value: win,
            onChange: (e) => setWin(Number(e.target.value)),
            'aria-label': 'Window',
            children: [
              _jsx('option', { value: 3600000, children: '1h' }),
              _jsx('option', { value: 6 * 3600000, children: '6h' }),
              _jsx('option', { value: 24 * 3600000, children: '24h' }),
            ],
          }),
        ],
      }),
      _jsxs('table', {
        className: 'w-full border text-sm',
        children: [
          _jsx('thead', {
            children: _jsxs('tr', {
              children: [
                _jsx('th', { children: 'Provider' }),
                _jsx('th', { children: 'RPM' }),
                _jsx('th', { children: 'Limit' }),
                _jsx('th', { children: 'Drop' }),
                _jsx('th', { children: 'p95 (ms)' }),
                _jsx('th', { children: 'Actions' }),
              ],
            }),
          }),
          _jsxs('tbody', {
            children: [
              items.map((it) =>
                _jsxs(
                  'tr',
                  {
                    children: [
                      _jsx('td', { children: it.provider }),
                      _jsx('td', { children: it.rpm }),
                      _jsx('td', { children: it.limit }),
                      _jsxs('td', { children: [(it.dropRate * 100).toFixed(0), '%'] }),
                      _jsx('td', { children: it.p95ms }),
                      _jsxs('td', {
                        children: [
                          _jsx('button', {
                            className: 'mr-2 text-blue-600 underline',
                            onClick: async () => {
                              const rpm = Number(
                                prompt(`Set RPM limit for ${it.provider}`, String(it.limit)) ||
                                  it.limit,
                              );
                              if (!Number.isFinite(rpm) || rpm <= 0) return;
                              await setProviderLimit(it.provider, rpm);
                              refresh();
                            },
                            children: 'Set limit',
                          }),
                          it.rpm > it.limit &&
                            _jsx('span', {
                              className: 'text-xs text-red-600',
                              children: 'THROTTLING',
                            }),
                        ],
                      }),
                    ],
                  },
                  it.provider,
                ),
              ),
              !items.length &&
                _jsx('tr', {
                  children: _jsx('td', {
                    colSpan: 6,
                    className: 'p-3 text-center text-gray-500',
                    children: 'No providers',
                  }),
                }),
            ],
          }),
        ],
      }),
    ],
  });
}
