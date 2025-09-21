import { jsx as _jsx, jsxs as _jsxs } from 'react/jsx-runtime';
import { useEffect, useState } from 'react';
import { api } from '../api';
export default function DLQRootCauses() {
  const { getDLQRootCauses } = api();
  const [groups, setGroups] = useState([]);
  const [since, setSince] = useState(7 * 24 * 3600 * 1000);
  useEffect(() => {
    getDLQRootCauses({ sinceMs: since }).then((r) => setGroups(r.groups || []));
  }, [since]);
  return _jsxs('section', {
    className: 'space-y-3 p-4',
    'aria-label': 'DLQ Root Causes',
    children: [
      _jsxs('div', {
        className: 'flex items-center gap-3',
        children: [
          _jsx('h1', { className: 'text-xl font-semibold', children: 'Root Causes' }),
          _jsxs('select', {
            className: 'rounded border px-2 py-1',
            value: since,
            onChange: (e) => setSince(Number(e.target.value)),
            'aria-label': 'Since',
            children: [
              _jsx('option', { value: 24 * 3600 * 1000, children: 'Last 24h' }),
              _jsx('option', { value: 3 * 24 * 3600 * 1000, children: 'Last 3d' }),
              _jsx('option', { value: 7 * 24 * 3600 * 1000, children: 'Last 7d' }),
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
                _jsx('th', { children: 'Count' }),
                _jsx('th', { children: 'Step' }),
                _jsx('th', { children: 'Kind' }),
                _jsx('th', { children: 'Provider' }),
                _jsx('th', { children: 'Last seen' }),
                _jsx('th', { children: 'Signature' }),
              ],
            }),
          }),
          _jsxs('tbody', {
            children: [
              groups.map((g) =>
                _jsxs(
                  'tr',
                  {
                    children: [
                      _jsx('td', { children: g.count }),
                      _jsx('td', { children: g.stepId }),
                      _jsx('td', { children: g.kind }),
                      _jsx('td', { children: g.provider }),
                      _jsx('td', { children: new Date(g.lastTs).toLocaleString() }),
                      _jsx('td', {
                        title: g.sampleError,
                        className: 'max-w-[560px] truncate',
                        children: g.signature,
                      }),
                    ],
                  },
                  `${g.stepId}|${g.kind}|${g.provider}`,
                ),
              ),
              !groups.length &&
                _jsx('tr', {
                  children: _jsx('td', {
                    colSpan: 6,
                    className: 'p-3 text-center text-gray-500',
                    children: 'No groups',
                  }),
                }),
            ],
          }),
        ],
      }),
    ],
  });
}
