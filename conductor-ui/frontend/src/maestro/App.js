import { jsx as _jsx, jsxs as _jsxs } from 'react/jsx-runtime';
import React, { useMemo, Suspense, lazy } from 'react';
import {
  BrowserRouter,
  Routes,
  Route,
  NavLink,
  Navigate,
  Link,
} from 'react-router-dom';
import { AuthProvider, ProtectedRoute, useAuth } from './auth/auth-context';
import UserProfile from './components/UserProfile';
import CommandPalette from './components/CommandPalette';
// Lazy-loaded components for code splitting
const ControlHub = lazy(() => import('./components/ControlHub'));
const RunsList = lazy(() => import('./components/RunsList'));
const EnhancedRunDetail = lazy(() => import('./components/EnhancedRunDetail'));
const EnhancedRoutingStudio = lazy(
  () => import('./components/EnhancedRoutingStudio'),
);
const EnhancedObservability = lazy(
  () => import('./components/EnhancedObservability'),
);
// Lazy-load page components
const RunDetail = lazy(() => import('./pages/RunDetail'));
const PipelineDetail = lazy(() => import('./pages/PipelineDetail'));
const Secrets = lazy(() => import('./pages/Secrets'));
const RoutingStudio = lazy(() => import('./pages/RoutingStudio'));
const CompareRun = lazy(() => import('./pages/CompareRun'));
const TenantObservability = lazy(() => import('./pages/TenantObservability'));
const DLQSignatures = lazy(() => import('./pages/DLQSignatures'));
const DLQPolicy = lazy(() => import('./pages/DLQPolicy'));
const AlertCenter = lazy(() => import('./pages/AlertCenter'));
const ProviderRates = lazy(() => import('./pages/ProviderRates'));
const CICD = lazy(() => import('./pages/CICD'));
function AuthCallback() {
  const { isLoading, error } = useAuth();
  if (error) {
    return _jsx('div', {
      className: 'min-h-screen flex items-center justify-center bg-slate-50',
      children: _jsxs('div', {
        className: 'text-center',
        children: [
          _jsx('h2', {
            className: 'text-2xl font-bold text-red-600 mb-4',
            children: 'Authentication Error',
          }),
          _jsx('p', { className: 'text-slate-600 mb-6', children: error }),
          _jsx('button', {
            onClick: () => (window.location.href = '/maestro/login'),
            className:
              'rounded bg-indigo-600 px-4 py-2 text-white hover:bg-indigo-700',
            children: 'Try Again',
          }),
        ],
      }),
    });
  }
  return _jsx('div', {
    className: 'min-h-screen flex items-center justify-center bg-slate-50',
    children: _jsxs('div', {
      className: 'text-center',
      children: [
        _jsx('div', {
          className:
            'h-8 w-8 animate-spin rounded-full border-4 border-indigo-500 border-t-transparent mx-auto mb-4',
        }),
        _jsx('p', { children: 'Processing authentication...' }),
      ],
    }),
  });
}
function AuthLogin() {
  const { login } = useAuth();
  return _jsx('div', {
    className: 'min-h-screen flex items-center justify-center bg-slate-50',
    children: _jsxs('div', {
      className: 'text-center',
      children: [
        _jsx('div', {
          className: 'h-12 w-12 rounded bg-indigo-600 mx-auto mb-6',
          'aria-hidden': true,
        }),
        _jsx('h2', {
          className: 'text-2xl font-bold text-slate-900 mb-6',
          children: 'Sign In to Maestro',
        }),
        _jsx('p', {
          className: 'text-slate-600 mb-6',
          children: 'Access the Maestro control plane with your credentials.',
        }),
        _jsx('button', {
          onClick: login,
          className:
            'rounded bg-indigo-600 px-6 py-3 text-white hover:bg-indigo-700 font-semibold',
          children: 'Continue with OIDC',
        }),
        _jsx('p', {
          className: 'text-xs text-slate-500 mt-4',
          children:
            "You'll be redirected to your identity provider to complete authentication.",
        }),
      ],
    }),
  });
}
// Loading fallback component
function LoadingFallback() {
  return _jsx('div', {
    className: 'min-h-[200px] flex items-center justify-center',
    children: _jsxs('div', {
      className: 'text-center',
      children: [
        _jsx('div', {
          className:
            'h-8 w-8 animate-spin rounded-full border-4 border-indigo-500 border-t-transparent mx-auto mb-4',
        }),
        _jsx('p', { className: 'text-slate-600', children: 'Loading...' }),
      ],
    }),
  });
}
import { api } from './api';
import SLOPanel from './components/SLOPanel';
import ServingLaneTrends from './components/ServingLaneTrends';
function Shell({ children }) {
  const [paletteOpen, setPaletteOpen] = React.useState(false);
  React.useEffect(() => {
    const onKey = (e) => {
      const metaK = (e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k';
      if (metaK) {
        e.preventDefault();
        setPaletteOpen(true);
      }
      if (e.key === 'Escape') setPaletteOpen(false);
      // Quick nav: g r, g o, g t
      if (e.key.toLowerCase() === 'g') {
        const handler = (ev) => {
          const m = ev.key.toLowerCase();
          if (m === 'r') window.history.pushState({}, '', '/maestro/runs');
          if (m === 'o')
            window.history.pushState({}, '', '/maestro/observability');
          if (m === 't') window.history.pushState({}, '', '/maestro/tickets');
          window.dispatchEvent(new PopStateEvent('popstate'));
          window.removeEventListener('keydown', handler);
        };
        window.addEventListener('keydown', handler, { once: true });
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);
  return _jsxs('div', {
    className: 'min-h-screen bg-slate-50 text-slate-900',
    children: [
      _jsx('a', {
        href: '#main',
        className:
          'sr-only focus:not-sr-only focus:absolute focus:top-2 focus:left-2 bg-white border rounded px-2 py-1',
        children: 'Skip to main content',
      }),
      _jsx('header', {
        className: 'sticky top-0 z-20 border-b bg-white/80 backdrop-blur',
        children: _jsxs('div', {
          className:
            'mx-auto flex max-w-screen-2xl items-center justify-between px-4 py-3',
          children: [
            _jsxs('div', {
              className: 'flex items-center gap-3',
              children: [
                _jsx('div', {
                  className: 'h-8 w-8 rounded bg-indigo-600',
                  'aria-hidden': true,
                }),
                _jsxs('div', {
                  children: [
                    _jsx('div', {
                      className:
                        'text-sm font-semibold tracking-wide text-slate-700',
                      children: 'Maestro builds IntelGraph v2',
                    }),
                    _jsx('div', {
                      className: 'text-xs text-slate-500',
                      children:
                        'Maestro \u2260 IntelGraph \u2014 Control Plane',
                    }),
                  ],
                }),
              ],
            }),
            _jsxs('div', {
              className: 'flex items-center gap-3',
              children: [
                _jsx('button', {
                  'aria-label': 'Open command palette',
                  className:
                    'rounded border px-2 py-1 text-xs text-slate-600 hover:bg-slate-100',
                  onClick: () => setPaletteOpen(true),
                  children: '\u2318K Command',
                }),
                _jsx('div', {
                  className: 'text-xs text-slate-500',
                  children: 'v1.0 \u2022 Dev Preview',
                }),
                _jsx(UserProfile, {}),
              ],
            }),
          ],
        }),
      }),
      _jsxs('div', {
        className:
          'mx-auto grid max-w-screen-2xl grid-cols-[250px_1fr] gap-0 px-4',
        children: [
          _jsxs('nav', {
            className:
              'sticky top-[57px] h-[calc(100vh-57px)] overflow-y-auto border-r bg-white pr-3',
            'aria-label': 'Primary',
            children: [
              _jsx('ul', {
                className: 'py-3 text-sm',
                children: [
                  ['/', 'Home'],
                  ['/runs', 'Runs'],
                  ['/pipelines', 'Pipelines'],
                  ['/autonomy', 'Autonomy & Guardrails'],
                  ['/recipes', 'Recipes'],
                  ['/observability', 'Observability & SLOs'],
                  ['/cost', 'Costs & Budgets'],
                  ['/routing', 'Routing Studio'],
                  ['/secrets', 'Secrets & Connections'],
                  ['/tenants/observability', 'Tenant Observability'],
                  ['/tenants/costs', 'Tenant Costs'],
                  ['/ops/dlq/signatures', 'DLQ Signatures'],
                  ['/ops/dlq/root', 'DLQ Root Causes'],
                  ['/ops/dlq/sim', 'DLQ Simulator'],
                  ['/alertcenter', 'Alert Center'],
                  ['/providers/rates', 'Provider Rates'],
                  ['/cicd', 'CI/CD & Environments'],
                  ['/tickets', 'Tickets & Projects'],
                  ['/admin', 'Admin Studio'],
                ].map(([href, label]) =>
                  _jsx(
                    'li',
                    {
                      children: _jsx(NavLink, {
                        to: href,
                        className: ({ isActive }) =>
                          [
                            'block rounded px-3 py-2 hover:bg-slate-100',
                            isActive
                              ? 'bg-indigo-50 text-indigo-700'
                              : 'text-slate-700',
                          ].join(' '),
                        end: true,
                        'aria-current': ({ isActive }) =>
                          isActive ? 'page' : undefined,
                        children: label,
                      }),
                    },
                    href,
                  ),
                ),
              }),
              _jsx('div', {
                className: 'px-3 pb-4 pt-2 text-[11px] text-slate-500',
                children: 'Evidence-first \u2022 Explainable \u2022 A11y AA',
              }),
            ],
          }),
          _jsx('main', {
            id: 'main',
            role: 'main',
            className:
              'min-h-[calc(100vh-57px)] overflow-x-hidden bg-slate-50 p-4',
            children: children,
          }),
        ],
      }),
      _jsx(CommandPalette, {
        open: paletteOpen,
        onClose: () => setPaletteOpen(false),
      }),
    ],
  });
}
function Card({ title, children, footer }) {
  return _jsxs('section', {
    className: 'rounded-lg border bg-white shadow-sm',
    children: [
      _jsx('div', {
        className: 'border-b px-4 py-2 text-sm font-semibold text-slate-700',
        children: title,
      }),
      _jsx('div', { className: 'px-4 py-3', children: children }),
      footer &&
        _jsx('div', {
          className: 'border-t bg-slate-50 px-4 py-2 text-xs text-slate-500',
          children: footer,
        }),
    ],
  });
}
function Home() {
  const { useSummary } = api();
  const { data } = useSummary();
  return _jsxs('div', {
    className: 'grid grid-cols-1 gap-4 lg:grid-cols-3',
    children: [
      _jsx(Card, {
        title: 'Autonomy',
        children: _jsxs('div', {
          className: 'flex items-center gap-4',
          children: [
            _jsx('div', {
              className:
                'h-24 w-24 rounded-full bg-gradient-to-br from-indigo-500 to-violet-500',
              'aria-hidden': true,
            }),
            _jsxs('div', {
              children: [
                _jsx('div', {
                  className: 'text-sm text-slate-600',
                  children: 'Current Level',
                }),
                _jsxs('div', {
                  className: 'text-2xl font-semibold',
                  children: ['L', data?.autonomy?.level ?? 0],
                }),
                _jsxs('div', {
                  className: 'text-xs text-slate-500',
                  children: [
                    'Canary: ',
                    Math.round((data?.autonomy?.canary ?? 0) * 100),
                    '%',
                  ],
                }),
              ],
            }),
          ],
        }),
      }),
      _jsx(Card, {
        title: 'Health & SLOs',
        children: _jsxs('ul', {
          className: 'text-sm text-slate-700',
          children: [
            _jsxs('li', {
              children: [
                'Success rate:',
                ' ',
                _jsxs('span', {
                  className: 'font-semibold',
                  children: [
                    Math.round((data?.health?.success ?? 0) * 100),
                    '%',
                  ],
                }),
              ],
            }),
            _jsxs('li', {
              children: [
                'P95 latency: ',
                _jsxs('span', {
                  className: 'font-semibold',
                  children: [data?.health?.p95 ?? '—', ' ms'],
                }),
              ],
            }),
            _jsxs('li', {
              children: [
                'Burn rate: ',
                _jsxs('span', {
                  className: 'font-semibold',
                  children: [data?.health?.burn ?? '—', '\u00D7'],
                }),
              ],
            }),
          ],
        }),
      }),
      _jsx(Card, {
        title: 'Budgets',
        children: _jsxs('ul', {
          className: 'text-sm text-slate-700',
          children: [
            _jsxs('li', {
              children: [
                'Remaining: ',
                _jsxs('span', {
                  className: 'font-semibold',
                  children: ['$', data?.budgets?.remaining ?? 0],
                }),
              ],
            }),
            _jsxs('li', {
              children: [
                'Hard cap: ',
                _jsxs('span', {
                  className: 'font-semibold',
                  children: ['$', data?.budgets?.cap ?? 0],
                }),
              ],
            }),
          ],
        }),
      }),
      _jsxs('div', {
        className: 'lg:col-span-2 grid grid-cols-1 gap-4 md:grid-cols-2',
        children: [
          _jsx(Card, {
            title: 'Live Runs',
            children: _jsx('div', {
              className: 'text-sm text-slate-600',
              children: data?.runs?.slice(0, 5).map((r) =>
                _jsxs(
                  'div',
                  {
                    className:
                      'flex items-center justify-between border-b py-2 last:border-0',
                    children: [
                      _jsx('span', {
                        className: 'font-mono text-xs',
                        children: r.id,
                      }),
                      _jsx('span', {
                        className: 'rounded bg-slate-100 px-2 py-0.5 text-xs',
                        children: r.status,
                      }),
                    ],
                  },
                  r.id,
                ),
              ),
            }),
          }),
          _jsx(Card, {
            title: 'Pending Approvals',
            children: _jsxs('div', {
              className: 'text-sm text-slate-600',
              children: [data?.approvals?.length || 0, ' items'],
            }),
          }),
        ],
      }),
      _jsx(Card, {
        title: 'Recent Changes',
        footer: 'Provenance and diffs are recorded for each change.',
        children: _jsx('div', {
          className: 'text-sm text-slate-600',
          children: data?.changes?.slice(0, 6).map((c, i) =>
            _jsxs(
              'div',
              {
                className:
                  'grid grid-cols-[140px_1fr] gap-3 border-b py-2 last:border-0',
                children: [
                  _jsx('span', {
                    className: 'font-mono text-xs text-slate-500',
                    children: c.at,
                  }),
                  _jsxs('div', {
                    children: [
                      _jsx('div', {
                        className: 'text-slate-800',
                        children: c.title,
                      }),
                      _jsx('div', {
                        className: 'text-xs text-slate-500',
                        children: c.by,
                      }),
                    ],
                  }),
                ],
              },
              i,
            ),
          ),
        }),
      }),
    ],
  });
}
function Runs() {
  return _jsxs('div', {
    className: 'space-y-3',
    children: [
      _jsxs('div', {
        className: 'flex items-center justify-between',
        children: [
          _jsx('h2', {
            className: 'text-lg font-semibold',
            children: 'Runs & Pipelines',
          }),
          _jsxs('div', {
            className: 'flex gap-2',
            children: [
              _jsx('button', {
                className:
                  'rounded border px-3 py-1.5 text-sm text-slate-700 hover:bg-slate-50',
                children: 'Export CSV',
              }),
              _jsx('button', {
                className:
                  'rounded bg-indigo-600 px-3 py-1.5 text-sm text-white hover:bg-indigo-700',
                children: 'Create Run',
              }),
            ],
          }),
        ],
      }),
      _jsx(RunsList, { showFilters: true }),
    ],
  });
}
function Pipelines() {
  const { usePipelines } = api();
  const { data } = usePipelines();
  return _jsxs('div', {
    className: 'space-y-3',
    children: [
      _jsx('h2', { className: 'text-lg font-semibold', children: 'Pipelines' }),
      _jsx('div', {
        className: 'grid grid-cols-1 gap-3 md:grid-cols-2',
        children: data?.map((p) =>
          _jsxs(
            Card,
            {
              title: p.name,
              children: [
                _jsxs('div', {
                  className: 'text-sm text-slate-600',
                  children: ['Version ', p.version],
                }),
                _jsxs('div', {
                  className: 'mt-2 text-xs text-slate-500',
                  children: ['Owner: ', p.owner],
                }),
                _jsx('div', {
                  className: 'mt-3 text-xs',
                  children: _jsx(Link, {
                    className: 'text-indigo-700 hover:underline',
                    to: `/maestro/pipelines/${p.id}`,
                    children: 'Open',
                  }),
                }),
              ],
            },
            p.id,
          ),
        ),
      }),
    ],
  });
}
function Autonomy() {
  const { useAutonomy, patchAutonomy } = api();
  const { data, setLevel } = useAutonomy();
  const [decision, setDecision] = React.useState(null);
  const [error, setError] = React.useState(null);
  const levels = [0, 1, 2, 3, 4, 5];
  return _jsxs('div', {
    className: 'space-y-3',
    children: [
      _jsx('h2', {
        className: 'text-lg font-semibold',
        children: 'Autonomy & Guardrails',
      }),
      _jsx(Card, {
        title: 'Level',
        children: _jsx('div', {
          className: 'flex items-center gap-2',
          children: levels.map((l) =>
            _jsxs(
              'button',
              {
                onClick: async () => {
                  setLevel(l);
                  setError(null);
                  try {
                    const resp = await patchAutonomy({
                      level: l,
                      canary: 0.1,
                      window: '09:00-17:00',
                      caps: { blastRadius: 0.1, cost: 200 },
                    });
                    setDecision(resp);
                  } catch (e) {
                    setError(e?.message || 'Autonomy update failed');
                  }
                },
                className: [
                  'rounded px-3 py-1.5 text-sm',
                  data?.level === l
                    ? 'bg-indigo-600 text-white'
                    : 'bg-slate-100 text-slate-700 hover:bg-slate-200',
                ].join(' '),
                children: ['L', l],
              },
              l,
            ),
          ),
        }),
      }),
      _jsx(Card, {
        title: 'Policies',
        children: _jsx('ul', {
          className: 'text-sm text-slate-700',
          children: data?.policies?.map((p, i) =>
            _jsxs(
              'li',
              {
                className:
                  'flex items-center justify-between border-b py-2 last:border-0',
                children: [
                  _jsx('span', { children: p.title }),
                  _jsx('span', {
                    className: 'text-xs text-slate-500',
                    children: p.state,
                  }),
                ],
              },
              i,
            ),
          ),
        }),
      }),
      _jsxs(Card, {
        title: 'Simulation',
        footer: 'Preview impact; risk bands and SLO deltas shown here.',
        children: [
          error &&
            _jsx('div', {
              className: 'mb-2 text-sm text-red-700',
              children: error,
            }),
          !decision &&
            _jsx('div', {
              className: 'text-sm text-slate-600',
              children:
                'Simulation preview coming from backend policy engine\u2026',
            }),
          decision &&
            _jsxs('div', {
              className: 'space-y-2 text-sm',
              children: [
                _jsxs('div', {
                  children: [
                    'Decision:',
                    ' ',
                    _jsx('span', {
                      className: 'font-semibold',
                      children: decision?.decision?.allowed ? 'Allow' : 'Deny',
                    }),
                  ],
                }),
                decision?.decision?.gates?.length > 0 &&
                  _jsxs('div', {
                    children: [
                      'Gates: ',
                      _jsx('span', {
                        className: 'text-xs',
                        children: decision.decision.gates.join(', '),
                      }),
                    ],
                  }),
                Array.isArray(decision?.decision?.reasons) &&
                  decision.decision.reasons.length > 0 &&
                  _jsxs('div', {
                    children: [
                      'Reasons:',
                      _jsx('ul', {
                        className: 'list-disc pl-5',
                        children: decision.decision.reasons.map((r, i) =>
                          _jsx('li', { children: r }, i),
                        ),
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
function Recipes() {
  const { useRecipes } = api();
  const { data } = useRecipes();
  return _jsxs('div', {
    className: 'space-y-3',
    children: [
      _jsx('h2', {
        className: 'text-lg font-semibold',
        children: 'Recipe Library',
      }),
      _jsx('div', {
        className: 'grid grid-cols-1 gap-3 md:grid-cols-3',
        children: data?.map((r) =>
          _jsxs(
            Card,
            {
              title: r.name,
              children: [
                _jsxs('div', {
                  className: 'text-xs text-slate-500',
                  children: ['v', r.version],
                }),
                _jsxs('div', {
                  className: 'mt-2 text-sm text-slate-700',
                  children: ['Verified: ', r.verified ? 'Yes' : 'No'],
                }),
              ],
            },
            r.id,
          ),
        ),
      }),
    ],
  });
}
function Observability() {
  const { useObservability } = api();
  const { data } = useObservability();
  const [tab, setTab] = React.useState('Dashboards');
  return _jsxs('div', {
    className: 'space-y-3',
    children: [
      _jsx('h2', {
        className: 'text-lg font-semibold',
        children: 'Observability & SLOs',
      }),
      _jsx('div', {
        className: 'flex gap-2 border-b',
        children: ['Dashboards', 'Traces', 'Logs', 'Alerts', 'SLOs'].map((t) =>
          _jsx(
            'button',
            {
              role: 'tab',
              'aria-selected': tab === t,
              className: [
                'rounded-t px-3 py-1.5 text-sm',
                tab === t
                  ? 'bg-white font-semibold text-slate-800 border border-b-transparent'
                  : 'text-slate-600 hover:bg-slate-100',
              ].join(' '),
              onClick: () => setTab(t),
              children: t,
            },
            t,
          ),
        ),
      }),
      _jsx(Card, {
        title: 'Golden Signals',
        children: _jsxs('ul', {
          className: 'grid grid-cols-2 gap-x-6 gap-y-2 text-sm',
          children: [
            _jsxs('li', {
              children: [
                'Latency p95: ',
                _jsxs('span', {
                  className: 'font-semibold',
                  children: [data?.latencyP95, ' ms'],
                }),
              ],
            }),
            _jsxs('li', {
              children: [
                'Error rate: ',
                _jsxs('span', {
                  className: 'font-semibold',
                  children: [data?.errorRate, '%'],
                }),
              ],
            }),
            _jsxs('li', {
              children: [
                'Throughput: ',
                _jsxs('span', {
                  className: 'font-semibold',
                  children: [data?.throughput, '/min'],
                }),
              ],
            }),
            _jsxs('li', {
              children: [
                'Queue depth: ',
                _jsx('span', {
                  className: 'font-semibold',
                  children: data?.queueDepth,
                }),
              ],
            }),
          ],
        }),
      }),
      _jsx(ServingLanePanel, {}),
      _jsx(ServingLaneTrends, {}),
      _jsx(SLOPanel, {}),
      _jsxs('div', {
        className: 'grid grid-cols-1 md:grid-cols-3 gap-3',
        children: [
          _jsx(GrafanaEmbed, { uidKey: 'overview' }),
          _jsx(GrafanaEmbed, { uidKey: 'slo' }),
          _jsx(GrafanaEmbed, { uidKey: 'cost' }),
        ],
      }),
      tab !== 'SLOs' &&
        _jsx(Card, {
          title: `Open in Grafana: ${tab}`,
          children: _jsxs('div', {
            className: 'text-sm text-slate-600',
            children: [
              'Use the top-right SLO panel link and switch dashboards to ',
              tab,
              '.',
            ],
          }),
        }),
    ],
  });
}
function Cost() {
  const { useCosts, getBudgets, putBudgets } = api();
  const { data } = useCosts();
  const [budget, setBudget] = React.useState(null);
  const [cap, setCap] = React.useState('');
  const [msg, setMsg] = React.useState(null);
  React.useEffect(() => {
    (async () => {
      try {
        const b = await getBudgets();
        setBudget(b);
        setCap(String(b?.cap ?? ''));
      } catch {}
    })();
  }, []);
  return _jsxs('div', {
    className: 'space-y-3',
    children: [
      _jsx('h2', {
        className: 'text-lg font-semibold',
        children: 'Costs & Budgets',
      }),
      _jsx(Card, {
        title: 'Spend',
        children: _jsxs('div', {
          className: 'text-sm text-slate-700',
          children: [
            'Today: $',
            data?.today,
            ' \u2022 This week: $',
            data?.week,
          ],
        }),
      }),
      _jsxs(Card, {
        title: 'Budgets',
        children: [
          _jsxs('div', {
            className: 'text-sm text-slate-700',
            children: [
              'Utilization: ',
              data?.utilization,
              '% \u2022 Hard cap: $',
              budget?.cap ?? data?.cap,
            ],
          }),
          _jsxs('div', {
            className: 'mt-2 flex items-center gap-2 text-sm',
            children: [
              _jsx('label', {
                className: 'text-slate-600',
                htmlFor: 'cap',
                children: 'Edit cap',
              }),
              _jsx('input', {
                id: 'cap',
                className: 'w-40 rounded border px-2 py-1',
                value: cap,
                onChange: (e) => setCap(e.target.value),
              }),
              _jsx('button', {
                className: 'rounded border px-2 py-1',
                onClick: async () => {
                  try {
                    const resp = await putBudgets({ cap: Number(cap) });
                    setBudget(resp);
                    setMsg('Saved');
                    setTimeout(() => setMsg(null), 1500);
                  } catch (e) {
                    setMsg(e?.message || 'Save failed');
                  }
                },
                children: 'Save',
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
    ],
  });
}
// CICD page moved to pages/CICD.tsx
function Tickets() {
  const { useTickets } = api();
  const { data } = useTickets();
  return _jsxs('div', {
    className: 'space-y-3',
    children: [
      _jsx('h2', {
        className: 'text-lg font-semibold',
        children: 'Tickets / Issues / Projects',
      }),
      _jsx('div', {
        className: 'overflow-hidden rounded-lg border bg-white',
        children: _jsxs('table', {
          className: 'w-full text-sm',
          children: [
            _jsx('thead', {
              className: 'bg-slate-50 text-left text-slate-500',
              children: _jsxs('tr', {
                children: [
                  _jsx('th', {
                    className: 'px-3 py-2 font-medium',
                    children: 'Issue',
                  }),
                  _jsx('th', {
                    className: 'px-3 py-2 font-medium',
                    children: 'Status',
                  }),
                  _jsx('th', {
                    className: 'px-3 py-2 font-medium',
                    children: 'Owner',
                  }),
                  _jsx('th', {
                    className: 'px-3 py-2 font-medium',
                    children: 'Linked Run',
                  }),
                ],
              }),
            }),
            _jsx('tbody', {
              children: data?.map((t) =>
                _jsxs(
                  'tr',
                  {
                    className: 'border-t hover:bg-slate-50',
                    children: [
                      _jsx('td', {
                        className: 'px-3 py-2 font-mono text-xs',
                        children: t.id,
                      }),
                      _jsx('td', {
                        className: 'px-3 py-2',
                        children: t.status,
                      }),
                      _jsx('td', { className: 'px-3 py-2', children: t.owner }),
                      _jsx('td', { className: 'px-3 py-2', children: t.runId }),
                    ],
                  },
                  t.id,
                ),
              ),
            }),
          ],
        }),
      }),
    ],
  });
}
function Admin() {
  return _jsxs('div', {
    className: 'space-y-3',
    children: [
      _jsx('h2', {
        className: 'text-lg font-semibold',
        children: 'Admin Studio',
      }),
      _jsx(Card, {
        title: 'Registry',
        children: _jsx('div', {
          className: 'text-sm text-slate-600',
          children:
            'Schema registry \u2022 Connectors \u2022 Feature Flags \u2022 Access (RBAC/ABAC) \u2022 Audit \u2022 Jobs',
        }),
      }),
    ],
  });
}
export default function MaestroApp() {
  // memoize API facade to keep hooks stable
  useMemo(() => api(), []);
  return _jsx(AuthProvider, {
    children: _jsx(BrowserRouter, {
      basename: '/maestro',
      children: _jsxs(Routes, {
        children: [
          _jsx(Route, {
            path: '/auth/callback',
            element: _jsx(AuthCallback, {}),
          }),
          _jsx(Route, { path: '/login', element: _jsx(AuthLogin, {}) }),
          ' ',
          _jsx(Route, {
            path: '/*',
            element: _jsx(ProtectedRoute, {
              children: _jsx(Shell, {
                children: _jsx(Suspense, {
                  fallback: _jsx(LoadingFallback, {}),
                  children: _jsxs(Routes, {
                    children: [
                      _jsx(Route, { path: '/', element: _jsx(ControlHub, {}) }),
                      _jsx(Route, { path: '/runs', element: _jsx(Runs, {}) }),
                      _jsx(Route, {
                        path: '/runs/:id',
                        element: _jsx(EnhancedRunDetail, {}),
                      }),
                      _jsx(Route, {
                        path: '/runs/:id/compare',
                        element: _jsx(CompareRun, {}),
                      }),
                      _jsx(Route, {
                        path: '/pipelines',
                        element: _jsx(Pipelines, {}),
                      }),
                      _jsx(Route, {
                        path: '/pipelines/:id',
                        element: _jsx(PipelineDetail, {}),
                      }),
                      _jsx(Route, {
                        path: '/autonomy',
                        element: _jsx(ProtectedRoute, {
                          roles: ['operator'],
                          children: _jsx(Autonomy, {}),
                        }),
                      }),
                      _jsx(Route, {
                        path: '/recipes',
                        element: _jsx(Recipes, {}),
                      }),
                      _jsx(Route, {
                        path: '/observability',
                        element: _jsx(EnhancedObservability, {}),
                      }),
                      _jsx(Route, {
                        path: '/tenants/observability',
                        element: _jsx(TenantObservability, {}),
                      }),
                      _jsx(Route, {
                        path: '/tenants/costs',
                        element: React.createElement(
                          require('./pages/TenantCosts').default,
                        ),
                      }),
                      _jsx(Route, { path: '/cost', element: _jsx(Cost, {}) }),
                      _jsx(Route, {
                        path: '/routing',
                        element: _jsx(ProtectedRoute, {
                          roles: ['operator'],
                          children: _jsx(EnhancedRoutingStudio, {}),
                        }),
                      }),
                      _jsx(Route, {
                        path: '/secrets',
                        element: _jsx(ProtectedRoute, {
                          roles: ['admin'],
                          children: _jsx(Secrets, {}),
                        }),
                      }),
                      _jsx(Route, {
                        path: '/ops/dlq/signatures',
                        element: _jsx(DLQSignatures, {}),
                      }),
                      _jsx(Route, {
                        path: '/ops/dlq/policy',
                        element: _jsx(ProtectedRoute, {
                          roles: ['operator'],
                          children: _jsx(DLQPolicy, {}),
                        }),
                      }),
                      _jsx(Route, {
                        path: '/ops/dlq/root',
                        element: React.createElement(
                          require('./pages/DLQRootCauses').default,
                        ),
                      }),
                      _jsx(Route, {
                        path: '/ops/dlq/sim',
                        element: _jsx(ProtectedRoute, {
                          roles: ['operator'],
                          children: React.createElement(
                            require('./pages/DLQSimulator').default,
                          ),
                        }),
                      }),
                      _jsx(Route, {
                        path: '/alertcenter',
                        element: _jsx(AlertCenter, {}),
                      }),
                      _jsx(Route, {
                        path: '/providers/rates',
                        element: _jsx(ProtectedRoute, {
                          roles: ['operator'],
                          children: _jsx(ProviderRates, {}),
                        }),
                      }),
                      _jsx(Route, { path: '/cicd', element: _jsx(CICD, {}) }),
                      _jsx(Route, {
                        path: '/tickets',
                        element: _jsx(Tickets, {}),
                      }),
                      _jsx(Route, {
                        path: '/admin',
                        element: _jsx(ProtectedRoute, {
                          roles: ['admin'],
                          children: _jsx(Admin, {}),
                        }),
                      }),
                      _jsx(Route, {
                        path: '*',
                        element: _jsx(Navigate, { to: '/', replace: true }),
                      }),
                    ],
                  }),
                }),
              }),
            }),
          }),
        ],
      }),
    }),
  });
}
function GrafanaEmbed({ uidKey }) {
  const cfg = window.__MAESTRO_CFG__ || {};
  const uids = cfg.grafanaDashboards || {
    overview: 'maestro-overview',
    slo: 'maestro-slo',
    cost: 'maestro-cost',
  };
  const GrafanaPanel = require('./components/GrafanaPanel').default;
  return _jsx(GrafanaPanel, { uid: uids[uidKey] });
}
function ServingLanePanel() {
  const { getServingMetrics } = api();
  const [m, setM] = React.useState(null);
  React.useEffect(() => {
    (async () => {
      try {
        const r = await getServingMetrics();
        setM(r);
      } catch {}
    })();
  }, []);
  return _jsx(Card, {
    title: 'Serving Lane (vLLM/Ray)',
    children: !m
      ? _jsx('div', {
          className: 'text-sm text-slate-500',
          children: 'Loading\u2026',
        })
      : _jsxs('div', {
          className: 'text-sm grid grid-cols-1 md:grid-cols-3 gap-3',
          children: [
            _jsxs('div', {
              className: 'rounded border p-2',
              children: [
                _jsx('div', {
                  className: 'text-xs text-slate-500',
                  children: 'Queue depth',
                }),
                _jsx('div', {
                  className: 'text-2xl font-semibold',
                  children: m.summary?.qDepth ?? '—',
                }),
              ],
            }),
            _jsxs('div', {
              className: 'rounded border p-2',
              children: [
                _jsx('div', {
                  className: 'text-xs text-slate-500',
                  children: 'Batch size',
                }),
                _jsx('div', {
                  className: 'text-2xl font-semibold',
                  children: m.summary?.batch ?? '—',
                }),
              ],
            }),
            _jsxs('div', {
              className: 'rounded border p-2',
              children: [
                _jsx('div', {
                  className: 'text-xs text-slate-500',
                  children: 'KV hit ratio',
                }),
                _jsxs('div', {
                  className: 'text-2xl font-semibold',
                  children: [Math.round((m.summary?.kvHit ?? 0) * 100), '%'],
                }),
              ],
            }),
          ],
        }),
  });
}
