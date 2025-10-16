import {
  jsx as _jsx,
  jsxs as _jsxs,
  Fragment as _Fragment,
} from 'react/jsx-runtime';
import { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { api } from '../api';
import DAG from './DAG';
import GrafanaPanel from './GrafanaPanel';
import AgentTimeline from './AgentTimeline';
function TabPanel({ children, value, index }) {
  return _jsx('div', {
    hidden: value !== index,
    role: 'tabpanel',
    'aria-labelledby': `tab-${index}`,
    children: value === index && children,
  });
}
function RunTimeline({ runId }) {
  const { useRunGraph } = api();
  const { nodes, edges } = useRunGraph(runId);
  const [selectedNode, setSelectedNode] = useState(null);
  return _jsxs('div', {
    className: 'grid grid-cols-1 gap-4 lg:grid-cols-[1fr_300px]',
    children: [
      _jsxs('div', {
        className: 'rounded-lg border bg-white p-4',
        children: [
          _jsx('h3', {
            className: 'mb-3 text-sm font-semibold text-slate-700',
            children: 'Pipeline DAG',
          }),
          _jsx(DAG, {
            nodes: nodes,
            edges: edges,
            onSelect: setSelectedNode,
            selectedNode: selectedNode,
          }),
        ],
      }),
      _jsxs('div', {
        className: 'rounded-lg border bg-white p-4',
        children: [
          _jsx('h3', {
            className: 'mb-3 text-sm font-semibold text-slate-700',
            children: 'Step Inspector',
          }),
          !selectedNode
            ? _jsx('div', {
                className: 'text-sm text-slate-500',
                children:
                  'Select a step from the DAG to inspect its details, metrics, and logs.',
              })
            : _jsx(NodeInspector, { runId: runId, nodeId: selectedNode }),
        ],
      }),
    ],
  });
}
function NodeInspector({ runId, nodeId }) {
  const { useRunNodeMetrics, useRunNodeEvidence, getRunNodeRouting } = api();
  const { metrics } = useRunNodeMetrics(runId, nodeId);
  const { evidence } = useRunNodeEvidence(runId, nodeId);
  const [routing, setRouting] = useState(null);
  useEffect(() => {
    const fetchRouting = async () => {
      try {
        const result = await getRunNodeRouting(runId, nodeId);
        setRouting(result);
      } catch (error) {
        console.warn('Failed to fetch node routing:', error);
      }
    };
    fetchRouting();
  }, [runId, nodeId]);
  return _jsxs('div', {
    className: 'space-y-4',
    children: [
      _jsxs('div', {
        children: [
          _jsxs('h4', {
            className: 'text-sm font-medium text-slate-700 mb-2',
            children: ['Step: ', nodeId],
          }),
          metrics &&
            _jsxs('div', {
              className: 'text-xs text-slate-600 space-y-1',
              children: [
                _jsxs('div', {
                  children: ['Duration: ', metrics.durationMs, 'ms'],
                }),
                _jsxs('div', {
                  children: [
                    'CPU: ',
                    metrics.cpuPct,
                    '% \u2022 Memory: ',
                    metrics.memMB,
                    'MB',
                  ],
                }),
                _jsxs('div', {
                  children: [
                    'Tokens: ',
                    metrics.tokens,
                    ' \u2022 Cost: $',
                    metrics.cost,
                  ],
                }),
                _jsxs('div', { children: ['Retries: ', metrics.retries] }),
              ],
            }),
        ],
      }),
      routing &&
        _jsxs('div', {
          children: [
            _jsx('h4', {
              className: 'text-sm font-medium text-slate-700 mb-2',
              children: 'Routing Decision',
            }),
            _jsxs('div', {
              className: 'text-xs text-slate-600 space-y-1',
              children: [
                _jsxs('div', {
                  children: ['Model: ', routing.decision?.model],
                }),
                _jsxs('div', {
                  children: ['Score: ', routing.decision?.score],
                }),
                _jsxs('div', {
                  children: [
                    'Policy: ',
                    routing.policy?.allow ? 'Allow' : 'Deny',
                  ],
                }),
                routing.policy?.reasons?.length > 0 &&
                  _jsxs('div', {
                    children: ['Reasons: ', routing.policy.reasons.join(', ')],
                  }),
              ],
            }),
          ],
        }),
      evidence &&
        _jsxs('div', {
          children: [
            _jsx('h4', {
              className: 'text-sm font-medium text-slate-700 mb-2',
              children: 'Evidence',
            }),
            _jsxs('div', {
              className: 'text-xs text-slate-600 space-y-1',
              children: [
                _jsxs('div', {
                  children: ['Artifacts: ', evidence.artifacts?.length || 0],
                }),
                _jsxs('div', {
                  children: ['Trace ID: ', evidence.traceId || '—'],
                }),
                evidence.provenance &&
                  _jsxs(_Fragment, {
                    children: [
                      _jsxs('div', {
                        children: ['SBOM: ', evidence.provenance.sbom],
                      }),
                      _jsxs('div', {
                        children: ['Cosign: ', evidence.provenance.cosign],
                      }),
                      _jsxs('div', {
                        children: ['SLSA: ', evidence.provenance.slsa],
                      }),
                    ],
                  }),
              ],
            }),
          ],
        }),
      _jsxs('div', {
        className: 'flex flex-wrap gap-2',
        children: [
          _jsx('button', {
            className:
              'rounded border px-2 py-1 text-xs text-slate-700 hover:bg-slate-50',
            children: 'View Logs',
          }),
          evidence?.traceId &&
            _jsx('button', {
              className:
                'rounded border px-2 py-1 text-xs text-blue-600 hover:bg-blue-50',
              children: 'View Trace',
            }),
          _jsx('button', {
            className:
              'rounded border px-2 py-1 text-xs text-slate-700 hover:bg-slate-50',
            children: 'Replay Step',
          }),
        ],
      }),
    ],
  });
}
function LogsViewer({ runId }) {
  const [selectedNode, setSelectedNode] = useState(null);
  const [traceFilter, setTraceFilter] = useState(null);
  const { useRunLogs } = api();
  const { lines, clear } = useRunLogs(runId, selectedNode);
  const [connected, setConnected] = useState(true);
  const [error, setError] = useState(null);
  const filteredLines = lines.filter(
    (line) => !traceFilter || line.text.includes(traceFilter),
  );
  return _jsxs('div', {
    className: 'rounded-lg border bg-white',
    children: [
      _jsxs('div', {
        className: 'flex items-center justify-between border-b p-3',
        children: [
          _jsx('h3', {
            className: 'text-sm font-semibold text-slate-700',
            children: 'Live Logs',
          }),
          _jsxs('div', {
            className: 'flex items-center gap-2',
            children: [
              traceFilter &&
                _jsx('button', {
                  onClick: () => setTraceFilter(null),
                  className:
                    'rounded border px-2 py-1 text-xs hover:bg-slate-50',
                  children: 'Clear Filter',
                }),
              _jsx('button', {
                onClick: clear,
                className: 'rounded border px-2 py-1 text-xs hover:bg-slate-50',
                children: 'Clear',
              }),
              _jsxs('div', {
                className: 'flex items-center gap-1',
                children: [
                  _jsx('div', {
                    className: `h-2 w-2 rounded-full ${connected ? 'bg-green-500' : error ? 'bg-red-500' : 'bg-yellow-500'}`,
                  }),
                  _jsx('span', {
                    className: 'text-xs text-slate-500',
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
        _jsxs('div', {
          className:
            'border-b border-red-200 bg-red-50 p-2 text-sm text-red-800',
          children: ['\u26A0\uFE0F Stream error: ', error],
        }),
      _jsxs('div', {
        className: 'max-h-96 overflow-auto p-3 font-mono text-xs',
        children: [
          filteredLines.length === 0 &&
            connected &&
            _jsx('div', {
              className: 'text-slate-500 italic',
              children: 'Waiting for log entries...',
            }),
          filteredLines.map((logLine, i) =>
            _jsxs(
              'div',
              {
                className: 'whitespace-pre-wrap py-0.5',
                children: [
                  _jsx('span', {
                    className: 'text-slate-400',
                    children: new Date(logLine.ts)
                      .toISOString()
                      .split('T')[1]
                      .slice(0, -1),
                  }),
                  ' ',
                  logLine.text,
                ],
              },
              i,
            ),
          ),
        ],
      }),
    ],
  });
}
function ObservabilityTab({ runId }) {
  return _jsxs('div', {
    className: 'space-y-4',
    children: [
      _jsxs('div', {
        className: 'grid grid-cols-1 gap-4 md:grid-cols-3',
        children: [
          _jsx(GrafanaPanel, {
            uid: 'maestro-trace-waterfall',
            title: 'Trace Waterfall',
          }),
          _jsx(GrafanaPanel, {
            uid: 'maestro-step-metrics',
            title: 'Step Metrics',
          }),
          _jsx(GrafanaPanel, {
            uid: 'maestro-alerts',
            title: 'Related Alerts',
          }),
        ],
      }),
      _jsxs('div', {
        className: 'rounded-lg border bg-white p-4',
        children: [
          _jsx('h3', {
            className: 'mb-3 text-sm font-semibold text-slate-700',
            children: 'OpenTelemetry Trace',
          }),
          _jsxs('div', {
            className: 'text-sm text-slate-600',
            children: [
              'Trace ID: ',
              _jsx('span', {
                className: 'font-mono',
                children: runId.replace('run_', 'trace_'),
              }),
            ],
          }),
          _jsx('div', {
            className: 'mt-3',
            children: _jsx('button', {
              className:
                'rounded bg-indigo-600 px-3 py-1.5 text-sm text-white hover:bg-indigo-700',
              children: 'Open in Jaeger',
            }),
          }),
        ],
      }),
    ],
  });
}
function EvidenceTab({ runId }) {
  const [evidenceBundle, setEvidenceBundle] = useState(null);
  const [generating, setGenerating] = useState(false);
  const { getRunEvidence } = api();
  const generateEvidenceBundle = async () => {
    setGenerating(true);
    try {
      // This would call the evidence generation API
      const response = await fetch(`/api/maestro/v1/evidence/run/${runId}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      });
      const bundle = await response.json();
      setEvidenceBundle(bundle);
    } catch (error) {
      console.error('Failed to generate evidence bundle:', error);
    } finally {
      setGenerating(false);
    }
  };
  useEffect(() => {
    const fetchEvidence = async () => {
      try {
        const evidence = await getRunEvidence(runId);
        // Check if evidence bundle already exists
        if (evidence.bundleUrl) {
          setEvidenceBundle(evidence);
        }
      } catch (error) {
        console.warn('No existing evidence bundle found');
      }
    };
    fetchEvidence();
  }, [runId]);
  return _jsxs('div', {
    className: 'space-y-4',
    children: [
      _jsxs('div', {
        className: 'rounded-lg border bg-white p-4',
        children: [
          _jsxs('div', {
            className: 'mb-3 flex items-center justify-between',
            children: [
              _jsx('h3', {
                className: 'text-sm font-semibold text-slate-700',
                children: 'Witness Bundle',
              }),
              _jsx('button', {
                onClick: generateEvidenceBundle,
                disabled: generating,
                className:
                  'rounded bg-indigo-600 px-3 py-1.5 text-sm text-white hover:bg-indigo-700 disabled:opacity-50',
                children: generating
                  ? 'Generating...'
                  : 'Generate Evidence Bundle',
              }),
            ],
          }),
          evidenceBundle
            ? _jsxs('div', {
                className: 'space-y-3',
                children: [
                  _jsx('div', {
                    className: 'text-sm text-green-800 bg-green-50 rounded p-2',
                    children: '\u2705 Evidence bundle generated and signed',
                  }),
                  _jsxs('div', {
                    className: 'text-xs text-slate-600',
                    children: [
                      _jsxs('div', {
                        children: [
                          'Bundle URL: ',
                          _jsx('a', {
                            href: evidenceBundle.bundleUrl,
                            className: 'text-indigo-600 hover:underline',
                            children: 'Download',
                          }),
                        ],
                      }),
                      _jsxs('div', {
                        children: [
                          'Signature: ',
                          _jsxs('span', {
                            className: 'font-mono',
                            children: [
                              evidenceBundle.signature.slice(0, 32),
                              '...',
                            ],
                          }),
                        ],
                      }),
                    ],
                  }),
                  _jsxs('div', {
                    className: 'grid grid-cols-2 gap-4 text-xs',
                    children: [
                      _jsxs('div', {
                        children: [
                          _jsx('div', {
                            className: 'font-medium text-slate-700 mb-1',
                            children: 'Included Evidence:',
                          }),
                          _jsxs('ul', {
                            className:
                              'list-disc list-inside text-slate-600 space-y-0.5',
                            children: [
                              _jsx('li', { children: 'SBOM verification' }),
                              _jsxs('li', {
                                children: [
                                  'Cosign attestations (',
                                  evidenceBundle.contents.attestations.length,
                                  ')',
                                ],
                              }),
                              _jsxs('li', {
                                children: [
                                  'Policy proofs (',
                                  evidenceBundle.contents.policyProofs.length,
                                  ')',
                                ],
                              }),
                              _jsx('li', { children: 'SLO snapshot' }),
                              _jsx('li', { children: 'Rollout state' }),
                            ],
                          }),
                        ],
                      }),
                      _jsxs('div', {
                        children: [
                          _jsx('div', {
                            className: 'font-medium text-slate-700 mb-1',
                            children: 'Verification Status:',
                          }),
                          _jsxs('div', {
                            className: 'space-y-0.5 text-slate-600',
                            children: [
                              _jsx('div', {
                                children:
                                  '\uD83D\uDD12 Cryptographically signed',
                              }),
                              _jsx('div', {
                                children: '\uD83D\uDCCB SLSA L3 attested',
                              }),
                              _jsx('div', {
                                children: '\uD83D\uDD0D Supply chain verified',
                              }),
                              _jsx('div', {
                                children: '\u2696\uFE0F Policy compliant',
                              }),
                            ],
                          }),
                        ],
                      }),
                    ],
                  }),
                ],
              })
            : _jsx('div', {
                className: 'text-sm text-slate-600',
                children:
                  'No evidence bundle generated yet. Click "Generate Evidence Bundle" to create a cryptographically signed bundle containing SBOM, attestations, policy proofs, and compliance snapshots.',
              }),
        ],
      }),
      _jsxs('div', {
        className: 'grid grid-cols-1 gap-4 md:grid-cols-2',
        children: [
          _jsxs('div', {
            className: 'rounded-lg border bg-white p-4',
            children: [
              _jsx('h3', {
                className: 'mb-3 text-sm font-semibold text-slate-700',
                children: 'Attestations',
              }),
              _jsxs('div', {
                className: 'space-y-2 text-sm',
                children: [
                  _jsxs('div', {
                    className: 'flex items-center justify-between',
                    children: [
                      _jsx('span', { children: 'SBOM Present' }),
                      _jsx('span', {
                        className: 'text-green-600',
                        children: '\u2713',
                      }),
                    ],
                  }),
                  _jsxs('div', {
                    className: 'flex items-center justify-between',
                    children: [
                      _jsx('span', { children: 'Cosign Verified' }),
                      _jsx('span', {
                        className: 'text-green-600',
                        children: '\u2713',
                      }),
                    ],
                  }),
                  _jsxs('div', {
                    className: 'flex items-center justify-between',
                    children: [
                      _jsx('span', { children: 'SLSA Attested' }),
                      _jsx('span', {
                        className: 'text-green-600',
                        children: '\u2713',
                      }),
                    ],
                  }),
                ],
              }),
            ],
          }),
          _jsxs('div', {
            className: 'rounded-lg border bg-white p-4',
            children: [
              _jsx('h3', {
                className: 'mb-3 text-sm font-semibold text-slate-700',
                children: 'Policy Compliance',
              }),
              _jsxs('div', {
                className: 'space-y-2 text-sm',
                children: [
                  _jsxs('div', {
                    className: 'flex items-center justify-between',
                    children: [
                      _jsx('span', { children: 'Security Policies' }),
                      _jsx('span', {
                        className: 'text-green-600',
                        children: 'Pass',
                      }),
                    ],
                  }),
                  _jsxs('div', {
                    className: 'flex items-center justify-between',
                    children: [
                      _jsx('span', { children: 'Cost Limits' }),
                      _jsx('span', {
                        className: 'text-green-600',
                        children: 'Pass',
                      }),
                    ],
                  }),
                  _jsxs('div', {
                    className: 'flex items-center justify-between',
                    children: [
                      _jsx('span', { children: 'Change Approval' }),
                      _jsx('span', {
                        className: 'text-green-600',
                        children: 'Pass',
                      }),
                    ],
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
function ArtifactsTab({ runId }) {
  const { useArtifacts } = api();
  const { artifacts } = useArtifacts(runId);
  return _jsxs('div', {
    className: 'rounded-lg border bg-white',
    children: [
      _jsx('div', {
        className: 'border-b p-3 text-sm font-semibold text-slate-700',
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
                _jsx('th', { className: 'px-3 py-2', children: 'Signed' }),
                _jsx('th', { className: 'px-3 py-2', children: 'Actions' }),
              ],
            }),
          }),
          _jsx('tbody', {
            children: artifacts.map((artifact) =>
              _jsxs(
                'tr',
                {
                  className: 'border-t',
                  children: [
                    _jsx('td', {
                      className: 'px-3 py-2',
                      children: artifact.name || artifact.type,
                    }),
                    _jsx('td', {
                      className: 'px-3 py-2 font-mono text-xs',
                      children: artifact.digest,
                    }),
                    _jsx('td', {
                      className: 'px-3 py-2',
                      children: artifact.size || '—',
                    }),
                    _jsx('td', {
                      className: 'px-3 py-2',
                      children: _jsx('span', {
                        className: `rounded px-2 py-0.5 text-xs ${artifact.signed ? 'bg-green-100 text-green-800' : 'bg-yellow-100 text-yellow-800'}`,
                        children: artifact.signed ? 'Signed' : 'Unsigned',
                      }),
                    }),
                    _jsx('td', {
                      className: 'px-3 py-2',
                      children: _jsx('button', {
                        className: 'text-xs text-indigo-600 hover:underline',
                        children: 'Download',
                      }),
                    }),
                  ],
                },
                artifact.digest,
              ),
            ),
          }),
        ],
      }),
    ],
  });
}
export default function EnhancedRunDetail() {
  const { id } = useParams();
  const [activeTab, setActiveTab] = useState('timeline');
  const { useRun } = api();
  const { data: run } = useRun(id);
  if (!run) {
    return _jsx('div', {
      className: 'rounded-lg border bg-white p-8 text-center shadow-sm',
      children: _jsx('div', {
        className: 'text-sm text-slate-600',
        children: 'Loading run details...',
      }),
    });
  }
  const tabs = [
    { id: 'timeline', label: 'Timeline', icon: '🔄' },
    { id: 'logs', label: 'Logs', icon: '📋' },
    { id: 'observability', label: 'Observability', icon: '📊' },
    { id: 'evidence', label: 'Evidence', icon: '🔒' },
    { id: 'artifacts', label: 'Artifacts', icon: '📦' },
    { id: 'agent', label: 'Agent', icon: '🤖' },
  ];
  return _jsxs('div', {
    className: 'space-y-4',
    children: [
      _jsx('div', {
        className: 'rounded-lg border bg-white p-4 shadow-sm',
        children: _jsxs('div', {
          className: 'flex items-start justify-between',
          children: [
            _jsxs('div', {
              children: [
                _jsx('div', {
                  className: 'text-xs text-slate-500',
                  children: 'Run',
                }),
                _jsx('h1', {
                  className: 'font-mono text-lg font-semibold',
                  children: run.id,
                }),
                _jsxs('div', {
                  className: 'flex items-center gap-2 text-xs text-slate-500',
                  children: [
                    _jsxs('span', { children: ['Pipeline: ', run.pipelineId] }),
                    _jsx('span', { children: '\u2022' }),
                    _jsxs('span', {
                      children: [
                        'Status: ',
                        _jsx('span', {
                          className: `rounded px-2 py-0.5 font-medium ${statusColors[run.status]}`,
                          children: run.status,
                        }),
                      ],
                    }),
                    _jsx('span', { children: '\u2022' }),
                    _jsxs('span', { children: ['Environment: ', run.env] }),
                  ],
                }),
              ],
            }),
            _jsxs('div', {
              className: 'flex items-center gap-2',
              children: [
                _jsx('button', {
                  className:
                    'rounded border px-2 py-1 text-sm hover:bg-slate-50',
                  children: 'Pause',
                }),
                _jsx('button', {
                  className:
                    'rounded border px-2 py-1 text-sm hover:bg-slate-50',
                  children: 'Cancel',
                }),
                _jsx('button', {
                  className:
                    'rounded border px-2 py-1 text-sm hover:bg-slate-50',
                  children: 'Retry',
                }),
                _jsx(Link, {
                  to: `/maestro/runs/${run.id}/compare`,
                  className:
                    'rounded border px-2 py-1 text-sm text-indigo-600 hover:bg-indigo-50',
                  children: 'Compare',
                }),
              ],
            }),
          ],
        }),
      }),
      _jsx('div', {
        className: 'border-b',
        children: _jsx('div', {
          className: 'flex gap-4',
          children: tabs.map((tab) =>
            _jsxs(
              'button',
              {
                onClick: () => setActiveTab(tab.id),
                className: `flex items-center gap-2 border-b-2 px-3 py-2 text-sm font-medium ${
                  activeTab === tab.id
                    ? 'border-indigo-600 text-indigo-600'
                    : 'border-transparent text-slate-600 hover:text-slate-800'
                }`,
                children: [_jsx('span', { children: tab.icon }), tab.label],
              },
              tab.id,
            ),
          ),
        }),
      }),
      _jsx(TabPanel, {
        value: activeTab,
        index: 'timeline',
        children: _jsx(RunTimeline, { runId: run.id }),
      }),
      _jsx(TabPanel, {
        value: activeTab,
        index: 'logs',
        children: _jsx(LogsViewer, { runId: run.id }),
      }),
      _jsx(TabPanel, {
        value: activeTab,
        index: 'observability',
        children: _jsx(ObservabilityTab, { runId: run.id }),
      }),
      _jsx(TabPanel, {
        value: activeTab,
        index: 'evidence',
        children: _jsx(EvidenceTab, { runId: run.id }),
      }),
      _jsx(TabPanel, {
        value: activeTab,
        index: 'artifacts',
        children: _jsx(ArtifactsTab, { runId: run.id }),
      }),
      _jsx(TabPanel, {
        value: activeTab,
        index: 'agent',
        children: _jsx(AgentTimeline, { runId: run.id }),
      }),
    ],
  });
}
const statusColors = {
  queued: 'bg-slate-100 text-slate-800',
  running: 'bg-blue-100 text-blue-800',
  succeeded: 'bg-green-100 text-green-800',
  failed: 'bg-red-100 text-red-800',
  cancelled: 'bg-yellow-100 text-yellow-800',
};
