import { jsx as _jsx, jsxs as _jsxs } from 'react/jsx-runtime';
import { useState, useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../api';
import { getMaestroConfig } from '../config';
const statusColors = {
  queued: 'bg-slate-100 text-slate-800',
  running: 'bg-blue-100 text-blue-800',
  succeeded: 'bg-green-100 text-green-800',
  failed: 'bg-red-100 text-red-800',
  cancelled: 'bg-yellow-100 text-yellow-800',
};
const statusIcons = {
  queued: '⏳',
  running: '▶️',
  succeeded: '✅',
  failed: '❌',
  cancelled: '⏹️',
};
function RunRow({ run, compact = false }) {
  const [isExpanded, setIsExpanded] = useState(false);
  return _jsxs('tr', {
    className: 'border-t hover:bg-slate-50',
    children: [
      _jsxs('td', {
        className: 'px-3 py-2',
        children: [
          _jsxs('div', {
            className: 'flex items-center gap-2',
            children: [
              _jsx('button', {
                onClick: () => setIsExpanded(!isExpanded),
                className: 'text-slate-400 hover:text-slate-600',
                'aria-label': 'Expand run details',
                children: isExpanded ? '▼' : '▶',
              }),
              _jsx('div', {
                className: 'font-mono text-xs',
                children: _jsx(Link, {
                  className: 'text-indigo-700 hover:underline',
                  to: `/maestro/runs/${run.id}`,
                  children: run.id,
                }),
              }),
            ],
          }),
          isExpanded &&
            !compact &&
            _jsxs('div', {
              className: 'mt-2 ml-6 text-xs text-slate-600',
              children: [
                _jsxs('div', {
                  children: [
                    'Started: ',
                    new Date(run.startedAt).toLocaleString(),
                  ],
                }),
                run.endedAt &&
                  _jsxs('div', {
                    children: [
                      'Ended: ',
                      new Date(run.endedAt).toLocaleString(),
                    ],
                  }),
                run.traceId &&
                  _jsxs('div', { children: ['Trace: ', run.traceId] }),
                _jsxs('div', {
                  children: ['Artifacts: ', run.artifacts?.length || 0],
                }),
              ],
            }),
        ],
      }),
      _jsx('td', {
        className: 'px-3 py-2',
        children: _jsx(Link, {
          to: `/maestro/pipelines/${run.pipelineId}`,
          className: 'text-slate-900 hover:text-indigo-600',
          children: run.pipelineId,
        }),
      }),
      _jsx('td', {
        className: 'px-3 py-2',
        children: _jsxs('div', {
          className: 'flex items-center gap-2',
          children: [
            _jsx('span', {
              className: 'text-sm',
              children: statusIcons[run.status],
            }),
            _jsx('span', {
              className: `rounded px-2 py-0.5 text-xs font-medium ${statusColors[run.status]}`,
              children: run.status,
            }),
            run.status === 'running' &&
              _jsx('div', {
                className: 'h-1 w-1 rounded-full bg-blue-500 animate-pulse',
              }),
          ],
        }),
      }),
      _jsxs('td', {
        className: 'px-3 py-2',
        children: [
          _jsx('div', {
            className: 'text-sm',
            children: run.durationMs
              ? `${Math.round(run.durationMs / 1000)}s`
              : '—',
          }),
          isExpanded &&
            run.status === 'running' &&
            _jsxs('div', {
              className: 'text-xs text-slate-500',
              children: [
                'Running for ',
                Math.round(
                  (Date.now() - new Date(run.startedAt).getTime()) / 1000,
                ),
                's',
              ],
            }),
        ],
      }),
      _jsxs('td', {
        className: 'px-3 py-2',
        children: [
          _jsx('div', {
            className: 'text-sm',
            children:
              typeof run.cost === 'object'
                ? `$${run.cost.total || '0.00'}`
                : `$${run.cost || '0.00'}`,
          }),
          isExpanded &&
            typeof run.cost === 'object' &&
            _jsxs('div', {
              className: 'text-xs text-slate-500',
              children: [
                'Compute: $',
                run.cost.compute || '0.00',
                ' \u2022 Models: $',
                run.cost.models || '0.00',
              ],
            }),
        ],
      }),
      _jsxs('td', {
        className: 'px-3 py-2',
        children: [
          _jsx('div', {
            className: 'text-xs text-slate-600',
            children: run.env,
          }),
          run.commit &&
            _jsx('div', {
              className: 'text-xs font-mono text-slate-500',
              children: run.commit.slice(0, 7),
            }),
        ],
      }),
      !compact &&
        _jsx('td', {
          className: 'px-3 py-2',
          children: _jsxs('div', {
            className: 'flex gap-1',
            children: [
              _jsx(Link, {
                to: `/maestro/runs/${run.id}`,
                className:
                  'rounded px-2 py-1 text-xs text-indigo-600 hover:bg-indigo-50',
                children: 'View',
              }),
              run.status === 'running' &&
                _jsx('button', {
                  className:
                    'rounded px-2 py-1 text-xs text-slate-600 hover:bg-slate-100',
                  children: 'Pause',
                }),
              run.status === 'failed' &&
                _jsx('button', {
                  className:
                    'rounded px-2 py-1 text-xs text-slate-600 hover:bg-slate-100',
                  children: 'Retry',
                }),
            ],
          }),
        }),
    ],
  });
}
function RunsFilters({ filters, onChange }) {
  const [savedViews, setSavedViews] = useState([
    { name: 'Recent Failures', filters: { status: 'failed', limit: 20 } },
    { name: 'Long Running', filters: { status: 'running' } },
    { name: 'High Cost', filters: { limit: 50 } },
  ]);
  return _jsxs('div', {
    className: 'rounded-lg border bg-white p-4 shadow-sm',
    children: [
      _jsxs('div', {
        className: 'mb-3 flex items-center justify-between',
        children: [
          _jsx('h3', {
            className: 'text-sm font-medium text-slate-700',
            children: 'Filters',
          }),
          _jsx('button', {
            className: 'text-xs text-indigo-600 hover:text-indigo-700',
            children: 'Save View',
          }),
        ],
      }),
      _jsxs('div', {
        className: 'grid grid-cols-1 gap-3 md:grid-cols-4',
        children: [
          _jsxs('div', {
            children: [
              _jsx('label', {
                className: 'block text-xs text-slate-600 mb-1',
                children: 'Status',
              }),
              _jsxs('select', {
                value: filters.status || '',
                onChange: (e) =>
                  onChange({ ...filters, status: e.target.value || undefined }),
                className: 'w-full rounded border px-2 py-1 text-sm',
                children: [
                  _jsx('option', { value: '', children: 'All statuses' }),
                  _jsx('option', { value: 'queued', children: 'Queued' }),
                  _jsx('option', { value: 'running', children: 'Running' }),
                  _jsx('option', { value: 'succeeded', children: 'Succeeded' }),
                  _jsx('option', { value: 'failed', children: 'Failed' }),
                  _jsx('option', { value: 'cancelled', children: 'Cancelled' }),
                ],
              }),
            ],
          }),
          _jsxs('div', {
            children: [
              _jsx('label', {
                className: 'block text-xs text-slate-600 mb-1',
                children: 'Pipeline',
              }),
              _jsx('input', {
                type: 'text',
                value: filters.pipeline || '',
                onChange: (e) =>
                  onChange({
                    ...filters,
                    pipeline: e.target.value || undefined,
                  }),
                placeholder: 'Filter by pipeline...',
                className: 'w-full rounded border px-2 py-1 text-sm',
              }),
            ],
          }),
          _jsxs('div', {
            children: [
              _jsx('label', {
                className: 'block text-xs text-slate-600 mb-1',
                children: 'Environment',
              }),
              _jsxs('select', {
                value: filters.env || '',
                onChange: (e) =>
                  onChange({ ...filters, env: e.target.value || undefined }),
                className: 'w-full rounded border px-2 py-1 text-sm',
                children: [
                  _jsx('option', { value: '', children: 'All environments' }),
                  _jsx('option', { value: 'dev', children: 'Development' }),
                  _jsx('option', { value: 'staging', children: 'Staging' }),
                  _jsx('option', { value: 'prod', children: 'Production' }),
                ],
              }),
            ],
          }),
          _jsxs('div', {
            children: [
              _jsx('label', {
                className: 'block text-xs text-slate-600 mb-1',
                children: 'Search',
              }),
              _jsx('input', {
                type: 'text',
                value: filters.q || '',
                onChange: (e) =>
                  onChange({ ...filters, q: e.target.value || undefined }),
                placeholder: 'Search runs...',
                className: 'w-full rounded border px-2 py-1 text-sm',
              }),
            ],
          }),
        ],
      }),
      savedViews.length > 0 &&
        _jsxs('div', {
          className: 'mt-3 pt-3 border-t',
          children: [
            _jsx('div', {
              className: 'text-xs text-slate-600 mb-2',
              children: 'Saved Views',
            }),
            _jsx('div', {
              className: 'flex flex-wrap gap-2',
              children: savedViews.map((view, i) =>
                _jsx(
                  'button',
                  {
                    onClick: () => onChange(view.filters),
                    className:
                      'rounded border px-2 py-1 text-xs text-slate-700 hover:bg-slate-50',
                    children: view.name,
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
export default function RunsList({
  filters: initialFilters = {},
  showFilters = true,
  compact = false,
}) {
  const [filters, setFilters] = useState(initialFilters);
  const [runs, setRuns] = useState([]);
  const [loading, setLoading] = useState(true);
  const [streamConnected, setStreamConnected] = useState(false);
  const eventSourceRef = useRef(null);
  const { useRuns } = api();
  const { data: initialRuns, refetch } = useRuns();
  // Initialize runs data
  useEffect(() => {
    if (initialRuns) {
      setRuns(initialRuns);
      setLoading(false);
    }
  }, [initialRuns]);
  // Set up SSE stream for real-time updates
  useEffect(() => {
    const cfg = getMaestroConfig();
    if (!cfg.gatewayBase) return;
    const eventSource = new EventSource(`${cfg.gatewayBase}/streams/runs`);
    eventSourceRef.current = eventSource;
    eventSource.onopen = () => {
      setStreamConnected(true);
    };
    eventSource.onerror = () => {
      setStreamConnected(false);
      // Retry connection after 5 seconds
      setTimeout(() => {
        if (eventSourceRef.current?.readyState === EventSource.CLOSED) {
          eventSourceRef.current = null;
          // Recursive call to re-establish connection
          const retryEventSource = new EventSource(
            `${cfg.gatewayBase}/streams/runs`,
          );
          eventSourceRef.current = retryEventSource;
        }
      }, 5000);
    };
    eventSource.addEventListener('run_started', (event) => {
      const data = JSON.parse(event.data);
      const newRun = data.payload;
      setRuns((prev) => [newRun, ...prev.slice(0, 199)]); // Keep last 200 runs
    });
    eventSource.addEventListener('run_progress', (event) => {
      const data = JSON.parse(event.data);
      const updatedRun = data.payload;
      setRuns((prev) =>
        prev.map((run) =>
          run.id === updatedRun.id ? { ...run, ...updatedRun } : run,
        ),
      );
    });
    eventSource.addEventListener('run_completed', (event) => {
      const data = JSON.parse(event.data);
      const completedRun = data.payload;
      setRuns((prev) =>
        prev.map((run) =>
          run.id === completedRun.id ? { ...run, ...completedRun } : run,
        ),
      );
    });
    return () => {
      if (eventSourceRef.current) {
        eventSourceRef.current.close();
        eventSourceRef.current = null;
      }
    };
  }, []);
  // Filter runs based on current filters
  const filteredRuns = runs
    .filter((run) => {
      if (filters.status && run.status !== filters.status) return false;
      if (filters.pipeline && !run.pipelineId.includes(filters.pipeline))
        return false;
      if (filters.env && run.env !== filters.env) return false;
      if (filters.q) {
        const query = filters.q.toLowerCase();
        return (
          run.id.toLowerCase().includes(query) ||
          run.pipelineId.toLowerCase().includes(query) ||
          run.commit?.toLowerCase().includes(query)
        );
      }
      return true;
    })
    .slice(0, filters.limit || 50);
  if (loading) {
    return _jsx('div', {
      className: 'rounded-lg border bg-white p-8 text-center shadow-sm',
      children: _jsx('div', {
        className: 'text-sm text-slate-600',
        children: 'Loading runs...',
      }),
    });
  }
  return _jsxs('div', {
    className: 'space-y-4',
    children: [
      _jsxs('div', {
        className: 'flex items-center justify-between',
        children: [
          _jsxs('div', {
            className: 'flex items-center gap-2',
            children: [
              _jsx('div', {
                className: `h-2 w-2 rounded-full ${streamConnected ? 'bg-green-500' : 'bg-red-500'}`,
              }),
              _jsx('span', {
                className: 'text-xs text-slate-500',
                children: streamConnected
                  ? 'Live updates connected'
                  : 'Connecting to live updates...',
              }),
            ],
          }),
          _jsx('button', {
            onClick: () => refetch(),
            className:
              'rounded border px-2 py-1 text-xs text-slate-600 hover:bg-slate-50',
            children: 'Refresh',
          }),
        ],
      }),
      showFilters &&
        _jsx(RunsFilters, { filters: filters, onChange: setFilters }),
      _jsxs('div', {
        className: 'flex items-center justify-between text-sm',
        children: [
          _jsxs('div', {
            className: 'text-slate-600',
            children: [
              'Showing ',
              filteredRuns.length,
              ' run',
              filteredRuns.length !== 1 ? 's' : '',
              Object.keys(filters).length > 0 && ' (filtered)',
            ],
          }),
          _jsxs('div', {
            className: 'flex items-center gap-2',
            children: [
              _jsx('span', {
                className: 'text-slate-500',
                children: 'Auto-refresh:',
              }),
              _jsx('div', {
                className: `h-2 w-2 rounded-full ${streamConnected ? 'bg-green-500 animate-pulse' : 'bg-slate-300'}`,
              }),
            ],
          }),
        ],
      }),
      _jsx('div', {
        className: 'overflow-hidden rounded-lg border bg-white shadow-sm',
        children: _jsxs('table', {
          className: 'w-full text-sm',
          children: [
            _jsx('thead', {
              className: 'bg-slate-50 text-left text-slate-500',
              children: _jsxs('tr', {
                children: [
                  _jsx('th', {
                    className: 'px-3 py-2 font-medium',
                    children: 'Run ID',
                  }),
                  _jsx('th', {
                    className: 'px-3 py-2 font-medium',
                    children: 'Pipeline',
                  }),
                  _jsx('th', {
                    className: 'px-3 py-2 font-medium',
                    children: 'Status',
                  }),
                  _jsx('th', {
                    className: 'px-3 py-2 font-medium',
                    children: 'Duration',
                  }),
                  _jsx('th', {
                    className: 'px-3 py-2 font-medium',
                    children: 'Cost',
                  }),
                  _jsx('th', {
                    className: 'px-3 py-2 font-medium',
                    children: 'Environment',
                  }),
                  !compact &&
                    _jsx('th', {
                      className: 'px-3 py-2 font-medium',
                      children: 'Actions',
                    }),
                ],
              }),
            }),
            _jsxs('tbody', {
              children: [
                filteredRuns.map((run) =>
                  _jsx(RunRow, { run: run, compact: compact }, run.id),
                ),
                filteredRuns.length === 0 &&
                  _jsx('tr', {
                    children: _jsx('td', {
                      colSpan: compact ? 6 : 7,
                      className: 'px-3 py-8 text-center text-slate-500',
                      children: 'No runs found matching current filters.',
                    }),
                  }),
              ],
            }),
          ],
        }),
      }),
      filteredRuns.length >= (filters.limit || 50) &&
        _jsx('div', {
          className: 'text-center',
          children: _jsx('button', {
            onClick: () =>
              setFilters((prev) => ({
                ...prev,
                limit: (prev.limit || 50) + 50,
              })),
            className:
              'rounded border px-4 py-2 text-sm text-slate-700 hover:bg-slate-50',
            children: 'Load More Runs',
          }),
        }),
    ],
  });
}
