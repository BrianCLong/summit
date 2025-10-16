import { jsx as _jsx, jsxs as _jsxs } from 'react/jsx-runtime';
import { useEffect, useMemo, useState } from 'react';
import { api } from '../api';
import { canonSig } from '../utils/canonSig';
import PlaybookDialog from '../components/PlaybookDialog';
export default function AlertCenter() {
  const { getAlertCenterEvents, getIncidents } = api();
  const [since, setSince] = useState(6 * 3600 * 1000);
  const [filterType, setFilterType] = useState('all');
  const [filterSev, setFilterSev] = useState('all');
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(false);
  const [mode, setMode] = useState('events');
  const [inc, setInc] = useState([]);
  const [pb, setPb] = useState(null);
  const refresh = () => {
    setLoading(true);
    getAlertCenterEvents({ sinceMs: since })
      .then((r) => setRows(r.events || []))
      .finally(() => setLoading(false));
  };
  useEffect(() => {
    refresh();
  }, [since]);
  useEffect(() => {
    if (mode === 'incidents') {
      getIncidents({ sinceMs: since }).then((r) => setInc(r.incidents || []));
    }
  }, [mode, since]);
  const filtered = useMemo(
    () =>
      rows.filter(
        (e) =>
          (filterType === 'all' || e.type === filterType) &&
          (filterSev === 'all' || e.severity === filterSev),
      ),
    [rows, filterType, filterSev],
  );
  return _jsxs('section', {
    className: 'space-y-3 p-4',
    'aria-label': 'Alert Center',
    children: [
      _jsxs('div', {
        className: 'flex items-center justify-between',
        children: [
          _jsx('h1', {
            className: 'text-xl font-semibold',
            children: 'Alert Center',
          }),
          _jsxs('div', {
            className: 'flex gap-2',
            children: [
              _jsx('button', {
                className: `rounded px-2 py-1 text-sm ${mode === 'events' ? 'bg-slate-800 text-white' : 'border'}`,
                onClick: () => setMode('events'),
                children: 'Events',
              }),
              _jsx('button', {
                className: `rounded px-2 py-1 text-sm ${mode === 'incidents' ? 'bg-slate-800 text-white' : 'border'}`,
                onClick: () => setMode('incidents'),
                children: 'Incidents',
              }),
              _jsx('button', {
                className: 'rounded border px-2 py-1 text-sm',
                onClick: refresh,
                disabled: loading,
                children: 'Refresh',
              }),
            ],
          }),
        ],
      }),
      _jsxs('div', {
        className: 'flex items-end gap-3',
        children: [
          _jsxs('label', {
            className: 'text-sm',
            children: [
              'Window\u00A0',
              _jsxs('select', {
                className: 'rounded border px-2 py-1',
                value: since,
                onChange: (e) => setSince(Number(e.target.value)),
                children: [
                  _jsx('option', { value: 3600000, children: '1h' }),
                  _jsx('option', { value: 3 * 3600000, children: '3h' }),
                  _jsx('option', { value: 6 * 3600000, children: '6h' }),
                  _jsx('option', { value: 24 * 3600000, children: '24h' }),
                ],
              }),
            ],
          }),
          _jsxs('label', {
            className: 'text-sm',
            children: [
              'Type\u00A0',
              _jsxs('select', {
                className: 'rounded border px-2 py-1',
                value: filterType,
                onChange: (e) => setFilterType(e.target.value),
                children: [
                  _jsx('option', { value: 'all', children: 'All' }),
                  _jsx('option', { value: 'ci', children: 'CI' }),
                  _jsx('option', { value: 'slo', children: 'SLO' }),
                  _jsx('option', { value: 'forecast', children: 'Forecast' }),
                ],
              }),
            ],
          }),
          _jsxs('label', {
            className: 'text-sm',
            children: [
              'Severity\u00A0',
              _jsxs('select', {
                className: 'rounded border px-2 py-1',
                value: filterSev,
                onChange: (e) => setFilterSev(e.target.value),
                children: [
                  _jsx('option', { value: 'all', children: 'All' }),
                  _jsx('option', { value: 'info', children: 'Info' }),
                  _jsx('option', { value: 'warn', children: 'Warn' }),
                  _jsx('option', { value: 'page', children: 'Page' }),
                ],
              }),
            ],
          }),
        ],
      }),
      mode === 'events'
        ? _jsx('div', {
            role: 'region',
            'aria-live': 'polite',
            className: 'rounded-2xl border',
            children: _jsxs('table', {
              className: 'w-full text-sm',
              children: [
                _jsx('thead', {
                  children: _jsxs('tr', {
                    children: [
                      _jsx('th', { children: 'Time' }),
                      _jsx('th', { children: 'Severity' }),
                      _jsx('th', { children: 'Type' }),
                      _jsx('th', { children: 'Title' }),
                      _jsx('th', { children: 'Link' }),
                    ],
                  }),
                }),
                _jsxs('tbody', {
                  children: [
                    filtered.map((e) =>
                      _jsxs(
                        'tr',
                        {
                          children: [
                            _jsx('td', {
                              children: new Date(e.ts).toLocaleString(),
                            }),
                            _jsx('td', {
                              children: _jsx('span', {
                                className: `rounded px-2 py-0.5 text-white text-xs ${e.severity === 'page' ? 'bg-red-600' : e.severity === 'warn' ? 'bg-amber-500' : 'bg-slate-500'}`,
                                children: String(e.severity).toUpperCase(),
                              }),
                            }),
                            _jsx('td', {
                              children: _jsx('span', {
                                className: 'rounded border px-2 py-0.5 text-xs',
                                children: e.type,
                              }),
                            }),
                            _jsxs('td', {
                              children: [
                                e.title,
                                _jsx('button', {
                                  className: 'ml-2 text-blue-600 underline',
                                  onClick: () => {
                                    const provider =
                                      e.type === 'forecast'
                                        ? 'llm'
                                        : e.type === 'ci'
                                          ? 'ci'
                                          : 'other';
                                    setPb({
                                      open: true,
                                      sig: canonSig(e.title || ''),
                                      provider,
                                    });
                                  },
                                  children: 'Playbook',
                                }),
                              ],
                            }),
                            _jsx('td', {
                              children: e.link
                                ? _jsx('a', {
                                    href: e.link,
                                    target: '_blank',
                                    rel: 'noreferrer',
                                    className: 'text-blue-600 underline',
                                    children: 'open',
                                  })
                                : '-',
                            }),
                          ],
                        },
                        e.id,
                      ),
                    ),
                    !filtered.length &&
                      _jsx('tr', {
                        children: _jsx('td', {
                          colSpan: 5,
                          className: 'p-3 text-center text-gray-500',
                          children: loading ? 'Loading…' : 'No events',
                        }),
                      }),
                  ],
                }),
              ],
            }),
          })
        : _jsx('div', {
            role: 'region',
            'aria-live': 'polite',
            className: 'rounded-2xl border',
            children: _jsxs('table', {
              className: 'w-full text-sm',
              children: [
                _jsx('thead', {
                  children: _jsxs('tr', {
                    children: [
                      _jsx('th', { children: 'Time window' }),
                      _jsx('th', { children: 'Tenant' }),
                      _jsx('th', { children: 'Severity' }),
                      _jsx('th', { children: 'Events' }),
                      _jsx('th', { children: 'Details' }),
                    ],
                  }),
                }),
                _jsxs('tbody', {
                  children: [
                    inc.map((g) =>
                      _jsxs(
                        'tr',
                        {
                          children: [
                            _jsxs('td', {
                              children: [
                                new Date(g.startTs).toLocaleTimeString(),
                                '\u2013',
                                new Date(g.endTs).toLocaleTimeString(),
                              ],
                            }),
                            _jsx('td', { children: g.tenant }),
                            _jsx('td', {
                              children: _jsx('span', {
                                className: `rounded px-2 py-0.5 text-white text-xs ${g.severity === 'page' ? 'bg-red-600' : g.severity === 'warn' ? 'bg-amber-500' : 'bg-slate-500'}`,
                                children: String(g.severity).toUpperCase(),
                              }),
                            }),
                            _jsx('td', { children: g.count }),
                            _jsx('td', {
                              children: _jsxs('details', {
                                children: [
                                  _jsx('summary', {
                                    className:
                                      'cursor-pointer text-blue-600 underline',
                                    children: 'view',
                                  }),
                                  _jsx('ul', {
                                    className: 'ml-6 list-disc',
                                    children: g.events.map((e) =>
                                      _jsxs(
                                        'li',
                                        {
                                          children: [
                                            String(e.type).toUpperCase(),
                                            ' \u2014 ',
                                            e.title,
                                            ' ',
                                            e.link
                                              ? _jsx('a', {
                                                  className:
                                                    'text-blue-600 underline',
                                                  href: e.link,
                                                  target: '_blank',
                                                  rel: 'noreferrer',
                                                  children: '(open)',
                                                })
                                              : null,
                                          ],
                                        },
                                        e.id,
                                      ),
                                    ),
                                  }),
                                ],
                              }),
                            }),
                          ],
                        },
                        g.id,
                      ),
                    ),
                    !inc.length &&
                      _jsx('tr', {
                        children: _jsx('td', {
                          colSpan: 5,
                          className: 'p-3 text-center text-gray-500',
                          children: 'No incidents',
                        }),
                      }),
                  ],
                }),
              ],
            }),
          }),
      pb?.open &&
        _jsx(PlaybookDialog, {
          open: true,
          onClose: () => setPb(null),
          sig: pb.sig,
          providerGuess: pb.provider,
        }),
    ],
  });
}
