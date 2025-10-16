import { jsxs as _jsxs, jsx as _jsx } from 'react/jsx-runtime';
import React from 'react';
import { useParams, Link } from 'react-router-dom';
import { api } from '../api';
import DAG from '../components/DAG';
export default function CompareRun() {
  const { id = '' } = useParams();
  const { getRunGraphCompare } = api();
  const [mode, setMode] = React.useState('side');
  const [data, setData] = React.useState(null);
  const [err, setErr] = React.useState(null);
  React.useEffect(() => {
    (async () => {
      try {
        const r = await getRunGraphCompare(id);
        setData(r);
      } catch (e) {
        setErr(e?.message || 'Failed');
      }
    })();
  }, [id]);
  return _jsxs('div', {
    className: 'space-y-3',
    children: [
      _jsxs('div', {
        className: 'flex items-center justify-between',
        children: [
          _jsxs('h2', {
            className: 'text-lg font-semibold',
            children: ['Compare Run: ', id],
          }),
          _jsxs('div', {
            className: 'flex gap-2',
            children: [
              _jsx('button', {
                className: `rounded border px-2 py-1 text-sm ${mode === 'overlay' ? 'bg-indigo-600 text-white' : ''}`,
                onClick: () => setMode('overlay'),
                children: 'Overlay',
              }),
              _jsx('button', {
                className: `rounded border px-2 py-1 text-sm ${mode === 'side' ? 'bg-indigo-600 text-white' : ''}`,
                onClick: () => setMode('side'),
                children: 'Side-by-side',
              }),
            ],
          }),
        ],
      }),
      _jsx('div', {
        className: 'text-sm',
        children: _jsx(Link, {
          className: 'text-indigo-700 hover:underline',
          to: `/maestro/runs/${id}`,
          children: 'Back to run',
        }),
      }),
      err && _jsx('div', { className: 'text-sm text-red-700', children: err }),
      data &&
        _jsxs('div', {
          className: 'space-y-3',
          children: [
            mode === 'side' &&
              _jsxs('div', {
                className: 'grid grid-cols-1 md:grid-cols-2 gap-3',
                children: [
                  _jsxs('section', {
                    className: 'rounded border bg-white p-3',
                    children: [
                      _jsxs('div', {
                        className: 'mb-2 text-sm font-semibold text-slate-700',
                        children: [
                          'Baseline ',
                          data.baselineRunId ? `(${data.baselineRunId})` : '',
                        ],
                      }),
                      _jsx(DAG, {
                        nodes: (data.baseline?.nodes || []).map((n) => ({
                          id: n.id,
                          label: n.label || n.id,
                          state: 'succeeded',
                        })),
                        edges: (data.baseline?.edges || []).map((e) => ({
                          from: e.source || e.from,
                          to: e.target || e.to,
                        })),
                      }),
                    ],
                  }),
                  _jsxs('section', {
                    className: 'rounded border bg-white p-3',
                    children: [
                      _jsx('div', {
                        className: 'mb-2 text-sm font-semibold text-slate-700',
                        children: 'Current',
                      }),
                      _jsx(DAG, {
                        nodes: (data.current?.nodes || []).map((n) => ({
                          id: n.id,
                          label: n.label || n.id,
                          state:
                            n.status === 'failed'
                              ? 'failed'
                              : n.status === 'running'
                                ? 'running'
                                : 'succeeded',
                        })),
                        edges: (data.current?.edges || []).map((e) => ({
                          from: e.source || e.from,
                          to: e.target || e.to,
                        })),
                      }),
                    ],
                  }),
                ],
              }),
            mode === 'overlay' &&
              _jsxs('section', {
                className: 'rounded border bg-white p-3',
                children: [
                  _jsx('div', {
                    className: 'mb-2 text-sm font-semibold text-slate-700',
                    children: 'Overlay',
                  }),
                  _jsx(DAG, {
                    nodes: (data.current?.nodes || []).map((n) => ({
                      id: n.id,
                      label: n.label || n.id,
                      state:
                        n.status === 'failed'
                          ? 'failed'
                          : n.status === 'running'
                            ? 'running'
                            : 'succeeded',
                    })),
                    edges: (data.current?.edges || []).map((e) => ({
                      from: e.source || e.from,
                      to: e.target || e.to,
                    })),
                  }),
                ],
              }),
          ],
        }),
    ],
  });
}
