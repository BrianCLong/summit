import { jsx as _jsx, jsxs as _jsxs } from 'react/jsx-runtime';
import { useState, useEffect } from 'react';
import { api } from '../api';
import { getMaestroConfig } from '../config';
function RoutingPinPanel({ className }) {
  const [pins, setPins] = useState({});
  const [newPin, setNewPin] = useState({ route: '', model: '', note: '' });
  const [showAddForm, setShowAddForm] = useState(false);
  const { getRoutingPins, putRoutingPin, deleteRoutingPin } = api();
  useEffect(() => {
    const fetchPins = async () => {
      try {
        const currentPins = await getRoutingPins();
        setPins(currentPins);
      } catch (error) {
        console.error('Failed to fetch routing pins:', error);
      }
    };
    fetchPins();
  }, []);
  const handleAddPin = async () => {
    if (!newPin.route || !newPin.model) return;
    try {
      await putRoutingPin({
        route: newPin.route,
        model: newPin.model,
        note: newPin.note || undefined,
      });
      setPins((prev) => ({ ...prev, [newPin.route]: newPin.model }));
      setNewPin({ route: '', model: '', note: '' });
      setShowAddForm(false);
    } catch (error) {
      console.error('Failed to add routing pin:', error);
    }
  };
  const handleRemovePin = async (route) => {
    try {
      await deleteRoutingPin(route);
      setPins((prev) => {
        const updated = { ...prev };
        delete updated[route];
        return updated;
      });
    } catch (error) {
      console.error('Failed to remove routing pin:', error);
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
            children: 'Routing Pins',
          }),
          _jsx('button', {
            onClick: () => setShowAddForm(!showAddForm),
            className:
              'rounded bg-indigo-600 px-3 py-1.5 text-sm text-white hover:bg-indigo-700',
            children: showAddForm ? 'Cancel' : 'Pin Route',
          }),
        ],
      }),
      showAddForm &&
        _jsxs('div', {
          className: 'mb-4 rounded-lg bg-slate-50 p-3',
          children: [
            _jsx('h3', {
              className: 'mb-2 text-sm font-medium text-slate-700',
              children: 'Pin New Route',
            }),
            _jsxs('div', {
              className: 'grid grid-cols-1 gap-2 md:grid-cols-3',
              children: [
                _jsx('input', {
                  type: 'text',
                  placeholder: 'Route (e.g., /chat/completions)',
                  value: newPin.route,
                  onChange: (e) =>
                    setNewPin((prev) => ({ ...prev, route: e.target.value })),
                  className: 'rounded border px-2 py-1 text-sm',
                }),
                _jsx('input', {
                  type: 'text',
                  placeholder: 'Model (e.g., gpt-4o-mini)',
                  value: newPin.model,
                  onChange: (e) =>
                    setNewPin((prev) => ({ ...prev, model: e.target.value })),
                  className: 'rounded border px-2 py-1 text-sm',
                }),
                _jsx('input', {
                  type: 'text',
                  placeholder: 'Note (optional)',
                  value: newPin.note,
                  onChange: (e) =>
                    setNewPin((prev) => ({ ...prev, note: e.target.value })),
                  className: 'rounded border px-2 py-1 text-sm',
                }),
              ],
            }),
            _jsx('div', {
              className: 'mt-2 flex gap-2',
              children: _jsx('button', {
                onClick: handleAddPin,
                disabled: !newPin.route || !newPin.model,
                className:
                  'rounded bg-green-600 px-3 py-1 text-xs text-white hover:bg-green-700 disabled:opacity-50',
                children: 'Add Pin',
              }),
            }),
          ],
        }),
      _jsx('div', {
        className: 'space-y-2',
        children:
          Object.keys(pins).length === 0
            ? _jsx('div', {
                className: 'text-center py-8 text-slate-500',
                children:
                  'No routing pins configured. Pin routes to specific models for consistent routing.',
              })
            : Object.entries(pins).map(([route, model]) =>
                _jsxs(
                  'div',
                  {
                    className:
                      'flex items-center justify-between rounded-lg bg-slate-50 p-3',
                    children: [
                      _jsxs('div', {
                        children: [
                          _jsx('div', {
                            className: 'text-sm font-medium text-slate-900',
                            children: route,
                          }),
                          _jsxs('div', {
                            className: 'text-xs text-slate-600',
                            children: ['\u2192 ', model],
                          }),
                        ],
                      }),
                      _jsxs('div', {
                        className: 'flex gap-2',
                        children: [
                          _jsx('button', {
                            className:
                              'rounded px-2 py-1 text-xs text-slate-600 hover:bg-slate-200',
                            children: 'Edit',
                          }),
                          _jsx('button', {
                            onClick: () => handleRemovePin(route),
                            className:
                              'rounded px-2 py-1 text-xs text-red-600 hover:bg-red-100',
                            children: 'Remove',
                          }),
                        ],
                      }),
                    ],
                  },
                  route,
                ),
              ),
      }),
    ],
  });
}
function CandidatesPanel({ className }) {
  const [requestClass, setRequestClass] = useState('chat.completions');
  const [candidates, setCandidates] = useState([]);
  const [loading, setLoading] = useState(false);
  const { routingPreview } = api();
  const fetchCandidates = async () => {
    setLoading(true);
    try {
      const response = await routingPreview({
        class: requestClass,
        // Mock request payload
        payload: {
          messages: [{ role: 'user', content: 'Hello' }],
          temperature: 0.7,
        },
      });
      setCandidates(response.candidates || []);
    } catch (error) {
      console.error('Failed to fetch routing candidates:', error);
      setCandidates([]);
    } finally {
      setLoading(false);
    }
  };
  useEffect(() => {
    fetchCandidates();
  }, [requestClass]);
  const handleTogglePin = (candidate) => {
    // This would implement pinning logic
    console.log('Toggle pin for candidate:', candidate);
  };
  return _jsxs('div', {
    className: `rounded-lg border bg-white p-4 shadow-sm ${className}`,
    children: [
      _jsxs('div', {
        className: 'mb-3 flex items-center justify-between',
        children: [
          _jsx('h2', {
            className: 'text-lg font-semibold text-slate-900',
            children: 'Routing Candidates',
          }),
          _jsxs('div', {
            className: 'flex items-center gap-2',
            children: [
              _jsxs('select', {
                value: requestClass,
                onChange: (e) => setRequestClass(e.target.value),
                className: 'rounded border px-2 py-1 text-sm',
                children: [
                  _jsx('option', {
                    value: 'chat.completions',
                    children: 'Chat Completions',
                  }),
                  _jsx('option', {
                    value: 'embeddings',
                    children: 'Embeddings',
                  }),
                  _jsx('option', { value: 'images', children: 'Images' }),
                  _jsx('option', { value: 'audio', children: 'Audio' }),
                ],
              }),
              _jsx('button', {
                onClick: fetchCandidates,
                disabled: loading,
                className:
                  'rounded border px-2 py-1 text-sm text-slate-700 hover:bg-slate-50 disabled:opacity-50',
                children: loading ? 'Loading...' : 'Refresh',
              }),
            ],
          }),
        ],
      }),
      _jsxs('div', {
        className: 'space-y-2',
        children: [
          candidates.map((candidate, i) =>
            _jsx(
              'div',
              {
                className: 'rounded-lg border p-3',
                children: _jsxs('div', {
                  className: 'flex items-start justify-between',
                  children: [
                    _jsxs('div', {
                      className: 'flex-1',
                      children: [
                        _jsxs('div', {
                          className: 'flex items-center gap-2',
                          children: [
                            _jsxs('span', {
                              className: 'text-sm font-medium text-slate-900',
                              children: [
                                candidate.provider,
                                '/',
                                candidate.model,
                              ],
                            }),
                            _jsxs('span', {
                              className: 'text-xs font-medium text-slate-700',
                              children: ['Score: ', candidate.score.toFixed(2)],
                            }),
                          ],
                        }),
                        _jsxs('div', {
                          className:
                            'mt-1 flex items-center gap-4 text-xs text-slate-600',
                          children: [
                            _jsxs('span', {
                              children: ['Latency: ', candidate.latency, 'ms'],
                            }),
                            _jsxs('span', {
                              children: ['Cost: $', candidate.cost.toFixed(4)],
                            }),
                            _jsxs('span', {
                              children: [
                                'Reliability: ',
                                (candidate.reliability * 100).toFixed(1),
                                '%',
                              ],
                            }),
                            _jsxs('span', {
                              className: `rounded px-1.5 py-0.5 font-medium ${
                                candidate.policyGrade === 'A'
                                  ? 'bg-green-100 text-green-800'
                                  : candidate.policyGrade === 'B'
                                    ? 'bg-yellow-100 text-yellow-800'
                                    : 'bg-red-100 text-red-800'
                              }`,
                              children: ['Policy: ', candidate.policyGrade],
                            }),
                          ],
                        }),
                      ],
                    }),
                    _jsxs('div', {
                      className: 'flex gap-1',
                      children: [
                        _jsx('button', {
                          onClick: () => handleTogglePin(candidate),
                          className:
                            'rounded px-2 py-1 text-xs text-indigo-600 hover:bg-indigo-50',
                          children: '\uD83D\uDCCC Pin',
                        }),
                        _jsx('button', {
                          className:
                            'rounded px-2 py-1 text-xs text-slate-600 hover:bg-slate-50',
                          children: 'Test',
                        }),
                      ],
                    }),
                  ],
                }),
              },
              i,
            ),
          ),
          candidates.length === 0 &&
            !loading &&
            _jsxs('div', {
              className: 'text-center py-8 text-slate-500',
              children: ['No candidates available for ', requestClass],
            }),
        ],
      }),
    ],
  });
}
function PolicySheet({ className }) {
  const [policies, setPolicies] = useState([
    {
      id: 'data-residency',
      name: 'Data Residency',
      enabled: true,
      rules: ['US/EU only', 'No China/Russia'],
      violations: 0,
    },
    {
      id: 'rate-limits',
      name: 'Rate Limits',
      enabled: true,
      rules: ['1000 RPM per tenant', '10K TPM global'],
      violations: 3,
    },
    {
      id: 'cost-controls',
      name: 'Cost Controls',
      enabled: true,
      rules: ['$0.10 per request max', 'Emergency brake at $1K/hour'],
      violations: 1,
    },
    {
      id: 'fallback-strategy',
      name: 'Fallback Strategy',
      enabled: false,
      rules: ['Primary → Secondary → Cache', 'Timeout: 30s'],
      violations: 0,
    },
  ]);
  return _jsxs('div', {
    className: `rounded-lg border bg-white p-4 shadow-sm ${className}`,
    children: [
      _jsxs('div', {
        className: 'mb-3 flex items-center justify-between',
        children: [
          _jsx('h2', {
            className: 'text-lg font-semibold text-slate-900',
            children: 'Policy Configuration',
          }),
          _jsx('button', {
            className:
              'rounded border px-3 py-1.5 text-sm text-slate-700 hover:bg-slate-50',
            children: 'Edit Policies',
          }),
        ],
      }),
      _jsx('div', {
        className: 'space-y-3',
        children: policies.map((policy) =>
          _jsx(
            'div',
            {
              className: 'rounded-lg border p-3',
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
                            className: 'text-sm font-medium text-slate-900',
                            children: policy.name,
                          }),
                          _jsx('label', {
                            className: 'inline-flex items-center',
                            children: _jsx('input', {
                              type: 'checkbox',
                              checked: policy.enabled,
                              onChange: (e) => {
                                setPolicies((prev) =>
                                  prev.map((p) =>
                                    p.id === policy.id
                                      ? { ...p, enabled: e.target.checked }
                                      : p,
                                  ),
                                );
                              },
                              className:
                                'form-checkbox h-4 w-4 text-indigo-600',
                            }),
                          }),
                        ],
                      }),
                      _jsx('div', {
                        className: 'mt-1 space-y-0.5',
                        children: policy.rules.map((rule, i) =>
                          _jsxs(
                            'div',
                            {
                              className: 'text-xs text-slate-600',
                              children: ['\u2022 ', rule],
                            },
                            i,
                          ),
                        ),
                      }),
                    ],
                  }),
                  _jsx('div', {
                    className: 'text-right',
                    children:
                      policy.violations > 0
                        ? _jsxs('span', {
                            className: 'text-xs font-medium text-red-600',
                            children: [
                              policy.violations,
                              ' violation',
                              policy.violations !== 1 ? 's' : '',
                            ],
                          })
                        : _jsx('span', {
                            className: 'text-xs text-green-600',
                            children: '\u2713 Compliant',
                          }),
                  }),
                ],
              }),
            },
            policy.id,
          ),
        ),
      }),
    ],
  });
}
function TrafficHealth({ className }) {
  const [healthData, setHealthData] = useState([
    {
      provider: 'OpenAI',
      model: 'gpt-4o-mini',
      successRate: 99.7,
      avgLatency: 245,
      requestsPerMin: 1240,
      tokensPerSec: 15600,
      costPerHour: 8.45,
      status: 'healthy',
    },
    {
      provider: 'Anthropic',
      model: 'claude-3-haiku',
      successRate: 99.9,
      avgLatency: 189,
      requestsPerMin: 890,
      tokensPerSec: 11200,
      costPerHour: 6.78,
      status: 'healthy',
    },
    {
      provider: 'Google',
      model: 'gemini-pro',
      successRate: 97.2,
      avgLatency: 567,
      requestsPerMin: 234,
      tokensPerSec: 3400,
      costPerHour: 2.34,
      status: 'degraded',
    },
  ]);
  const [streamConnected, setStreamConnected] = useState(false);
  useEffect(() => {
    // Set up SSE stream for routing events
    const cfg = getMaestroConfig();
    if (!cfg.gatewayBase) return;
    const eventSource = new EventSource(`${cfg.gatewayBase}/streams/routing`);
    eventSource.onopen = () => setStreamConnected(true);
    eventSource.onerror = () => setStreamConnected(false);
    eventSource.addEventListener('routing_failover', (event) => {
      const data = JSON.parse(event.data);
      console.log('Routing failover detected:', data.payload);
      // Update health data based on failover events
    });
    eventSource.addEventListener('routing_restored', (event) => {
      const data = JSON.parse(event.data);
      console.log('Routing restored:', data.payload);
    });
    return () => eventSource.close();
  }, []);
  return _jsxs('div', {
    className: `rounded-lg border bg-white p-4 shadow-sm ${className}`,
    children: [
      _jsxs('div', {
        className: 'mb-3 flex items-center justify-between',
        children: [
          _jsx('h2', {
            className: 'text-lg font-semibold text-slate-900',
            children: 'Traffic & Health',
          }),
          _jsxs('div', {
            className: 'flex items-center gap-2',
            children: [
              _jsx('div', {
                className: `h-2 w-2 rounded-full ${streamConnected ? 'bg-green-500' : 'bg-red-500'}`,
              }),
              _jsx('span', {
                className: 'text-xs text-slate-500',
                children: streamConnected ? 'Live' : 'Offline',
              }),
            ],
          }),
        ],
      }),
      _jsx('div', {
        className: 'overflow-x-auto',
        children: _jsxs('table', {
          className: 'w-full text-sm',
          children: [
            _jsx('thead', {
              className: 'bg-slate-50 text-left text-slate-500',
              children: _jsxs('tr', {
                children: [
                  _jsx('th', {
                    className: 'px-3 py-2',
                    children: 'Provider/Model',
                  }),
                  _jsx('th', {
                    className: 'px-3 py-2',
                    children: 'Success Rate',
                  }),
                  _jsx('th', { className: 'px-3 py-2', children: 'Latency' }),
                  _jsx('th', { className: 'px-3 py-2', children: 'Traffic' }),
                  _jsx('th', { className: 'px-3 py-2', children: 'Cost/Hour' }),
                  _jsx('th', { className: 'px-3 py-2', children: 'Status' }),
                ],
              }),
            }),
            _jsx('tbody', {
              children: healthData.map((item, i) =>
                _jsxs(
                  'tr',
                  {
                    className: 'border-t',
                    children: [
                      _jsxs('td', {
                        className: 'px-3 py-2',
                        children: [
                          _jsx('div', {
                            className: 'text-sm font-medium text-slate-900',
                            children: item.provider,
                          }),
                          _jsx('div', {
                            className: 'text-xs text-slate-600',
                            children: item.model,
                          }),
                        ],
                      }),
                      _jsx('td', {
                        className: 'px-3 py-2',
                        children: _jsxs('span', {
                          className: `text-sm font-medium ${
                            item.successRate >= 99
                              ? 'text-green-600'
                              : item.successRate >= 95
                                ? 'text-yellow-600'
                                : 'text-red-600'
                          }`,
                          children: [item.successRate.toFixed(1), '%'],
                        }),
                      }),
                      _jsxs('td', {
                        className: 'px-3 py-2 text-sm',
                        children: [item.avgLatency, 'ms'],
                      }),
                      _jsx('td', {
                        className: 'px-3 py-2',
                        children: _jsxs('div', {
                          className: 'text-xs',
                          children: [
                            _jsxs('div', {
                              children: [item.requestsPerMin, ' RPM'],
                            }),
                            _jsxs('div', {
                              className: 'text-slate-500',
                              children: [item.tokensPerSec, ' tok/s'],
                            }),
                          ],
                        }),
                      }),
                      _jsxs('td', {
                        className: 'px-3 py-2 text-sm',
                        children: ['$', item.costPerHour.toFixed(2)],
                      }),
                      _jsx('td', {
                        className: 'px-3 py-2',
                        children: _jsx('span', {
                          className: `rounded px-2 py-0.5 text-xs font-medium ${
                            item.status === 'healthy'
                              ? 'bg-green-100 text-green-800'
                              : item.status === 'degraded'
                                ? 'bg-yellow-100 text-yellow-800'
                                : 'bg-red-100 text-red-800'
                          }`,
                          children: item.status,
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
      }),
    ],
  });
}
export default function EnhancedRoutingStudio() {
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
                children: 'Routing Studio',
              }),
              _jsx('p', {
                className: 'text-sm text-slate-600',
                children:
                  'Manage model routing, pins, policies, and traffic health',
              }),
            ],
          }),
          _jsxs('div', {
            className: 'flex gap-2',
            children: [
              _jsx('button', {
                className:
                  'rounded border px-3 py-2 text-sm text-slate-700 hover:bg-slate-50',
                children: 'Export Config',
              }),
              _jsx('button', {
                className:
                  'rounded bg-indigo-600 px-3 py-2 text-sm text-white hover:bg-indigo-700',
                children: 'Emergency Stop',
              }),
            ],
          }),
        ],
      }),
      _jsxs('div', {
        className: 'grid grid-cols-1 gap-6 lg:grid-cols-2',
        children: [_jsx(CandidatesPanel, {}), _jsx(RoutingPinPanel, {})],
      }),
      _jsxs('div', {
        className: 'grid grid-cols-1 gap-6 lg:grid-cols-[1fr_400px]',
        children: [_jsx(TrafficHealth, {}), _jsx(PolicySheet, {})],
      }),
    ],
  });
}
