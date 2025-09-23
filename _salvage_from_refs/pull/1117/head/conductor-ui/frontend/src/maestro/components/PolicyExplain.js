import { jsx as _jsx, jsxs as _jsxs } from 'react/jsx-runtime';
import React from 'react';
import { api } from '../api';
export default function PolicyExplain({ context }) {
  const { postPolicyExplain } = api();
  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState(null);
  const [result, setResult] = React.useState(null);
  const runExplain = async () => {
    setLoading(true);
    setError(null);
    try {
      const payload = { input: context };
      const resp = await postPolicyExplain(payload);
      setResult(resp);
    } catch (e) {
      setError(e?.message || 'Explain failed');
    } finally {
      setLoading(false);
    }
  };
  return _jsxs('section', {
    className: 'rounded border bg-white p-3',
    children: [
      _jsxs('div', {
        className: 'mb-2 flex items-center justify-between',
        children: [
          _jsx('h3', {
            className: 'text-sm font-semibold text-slate-700',
            children: 'Policy Explain',
          }),
          _jsx('button', {
            className: 'rounded border px-2 py-1 text-xs',
            onClick: runExplain,
            disabled: loading,
            children: 'Explain',
          }),
        ],
      }),
      loading && _jsx('div', { className: 'text-sm text-slate-600', children: 'Explaining\u2026' }),
      error && _jsx('div', { className: 'text-sm text-red-700', children: error }),
      result &&
        _jsxs('div', {
          className: 'space-y-2 text-sm',
          children: [
            _jsxs('div', {
              children: [
                'Decision: ',
                _jsx('span', {
                  className: 'font-semibold',
                  children: result.allowed ? 'Allow' : 'Deny',
                }),
              ],
            }),
            _jsxs('div', {
              children: [
                'Rule Path: ',
                _jsx('span', { className: 'font-mono text-xs', children: result.rulePath || '—' }),
              ],
            }),
            _jsxs('div', {
              children: [
                'Reasons:',
                _jsx('ul', {
                  className: 'list-disc pl-5',
                  children: (result.reasons || []).map((r, i) => _jsx('li', { children: r }, i)),
                }),
              ],
            }),
            result.inputs &&
              _jsxs('details', {
                children: [
                  _jsx('summary', { className: 'cursor-pointer', children: 'Inputs' }),
                  _jsx('pre', {
                    className: 'overflow-auto rounded bg-slate-50 p-2 text-xs',
                    children: JSON.stringify(result.inputs, null, 2),
                  }),
                ],
              }),
            result.trace &&
              _jsxs('details', {
                children: [
                  _jsx('summary', { className: 'cursor-pointer', children: 'Rego Trace' }),
                  _jsx('pre', {
                    className: 'overflow-auto rounded bg-slate-50 p-2 text-[11px]',
                    children: Array.isArray(result.trace)
                      ? result.trace.join('\n')
                      : JSON.stringify(result.trace, null, 2),
                  }),
                ],
              }),
            result.whatIf &&
              _jsxs('details', {
                children: [
                  _jsx('summary', { className: 'cursor-pointer', children: 'What-if Simulation' }),
                  _jsx('pre', {
                    className: 'overflow-auto rounded bg-slate-50 p-2 text-xs',
                    children: JSON.stringify(result.whatIf, null, 2),
                  }),
                ],
              }),
          ],
        }),
    ],
  });
}
