import { jsx as _jsx, jsxs as _jsxs } from 'react/jsx-runtime';
import { useState } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../api';
function ReleaseOverview({ summary }) {
  const [releaseStatus, setReleaseStatus] = useState({
    currentCanary: summary?.autonomy.canary || 0,
    trafficPercent: 10,
    rolloutHealth: 'healthy',
    lastPromotion: '2h ago',
  });
  const quickActions = [
    { label: 'Pause Rollout', action: 'pause', variant: 'secondary' },
    { label: 'Promote to 25%', action: 'promote', variant: 'primary' },
    { label: 'Emergency Rollback', action: 'rollback', variant: 'danger' },
  ];
  return _jsxs('div', {
    className: 'rounded-lg border bg-white p-4 shadow-sm',
    children: [
      _jsxs('div', {
        className: 'mb-3 flex items-center justify-between',
        children: [
          _jsx('h2', {
            className: 'text-lg font-semibold text-slate-900',
            children: 'Release Overview',
          }),
          _jsx('div', {
            className: `rounded-full px-2 py-1 text-xs font-medium ${
              {
                healthy: 'bg-green-100 text-green-800',
                warning: 'bg-yellow-100 text-yellow-800',
                critical: 'bg-red-100 text-red-800',
              }[releaseStatus.rolloutHealth]
            }`,
            children: releaseStatus.rolloutHealth.toUpperCase(),
          }),
        ],
      }),
      _jsxs('div', {
        className: 'grid grid-cols-1 gap-4 md:grid-cols-3',
        children: [
          _jsxs('div', {
            className: 'space-y-2',
            children: [
              _jsx('div', {
                className: 'text-sm text-slate-600',
                children: 'Current Canary',
              }),
              _jsxs('div', {
                className: 'text-2xl font-bold text-slate-900',
                children: [Math.round(releaseStatus.currentCanary * 100), '%'],
              }),
              _jsxs('div', {
                className: 'text-xs text-slate-500',
                children: ['Traffic: ', releaseStatus.trafficPercent, '%'],
              }),
            ],
          }),
          _jsxs('div', {
            className: 'space-y-2',
            children: [
              _jsx('div', {
                className: 'text-sm text-slate-600',
                children: 'Rollout Health',
              }),
              _jsxs('div', {
                className: 'flex items-center gap-2',
                children: [
                  _jsx('div', {
                    className: `h-2 w-2 rounded-full ${
                      {
                        healthy: 'bg-green-500',
                        warning: 'bg-yellow-500',
                        critical: 'bg-red-500',
                      }[releaseStatus.rolloutHealth]
                    }`,
                  }),
                  _jsx('span', {
                    className: 'text-sm font-medium capitalize',
                    children: releaseStatus.rolloutHealth,
                  }),
                ],
              }),
              _jsxs('div', {
                className: 'text-xs text-slate-500',
                children: ['Last promotion: ', releaseStatus.lastPromotion],
              }),
            ],
          }),
          _jsxs('div', {
            className: 'space-y-2',
            children: [
              _jsx('div', {
                className: 'text-sm text-slate-600',
                children: 'Quick Actions',
              }),
              _jsx('div', {
                className: 'flex flex-wrap gap-1',
                children: quickActions.map((action) =>
                  _jsx(
                    'button',
                    {
                      className: `rounded px-2 py-1 text-xs font-medium ${
                        {
                          primary:
                            'bg-indigo-600 text-white hover:bg-indigo-700',
                          secondary:
                            'bg-slate-100 text-slate-700 hover:bg-slate-200',
                          danger: 'bg-red-100 text-red-700 hover:bg-red-200',
                        }[action.variant]
                      }`,
                      children: action.label,
                    },
                    action.action,
                  ),
                ),
              }),
            ],
          }),
        ],
      }),
    ],
  });
}
function TopKPIs({ summary }) {
  const kpis = [
    {
      label: 'Build Success Rate',
      value: `${Math.round((summary?.health.success || 0.98) * 100)}%`,
      trend: '+2.1%',
      trendUp: true,
      target: '≥97%',
    },
    {
      label: 'Mean Lead Time',
      value: '2.3h',
      trend: '-15min',
      trendUp: true,
      target: '≤4h',
    },
    {
      label: 'P95 Build Duration',
      value: `${summary?.health.p95 || 180}ms`,
      trend: '+12ms',
      trendUp: false,
      target: '≤600ms',
    },
    {
      label: 'SLO Burn Rate',
      value: `${summary?.health.burn || 0.8}×`,
      trend: '-0.2×',
      trendUp: true,
      target: '≤1.0×',
    },
    {
      label: 'Cost Burn',
      value: `$${summary?.budgets.remaining || 1240}`,
      trend: '+$120',
      trendUp: false,
      target: `≤$${summary?.budgets.cap || 5000}`,
    },
    {
      label: 'Queue Depth',
      value: '3',
      trend: '-2',
      trendUp: true,
      target: '≤10',
    },
  ];
  return _jsxs('div', {
    className: 'rounded-lg border bg-white p-4 shadow-sm',
    children: [
      _jsx('h2', {
        className: 'mb-3 text-lg font-semibold text-slate-900',
        children: 'Top KPIs',
      }),
      _jsx('div', {
        className: 'grid grid-cols-2 gap-4 md:grid-cols-3',
        children: kpis.map((kpi) =>
          _jsxs(
            'div',
            {
              className: 'space-y-1',
              children: [
                _jsx('div', {
                  className: 'text-xs text-slate-600',
                  children: kpi.label,
                }),
                _jsx('div', {
                  className: 'text-lg font-semibold text-slate-900',
                  children: kpi.value,
                }),
                _jsxs('div', {
                  className: 'flex items-center justify-between',
                  children: [
                    _jsxs('span', {
                      className: `text-xs font-medium ${kpi.trendUp ? 'text-green-600' : 'text-red-600'}`,
                      children: [kpi.trendUp ? '↑' : '↓', ' ', kpi.trend],
                    }),
                    _jsx('span', {
                      className: 'text-xs text-slate-500',
                      children: kpi.target,
                    }),
                  ],
                }),
              ],
            },
            kpi.label,
          ),
        ),
      }),
    ],
  });
}
function WhatsHotCold({ summary }) {
  const issues = [
    {
      type: 'flapping',
      title: 'Test: integration.auth.test.js',
      description: '67% flap rate, 3 failures in last hour',
      severity: 'warning',
      trend: 'worsening',
    },
    {
      type: 'pipeline',
      title: 'Pipeline: deploy-staging',
      description: 'P95 duration increased 45% (8min → 11.6min)',
      severity: 'warning',
      trend: 'worsening',
    },
    {
      type: 'cost',
      title: 'Cost Center: ml-inference',
      description: '$1,245 spend this hour (+340% vs baseline)',
      severity: 'critical',
      trend: 'worsening',
    },
    {
      type: 'alert',
      title: 'Alert: SLO Burn Rate High',
      description: 'Error budget at 15% (85% consumed)',
      severity: 'critical',
      trend: 'stable',
    },
  ];
  const improvements = [
    {
      type: 'performance',
      title: 'Pipeline: build-frontend',
      description: 'P95 duration improved 23% (6min → 4.6min)',
      trend: 'improving',
    },
    {
      type: 'reliability',
      title: 'Route: /api/v1/chat/completions',
      description: '99.97% success rate (target: 99.9%)',
      trend: 'stable',
    },
  ];
  return _jsxs('div', {
    className: 'space-y-4',
    children: [
      _jsxs('div', {
        className: 'rounded-lg border bg-white p-4 shadow-sm',
        children: [
          _jsx('h2', {
            className: 'mb-3 text-lg font-semibold text-slate-900',
            children: "What's Hot \uD83D\uDD25",
          }),
          _jsx('div', {
            className: 'space-y-3',
            children: issues.map((issue, i) =>
              _jsxs(
                'div',
                {
                  className:
                    'flex items-start gap-3 rounded-lg bg-slate-50 p-3',
                  children: [
                    _jsx('div', {
                      className: `h-2 w-2 rounded-full mt-2 ${
                        {
                          warning: 'bg-yellow-500',
                          critical: 'bg-red-500',
                        }[issue.severity]
                      }`,
                    }),
                    _jsxs('div', {
                      className: 'flex-1 min-w-0',
                      children: [
                        _jsx('div', {
                          className: 'text-sm font-medium text-slate-900',
                          children: issue.title,
                        }),
                        _jsx('div', {
                          className: 'text-xs text-slate-600',
                          children: issue.description,
                        }),
                        _jsxs('div', {
                          className: 'mt-1 flex items-center gap-2',
                          children: [
                            _jsx('span', {
                              className: `text-xs px-1.5 py-0.5 rounded font-medium ${
                                {
                                  warning: 'bg-yellow-100 text-yellow-800',
                                  critical: 'bg-red-100 text-red-800',
                                }[issue.severity]
                              }`,
                              children: issue.severity,
                            }),
                            _jsxs('span', {
                              className: `text-xs font-medium ${
                                {
                                  worsening: 'text-red-600',
                                  stable: 'text-slate-600',
                                }[issue.trend]
                              }`,
                              children: [
                                issue.trend === 'worsening' ? '↗' : '→',
                                ' ',
                                issue.trend,
                              ],
                            }),
                          ],
                        }),
                      ],
                    }),
                  ],
                },
                i,
              ),
            ),
          }),
        ],
      }),
      _jsxs('div', {
        className: 'rounded-lg border bg-white p-4 shadow-sm',
        children: [
          _jsx('h2', {
            className: 'mb-3 text-lg font-semibold text-slate-900',
            children: "What's Cold \u2744\uFE0F",
          }),
          _jsx('div', {
            className: 'space-y-3',
            children: improvements.map((item, i) =>
              _jsxs(
                'div',
                {
                  className:
                    'flex items-start gap-3 rounded-lg bg-green-50 p-3',
                  children: [
                    _jsx('div', {
                      className: 'h-2 w-2 rounded-full bg-green-500 mt-2',
                    }),
                    _jsxs('div', {
                      className: 'flex-1 min-w-0',
                      children: [
                        _jsx('div', {
                          className: 'text-sm font-medium text-slate-900',
                          children: item.title,
                        }),
                        _jsx('div', {
                          className: 'text-xs text-slate-600',
                          children: item.description,
                        }),
                        _jsx('div', {
                          className: 'mt-1',
                          children: _jsxs('span', {
                            className: `text-xs font-medium ${
                              {
                                improving: 'text-green-600',
                                stable: 'text-slate-600',
                              }[item.trend]
                            }`,
                            children: [
                              item.trend === 'improving' ? '↘' : '→',
                              ' ',
                              item.trend,
                            ],
                          }),
                        }),
                      ],
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
  });
}
function ComplianceGlance({ summary }) {
  const compliance = {
    signaturesVerified: { count: 47, total: 47, status: 'pass' },
    sbomDiff: { status: 'pass', lastCheck: '5 min ago' },
    policyDenials: { count: 3, window: '24h', trend: '-40%' },
    evidenceBundles: {
      generated: 12,
      window: 'today',
      lastBundle: '15 min ago',
    },
  };
  return _jsxs('div', {
    className: 'rounded-lg border bg-white p-4 shadow-sm',
    children: [
      _jsx('h2', {
        className: 'mb-3 text-lg font-semibold text-slate-900',
        children: 'Compliance at a Glance',
      }),
      _jsxs('div', {
        className: 'grid grid-cols-1 gap-4 md:grid-cols-2',
        children: [
          _jsxs('div', {
            className: 'space-y-3',
            children: [
              _jsxs('div', {
                className: 'flex items-center justify-between',
                children: [
                  _jsx('span', {
                    className: 'text-sm text-slate-600',
                    children: 'Signatures Verified',
                  }),
                  _jsxs('div', {
                    className: 'flex items-center gap-2',
                    children: [
                      _jsxs('span', {
                        className: 'text-sm font-medium text-slate-900',
                        children: [
                          compliance.signaturesVerified.count,
                          '/',
                          compliance.signaturesVerified.total,
                        ],
                      }),
                      _jsx('div', {
                        className: `h-2 w-2 rounded-full ${compliance.signaturesVerified.status === 'pass' ? 'bg-green-500' : 'bg-red-500'}`,
                      }),
                    ],
                  }),
                ],
              }),
              _jsxs('div', {
                className: 'flex items-center justify-between',
                children: [
                  _jsx('span', {
                    className: 'text-sm text-slate-600',
                    children: 'SBOM Diff',
                  }),
                  _jsxs('div', {
                    className: 'flex items-center gap-2',
                    children: [
                      _jsx('span', {
                        className: 'text-xs text-slate-500',
                        children: compliance.sbomDiff.lastCheck,
                      }),
                      _jsx('div', {
                        className: `h-2 w-2 rounded-full ${compliance.sbomDiff.status === 'pass' ? 'bg-green-500' : 'bg-red-500'}`,
                      }),
                    ],
                  }),
                ],
              }),
            ],
          }),
          _jsxs('div', {
            className: 'space-y-3',
            children: [
              _jsxs('div', {
                className: 'flex items-center justify-between',
                children: [
                  _jsxs('span', {
                    className: 'text-sm text-slate-600',
                    children: [
                      'Policy Denials (',
                      compliance.policyDenials.window,
                      ')',
                    ],
                  }),
                  _jsxs('div', {
                    className: 'flex items-center gap-2',
                    children: [
                      _jsx('span', {
                        className: 'text-sm font-medium text-slate-900',
                        children: compliance.policyDenials.count,
                      }),
                      _jsxs('span', {
                        className: 'text-xs text-green-600 font-medium',
                        children: ['\u2193 ', compliance.policyDenials.trend],
                      }),
                    ],
                  }),
                ],
              }),
              _jsxs('div', {
                className: 'flex items-center justify-between',
                children: [
                  _jsxs('span', {
                    className: 'text-sm text-slate-600',
                    children: [
                      'Evidence Bundles (',
                      compliance.evidenceBundles.window,
                      ')',
                    ],
                  }),
                  _jsxs('div', {
                    className: 'flex items-center gap-2',
                    children: [
                      _jsx('span', {
                        className: 'text-sm font-medium text-slate-900',
                        children: compliance.evidenceBundles.generated,
                      }),
                      _jsx('span', {
                        className: 'text-xs text-slate-500',
                        children: compliance.evidenceBundles.lastBundle,
                      }),
                    ],
                  }),
                ],
              }),
            ],
          }),
        ],
      }),
      _jsx('div', {
        className: 'mt-4 pt-3 border-t',
        children: _jsxs('div', {
          className: 'flex items-center justify-between',
          children: [
            _jsx('span', {
              className: 'text-xs text-slate-500',
              children:
                'All attestations signed \u2022 Supply chain verified \u2022 Audit trail complete',
            }),
            _jsx(Link, {
              to: '/maestro/admin/compliance',
              className:
                'text-xs text-indigo-600 hover:text-indigo-700 font-medium',
              children: 'View Details \u2192',
            }),
          ],
        }),
      }),
    ],
  });
}
export default function ControlHub() {
  const { useSummary } = api();
  const { data: summary } = useSummary();
  return _jsxs('div', {
    className: 'space-y-6',
    children: [
      _jsx('div', {
        className:
          'rounded-lg bg-gradient-to-r from-indigo-500 to-purple-600 p-4 text-white',
        children: _jsxs('div', {
          className: 'flex items-center justify-between',
          children: [
            _jsxs('div', {
              className: 'flex items-center gap-3',
              children: [
                _jsx('div', { className: 'h-3 w-3 rounded-full bg-green-400' }),
                _jsx('span', {
                  className: 'text-sm font-medium',
                  children: 'System Status: All services operational',
                }),
              ],
            }),
            _jsxs('div', {
              className: 'flex items-center gap-4 text-sm',
              children: [
                _jsx('span', { children: 'Current Release: v2.4.1' }),
                _jsx('span', { children: 'Error Budget: 85% remaining' }),
                _jsx('span', { children: 'Environment: Development' }),
              ],
            }),
          ],
        }),
      }),
      _jsx(ReleaseOverview, { summary: summary }),
      _jsx(TopKPIs, { summary: summary }),
      _jsxs('div', {
        className: 'grid grid-cols-1 gap-6 lg:grid-cols-2',
        children: [
          _jsx(WhatsHotCold, { summary: summary }),
          _jsx(ComplianceGlance, { summary: summary }),
        ],
      }),
      _jsxs('div', {
        className: 'grid grid-cols-1 gap-6 lg:grid-cols-3',
        children: [
          _jsxs('div', {
            className: 'lg:col-span-2 rounded-lg border bg-white p-4 shadow-sm',
            children: [
              _jsxs('div', {
                className: 'mb-3 flex items-center justify-between',
                children: [
                  _jsx('h2', {
                    className: 'text-lg font-semibold text-slate-900',
                    children: 'Live Runs',
                  }),
                  _jsx(Link, {
                    to: '/maestro/runs',
                    className:
                      'text-sm text-indigo-600 hover:text-indigo-700 font-medium',
                    children: 'View All \u2192',
                  }),
                ],
              }),
              _jsx('div', {
                className: 'space-y-2',
                children: summary?.runs
                  ?.slice(0, 5)
                  .map((run) =>
                    _jsxs(
                      'div',
                      {
                        className:
                          'flex items-center justify-between rounded-lg bg-slate-50 p-3',
                        children: [
                          _jsxs('div', {
                            className: 'flex items-center gap-3',
                            children: [
                              _jsx('div', {
                                className: `h-2 w-2 rounded-full ${
                                  run.status === 'Running'
                                    ? 'bg-blue-500 animate-pulse'
                                    : run.status === 'Succeeded'
                                      ? 'bg-green-500'
                                      : 'bg-red-500'
                                }`,
                              }),
                              _jsxs('div', {
                                children: [
                                  _jsx('div', {
                                    className:
                                      'text-sm font-medium text-slate-900',
                                    children: _jsx(Link, {
                                      to: `/maestro/runs/${run.id}`,
                                      className: 'hover:text-indigo-600',
                                      children: run.id,
                                    }),
                                  }),
                                  _jsx('div', {
                                    className: 'text-xs text-slate-600',
                                    children: run.pipeline || 'build',
                                  }),
                                ],
                              }),
                            ],
                          }),
                          _jsx('span', {
                            className: `rounded px-2 py-1 text-xs font-medium ${
                              run.status === 'Running'
                                ? 'bg-blue-100 text-blue-800'
                                : run.status === 'Succeeded'
                                  ? 'bg-green-100 text-green-800'
                                  : 'bg-red-100 text-red-800'
                            }`,
                            children: run.status,
                          }),
                        ],
                      },
                      run.id,
                    ),
                  ),
              }),
            ],
          }),
          _jsxs('div', {
            className: 'space-y-4',
            children: [
              _jsxs('div', {
                className: 'rounded-lg border bg-white p-4 shadow-sm',
                children: [
                  _jsx('h2', {
                    className: 'mb-3 text-lg font-semibold text-slate-900',
                    children: 'Pending Approvals',
                  }),
                  _jsxs('div', {
                    className: 'text-center',
                    children: [
                      _jsx('div', {
                        className: 'text-2xl font-bold text-slate-900',
                        children: summary?.approvals?.length || 0,
                      }),
                      _jsx('div', {
                        className: 'text-sm text-slate-600',
                        children: 'items awaiting approval',
                      }),
                      (summary?.approvals?.length || 0) > 0 &&
                        _jsx(Link, {
                          to: '/maestro/approvals',
                          className:
                            'mt-2 text-sm text-indigo-600 hover:text-indigo-700 font-medium',
                          children: 'Review Now \u2192',
                        }),
                    ],
                  }),
                ],
              }),
              _jsxs('div', {
                className: 'rounded-lg border bg-white p-4 shadow-sm',
                children: [
                  _jsx('h2', {
                    className: 'mb-3 text-lg font-semibold text-slate-900',
                    children: 'Quick Actions',
                  }),
                  _jsxs('div', {
                    className: 'space-y-2',
                    children: [
                      _jsx('button', {
                        className:
                          'w-full rounded bg-indigo-600 px-3 py-2 text-sm text-white hover:bg-indigo-700',
                        children: 'Create New Run',
                      }),
                      _jsx('button', {
                        className:
                          'w-full rounded border px-3 py-2 text-sm text-slate-700 hover:bg-slate-50',
                        children: 'Generate Evidence Bundle',
                      }),
                      _jsx('button', {
                        className:
                          'w-full rounded border px-3 py-2 text-sm text-slate-700 hover:bg-slate-50',
                        children: 'Review Policies',
                      }),
                    ],
                  }),
                ],
              }),
            ],
          }),
        ],
      }),
      _jsxs('div', {
        className: 'rounded-lg border bg-white p-4 shadow-sm',
        children: [
          _jsxs('div', {
            className: 'mb-3 flex items-center justify-between',
            children: [
              _jsx('h2', {
                className: 'text-lg font-semibold text-slate-900',
                children: 'Recent Changes',
              }),
              _jsx(Link, {
                to: '/maestro/audit',
                className:
                  'text-sm text-indigo-600 hover:text-indigo-700 font-medium',
                children: 'View Audit Log \u2192',
              }),
            ],
          }),
          _jsx('div', {
            className: 'space-y-3',
            children: summary?.changes
              ?.slice(0, 6)
              .map((change, i) =>
                _jsxs(
                  'div',
                  {
                    className: 'flex gap-4 border-b pb-3 last:border-0',
                    children: [
                      _jsx('div', {
                        className: 'w-32 flex-shrink-0',
                        children: _jsx('div', {
                          className: 'text-xs font-mono text-slate-500',
                          children: change.at,
                        }),
                      }),
                      _jsxs('div', {
                        className: 'flex-1 min-w-0',
                        children: [
                          _jsx('div', {
                            className: 'text-sm text-slate-900',
                            children: change.title,
                          }),
                          _jsxs('div', {
                            className: 'text-xs text-slate-600',
                            children: ['by ', change.by],
                          }),
                        ],
                      }),
                    ],
                  },
                  i,
                ),
              ),
          }),
          _jsx('div', {
            className: 'mt-3 pt-3 border-t text-xs text-slate-500',
            children:
              'Provenance and diffs are recorded for each change. All changes are cryptographically signed and immutable.',
          }),
        ],
      }),
    ],
  });
}
