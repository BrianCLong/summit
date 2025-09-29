import { jsx as _jsx, jsxs as _jsxs } from 'react/jsx-runtime';
import { useEffect, useState } from 'react';
import { api } from '../api';
export default function DLQPolicy() {
  const { getDLQPolicy, putDLQPolicy, getDLQAudit } = api();
  const [p, setP] = useState(null);
  const [audit, setAudit] = useState([]);
  const [allowKinds, setAllowKinds] = useState('');
  const [allowSigs, setAllowSigs] = useState('');
  const refresh = () => {
    getDLQPolicy().then((policy) => {
      setP(policy);
      setAllowKinds(policy.allowKinds?.join(',') || '');
      setAllowSigs(policy.allowSignatures?.join(',') || '');
    });
    getDLQAudit().then((a) => setAudit(a.items || []));
  };
  useEffect(() => {
    refresh();
  }, []);
  if (!p) return _jsx('div', { className: 'p-4', children: 'Loading\u2026' });
  return _jsxs('section', {
    className: 'space-y-3',
    'aria-label': 'DLQ policy',
    children: [
      _jsxs('div', {
        className: 'space-y-3 rounded-2xl border p-4',
        children: [
          _jsxs('div', {
            className: 'flex items-center gap-3',
            children: [
              _jsxs('label', {
                className: 'flex items-center gap-2',
                children: [
                  _jsx('input', {
                    type: 'checkbox',
                    checked: p.enabled,
                    onChange: (e) => setP({ ...p, enabled: e.target.checked }),
                  }),
                  ' ',
                  _jsx('span', { children: 'Enabled' }),
                ],
              }),
              _jsxs('label', {
                className: 'flex items-center gap-2',
                children: [
                  _jsx('input', {
                    type: 'checkbox',
                    checked: p.dryRun,
                    onChange: (e) => setP({ ...p, dryRun: e.target.checked }),
                  }),
                  ' ',
                  _jsx('span', { children: 'Dry-run' }),
                ],
              }),
              _jsxs('label', {
                className: 'flex items-center gap-2',
                children: [
                  'Max replays/min',
                  _jsx('input', {
                    type: 'number',
                    className: 'w-24 rounded border px-2 py-1',
                    value: p.maxReplaysPerMinute,
                    onChange: (e) => setP({ ...p, maxReplaysPerMinute: Number(e.target.value) }),
                  }),
                ],
              }),
            ],
          }),
          _jsx('label', { className: 'block text-sm', children: 'Allow kinds (CSV)' }),
          _jsx('input', {
            className: 'w-full rounded border px-2 py-1',
            value: allowKinds,
            onChange: (e) => setAllowKinds(e.target.value),
          }),
          _jsx('label', {
            className: 'block text-sm',
            children: 'Allow signatures (CSV; substring match on normalized signature)',
          }),
          _jsx('input', {
            className: 'w-full rounded border px-2 py-1',
            value: allowSigs,
            onChange: (e) => setAllowSigs(e.target.value),
          }),
          _jsxs('div', {
            className: 'flex gap-2',
            children: [
              _jsx('button', {
                className: 'rounded bg-blue-600 px-3 py-2 text-white',
                onClick: async () => {
                  const body = {
                    ...p,
                    allowKinds: allowKinds
                      .split(',')
                      .map((s) => s.trim())
                      .filter(Boolean),
                    allowSignatures: allowSigs
                      .split(',')
                      .map((s) => s.trim())
                      .filter(Boolean),
                  };
                  await putDLQPolicy(body);
                  refresh();
                },
                children: 'Save',
              }),
              _jsx('button', {
                className: 'rounded border px-3 py-2',
                onClick: refresh,
                children: 'Refresh',
              }),
            ],
          }),
        ],
      }),
      _jsxs('div', {
        className: 'rounded-2xl border p-4',
        children: [
          _jsx('h2', { className: 'mb-2 font-medium', children: 'Recent policy actions' }),
          _jsxs('table', {
            className: 'w-full text-sm',
            children: [
              _jsx('thead', {
                children: _jsxs('tr', {
                  children: [
                    _jsx('th', { children: 'Time' }),
                    _jsx('th', { children: 'Action' }),
                    _jsx('th', { children: 'Details' }),
                  ],
                }),
              }),
              _jsxs('tbody', {
                children: [
                  audit.map((a, i) =>
                    _jsxs(
                      'tr',
                      {
                        children: [
                          _jsx('td', { children: new Date(a.ts).toLocaleString() }),
                          _jsx('td', { children: a.action }),
                          _jsx('td', {
                            children: _jsx('pre', {
                              className: 'max-w-[720px] whitespace-pre-wrap break-all text-xs',
                              children: JSON.stringify(a.details, null, 2),
                            }),
                          }),
                        ],
                      },
                      i,
                    ),
                  ),
                  !audit.length &&
                    _jsx('tr', {
                      children: _jsx('td', {
                        colSpan: 3,
                        className: 'p-3 text-center text-gray-500',
                        children: 'No audit entries',
                      }),
                    }),
                ],
              }),
            ],
          }),
        ],
      }),
    ],
  });
}
