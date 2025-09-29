import { jsx as _jsx, jsxs as _jsxs } from 'react/jsx-runtime';
import { useEffect, useState } from 'react';
import { api } from '../api';
export default function ModelAnomalyPanels({ tenant }) {
  const { getModelCostAnomalies } = api();
  const [items, setItems] = useState([]);
  useEffect(() => {
    getModelCostAnomalies(tenant).then((r) => setItems(r.items || []));
  }, [tenant]);
  return _jsxs('section', {
    className: 'space-y-3 rounded-2xl border p-4',
    'aria-label': 'Model anomalies',
    children: [
      _jsx('h2', { className: 'font-medium', children: 'Per-model anomalies' }),
      _jsxs('div', {
        className: 'grid grid-cols-1 gap-3 md:grid-cols-3',
        children: [
          items.map((it, idx) =>
            _jsxs(
              'div',
              {
                className: 'rounded-xl border p-3 text-sm',
                children: [
                  _jsxs('div', {
                    className: 'mb-1 text-gray-600',
                    children: [
                      it.provider,
                      ' / ',
                      _jsx('span', { className: 'font-medium', children: it.model }),
                      ' \u2014 z=',
                      it.z,
                    ],
                  }),
                  _jsxs('div', {
                    className: 'text-xs text-slate-600',
                    children: ['last: $', it.last],
                  }),
                ],
              },
              idx,
            ),
          ),
          !items.length &&
            _jsx('div', { className: 'p-3 text-sm text-gray-500', children: 'No data' }),
        ],
      }),
    ],
  });
}
