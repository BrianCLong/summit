import { jsx as _jsx, jsxs as _jsxs, Fragment as _Fragment } from 'react/jsx-runtime';
import React from 'react';
import { useParams } from 'react-router-dom';
import { api } from '../api';
import AgentTimeline from '../components/AgentTimeline';
import DAG from '../components/DAG';
import PolicyExplain from '../components/PolicyExplain';
import { getMaestroConfig } from '../config';
import { useFocusTrap } from '../utils/useFocusTrap';
import { useResilientStream } from '../utils/streamUtils';
import { sanitizeLogs } from '../utils/secretUtils';
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip } from 'recharts';
import PolicyExplainDialog from '../components/PolicyExplainDialog';
function Tabs({ value, onChange, tabs }) {
  return _jsx('div', {
    role: 'tablist',
    className: 'mb-3 flex gap-2 border-b',
    children: tabs.map((t) =>
      _jsx(
        'button',
        {
          role: 'tab',
          'aria-selected': value === t,
          className: [
            'rounded-t px-3 py-1.5 text-sm',
            value === t
              ? 'bg-white font-semibold text-slate-800 border border-b-transparent'
              : 'text-slate-600 hover:bg-slate-100',
          ].join(' '),
          onClick: () => onChange(t),
          children: t,
        },
        t,
      ),
    ),
  });
}
export default function RunDetail() {
  const { id = '' } = useParams();
  const {
    useRun,
    useRunGraph,
    useRunLogs,
    usePolicyDecisions,
    useArtifacts,
    useRunNodeMetrics,
    useRunNodeEvidence,
    getCIAnnotations,
    getRunComparePrevious,
    getRunScorecard,
    checkGate,
    getRunNodeRouting,
    getRunEvidence,
  } = api();
  const { data: run } = useRun(id);
  const { nodes, edges } = useRunGraph(id);
  const [selectedNode, setSelectedNode] = React.useState(null);
  // Use resilient streaming for logs
  const streamUrl = `/api/maestro/v1/runs/${id}/logs?stream=true${selectedNode ? `&nodeId=${selectedNode}` : ''}`;
  const { connection, connected, events, error, reconnect } = useResilientStream(streamUrl, {
    maxRetries: 15,
    initialRetryDelay: 500,
    maxRetryDelay: 10000,
    heartbeatInterval: 20000,
  });
  // Convert stream events to log lines and sanitize them
  const lines = React.useMemo(() => {
    return sanitizeLogs(
      events.map((event) => event.data?.text || JSON.stringify(event.data)).filter(Boolean),
    );
  }, [events]);
  const clearLogs = React.useCallback(() => {
    // In a real implementation, this would signal the backend to restart the stream
    reconnect();
  }, [reconnect]);
  const [ci, setCi] = React.useState(null);
  const [cmp, setCmp] = React.useState(null);
  const { decisions } = usePolicyDecisions(id);
  const { artifacts } = useArtifacts(id);
  const [tab, setTab] = React.useState('Overview');
  const [sc, setSc] = React.useState(null);
  const [gate, setGate] = React.useState(null);
  React.useEffect(() => {
    (async () => {
      try {
        const s = await getRunScorecard(id);
        setSc(s);
      } catch {}
      try {
        const g = await checkGate({ runId: id, pipeline: 'intelgraph_pr_build' });
        setGate(g);
      } catch {}
    })();
  }, [id]);
  const { metrics } = useRunNodeMetrics(id, selectedNode);
  const { evidence: nodeEvidence } = useRunNodeEvidence(id, selectedNode);
  const [replayOpen, setReplayOpen] = React.useState(false);
  const [replayReason, setReplayReason] = React.useState('');
  const cfg = getMaestroConfig();
  const replayRef = React.useRef(null);
  useFocusTrap(replayRef, replayOpen, () => setReplayOpen(false));
  return _jsxs(_Fragment, {
    children: [
      _jsxs('div', {
        className: 'space-y-3',
        children: [
          _jsxs('header', {
            className: 'flex flex-wrap items-center justify-between gap-3',
            children: [
              _jsxs('div', {
                children: [
                  _jsx('div', { className: 'text-xs text-slate-500', children: 'Run' }),
                  _jsx('h1', { className: 'font-mono text-lg', children: id }),
                  _jsxs('div', {
                    className: 'text-xs text-slate-500',
                    children: [
                      'Pipeline: ',
                      run?.pipeline,
                      ' \u2022 Status: ',
                      _jsx('span', {
                        className: 'rounded bg-slate-200 px-2 py-0.5 text-xs',
                        children: run?.status,
                      }),
                    ],
                  }),
                ],
              }),
              _jsxs('div', {
                className: 'flex items-center gap-2',
                children: [
                  _jsx('button', {
                    className: 'rounded border px-2 py-1 text-sm',
                    title: 'Pause',
                    children: 'Pause',
                  }),
                  _jsx('button', {
                    className: 'rounded border px-2 py-1 text-sm',
                    title: 'Cancel',
                    children: 'Cancel',
                  }),
                  _jsx('button', {
                    className: 'rounded border px-2 py-1 text-sm',
                    title: 'Retry',
                    children: 'Retry',
                  }),
                  _jsx('button', {
                    className: 'rounded border px-2 py-1 text-sm',
                    title: 'Replay from node',
                    disabled: !selectedNode,
                    children: 'Replay from node',
                  }),
                  run?.ghRunUrl &&
                    _jsx('a', {
                      className: 'rounded border px-2 py-1 text-sm text-indigo-700',
                      href: run.ghRunUrl,
                      target: '_blank',
                      rel: 'noreferrer',
                      children: 'Open GH logs',
                    }),
                  run?.traceId &&
                    _jsx('a', {
                      className: 'rounded border px-2 py-1 text-sm text-blue-600',
                      href: `${cfg.grafanaBase}/explore?orgId=1&left=%5B%22now-1h%22,%22now%22,%22Tempo%22,%7B%22query%22:%22${run.traceId}%22%7D,%7B%22ui%22:%22trace%22%7D%5D`,
                      target: '_blank',
                      rel: 'noreferrer',
                      children: 'View Trace',
                    }),
                  _jsx('button', {
                    className: 'rounded border px-2 py-1 text-sm',
                    onClick: async () => {
                      try {
                        const r = await getRunComparePrevious(id);
                        setCmp(r);
                        setTab('Events');
                      } catch {}
                    },
                    children: 'Compare prev',
                  }),
                  _jsx('button', {
                    className: 'rounded border px-2 py-1 text-sm',
                    title: 'Create ticket',
                    onClick: async () => {
                      try {
                        const base = cfg.gatewayBase?.replace(/\/$/, '') || '';
                        if (base) {
                          await fetch(`${base}/tickets`, {
                            method: 'POST',
                            headers: { 'content-type': 'application/json' },
                            body: JSON.stringify({
                              provider: 'github',
                              title: `Run ${id} failed`,
                              labels: ['maestro'],
                              links: { runId: id },
                            }),
                          });
                          alert('Ticket created');
                        }
                      } catch {}
                    },
                    children: 'Create ticket',
                  }),
                ],
              }),
            ],
          }),
          _jsx(Tabs, {
            value: tab,
            onChange: setTab,
            tabs: [
              'Overview',
              'DAG',
              'Timeline',
              'Logs',
              'Artifacts',
              'Evidence',
              'Policies',
              'Scorecard',
              'Agent',
              'Approvals',
              'Events',
            ],
          }),
          tab === 'Overview' &&
            _jsxs('div', {
              className: 'grid grid-cols-1 gap-3 lg:grid-cols-3',
              children: [
                _jsxs('section', {
                  className: 'rounded border bg-white p-3 lg:col-span-2',
                  children: [
                    _jsx('h3', {
                      className: 'mb-2 text-sm font-semibold text-slate-700',
                      children: 'Timeline',
                    }),
                    _jsxs('div', {
                      className: 'text-sm text-slate-600',
                      children: [
                        'Started: ',
                        run?.startedAt,
                        ' \u2022 Duration: ',
                        run?.durationMs,
                        ' ms \u2022 Cost: $',
                        run?.cost,
                      ],
                    }),
                  ],
                }),
                _jsxs('section', {
                  className: 'rounded border bg-white p-3',
                  children: [
                    _jsx('h3', {
                      className: 'mb-2 text-sm font-semibold text-slate-700',
                      children: 'Autonomy & Budget',
                    }),
                    _jsxs('div', {
                      className: 'text-sm text-slate-600',
                      children: [
                        'Level L',
                        run?.autonomyLevel,
                        ' \u2022 Canary ',
                        Math.round((run?.canary ?? 0) * 100),
                        '% \u2022 Budget cap $',
                        run?.budgetCap,
                      ],
                    }),
                  ],
                }),
              ],
            }),
          tab === 'DAG' &&
            _jsxs('div', {
              className: 'grid grid-cols-1 gap-3 lg:grid-cols-[1fr_360px]',
              children: [
                _jsx(DAG, { nodes: nodes, edges: edges, onSelect: setSelectedNode }),
                _jsxs('section', {
                  className: 'rounded border bg-white p-3',
                  children: [
                    _jsx('h3', {
                      className: 'mb-2 text-sm font-semibold text-slate-700',
                      children: 'Node Inspector',
                    }),
                    !selectedNode &&
                      _jsx('div', {
                        className: 'text-sm text-slate-500',
                        children: 'Select a node to inspect inputs/outputs, metrics, and logs.',
                      }),
                    selectedNode &&
                      _jsxs('div', {
                        className: 'space-y-2 text-sm',
                        children: [
                          _jsxs('div', {
                            className: 'text-slate-600',
                            children: [
                              'Node: ',
                              _jsx('span', { className: 'font-mono', children: selectedNode }),
                            ],
                          }),
                          _jsx('div', {
                            className: 'text-slate-600',
                            children: 'Retries: 0 \u2022 Duration: 320ms',
                          }),
                          _jsxs('div', {
                            className: 'text-xs text-slate-500',
                            children: [
                              'Metrics: cpu ',
                              metrics?.cpuPct ?? '—',
                              '%, mem ',
                              metrics?.memMB ?? '—',
                              'MB, tokens ',
                              metrics?.tokens ?? '—',
                              ', cost $',
                              metrics?.cost ?? '—',
                            ],
                          }),
                          _jsxs('div', {
                            className: 'text-xs text-slate-500',
                            children: [
                              'Evidence: ',
                              nodeEvidence?.artifacts?.[0]?.name || '—',
                              '; traceId: ',
                              nodeEvidence?.traceId || '—',
                            ],
                          }),
                          _jsxs('div', {
                            className: 'flex gap-2',
                            children: [
                              _jsx('button', {
                                className: 'rounded border px-2 py-1 text-xs',
                                onClick: () => {
                                  setTab('Logs');
                                },
                                children: 'View node logs',
                              }),
                              nodeEvidence?.traceId &&
                                nodeEvidence?.spanId &&
                                _jsx('a', {
                                  className: 'rounded border px-2 py-1 text-xs text-blue-600',
                                  href: `${cfg.grafanaBase}/explore?orgId=1&left=%5B%22now-1h%22,%22now%22,%22Tempo%22,%7B%22query%22:%22${nodeEvidence.traceId}%22%7D,%7B%22ui%22:%22trace%22%7D%5D`,
                                  target: '_blank',
                                  rel: 'noreferrer',
                                  children: 'View Node Trace',
                                }),
                              _jsx('button', {
                                className: 'rounded border px-2 py-1 text-xs',
                                onClick: () => setReplayOpen(true),
                                children: 'Replay from here',
                              }),
                            ],
                          }),
                          _jsx(RouterDecision, {
                            runId: id,
                            nodeId: selectedNode,
                            fetcher: getRunNodeRouting,
                          }),
                        ],
                      }),
                  ],
                }),
              ],
            }),
          tab === 'Logs' &&
            _jsxs('section', {
              className: 'rounded border bg-white',
              children: [
                _jsxs('div', {
                  className: 'flex items-center justify-between border-b p-2',
                  children: [
                    _jsx('div', {
                      className: 'text-sm font-semibold text-slate-700',
                      children: 'Live Logs',
                    }),
                    _jsxs('div', {
                      className: 'flex items-center gap-2',
                      children: [
                        run?.traceId &&
                          _jsx('button', {
                            className: 'rounded border px-2 py-1 text-xs hover:bg-slate-50',
                            onClick: () => setTraceFilter(run.traceId),
                            children: 'Filter to this trace',
                          }),
                        traceFilter &&
                          _jsx('button', {
                            className: 'rounded border px-2 py-1 text-xs hover:bg-slate-50',
                            onClick: () => setTraceFilter(null),
                            children: 'Clear trace filter',
                          }),
                        _jsx('button', {
                          className: 'rounded border px-2 py-1 text-xs hover:bg-slate-50',
                          onClick: clearLogs,
                          children: 'Clear',
                        }),
                        _jsx('button', {
                          className: 'rounded border px-2 py-1 text-xs hover:bg-slate-50',
                          onClick: reconnect,
                          disabled: connected,
                          children: 'Reconnect',
                        }),
                        _jsxs('div', {
                          className: 'flex items-center gap-1',
                          children: [
                            _jsx('div', {
                              className: `w-2 h-2 rounded-full ${connected ? 'bg-green-500' : error ? 'bg-red-500' : 'bg-yellow-500'}`,
                            }),
                            _jsx('span', {
                              className: 'text-[11px] text-slate-500',
                              children: connected
                                ? 'Connected'
                                : error
                                  ? 'Disconnected'
                                  : 'Connecting...',
                            }),
                          ],
                        }),
                      ],
                    }),
                  ],
                }),
                error &&
                  _jsx('div', {
                    className: 'bg-red-50 border-b border-red-200 p-2 text-sm text-red-800',
                    children: _jsxs('div', {
                      className: 'flex items-center justify-between',
                      children: [
                        _jsxs('span', { children: ['\u26A0\uFE0F Stream error: ', error] }),
                        _jsx('button', {
                          onClick: reconnect,
                          className: 'text-red-600 hover:text-red-800 underline',
                          children: 'Retry',
                        }),
                      ],
                    }),
                  }),
                _jsxs('div', {
                  role: 'log',
                  'aria-live': 'polite',
                  'aria-atomic': 'false',
                  'aria-relevant': 'additions text',
                  className: 'max-h-[50vh] overflow-auto p-2 font-mono text-xs',
                  children: [
                    lines.length === 0 &&
                      connected &&
                      _jsx('div', {
                        className: 'text-slate-500 italic',
                        children: 'Waiting for log entries...',
                      }),
                    lines
                      .filter(
                        (l) =>
                          (!selectedNode || l.includes(`[${selectedNode}]`)) &&
                          (!traceFilter || l.includes(`traceId=${traceFilter}`)),
                      ) // Added traceFilter
                      .map((logLine, i) =>
                        _jsxs(
                          'div',
                          {
                            className: 'whitespace-pre-wrap',
                            children: [
                              _jsx('span', {
                                className: 'text-slate-400',
                                children: new Date().toISOString().split('T')[1].slice(0, -1),
                              }),
                              ' ',
                              logLine,
                            ],
                          },
                          i,
                        ),
                      ),
                  ],
                }),
              ],
            }),
          tab === 'Timeline' &&
            _jsxs('section', {
              className: 'rounded border bg-white p-3',
              children: [
                _jsx('h3', {
                  className: 'mb-2 text-sm font-semibold text-slate-700',
                  children: 'Timeline',
                }),
                _jsx('ul', {
                  className: 'text-sm text-slate-700',
                  children: (nodes || []).map((n, i) =>
                    _jsxs(
                      'li',
                      {
                        className: 'border-b py-2 last:border-0',
                        children: [
                          _jsxs('span', {
                            className: 'font-mono text-xs',
                            children: ['T+', i * 250, 'ms'],
                          }),
                          ' \u2022 ',
                          n.label,
                          ' \u2014 ',
                          n.state,
                          n?.retries ? ` (r${n.retries})` : '',
                        ],
                      },
                      n.id,
                    ),
                  ),
                }),
              ],
            }),
          tab === 'Scorecard' &&
            _jsxs('div', {
              role: 'tabpanel',
              'aria-label': 'Eval scorecard',
              className: 'space-y-3',
              children: [
                sc
                  ? _jsxs('div', {
                      className: 'rounded-2xl border p-4',
                      children: [
                        _jsxs('div', {
                          className: 'mb-2 flex items-center gap-2',
                          children: [
                            _jsx('span', {
                              className: `px-2 py-0.5 rounded text-white text-xs ${sc.overall === 'PASS' ? 'bg-emerald-600' : 'bg-red-600'}`,
                              children: sc.overall,
                            }),
                            _jsxs('div', {
                              className: 'text-sm text-gray-600',
                              children: ['pipeline: ', sc.pipeline],
                            }),
                          ],
                        }),
                        _jsxs('table', {
                          className: 'w-full text-sm',
                          children: [
                            _jsx('thead', {
                              children: _jsxs('tr', {
                                children: [
                                  _jsx('th', { children: 'Metric' }),
                                  _jsx('th', { children: 'Value' }),
                                  _jsx('th', { children: 'Target' }),
                                  _jsx('th', { children: 'Status' }),
                                ],
                              }),
                            }),
                            _jsx('tbody', {
                              children: sc.rows.map((r) =>
                                _jsxs(
                                  'tr',
                                  {
                                    children: [
                                      _jsx('td', { children: r.metric }),
                                      _jsx('td', { children: r.value }),
                                      _jsx('td', { children: r.target }),
                                      _jsx('td', { children: r.pass ? '✓' : '✕' }),
                                    ],
                                  },
                                  r.metric,
                                ),
                              ),
                            }),
                          ],
                        }),
                      ],
                    })
                  : _jsx('div', { className: 'text-sm text-gray-500', children: 'No scorecard' }),
                gate &&
                  _jsxs('div', {
                    className: 'rounded-2xl border p-4',
                    children: [
                      _jsx('div', {
                        className: 'mb-2 text-sm text-gray-600',
                        children: 'Gate decision',
                      }),
                      _jsx('div', {
                        className: `inline-block rounded px-2 py-1 text-white ${gate.status === 'ALLOW' ? 'bg-emerald-600' : 'bg-red-600'}`,
                        children: gate.status,
                      }),
                      !!gate.failing?.length &&
                        _jsxs('div', {
                          className: 'mt-2 text-sm',
                          children: ['Failing: ', gate.failing.join(', ')],
                        }),
                    ],
                  }),
              ],
            }),
          tab === 'Agent' && _jsx(AgentTimeline, { runId: id }),
          tab === 'Artifacts' &&
            _jsxs('section', {
              className: 'rounded border bg-white',
              children: [
                _jsx('div', {
                  className: 'border-b p-2 text-sm font-semibold text-slate-700',
                  children: 'Artifacts',
                }),
                _jsxs('table', {
                  className: 'w-full text-sm',
                  children: [
                    _jsx('thead', {
                      className: 'bg-slate-50 text-left text-slate-500',
                      children: _jsxs('tr', {
                        children: [
                          _jsx('th', { className: 'px-3 py-2', children: 'Name' }),
                          _jsx('th', { className: 'px-3 py-2', children: 'Digest' }),
                          _jsx('th', { className: 'px-3 py-2', children: 'Size' }),
                        ],
                      }),
                    }),
                    _jsx('tbody', {
                      children: artifacts.map((a) =>
                        _jsxs(
                          'tr',
                          {
                            className: 'border-t',
                            children: [
                              _jsx('td', { className: 'px-3 py-2', children: a.name }),
                              _jsx('td', {
                                className: 'px-3 py-2 font-mono text-xs',
                                children: a.digest,
                              }),
                              _jsx('td', { className: 'px-3 py-2', children: a.size }),
                            ],
                          },
                          a.digest,
                        ),
                      ),
                    }),
                  ],
                }),
              ],
            }),
          tab === 'Evidence' && _jsx(RunEvidence, { runId: id, getRunEvidence: getRunEvidence }),
          tab === 'Policies' &&
            _jsxs('div', {
              className: 'grid grid-cols-1 gap-3 lg:grid-cols-2',
              children: [
                _jsxs('section', {
                  className: 'rounded border bg-white',
                  children: [
                    _jsx('div', {
                      className: 'border-b p-2 text-sm font-semibold text-slate-700',
                      children: 'Policy Decisions',
                    }),
                    _jsxs('table', {
                      className: 'w-full text-sm',
                      children: [
                        _jsx('thead', {
                          className: 'bg-slate-50 text-left text-slate-500',
                          children: _jsxs('tr', {
                            children: [
                              _jsx('th', { className: 'px-3 py-2', children: 'Action' }),
                              _jsx('th', { className: 'px-3 py-2', children: 'Allowed' }),
                              _jsx('th', { className: 'px-3 py-2', children: 'Reasons' }),
                              _jsx('th', { className: 'px-3 py-2', children: 'Appeal' }),
                            ],
                          }),
                        }),
                        _jsx('tbody', {
                          children: decisions.map((d) =>
                            _jsxs(
                              'tr',
                              {
                                className: 'border-t',
                                children: [
                                  _jsx('td', { className: 'px-3 py-2', children: d.action }),
                                  _jsx('td', {
                                    className: 'px-3 py-2',
                                    children: d.allowed ? 'Yes' : 'No',
                                  }),
                                  _jsx('td', {
                                    className: 'px-3 py-2 text-xs',
                                    children: d.reasons.join('; '),
                                  }),
                                  _jsx('td', {
                                    className: 'px-3 py-2 text-xs',
                                    children: d.appealPath,
                                  }),
                                ],
                              },
                              d.id,
                            ),
                          ),
                        }),
                      ],
                    }),
                  ],
                }),
                _jsx(PolicyExplain, { context: { runId: id, nodeId: selectedNode, env: 'prod' } }),
              ],
            }),
          tab === 'Approvals' &&
            _jsxs('section', {
              className: 'rounded border bg-white p-3',
              children: [
                _jsx('h3', {
                  className: 'mb-2 text-sm font-semibold text-slate-700',
                  children: 'Pending Approvals',
                }),
                _jsx('div', { className: 'text-sm text-slate-600', children: 'None' }),
              ],
            }),
          tab === 'Events' &&
            _jsxs('section', {
              className: 'rounded border bg-white p-3',
              children: [
                _jsx('h3', {
                  className: 'mb-2 text-sm font-semibold text-slate-700',
                  children: 'Events',
                }),
                cmp
                  ? _jsxs('div', {
                      className: 'text-sm text-slate-700',
                      children: [
                        _jsxs('div', {
                          children: [
                            'Duration delta: ',
                            cmp.durationDeltaMs,
                            'ms \u2022 Cost delta: $',
                            cmp.costDelta,
                          ],
                        }),
                        _jsx('div', { className: 'mt-2', children: 'Changed nodes:' }),
                        _jsx('ul', {
                          className: 'list-disc pl-5',
                          children: (cmp.changedNodes || []).map((n, i) =>
                            _jsxs('li', { children: [n.id, ': ', n.durationDeltaMs, 'ms'] }, i),
                          ),
                        }),
                      ],
                    })
                  : _jsx('div', {
                      className: 'text-sm text-slate-600',
                      children: 'Run created \u2192 canary \u2192 promote',
                    }),
              ],
            }),
          tab === 'CI' &&
            _jsxs('section', {
              className: 'rounded border bg-white',
              children: [
                _jsxs('div', {
                  className: 'flex items-center justify-between border-b p-2',
                  children: [
                    _jsx('div', {
                      className: 'text-sm font-semibold text-slate-700',
                      children: 'CI Annotations',
                    }),
                    _jsx('button', {
                      className: 'rounded border px-2 py-1 text-xs',
                      onClick: async () => {
                        try {
                          const r = await getCIAnnotations(id);
                          setCi(r.items || []);
                        } catch {}
                      },
                      children: 'Refresh',
                    }),
                  ],
                }),
                _jsxs('table', {
                  className: 'w-full text-sm',
                  children: [
                    _jsx('thead', {
                      className: 'bg-slate-50 text-left text-slate-500',
                      children: _jsxs('tr', {
                        children: [
                          _jsx('th', { className: 'px-3 py-2', children: 'Level' }),
                          _jsx('th', { className: 'px-3 py-2', children: 'Title' }),
                          _jsx('th', { className: 'px-3 py-2', children: 'File' }),
                          _jsx('th', { className: 'px-3 py-2', children: 'Message' }),
                        ],
                      }),
                    }),
                    _jsx('tbody', {
                      children: (ci || []).map((a, i) =>
                        _jsxs(
                          'tr',
                          {
                            className: 'border-t',
                            children: [
                              _jsx('td', { className: 'px-3 py-2', children: a.level }),
                              _jsx('td', { className: 'px-3 py-2', children: a.title }),
                              _jsxs('td', {
                                className: 'px-3 py-2 text-xs',
                                children: [a.file, ':', a.line],
                              }),
                              _jsx('td', {
                                className: 'px-3 py-2 text-xs',
                                children: _jsx('a', {
                                  className: 'text-indigo-700 hover:underline',
                                  href: a.url,
                                  target: '_blank',
                                  rel: 'noreferrer',
                                  children: a.message,
                                }),
                              }),
                            ],
                          },
                          i,
                        ),
                      ),
                    }),
                  ],
                }),
              ],
            }),
        ],
      }),
      replayOpen &&
        _jsx('div', {
          role: 'dialog',
          'aria-modal': 'true',
          'aria-label': 'Replay from node dialog',
          className: 'fixed inset-0 z-[100] flex items-center justify-center bg-black/30',
          onClick: () => setReplayOpen(false),
          children: _jsxs('div', {
            ref: replayRef,
            className: 'w-full max-w-md rounded-lg border bg-white p-3',
            onClick: (e) => e.stopPropagation(),
            children: [
              _jsx('div', {
                className: 'mb-2 text-sm font-semibold',
                id: 'replay-title',
                children: 'Replay from node',
              }),
              _jsxs('div', {
                className: 'mb-2 text-xs text-slate-500',
                children: [
                  'Node: ',
                  _jsx('span', { className: 'font-mono', children: selectedNode }),
                ],
              }),
              _jsx('textarea', {
                'aria-label': 'Replay reason',
                'aria-describedby': 'replay-title',
                className: 'h-28 w-full rounded border p-2 text-sm',
                placeholder: 'Reason / justification',
                value: replayReason,
                onChange: (e) => setReplayReason(e.target.value),
              }),
              _jsxs('div', {
                className: 'mt-2 flex justify-end gap-2',
                children: [
                  _jsx('button', {
                    className: 'rounded border px-2 py-1 text-sm',
                    onClick: () => setReplayOpen(false),
                    children: 'Cancel',
                  }),
                  _jsx('button', {
                    className: 'rounded bg-indigo-600 px-3 py-1.5 text-sm text-white',
                    onClick: async () => {
                      try {
                        // Best-effort call; ignore error if not available
                        const base = cfg.gatewayBase?.replace(/\/$/, '') || '';
                        if (base && selectedNode) {
                          await fetch(`${base}/runs/${encodeURIComponent(id)}/replay`, {
                            method: 'POST',
                            headers: { 'content-type': 'application/json' },
                            body: JSON.stringify({ nodeId: selectedNode, reason: replayReason }),
                          });
                        }
                      } finally {
                        setReplayOpen(false);
                      }
                    },
                    children: 'Replay',
                  }),
                ],
              }),
            ],
          }),
        }),
    ],
  });
}
function RouterDecision({ runId, nodeId, fetcher }) {
  const [data, setData] = React.useState(null);
  const [open, setOpen] = React.useState(false);
  React.useEffect(() => {
    (async () => {
      try {
        const r = await fetcher(runId, nodeId);
        setData(r);
      } catch {}
    })();
  }, [runId, nodeId]);
  if (!data) return null;
  return _jsxs('div', {
    className: 'mt-2 rounded border p-2',
    children: [
      _jsx('div', {
        className: 'mb-1 text-xs font-semibold text-slate-700',
        children: 'Router Decision',
      }),
      _jsxs('div', {
        className: 'text-xs text-slate-600',
        children: [
          'Selected: ',
          _jsx('span', { className: 'font-mono', children: data.decision?.model }),
          ' \u2022 score ',
          data.decision?.score,
        ],
      }),
      _jsx('div', {
        className: 'mt-1',
        children: _jsx('button', {
          className: 'rounded border px-2 py-1 text-xs',
          onClick: () => setOpen(true),
          children: 'Explain policy',
        }),
      }),
      _jsx('div', {
        className: 'mt-2',
        style: { height: 140 },
        children: _jsx(ResponsiveContainer, {
          children: _jsxs(BarChart, {
            data: (data.candidates || []).map((c) => ({ model: c.model, score: c.score })),
            children: [
              _jsx(XAxis, { dataKey: 'model', hide: true }),
              _jsx(YAxis, { domain: [0, 1] }),
              _jsx(Tooltip, {}),
              _jsx(Bar, { dataKey: 'score', fill: '#6366F1' }),
            ],
          }),
        }),
      }),
      _jsxs('div', {
        className: 'mt-2 text-xs text-slate-600',
        children: [
          'Policy: ',
          data.policy?.allow ? 'ALLOW' : 'DENY',
          ' \u2014 ',
          _jsx('span', { className: 'font-mono', children: data.policy?.rulePath }),
        ],
      }),
      !!(data.policy?.reasons || []).length &&
        _jsx('div', {
          className: 'text-[11px] text-slate-500',
          children: data.policy.reasons.join('; '),
        }),
      _jsx(PolicyExplainDialog, {
        open: open,
        onClose: () => setOpen(false),
        context: { runId, nodeId },
      }),
    ],
  });
}
function RunEvidence({ runId, getRunEvidence }) {
  const [ev, setEv] = React.useState(null);
  React.useEffect(() => {
    (async () => {
      try {
        const r = await getRunEvidence(runId);
        setEv(r);
      } catch {}
    })();
  }, [runId]);
  return _jsxs('section', {
    className: 'rounded border bg-white p-3',
    children: [
      _jsx('h3', {
        className: 'mb-2 text-sm font-semibold text-slate-700',
        children: 'Provenance',
      }),
      !ev
        ? _jsx('div', { className: 'text-sm text-slate-500', children: 'Loading\u2026' })
        : _jsxs('div', {
            className: 'space-y-2 text-sm',
            children: [
              _jsx(Badges, { ev: ev }),
              _jsxs('div', {
                className: 'flex flex-wrap items-center gap-2',
                children: [
                  _jsx('button', {
                    className: 'rounded border px-2 py-1 text-xs',
                    onClick: handleVerifyNow,
                    children: 'Verify now',
                  }),
                  _jsx('button', {
                    className: 'rounded border px-2 py-1 text-xs',
                    onClick: handleSbomDiff,
                    children: 'SBOM Diff',
                  }),
                  _jsx('button', {
                    className: 'rounded border px-2 py-1 text-xs',
                    onClick: () => {
                      const blob = new Blob([JSON.stringify(ev, null, 2)], {
                        type: 'application/json',
                      });
                      const a = document.createElement('a');
                      a.href = URL.createObjectURL(blob);
                      a.download = `evidence-${runId}.json`;
                      a.click();
                      setTimeout(() => URL.revokeObjectURL(a.href), 0);
                    },
                    children: 'Export JSON',
                  }),
                  ev?.sbom?.href &&
                    _jsx('a', {
                      className: 'rounded border px-2 py-1 text-xs text-blue-600 underline',
                      href: ev.sbom.href,
                      target: '_blank',
                      rel: 'noreferrer',
                      children: 'Open SBOM',
                    }),
                  ev?.cosign?.verifyCmd &&
                    _jsx('button', {
                      className: 'rounded border px-2 py-1 text-xs',
                      onClick: () => navigator.clipboard?.writeText(ev.cosign.verifyCmd),
                      children: 'Copy verify command',
                    }),
                  ev?.slsa?.href &&
                    _jsx('a', {
                      className: 'rounded border px-2 py-1 text-xs text-blue-600 underline',
                      href: ev.slsa.href,
                      target: '_blank',
                      rel: 'noreferrer',
                      children: 'Open SLSA',
                    }),
                ],
              }),
              showSbomDiff &&
                sbomDiff &&
                _jsxs('div', {
                  className: 'rounded border p-2',
                  children: [
                    _jsx('h4', {
                      className: 'mb-2 text-sm font-semibold',
                      children: 'SBOM Diff Summary',
                    }),
                    _jsxs('p', {
                      className: 'text-xs text-slate-600',
                      children: [
                        'Added: ',
                        sbomDiff.summary.addedCount,
                        ' (High Severity: ',
                        sbomDiff.summary.highSeverityAdded,
                        ')',
                      ],
                    }),
                    _jsxs('p', {
                      className: 'text-xs text-slate-600',
                      children: ['Removed: ', sbomDiff.summary.removedCount],
                    }),
                    _jsxs('p', {
                      className: 'text-xs text-slate-600',
                      children: [
                        'Changed: ',
                        sbomDiff.summary.changedCount,
                        ' (Medium Severity: ',
                        sbomDiff.summary.mediumSeverityChanged,
                        ')',
                      ],
                    }),
                    sbomDiff.added.length > 0 &&
                      _jsxs('details', {
                        className: 'mt-2',
                        children: [
                          _jsx('summary', {
                            className: 'cursor-pointer text-xs font-semibold',
                            children: 'Added Components',
                          }),
                          _jsx('ul', {
                            className: 'list-disc pl-5 text-xs',
                            children: sbomDiff.added.map((item, i) =>
                              _jsxs(
                                'li',
                                {
                                  children: [
                                    item.component,
                                    ' (License: ',
                                    item.license,
                                    ', Severity: ',
                                    item.severity,
                                    ')',
                                  ],
                                },
                                i,
                              ),
                            ),
                          }),
                        ],
                      }),
                    sbomDiff.removed.length > 0 &&
                      _jsxs('details', {
                        className: 'mt-2',
                        children: [
                          _jsx('summary', {
                            className: 'cursor-pointer text-xs font-semibold',
                            children: 'Removed Components',
                          }),
                          _jsx('ul', {
                            className: 'list-disc pl-5 text-xs',
                            children: sbomDiff.removed.map((item, i) =>
                              _jsxs(
                                'li',
                                { children: [item.component, ' (License: ', item.license, ')'] },
                                i,
                              ),
                            ),
                          }),
                        ],
                      }),
                    sbomDiff.changed.length > 0 &&
                      _jsxs('details', {
                        className: 'mt-2',
                        children: [
                          _jsx('summary', {
                            className: 'cursor-pointer text-xs font-semibold',
                            children: 'Changed Components',
                          }),
                          _jsx('ul', {
                            className: 'list-disc pl-5 text-xs',
                            children: sbomDiff.changed.map((item, i) =>
                              _jsxs(
                                'li',
                                {
                                  children: [
                                    item.component,
                                    ' (from ',
                                    item.fromVersion,
                                    ' to ',
                                    item.toVersion,
                                    ', Severity: ',
                                    item.severity,
                                    ')',
                                  ],
                                },
                                i,
                              ),
                            ),
                          }),
                        ],
                      }),
                  ],
                }),
              _jsxs('div', {
                className: 'flex items-center gap-2 mt-2',
                children: [
                  _jsx('input', {
                    type: 'checkbox',
                    id: 'quarantine-toggle',
                    checked: isQuarantined,
                    onChange: (e) => setIsQuarantined(e.target.checked),
                    className:
                      'form-checkbox h-4 w-4 text-indigo-600 transition duration-150 ease-in-out',
                  }),
                  _jsx('label', {
                    htmlFor: 'quarantine-toggle',
                    className: 'text-sm font-medium text-slate-700',
                    children: 'Quarantine Artifacts (Read-Only)',
                  }),
                  isQuarantined &&
                    _jsx('a', {
                      href: '/docs/maestro/runbooks/quarantine',
                      target: '_blank',
                      rel: 'noreferrer',
                      className: 'text-xs text-blue-600 underline',
                      children: 'View Quarantine Runbook',
                    }),
                ],
              }),
              _jsx('div', {
                className: 'rounded border',
                children: _jsxs('table', {
                  className: 'w-full text-sm',
                  children: [
                    _jsx('thead', {
                      children: _jsxs('tr', {
                        children: [
                          _jsx('th', { children: 'Type' }),
                          _jsx('th', { children: 'Ref' }),
                          _jsx('th', { children: 'Status' }),
                        ],
                      }),
                    }),
                    _jsxs('tbody', {
                      children: [
                        (ev.attestations || []).map((a, i) =>
                          _jsxs(
                            'tr',
                            {
                              children: [
                                _jsx('td', { children: a.type }),
                                _jsx('td', { className: 'font-mono text-xs', children: a.ref }),
                                _jsx('td', { children: a.status || a.issuer || '-' }),
                              ],
                            },
                            i,
                          ),
                        ),
                        !(ev.attestations || []).length &&
                          _jsx('tr', {
                            children: _jsx('td', {
                              colSpan: 3,
                              className: 'p-2 text-center text-slate-500',
                              children: 'No attestations',
                            }),
                          }),
                      ],
                    }),
                  ],
                }),
              }),
            ],
          }),
    ],
  });
}
function Badges({ ev }) {
  const badge = (label, ok) =>
    _jsxs('span', {
      className: `inline-block rounded px-2 py-0.5 text-xs ${ok ? 'bg-emerald-100 text-emerald-700' : 'bg-red-100 text-red-700'}`,
      children: [label, ' ', ok ? '✓' : '✗'],
    });
  return _jsxs('div', {
    className: 'flex flex-wrap gap-2 text-sm',
    children: [
      badge('Signed', ev.cosign?.signed || ev.cosign?.verified),
      badge('SLSA', ev.slsa?.present),
      badge('SBOM', ev.sbom?.present),
    ],
  });
}
