import { jsxs as _jsxs, jsx as _jsx } from 'react/jsx-runtime';
import React from 'react';
import { useParams } from 'react-router-dom';
import { api } from '../api';
import GrafanaPanel from '../components/GrafanaPanel';
import ErrorBudgetBurn from '../components/ErrorBudgetBurn';
export default function PipelineDetail() {
  const { id = '' } = useParams();
  const {
    getPipeline,
    planPipeline,
    validatePipeline,
    postPolicyExplain,
    getPipelineBaseline,
    putPipelineBaseline,
  } = api();
  const [pipe, setPipe] = React.useState(null);
  const [yaml, setYaml] = React.useState('');
  const [plan, setPlan] = React.useState(null);
  const [msg, setMsg] = React.useState(null);
  const [tab, setTab] = React.useState('overview');
  const pipelineIdOrName = pipe?.name || id || 'intelgraph_pr_build';
  const [baseline, setBaseline] = React.useState(null);
  React.useEffect(() => {
    (async () => {
      const p = await getPipeline(id);
      setPipe(p);
      setYaml(p.yaml || '');
      try {
        const b = await getPipelineBaseline(pipelineIdOrName);
        setBaseline(b.baseline || {});
      } catch {}
    })();
  }, [id]);
  return _jsxs('section', {
    className: 'space-y-3 p-1',
    'aria-label': 'Pipeline detail',
    children: [
      _jsxs('h2', {
        className: 'text-lg font-semibold',
        children: ['Pipeline: ', pipe?.name || id],
      }),
      _jsxs('div', {
        role: 'tablist',
        className: 'flex gap-2',
        children: [
          _jsx('button', {
            role: 'tab',
            'aria-selected': tab === 'overview',
            onClick: () => setTab('overview'),
            className: 'rounded border px-2 py-1',
            children: 'Overview',
          }),
          _jsx('button', {
            role: 'tab',
            'aria-selected': tab === 'validate',
            onClick: () => setTab('validate'),
            className: 'rounded border px-2 py-1',
            children: 'Validate',
          }),
          _jsx('button', {
            role: 'tab',
            'aria-selected': tab === 'policy',
            onClick: () => setTab('policy'),
            className: 'rounded border px-2 py-1',
            children: 'Policy',
          }),
          _jsx('button', {
            role: 'tab',
            'aria-selected': tab === 'observability',
            onClick: () => setTab('observability'),
            className: 'rounded border px-2 py-1',
            children: 'Observability',
          }),
        ],
      }),
      tab === 'overview' &&
        _jsxs('div', {
          className: 'grid grid-cols-1 gap-3 lg:grid-cols-2',
          children: [
            _jsxs('section', {
              className: 'rounded border bg-white p-3',
              children: [
                _jsx('div', {
                  className: 'mb-2 text-sm font-semibold text-slate-700',
                  children: 'YAML',
                }),
                _jsx('textarea', {
                  'aria-label': 'Pipeline YAML',
                  className:
                    'h-[50vh] w-full rounded border p-2 font-mono text-xs',
                  value: yaml,
                  onChange: (e) => setYaml(e.target.value),
                }),
              ],
            }),
            _jsxs('section', {
              className: 'rounded border bg-white p-3',
              children: [
                _jsxs('div', {
                  className: 'text-sm text-slate-600',
                  children: ['Owner: ', pipe?.owner || '—'],
                }),
                _jsxs('div', {
                  className: 'text-sm text-slate-600',
                  children: ['Version: ', pipe?.version || '—'],
                }),
              ],
            }),
          ],
        }),
      tab === 'validate' &&
        _jsxs('div', {
          className: 'grid grid-cols-1 gap-3 lg:grid-cols-2',
          children: [
            _jsxs('section', {
              className: 'rounded border bg-white p-3',
              children: [
                _jsx('div', {
                  className: 'mb-2 text-sm font-semibold text-slate-700',
                  children: 'YAML',
                }),
                _jsx('textarea', {
                  'aria-label': 'Pipeline YAML',
                  className:
                    'h-[50vh] w-full rounded border p-2 font-mono text-xs',
                  value: yaml,
                  onChange: (e) => setYaml(e.target.value),
                }),
                _jsxs('div', {
                  className:
                    'mt-2 flex flex-wrap items-center justify-end gap-2',
                  children: [
                    _jsx('button', {
                      className: 'rounded border px-2 py-1 text-sm',
                      onClick: async () => {
                        try {
                          const r = await validatePipeline(id, { yaml });
                          setMsg(r.valid ? 'Valid ✔' : 'Invalid');
                          setTimeout(() => setMsg(null), 1500);
                        } catch (e) {
                          setMsg(e?.message || 'Validate failed');
                        }
                      },
                      children: 'Validate',
                    }),
                    _jsx('button', {
                      className: 'rounded border px-2 py-1 text-sm',
                      onClick: async () => {
                        try {
                          const r = await planPipeline(id, { yaml });
                          setPlan(r);
                          setMsg('Plan computed');
                          setTimeout(() => setMsg(null), 1500);
                        } catch (e) {
                          setMsg(e?.message || 'Plan failed');
                        }
                      },
                      children: 'Plan Preview',
                    }),
                    msg &&
                      _jsx('span', {
                        className: 'text-xs text-slate-500',
                        children: msg,
                      }),
                  ],
                }),
              ],
            }),
            _jsxs('section', {
              className: 'rounded border bg-white p-3',
              children: [
                _jsx('div', {
                  className: 'mb-2 text-sm font-semibold text-slate-700',
                  children: 'Diff & Impact',
                }),
                !plan &&
                  _jsx('div', {
                    className: 'text-sm text-slate-500',
                    children: 'Click Plan Preview to see changes.',
                  }),
                plan &&
                  _jsxs('div', {
                    className: 'text-sm',
                    children: [
                      _jsx('div', {
                        className: 'mb-2 text-slate-700',
                        children: 'Changes',
                      }),
                      _jsx('ul', {
                        className: 'list-disc pl-5',
                        children: (plan.changes || []).map((c, i) =>
                          _jsxs(
                            'li',
                            {
                              children: [
                                c.type,
                                ' ',
                                c.path,
                                ': ',
                                c.before,
                                ' \u2192 ',
                                c.after,
                              ],
                            },
                            i,
                          ),
                        ),
                      }),
                      _jsxs('div', {
                        className: 'mt-3 text-slate-700',
                        children: [
                          'Cost delta: $',
                          plan.costEstimate?.delta ?? 0,
                        ],
                      }),
                    ],
                  }),
              ],
            }),
          ],
        }),
      tab === 'policy' &&
        _jsxs('section', {
          className: 'rounded border bg-white p-3',
          children: [
            _jsx('div', {
              className: 'mb-2 text-sm font-semibold text-slate-700',
              children: 'Policy Explain',
            }),
            _jsx('div', {
              children: _jsx('button', {
                className: 'rounded border px-2 py-1 text-xs',
                onClick: async () => {
                  try {
                    const r = await postPolicyExplain({
                      input: { yaml, changes: plan?.changes || [] },
                    });
                    setPlan({ ...plan, explain: r });
                  } catch {}
                },
                children: 'Explain (Policy)',
              }),
            }),
            plan?.explain &&
              _jsxs('div', {
                className: 'mt-2 rounded border bg-slate-50 p-2 text-xs',
                children: [
                  'Decision: ',
                  plan.explain.allowed ? 'Allow' : 'Deny',
                  _jsx('br', {}),
                  'Rule: ',
                  _jsx('span', {
                    className: 'font-mono',
                    children: plan.explain.rulePath,
                  }),
                  _jsx('br', {}),
                  'Reasons: ',
                  (plan.explain.reasons || []).join('; '),
                ],
              }),
          ],
        }),
      tab === 'observability' &&
        _jsxs('div', {
          role: 'tabpanel',
          'aria-label': 'Pipeline observability',
          className: 'space-y-3',
          children: [
            _jsxs('section', {
              className: 'rounded-2xl border p-4 space-y-2',
              children: [
                _jsx('div', {
                  className: 'text-sm font-medium',
                  children: 'Eval baselines',
                }),
                _jsxs('div', {
                  className: 'grid grid-cols-1 gap-2 md:grid-cols-4',
                  children: [
                    _jsxs('label', {
                      className: 'text-sm',
                      children: [
                        'P99 latency (ms)',
                        _jsx('input', {
                          className: 'w-full rounded border px-2 py-1',
                          value: baseline?.latencyMs || 600000,
                          onChange: (e) =>
                            setBaseline({
                              ...(baseline || {}),
                              latencyMs: Number(e.target.value),
                            }),
                        }),
                      ],
                    }),
                    _jsxs('label', {
                      className: 'text-sm',
                      children: [
                        'Fail pct',
                        _jsx('input', {
                          className: 'w-full rounded border px-2 py-1',
                          value: baseline?.failPct || 0.02,
                          onChange: (e) =>
                            setBaseline({
                              ...(baseline || {}),
                              failPct: Number(e.target.value),
                            }),
                        }),
                      ],
                    }),
                    _jsxs('label', {
                      className: 'text-sm',
                      children: [
                        'Cost (USD)',
                        _jsx('input', {
                          className: 'w-full rounded border px-2 py-1',
                          value: baseline?.costUsd || 2.5,
                          onChange: (e) =>
                            setBaseline({
                              ...(baseline || {}),
                              costUsd: Number(e.target.value),
                            }),
                        }),
                      ],
                    }),
                    _jsxs('label', {
                      className: 'text-sm',
                      children: [
                        'Policy errs',
                        _jsx('input', {
                          className: 'w-full rounded border px-2 py-1',
                          value: baseline?.policy || 0,
                          onChange: (e) =>
                            setBaseline({
                              ...(baseline || {}),
                              policy: Number(e.target.value),
                            }),
                        }),
                      ],
                    }),
                  ],
                }),
                _jsx('button', {
                  className: 'rounded bg-blue-600 px-3 py-2 text-white',
                  onClick: async () => {
                    try {
                      await putPipelineBaseline(pipelineIdOrName, baseline);
                    } catch {}
                  },
                  children: 'Save baseline',
                }),
              ],
            }),
            _jsx(ErrorBudgetBurn, { pipeline: pipelineIdOrName }),
            _jsxs('div', {
              className: 'grid grid-cols-1 gap-3 md:grid-cols-3',
              children: [
                _jsx(GrafanaPanel, {
                  uid:
                    window.__MAESTRO_CFG__?.grafanaDashboards?.slo ||
                    'maestro-slo',
                  vars: { pipeline: pipelineIdOrName },
                }),
                _jsx(GrafanaPanel, {
                  uid:
                    window.__MAESTRO_CFG__?.grafanaDashboards?.overview ||
                    'maestro-overview',
                  vars: { pipeline: pipelineIdOrName },
                }),
                _jsx(GrafanaPanel, {
                  uid:
                    window.__MAESTRO_CFG__?.grafanaDashboards?.cost ||
                    'maestro-cost',
                  vars: { pipeline: pipelineIdOrName },
                }),
              ],
            }),
          ],
        }),
    ],
  });
}
