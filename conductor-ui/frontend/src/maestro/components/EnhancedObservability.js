import { jsx as _jsx, jsxs as _jsxs } from 'react/jsx-runtime';
import { useState } from 'react';
import { api } from '../api';
import GrafanaPanel from './GrafanaPanel';
import SLOPanel from './SLOPanel';
import ServingLaneTrends from './ServingLaneTrends';
function SLODashboard({ className }) {
  const [slos, setSlos] = useState([
    {
      name: 'Control Plane Availability',
      target: 0.999,
      current: 0.9984,
      errorBudget: 85.2,
      burnRate: 0.8,
      windowHours: 24,
    },
    {
      name: 'Run Success Rate',
      target: 0.97,
      current: 0.984,
      errorBudget: 42.1,
      burnRate: 1.2,
      windowHours: 24,
    },
    {
      name: 'P95 Build Duration',
      target: 600,
      current: 287,
      errorBudget: 78.9,
      burnRate: 0.3,
      windowHours: 24,
    },
    {
      name: 'UI Response Time',
      target: 2500,
      current: 1245,
      errorBudget: 91.7,
      burnRate: 0.2,
      windowHours: 24,
    },
  ]);
  const getSLOStatus = (slo) => {
    if (slo.burnRate > 2) return 'critical';
    if (slo.burnRate > 1) return 'warning';
    return 'healthy';
  };
  const getSLOColor = (status) => {
    switch (status) {
      case 'critical':
        return 'text-red-600';
      case 'warning':
        return 'text-yellow-600';
      default:
        return 'text-green-600';
    }
  };
  return _jsxs('div', {
    className: `rounded-lg border bg-white p-4 shadow-sm ${className}`,
    children: [
      _jsxs('div', {
        className: 'mb-3 flex items-center justify-between',
        children: [
          _jsx('h2', {
            className: 'text-lg font-semibold text-slate-900',
            children: 'SLOs & Error Budgets',
          }),
          _jsx('button', {
            className:
              'rounded border px-2 py-1 text-xs text-slate-600 hover:bg-slate-50',
            children: 'Configure SLOs',
          }),
        ],
      }),
      _jsx('div', {
        className: 'grid grid-cols-1 gap-4 md:grid-cols-2',
        children: slos.map((slo) => {
          const status = getSLOStatus(slo);
          return _jsxs(
            'div',
            {
              className: 'rounded-lg border p-3',
              children: [
                _jsxs('div', {
                  className: 'flex items-start justify-between',
                  children: [
                    _jsxs('div', {
                      className: 'flex-1',
                      children: [
                        _jsx('h3', {
                          className: 'text-sm font-medium text-slate-900',
                          children: slo.name,
                        }),
                        _jsxs('div', {
                          className: 'mt-1 text-xs text-slate-600',
                          children: [
                            'Target: ',
                            typeof slo.target === 'number' && slo.target < 1
                              ? `${(slo.target * 100).toFixed(2)}%`
                              : `${slo.target}${slo.name.includes('Duration') || slo.name.includes('Time') ? 'ms' : ''}`,
                          ],
                        }),
                      ],
                    }),
                    _jsxs('div', {
                      className: 'text-right',
                      children: [
                        _jsx('div', {
                          className: `text-lg font-semibold ${getSLOColor(status)}`,
                          children:
                            typeof slo.current === 'number' && slo.current < 1
                              ? `${(slo.current * 100).toFixed(2)}%`
                              : `${slo.current}${slo.name.includes('Duration') || slo.name.includes('Time') ? 'ms' : ''}`,
                        }),
                        _jsxs('div', {
                          className: 'text-xs text-slate-500',
                          children: [
                            'Budget: ',
                            slo.errorBudget.toFixed(1),
                            '%',
                          ],
                        }),
                      ],
                    }),
                  ],
                }),
                _jsxs('div', {
                  className: 'mt-2',
                  children: [
                    _jsxs('div', {
                      className: 'flex items-center justify-between text-xs',
                      children: [
                        _jsx('span', {
                          className: 'text-slate-600',
                          children: 'Error Budget',
                        }),
                        _jsxs('span', {
                          className: getSLOColor(status),
                          children: [slo.errorBudget.toFixed(1), '% remaining'],
                        }),
                      ],
                    }),
                    _jsx('div', {
                      className:
                        'mt-1 h-2 overflow-hidden rounded-full bg-slate-200',
                      children: _jsx('div', {
                        className: `h-full transition-all duration-300 ${
                          status === 'critical'
                            ? 'bg-red-500'
                            : status === 'warning'
                              ? 'bg-yellow-500'
                              : 'bg-green-500'
                        }`,
                        style: { width: `${slo.errorBudget}%` },
                      }),
                    }),
                    _jsxs('div', {
                      className:
                        'mt-1 flex items-center justify-between text-xs',
                      children: [
                        _jsxs('span', {
                          className: 'text-slate-500',
                          children: ['Burn rate: ', slo.burnRate, '\u00D7'],
                        }),
                        _jsx('span', {
                          className: `font-medium ${getSLOColor(status)}`,
                          children: status.toUpperCase(),
                        }),
                      ],
                    }),
                  ],
                }),
              ],
            },
            slo.name,
          );
        }),
      }),
    ],
  });
}
function MetricsDashboard({ className }) {
  const { useObservability } = api();
  const { data: metrics } = useObservability();
  const goldenSignals = [
    {
      name: 'Latency (P95)',
      value: `${metrics?.latencyP95 || 180}ms`,
      trend: '-12ms',
      status: 'improving',
      target: '≤ 300ms',
    },
    {
      name: 'Error Rate',
      value: `${metrics?.errorRate || 0.4}%`,
      trend: '+0.1%',
      status: 'stable',
      target: '≤ 1.0%',
    },
    {
      name: 'Throughput',
      value: `${metrics?.throughput || 320}/min`,
      trend: '+45/min',
      status: 'improving',
      target: '≥ 200/min',
    },
    {
      name: 'Queue Depth',
      value: `${metrics?.queueDepth || 7}`,
      trend: '-2',
      status: 'improving',
      target: '≤ 10',
    },
  ];
  return _jsxs('div', {
    className: `rounded-lg border bg-white p-4 shadow-sm ${className}`,
    children: [
      _jsx('h2', {
        className: 'mb-3 text-lg font-semibold text-slate-900',
        children: 'Golden Signals',
      }),
      _jsx('div', {
        className: 'grid grid-cols-2 gap-4 md:grid-cols-4',
        children: goldenSignals.map((signal) =>
          _jsxs(
            'div',
            {
              className: 'text-center',
              children: [
                _jsx('div', {
                  className: 'text-xs text-slate-600',
                  children: signal.name,
                }),
                _jsx('div', {
                  className: 'text-xl font-bold text-slate-900',
                  children: signal.value,
                }),
                _jsx('div', {
                  className: 'flex items-center justify-center gap-1 text-xs',
                  children: _jsxs('span', {
                    className: `font-medium ${
                      signal.status === 'improving'
                        ? 'text-green-600'
                        : signal.status === 'degrading'
                          ? 'text-red-600'
                          : 'text-slate-600'
                    }`,
                    children: [
                      signal.status === 'improving'
                        ? '↗'
                        : signal.status === 'degrading'
                          ? '↘'
                          : '→',
                      ' ',
                      signal.trend,
                    ],
                  }),
                }),
                _jsx('div', {
                  className: 'text-xs text-slate-500',
                  children: signal.target,
                }),
              ],
            },
            signal.name,
          ),
        ),
      }),
    ],
  });
}
function AlertsCenter({ className }) {
  const [alerts, setAlerts] = useState([
    {
      id: 'alert-1',
      severity: 'critical',
      message: 'SLO burn rate exceeds 2x for Control Plane Availability',
      runbook: 'https://runbooks.example.com/slo-burn-rate',
      timestamp: new Date(Date.now() - 5 * 60 * 1000).toISOString(),
    },
    {
      id: 'alert-2',
      severity: 'warning',
      message: 'Queue depth approaching limit (8/10)',
      runbook: 'https://runbooks.example.com/queue-depth',
      timestamp: new Date(Date.now() - 15 * 60 * 1000).toISOString(),
    },
    {
      id: 'alert-3',
      severity: 'info',
      message: 'Deployment canary promoted to 50%',
      runbook: '',
      timestamp: new Date(Date.now() - 30 * 60 * 1000).toISOString(),
    },
  ]);
  const handleAckAlert = async (alertId) => {
    try {
      // This would call the actual API
      console.log('Acknowledging alert:', alertId);
      setAlerts((prev) => prev.filter((alert) => alert.id !== alertId));
    } catch (error) {
      console.error('Failed to acknowledge alert:', error);
    }
  };
  const getSeverityColor = (severity) => {
    switch (severity) {
      case 'critical':
        return 'text-red-600 bg-red-50';
      case 'warning':
        return 'text-yellow-600 bg-yellow-50';
      case 'info':
        return 'text-blue-600 bg-blue-50';
      default:
        return 'text-slate-600 bg-slate-50';
    }
  };
  return _jsxs('div', {
    className: `rounded-lg border bg-white p-4 shadow-sm ${className}`,
    children: [
      _jsxs('div', {
        className: 'mb-3 flex items-center justify-between',
        children: [
          _jsx('h2', {
            className: 'text-lg font-semibold text-slate-900',
            children: 'Active Alerts',
          }),
          _jsxs('div', {
            className: 'flex items-center gap-2',
            children: [
              _jsxs('span', {
                className: 'text-xs text-slate-500',
                children: [alerts.length, ' active'],
              }),
              _jsx('button', {
                className:
                  'rounded border px-2 py-1 text-xs text-slate-600 hover:bg-slate-50',
                children: 'View All',
              }),
            ],
          }),
        ],
      }),
      _jsx('div', {
        className: 'space-y-2',
        children:
          alerts.length === 0
            ? _jsxs('div', {
                className: 'text-center py-8 text-slate-500',
                children: [
                  _jsx('div', {
                    className: 'text-green-600 text-2xl mb-2',
                    children: '\u2713',
                  }),
                  _jsx('div', {
                    className: 'text-sm',
                    children: 'No active alerts',
                  }),
                ],
              })
            : alerts.map((alert) =>
                _jsx(
                  'div',
                  {
                    className: `rounded-lg border p-3 ${getSeverityColor(alert.severity)}`,
                    children: _jsxs('div', {
                      className: 'flex items-start justify-between',
                      children: [
                        _jsxs('div', {
                          className: 'flex-1',
                          children: [
                            _jsxs('div', {
                              className: 'flex items-center gap-2',
                              children: [
                                _jsx('span', {
                                  className: `rounded px-1.5 py-0.5 text-xs font-medium ${
                                    alert.severity === 'critical'
                                      ? 'bg-red-100 text-red-800'
                                      : alert.severity === 'warning'
                                        ? 'bg-yellow-100 text-yellow-800'
                                        : 'bg-blue-100 text-blue-800'
                                  }`,
                                  children: alert.severity.toUpperCase(),
                                }),
                                _jsx('span', {
                                  className: 'text-xs text-slate-500',
                                  children: new Date(
                                    alert.timestamp,
                                  ).toLocaleTimeString(),
                                }),
                              ],
                            }),
                            _jsx('div', {
                              className: 'mt-1 text-sm text-slate-900',
                              children: alert.message,
                            }),
                            alert.runbook &&
                              _jsx('div', {
                                className: 'mt-1',
                                children: _jsx('a', {
                                  href: alert.runbook,
                                  target: '_blank',
                                  rel: 'noopener noreferrer',
                                  className:
                                    'text-xs text-indigo-600 hover:underline',
                                  children: 'View Runbook \u2192',
                                }),
                              }),
                          ],
                        }),
                        _jsxs('div', {
                          className: 'flex gap-1',
                          children: [
                            _jsx('button', {
                              onClick: () => handleAckAlert(alert.id),
                              className:
                                'rounded px-2 py-1 text-xs text-slate-600 hover:bg-slate-100',
                              children: 'Ack',
                            }),
                            _jsx('button', {
                              className:
                                'rounded px-2 py-1 text-xs text-slate-600 hover:bg-slate-100',
                              children: 'Assign',
                            }),
                          ],
                        }),
                      ],
                    }),
                  },
                  alert.id,
                ),
              ),
      }),
    ],
  });
}
function TabPanel({ children, value, index }) {
  return _jsx('div', {
    hidden: value !== index,
    role: 'tabpanel',
    'aria-labelledby': `obs-tab-${index}`,
    children: value === index && children,
  });
}
export default function EnhancedObservability() {
  const [activeTab, setActiveTab] = useState('dashboards');
  const tabs = [
    { id: 'dashboards', label: 'Dashboards', icon: '📊' },
    { id: 'traces', label: 'Traces', icon: '🔍' },
    { id: 'logs', label: 'Logs', icon: '📋' },
    { id: 'alerts', label: 'Alerts', icon: '🚨' },
    { id: 'slos', label: 'SLOs', icon: '🎯' },
  ];
  return _jsxs('div', {
    className: 'space-y-6',
    children: [
      _jsxs('div', {
        className: 'flex items-center justify-between',
        children: [
          _jsxs('div', {
            children: [
              _jsx('h1', {
                className: 'text-2xl font-bold text-slate-900',
                children: 'Observability & SLOs',
              }),
              _jsx('p', {
                className: 'text-sm text-slate-600',
                children:
                  'Monitor system health, track SLOs, and investigate issues',
              }),
            ],
          }),
          _jsxs('div', {
            className: 'flex gap-2',
            children: [
              _jsx('button', {
                className:
                  'rounded border px-3 py-2 text-sm text-slate-700 hover:bg-slate-50',
                children: 'Export Metrics',
              }),
              _jsx('button', {
                className:
                  'rounded bg-indigo-600 px-3 py-2 text-sm text-white hover:bg-indigo-700',
                children: 'Create Alert',
              }),
            ],
          }),
        ],
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
        index: 'dashboards',
        children: _jsxs('div', {
          className: 'space-y-6',
          children: [
            _jsx(MetricsDashboard, {}),
            _jsx(SLODashboard, {}),
            _jsx(ServingLaneTrends, {}),
            _jsxs('div', {
              className: 'grid grid-cols-1 gap-4 md:grid-cols-3',
              children: [
                _jsx(GrafanaPanel, {
                  uid: 'maestro-overview',
                  title: 'System Overview',
                }),
                _jsx(GrafanaPanel, {
                  uid: 'maestro-cost',
                  title: 'Cost Trends',
                }),
                _jsx(GrafanaPanel, {
                  uid: 'maestro-performance',
                  title: 'Performance Metrics',
                }),
              ],
            }),
          ],
        }),
      }),
      _jsx(TabPanel, {
        value: activeTab,
        index: 'traces',
        children: _jsxs('div', {
          className: 'rounded-lg border bg-white p-4 shadow-sm',
          children: [
            _jsx('h2', {
              className: 'mb-3 text-lg font-semibold text-slate-900',
              children: 'Distributed Tracing',
            }),
            _jsxs('div', {
              className: 'text-center py-12 text-slate-500',
              children: [
                _jsx('div', {
                  className: 'text-4xl mb-4',
                  children: '\uD83D\uDD0D',
                }),
                _jsx('h3', {
                  className: 'text-lg font-medium text-slate-700 mb-2',
                  children: 'Trace Explorer',
                }),
                _jsx('p', {
                  className: 'text-sm mb-4',
                  children:
                    'Search and analyze distributed traces across your runs',
                }),
                _jsx('button', {
                  className:
                    'rounded bg-indigo-600 px-4 py-2 text-sm text-white hover:bg-indigo-700',
                  children: 'Open Jaeger UI',
                }),
              ],
            }),
          ],
        }),
      }),
      _jsx(TabPanel, {
        value: activeTab,
        index: 'logs',
        children: _jsxs('div', {
          className: 'rounded-lg border bg-white p-4 shadow-sm',
          children: [
            _jsx('h2', {
              className: 'mb-3 text-lg font-semibold text-slate-900',
              children: 'Centralized Logs',
            }),
            _jsxs('div', {
              className: 'text-center py-12 text-slate-500',
              children: [
                _jsx('div', {
                  className: 'text-4xl mb-4',
                  children: '\uD83D\uDCCB',
                }),
                _jsx('h3', {
                  className: 'text-lg font-medium text-slate-700 mb-2',
                  children: 'Log Explorer',
                }),
                _jsx('p', {
                  className: 'text-sm mb-4',
                  children:
                    'Query and analyze logs from all runs and components',
                }),
                _jsx('button', {
                  className:
                    'rounded bg-indigo-600 px-4 py-2 text-sm text-white hover:bg-indigo-700',
                  children: 'Open Grafana Logs',
                }),
              ],
            }),
          ],
        }),
      }),
      _jsx(TabPanel, {
        value: activeTab,
        index: 'alerts',
        children: _jsxs('div', {
          className: 'grid grid-cols-1 gap-6 lg:grid-cols-[1fr_400px]',
          children: [
            _jsx(AlertsCenter, {}),
            _jsxs('div', {
              className: 'rounded-lg border bg-white p-4 shadow-sm',
              children: [
                _jsx('h2', {
                  className: 'mb-3 text-lg font-semibold text-slate-900',
                  children: 'Alert Rules',
                }),
                _jsxs('div', {
                  className: 'space-y-2 text-sm',
                  children: [
                    _jsxs('div', {
                      className: 'flex items-center justify-between',
                      children: [
                        _jsxs('span', {
                          children: ['SLO Burn Rate ', `>`, ' 2x'],
                        }),
                        _jsx('span', {
                          className: 'text-green-600',
                          children: 'Active',
                        }),
                      ],
                    }),
                    _jsxs('div', {
                      className: 'flex items-center justify-between',
                      children: [
                        _jsxs('span', {
                          children: ['Queue Depth ', `>`, ' 10'],
                        }),
                        _jsx('span', {
                          className: 'text-green-600',
                          children: 'Active',
                        }),
                      ],
                    }),
                    _jsxs('div', {
                      className: 'flex items-center justify-between',
                      children: [
                        _jsxs('span', {
                          children: ['Error Rate ', `>`, ' 5%'],
                        }),
                        _jsx('span', {
                          className: 'text-green-600',
                          children: 'Active',
                        }),
                      ],
                    }),
                    _jsxs('div', {
                      className: 'flex items-center justify-between',
                      children: [
                        _jsxs('span', {
                          children: ['Cost Spike ', `>`, ' $100/hr'],
                        }),
                        _jsx('span', {
                          className: 'text-green-600',
                          children: 'Active',
                        }),
                      ],
                    }),
                  ],
                }),
                _jsx('button', {
                  className:
                    'mt-3 w-full rounded border px-3 py-2 text-sm text-slate-700 hover:bg-slate-50',
                  children: 'Manage Rules',
                }),
              ],
            }),
          ],
        }),
      }),
      _jsx(TabPanel, {
        value: activeTab,
        index: 'slos',
        children: _jsxs('div', {
          className: 'space-y-6',
          children: [_jsx(SLODashboard, {}), _jsx(SLOPanel, {})],
        }),
      }),
    ],
  });
}
