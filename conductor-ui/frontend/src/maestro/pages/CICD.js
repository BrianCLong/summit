import { jsx as _jsx, jsxs as _jsxs } from 'react/jsx-runtime';
import { useEffect, useState } from 'react';
import CiSummary from '../components/CiSummary';
import RefreshIcon from '@mui/icons-material/Refresh';
import { IconButton, MenuItem, Select, TextField } from '@mui/material';
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  Legend,
} from 'recharts';
import { api } from '../api';
function setQuery(params) {
  const url = new URL(location.href);
  Object.entries(params).forEach(([k, v]) => {
    if (v === undefined || v === '') url.searchParams.delete(k);
    else url.searchParams.set(k, String(v));
  });
  history.replaceState(
    null,
    '',
    `${url.pathname}${url.search}${location.hash}`,
  );
}
export default function CICD() {
  const { getCIAnnotationsGlobal } = api();
  const url = new URL(location.href);
  const [level, setLevel] = useState(url.searchParams.get('level') || 'all');
  const [repo, setRepo] = useState(url.searchParams.get('repo') || '');
  const [since, setSince] = useState(
    Number(url.searchParams.get('since') || 24 * 3600 * 1000),
  );
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(false);
  const [trends, setTrends] = useState([]);
  const refresh = () => {
    setLoading(true);
    getCIAnnotationsGlobal({
      sinceMs: since,
      level: level === 'all' ? undefined : level,
      repo: repo || undefined,
    })
      .then((r) => setRows(r.annotations || []))
      .finally(() => setLoading(false));
  };
  useEffect(() => {
    setQuery({ level, repo, since });
    refresh();
    // fetch trends
    (async () => {
      try {
        const r = await api().getCITrends({
          sinceMs: since,
          stepMs: 60 * 60 * 1000,
        });
        setTrends(
          (r.buckets || []).map((b) => ({
            time: new Date(b.ts).toLocaleTimeString(),
            ...b,
          })),
        );
      } catch {}
    })();
  }, [level, repo, since]);
  const link = (a) =>
    a.url
      ? a.url
      : a.repo && a.sha
        ? `https://github.com/${a.repo}/commit/${a.sha}`
        : undefined;
  const pathCol = (a) =>
    a.path ? `${a.path}${a.startLine ? `:${a.startLine}` : ''}` : '-';
  return _jsxs('section', {
    className: 'space-y-3 p-4',
    'aria-label': 'CICD annotations',
    children: [
      _jsxs('div', {
        className: 'flex items-center justify-between',
        children: [
          _jsx('h1', {
            className: 'text-xl font-semibold',
            children: 'CI Annotations',
          }),
          _jsx(IconButton, {
            'aria-label': 'Refresh',
            onClick: refresh,
            disabled: loading,
            children: _jsx(RefreshIcon, {}),
          }),
        ],
      }),
      _jsx(CiSummary, { annotations: rows }),
      _jsxs('div', {
        className: 'rounded-2xl border p-3',
        children: [
          _jsx('div', {
            className: 'mb-2 text-sm text-gray-600',
            children: 'CI annotations trend',
          }),
          _jsx('div', {
            style: { height: 220 },
            children: _jsx(ResponsiveContainer, {
              children: _jsxs(AreaChart, {
                data: trends,
                children: [
                  _jsx(XAxis, { dataKey: 'time', hide: true }),
                  _jsx(YAxis, { allowDecimals: false }),
                  _jsx(Tooltip, {}),
                  _jsx(Legend, {}),
                  _jsx(Area, { dataKey: 'failure', name: 'Failures' }),
                  _jsx(Area, { dataKey: 'warning', name: 'Warnings' }),
                  _jsx(Area, { dataKey: 'notice', name: 'Notices' }),
                ],
              }),
            }),
          }),
        ],
      }),
      _jsxs('div', {
        className: 'flex items-end gap-3',
        children: [
          _jsxs(Select, {
            value: level,
            onChange: (e) => setLevel(e.target.value),
            size: 'small',
            'aria-label': 'Level filter',
            children: [
              _jsx(MenuItem, { value: 'all', children: 'All' }),
              _jsx(MenuItem, { value: 'notice', children: 'Notice' }),
              _jsx(MenuItem, { value: 'warning', children: 'Warning' }),
              _jsx(MenuItem, { value: 'failure', children: 'Failure' }),
            ],
          }),
          _jsx(TextField, {
            size: 'small',
            label: 'Repo (owner/name)',
            value: repo,
            onChange: (e) => setRepo(e.target.value),
          }),
          _jsxs(Select, {
            value: since,
            onChange: (e) => setSince(Number(e.target.value)),
            size: 'small',
            'aria-label': 'Since filter',
            children: [
              _jsx(MenuItem, { value: 3600000, children: 'Last 1h' }),
              _jsx(MenuItem, { value: 6 * 3600000, children: 'Last 6h' }),
              _jsx(MenuItem, { value: 24 * 3600000, children: 'Last 24h' }),
              _jsx(MenuItem, { value: 7 * 24 * 3600000, children: 'Last 7d' }),
            ],
          }),
        ],
      }),
      _jsx('div', {
        role: 'region',
        'aria-live': 'polite',
        'aria-relevant': 'additions text',
        children: _jsxs('table', {
          className: 'w-full border text-sm',
          children: [
            _jsx('thead', {
              children: _jsxs('tr', {
                children: [
                  _jsx('th', { children: 'Time' }),
                  _jsx('th', { children: 'Level' }),
                  _jsx('th', { children: 'Repo' }),
                  _jsx('th', { children: 'Run' }),
                  _jsx('th', { children: 'Path' }),
                  _jsx('th', { children: 'Message' }),
                ],
              }),
            }),
            _jsxs('tbody', {
              children: [
                rows.map((a) =>
                  _jsxs(
                    'tr',
                    {
                      children: [
                        _jsx('td', {
                          children: new Date(a.ts).toLocaleString(),
                        }),
                        _jsx('td', { children: a.level }),
                        _jsx('td', { children: a.repo || '-' }),
                        _jsx('td', {
                          children: _jsx('a', {
                            href: `/maestro/runs/${a.runId}`,
                            className: 'text-blue-600 underline',
                            children: a.runId.slice(0, 8),
                          }),
                        }),
                        _jsx('td', { children: pathCol(a) }),
                        _jsx('td', {
                          children: link(a)
                            ? _jsx('a', {
                                href: link(a),
                                target: '_blank',
                                rel: 'noreferrer',
                                className: 'text-blue-600 underline',
                                children: a.message,
                              })
                            : a.message,
                        }),
                      ],
                    },
                    a.id,
                  ),
                ),
                !rows.length &&
                  _jsx('tr', {
                    children: _jsx('td', {
                      colSpan: 6,
                      className: 'p-4 text-center text-gray-500',
                      children: loading ? 'Loading…' : 'No annotations',
                    }),
                  }),
              ],
            }),
          ],
        }),
      }),
    ],
  });
}
