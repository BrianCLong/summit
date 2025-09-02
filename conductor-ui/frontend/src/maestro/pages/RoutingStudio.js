import { jsx as _jsx, jsxs as _jsxs } from 'react/jsx-runtime';
import React from 'react';
import { api } from '../api';
export default function RoutingStudio() {
  const {
    routingPreview,
    getRoutingPins,
    putRoutingPin,
    deleteRoutingPin,
    postPolicyExplain,
    getPinHistory,
    postRollback,
    getWatchdogConfigs,
    putWatchdogConfigs,
    getWatchdogEvents,
  } = api();
  const [task, setTask] = React.useState('Build and package IntelGraph');
  const [latency, setLatency] = React.useState(3000);
  const [resp, setResp] = React.useState(null);
  const [err, setErr] = React.useState(null);
  const [pins, setPins] = React.useState({});
  const [route, setRoute] = React.useState('');
  const [model, setModel] = React.useState('');
  const [note, setNote] = React.useState('');
  const refreshPins = React.useCallback(() => {
    getRoutingPins()
      .then(setPins)
      .catch(() => setPins({}));
  }, [getRoutingPins]);
  React.useEffect(() => {
    refreshPins();
  }, []);
  return _jsxs('div', {
    className: 'space-y-3',
    children: [
      _jsx('h2', { className: 'text-lg font-semibold', children: 'Routing Studio' }),
      _jsxs('section', {
        className: 'rounded border bg-white p-3',
        children: [
          _jsx('div', {
            className: 'mb-2 text-sm font-semibold text-slate-700',
            children: 'Dry-run simulation',
          }),
          _jsx('div', {
            className: 'mb-2 flex items-center gap-2',
            children: _jsx('textarea', {
              className: 'h-24 w-full rounded border p-2',
              value: task,
              onChange: (e) => setTask(e.target.value),
            }),
          }),
          _jsxs('div', {
            className: 'mb-2 flex items-center gap-2 text-sm',
            children: [
              _jsx('label', { htmlFor: 'latency', children: 'Max Latency (ms)' }),
              _jsx('input', {
                id: 'latency',
                className: 'w-32 rounded border px-2 py-1',
                type: 'number',
                value: latency,
                onChange: (e) => setLatency(Number(e.target.value)),
              }),
              _jsx('button', {
                className: 'rounded border px-2 py-1',
                onClick: async () => {
                  try {
                    setErr(null);
                    const r = await routingPreview({ task, maxLatencyMs: latency });
                    setResp(r);
                  } catch (e) {
                    setErr(e?.message || 'Failed');
                  }
                },
                children: 'Preview',
              }),
            ],
          }),
          err && _jsx('div', { className: 'text-sm text-red-700', children: err }),
          resp &&
            _jsxs('div', {
              className: 'text-sm',
              children: [
                _jsxs('div', {
                  children: [
                    'Decision: ',
                    _jsx('span', {
                      className: 'font-semibold',
                      children: resp.decision?.model || resp.decision?.expert || 'unknown',
                    }),
                    ' \u2022 conf ',
                    resp.decision?.confidence ?? '—',
                  ],
                }),
                _jsx('div', { className: 'mt-2 text-slate-700', children: 'Candidates' }),
                _jsx('ul', {
                  className: 'list-disc pl-5',
                  children: (resp.candidates || []).map((c, i) =>
                    _jsxs(
                      'li',
                      { children: [c.model || c.expert, ': ', c.score || c.confidence] },
                      i,
                    ),
                  ),
                }),
              ],
            }),
        ],
      }),
      _jsxs('section', {
        className: 'rounded border bg-white p-3',
        'aria-label': 'Routing pins',
        children: [
          _jsx('div', {
            className: 'mb-2 text-sm font-semibold text-slate-700',
            children: 'Pin route to model',
          }),
          _jsxs('div', {
            className: 'grid grid-cols-1 gap-3 md:grid-cols-3',
            children: [
              _jsx('input', {
                className: 'rounded border px-2 py-1',
                placeholder: 'Route',
                'aria-label': 'Route',
                value: route,
                onChange: (e) => setRoute(e.target.value),
              }),
              _jsx('input', {
                className: 'rounded border px-2 py-1',
                placeholder: 'Model',
                'aria-label': 'Model',
                value: model,
                onChange: (e) => setModel(e.target.value),
              }),
              _jsx('input', {
                className: 'rounded border px-2 py-1',
                placeholder: 'Audit note',
                'aria-label': 'Audit note',
                value: note,
                onChange: (e) => setNote(e.target.value),
              }),
            ],
          }),
          _jsx('div', {
            className: 'mt-2 flex gap-2',
            children: _jsx('button', {
              className: 'rounded border px-2 py-1 text-sm',
              onClick: async () => {
                const ex = await postPolicyExplain({
                  input: { action: 'route.pin', route, model, note },
                });
                const allow = !!ex?.allowed || !!ex?.result?.allow;
                if (!allow) {
                  const proceed = window.confirm(
                    'Policy would DENY. Proceed anyway (will be audited)?',
                  );
                  if (!proceed) return;
                }
                await putRoutingPin({ route, model, note });
                setRoute('');
                setModel('');
                setNote('');
                refreshPins();
              },
              disabled: !route || !model,
              children: 'Pin',
            }),
          }),
          _jsx('div', {
            className: 'mt-3 rounded border',
            children: _jsxs('table', {
              className: 'w-full text-sm',
              children: [
                _jsx('thead', {
                  children: _jsxs('tr', {
                    children: [
                      _jsx('th', { className: 'px-2 py-1 text-left', children: 'Route' }),
                      _jsx('th', { className: 'px-2 py-1 text-left', children: 'Model' }),
                      _jsx('th', { className: 'px-2 py-1 text-left', children: 'Actions' }),
                    ],
                  }),
                }),
                _jsxs('tbody', {
                  children: [
                    Object.entries(pins).map(([r, m]) =>
                      _jsxs(
                        'tr',
                        {
                          className: 'border-t',
                          children: [
                            _jsx('td', { className: 'px-2 py-1', children: r }),
                            _jsx('td', { className: 'px-2 py-1', children: m }),
                            _jsx('td', {
                              className: 'px-2 py-1',
                              children: _jsx('button', {
                                className: 'text-blue-600 underline',
                                onClick: async () => {
                                  await deleteRoutingPin(r);
                                  refreshPins();
                                },
                                children: 'Unpin',
                              }),
                            }),
                          ],
                        },
                        r,
                      ),
                    ),
                    !Object.keys(pins).length &&
                      _jsx('tr', {
                        children: _jsx('td', {
                          colSpan: 3,
                          className: 'p-3 text-center text-slate-500',
                          children: 'No pins',
                        }),
                      }),
                  ],
                }),
              ],
            }),
          }),
        ],
      }),
      _jsx(AutoRollbackSection, {
        apiFns: {
          getPinHistory,
          postRollback,
          getWatchdogConfigs,
          putWatchdogConfigs,
          getWatchdogEvents,
        },
      }),
    ],
  });
}
function AutoRollbackSection({ apiFns }) {
  const [route, setRoute] = React.useState('codegen');
  const [cfg, setCfg] = React.useState({ enabled: false, routes: {} });
  const [events, setEvents] = React.useState([]);
  const cur = cfg.routes?.[route] || { enabled: false, maxCostZ: 2.0, maxDLQ10m: 10 };
  const refresh = async () => {
    const c = await apiFns.getWatchdogConfigs();
    setCfg(c);
    const e = await apiFns.getWatchdogEvents();
    setEvents(e.items || []);
  };
  React.useEffect(() => {
    refresh();
  }, []);
  async function save() {
    const next = { ...cfg, enabled: cfg.enabled, routes: { ...(cfg.routes || {}), [route]: cur } };
    await apiFns.putWatchdogConfigs(next);
    await refresh();
  }
  const [history, setHistory] = React.useState([]);
  React.useEffect(() => {
    apiFns.getPinHistory(route).then((r) => setHistory(r.history || []));
  }, [route]);
  return _jsxs('div', {
    className: 'space-y-3 rounded-2xl border bg-white p-3',
    children: [
      _jsx('h2', { className: 'font-medium', children: 'Auto-Rollback Watchdog' }),
      _jsxs('label', {
        className: 'flex items-center gap-2',
        children: [
          _jsx('input', {
            type: 'checkbox',
            checked: !!cfg.enabled,
            onChange: (e) => setCfg((x) => ({ ...x, enabled: e.target.checked })),
          }),
          ' Enable watchdog',
        ],
      }),
      _jsxs('div', {
        className: 'grid grid-cols-1 gap-3 md:grid-cols-4',
        children: [
          _jsx('input', {
            className: 'rounded border px-2 py-1',
            'aria-label': 'Route',
            value: route,
            onChange: (e) => setRoute(e.target.value),
          }),
          _jsxs('label', {
            className: 'flex items-center gap-2',
            children: [
              'Enabled',
              _jsx('input', {
                type: 'checkbox',
                checked: !!cur.enabled,
                onChange: (e) => {
                  cur.enabled = e.target.checked;
                  setCfg({ ...cfg });
                },
              }),
            ],
          }),
          _jsxs('label', {
            className: 'flex items-center gap-2',
            children: [
              'Max cost z',
              _jsx('input', {
                type: 'number',
                className: 'w-24 rounded border px-2 py-1',
                value: cur.maxCostZ,
                onChange: (e) => {
                  cur.maxCostZ = Number(e.target.value);
                  setCfg({ ...cfg });
                },
              }),
            ],
          }),
          _jsxs('label', {
            className: 'flex items-center gap-2',
            children: [
              'Max DLQ (10m)',
              _jsx('input', {
                type: 'number',
                className: 'w-24 rounded border px-2 py-1',
                value: cur.maxDLQ10m,
                onChange: (e) => {
                  cur.maxDLQ10m = Number(e.target.value);
                  setCfg({ ...cfg });
                },
              }),
            ],
          }),
        ],
      }),
      _jsxs('div', {
        className: 'flex gap-2',
        children: [
          _jsx('button', {
            className: 'rounded bg-blue-600 px-3 py-2 text-white',
            onClick: save,
            children: 'Save',
          }),
          _jsx('button', {
            className: 'rounded border px-3 py-2',
            onClick: () => apiFns.postRollback(route, 'manual rollback'),
            children: 'Rollback now',
          }),
        ],
      }),
      _jsxs('div', {
        className: 'rounded-2xl border p-3',
        children: [
          _jsxs('div', {
            className: 'mb-2 text-sm font-medium',
            children: ['Pin history (', route, ')'],
          }),
          _jsxs('table', {
            className: 'w-full text-sm',
            children: [
              _jsx('thead', {
                children: _jsxs('tr', {
                  children: [
                    _jsx('th', { children: 'Time' }),
                    _jsx('th', { children: 'Action' }),
                    _jsx('th', { children: 'From' }),
                    _jsx('th', { children: 'To' }),
                    _jsx('th', { children: 'Note' }),
                  ],
                }),
              }),
              _jsxs('tbody', {
                children: [
                  history.map((h) =>
                    _jsxs(
                      'tr',
                      {
                        children: [
                          _jsx('td', { children: new Date(h.ts).toLocaleString() }),
                          _jsx('td', { children: h.action }),
                          _jsx('td', { children: h.prevModel || '-' }),
                          _jsx('td', { children: h.newModel }),
                          _jsx('td', { children: h.note || '-' }),
                        ],
                      },
                      h.ts,
                    ),
                  ),
                  !history.length &&
                    _jsx('tr', {
                      children: _jsx('td', {
                        colSpan: 5,
                        className: 'p-3 text-center text-gray-500',
                        children: 'No history',
                      }),
                    }),
                ],
              }),
            ],
          }),
        ],
      }),
      _jsxs('div', {
        className: 'rounded-2xl border p-3',
        children: [
          _jsx('div', { className: 'mb-2 text-sm font-medium', children: 'Watchdog events' }),
          _jsxs('table', {
            className: 'w-full text-sm',
            children: [
              _jsx('thead', {
                children: _jsxs('tr', {
                  children: [
                    _jsx('th', { children: 'Time' }),
                    _jsx('th', { children: 'Route' }),
                    _jsx('th', { children: 'Kind' }),
                    _jsx('th', { children: 'Reason' }),
                  ],
                }),
              }),
              _jsxs('tbody', {
                children: [
                  (events || []).map((e) =>
                    _jsxs(
                      'tr',
                      {
                        children: [
                          _jsx('td', { children: new Date(e.ts).toLocaleString() }),
                          _jsx('td', { children: e.route }),
                          _jsx('td', { children: e.kind }),
                          _jsx('td', { children: e.reason }),
                        ],
                      },
                      e.ts,
                    ),
                  ),
                  !events.length &&
                    _jsx('tr', {
                      children: _jsx('td', {
                        colSpan: 4,
                        className: 'p-3 text-center text-gray-500',
                        children: 'No events',
                      }),
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
