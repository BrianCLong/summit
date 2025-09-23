import { jsx as _jsx, jsxs as _jsxs, Fragment as _Fragment } from 'react/jsx-runtime';
import { useEffect, useState } from 'react';
import { api } from '../api';
export default function DLQSimulator() {
  const { getDLQ, simulateDLQPolicy } = api();
  const [items, setItems] = useState([]);
  const [json, setJson] = useState('');
  const [res, setRes] = useState(null);
  const [sel, setSel] = useState('');
  useEffect(() => {
    getDLQ({ sinceMs: 7 * 24 * 3600 * 1000 }).then((r) => setItems(r.items || []));
  }, []);
  const itemFromSel = items.find((i) => i.id === sel);
  const candidate = json.trim() ? safeParse(json) : itemFromSel || null;
  return _jsxs('section', {
    className: 'space-y-3 p-4',
    'aria-label': 'DLQ Policy Simulator',
    children: [
      _jsx('h1', { className: 'text-xl font-semibold', children: 'DLQ Policy Simulator' }),
      _jsxs('div', {
        className: 'space-y-2 rounded-2xl border p-4',
        children: [
          _jsxs('div', {
            className: 'grid grid-cols-1 gap-3 md:grid-cols-3',
            children: [
              _jsxs('div', {
                children: [
                  _jsx('label', {
                    className: 'mb-1 block text-sm',
                    children: 'Pick existing DLQ item',
                  }),
                  _jsxs('select', {
                    className: 'w-full rounded border px-2 py-1',
                    value: sel,
                    onChange: (e) => setSel(e.target.value),
                    children: [
                      _jsx('option', { value: '', children: '\u2014' }),
                      items.map((i) =>
                        _jsxs(
                          'option',
                          {
                            value: i.id,
                            children: [i.kind, ' / ', i.stepId, ' / ', String(i.id).slice(0, 8)],
                          },
                          i.id,
                        ),
                      ),
                    ],
                  }),
                ],
              }),
              _jsxs('div', {
                className: 'md:col-span-2',
                children: [
                  _jsx('label', {
                    className: 'mb-1 block text-sm',
                    children: 'Or paste DLQ item JSON',
                  }),
                  _jsx('textarea', {
                    className: 'h-28 w-full rounded border p-2',
                    placeholder:
                      '{"kind":"BUILD_IMAGE","stepId":"build","runId":"r123","error":"..."}',
                    value: json,
                    onChange: (e) => setJson(e.target.value),
                  }),
                ],
              }),
            ],
          }),
          _jsx('div', {
            children: _jsx('button', {
              className: 'rounded bg-blue-600 px-3 py-2 text-white disabled:bg-gray-300',
              disabled: !candidate,
              onClick: async () => {
                const r = await simulateDLQPolicy({
                  kind: candidate.kind,
                  error: candidate.error,
                  stepId: candidate.stepId,
                  runId: candidate.runId,
                  id: candidate.id,
                });
                setRes(r);
              },
              children: 'Simulate',
            }),
          }),
        ],
      }),
      res &&
        _jsxs('div', {
          className: 'space-y-2 rounded-2xl border p-4',
          role: 'status',
          'aria-live': 'polite',
          children: [
            _jsxs('div', {
              className: 'flex items-center gap-3',
              children: [
                _jsx('span', {
                  className: `rounded px-3 py-1 text-white ${res.decision === 'ALLOW' ? 'bg-emerald-600' : res.decision === 'DRY_RUN' ? 'bg-amber-500' : 'bg-red-600'}`,
                  children: res.decision,
                }),
                _jsxs('div', {
                  className: 'text-sm text-gray-600',
                  children: ['signature: ', _jsx('code', { children: res.normalizedSignature })],
                }),
              ],
            }),
            _jsxs('ul', {
              className: 'ml-6 list-disc text-sm',
              children: [
                _jsxs('li', {
                  children: [
                    'policy: ',
                    res.enabled ? 'enabled' : 'disabled',
                    res.dryRun ? ' (dry-run)' : '',
                  ],
                }),
                _jsxs('li', { children: ['kind allowed: ', String(res.passKind)] }),
                _jsxs('li', { children: ['signature allowed: ', String(res.passSig)] }),
                _jsxs('li', { children: ['rate limited: ', String(res.rateLimited)] }),
              ],
            }),
            res.reasons?.length
              ? _jsxs(_Fragment, {
                  children: [
                    _jsx('div', { className: 'font-medium', children: 'Reasons' }),
                    _jsx('pre', {
                      className:
                        'overflow-auto whitespace-pre-wrap break-all bg-gray-50 p-2 text-xs',
                      children: JSON.stringify(res.reasons, null, 2),
                    }),
                  ],
                })
              : null,
          ],
        }),
    ],
  });
}
function safeParse(j) {
  try {
    return JSON.parse(j);
  } catch {
    return null;
  }
}
