import React, { useState, useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../api';
import { Run, RunFilters, SSEEvent } from '../types/maestro-api';
import { getMaestroConfig } from '../config';

interface RunsListProps {
  filters?: RunFilters;
  showFilters?: boolean;
  compact?: boolean;
}

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

function RunRow({ run, compact = false }: { run: Run; compact?: boolean }) {
  const [isExpanded, setIsExpanded] = useState(false);

  return (
    <tr className="border-t hover:bg-slate-50">
      <td className="px-3 py-2">
        <div className="flex items-center gap-2">
          <button
            onClick={() => setIsExpanded(!isExpanded)}
            className="text-slate-400 hover:text-slate-600"
            aria-label="Expand run details"
          >
            {isExpanded ? '▼' : '▶'}
          </button>
          <div className="font-mono text-xs">
            <Link
              className="text-indigo-700 hover:underline"
              to={`/maestro/runs/${run.id}`}
            >
              {run.id}
            </Link>
          </div>
        </div>
        {isExpanded && !compact && (
          <div className="mt-2 ml-6 text-xs text-slate-600">
            <div>Started: {new Date(run.startedAt).toLocaleString()}</div>
            {run.endedAt && (
              <div>Ended: {new Date(run.endedAt).toLocaleString()}</div>
            )}
            {run.traceId && <div>Trace: {run.traceId}</div>}
            <div>Artifacts: {run.artifacts?.length || 0}</div>
          </div>
        )}
      </td>
      <td className="px-3 py-2">
        <Link
          to={`/maestro/pipelines/${run.pipelineId}`}
          className="text-slate-900 hover:text-indigo-600"
        >
          {run.pipelineId}
        </Link>
      </td>
      <td className="px-3 py-2">
        <div className="flex items-center gap-2">
          <span className="text-sm">
            {statusIcons[run.status as keyof typeof statusIcons]}
          </span>
          <span
            className={`rounded px-2 py-0.5 text-xs font-medium ${
              statusColors[run.status as keyof typeof statusColors]
            }`}
          >
            {run.status}
          </span>
          {run.status === 'running' && (
            <div className="h-1 w-1 rounded-full bg-blue-500 animate-pulse" />
          )}
        </div>
      </td>
      <td className="px-3 py-2">
        <div className="text-sm">
          {run.durationMs ? `${Math.round(run.durationMs / 1000)}s` : '—'}
        </div>
        {isExpanded && run.status === 'running' && (
          <div className="text-xs text-slate-500">
            Running for{' '}
            {Math.round(
              (Date.now() - new Date(run.startedAt).getTime()) / 1000,
            )}
            s
          </div>
        )}
      </td>
      <td className="px-3 py-2">
        <div className="text-sm">
          {typeof run.cost === 'object'
            ? `$${run.cost.total || '0.00'}`
            : `$${run.cost || '0.00'}`}
        </div>
        {isExpanded && typeof run.cost === 'object' && (
          <div className="text-xs text-slate-500">
            Compute: ${run.cost.compute || '0.00'} • Models: $
            {run.cost.models || '0.00'}
          </div>
        )}
      </td>
      <td className="px-3 py-2">
        <div className="text-xs text-slate-600">{run.env}</div>
        {run.commit && (
          <div className="text-xs font-mono text-slate-500">
            {run.commit.slice(0, 7)}
          </div>
        )}
      </td>
      {!compact && (
        <td className="px-3 py-2">
          <div className="flex gap-1">
            <Link
              to={`/maestro/runs/${run.id}`}
              className="rounded px-2 py-1 text-xs text-indigo-600 hover:bg-indigo-50"
            >
              View
            </Link>
            {run.status === 'running' && (
              <button className="rounded px-2 py-1 text-xs text-slate-600 hover:bg-slate-100">
                Pause
              </button>
            )}
            {run.status === 'failed' && (
              <button className="rounded px-2 py-1 text-xs text-slate-600 hover:bg-slate-100">
                Retry
              </button>
            )}
          </div>
        </td>
      )}
    </tr>
  );
}

function RunsFilters({
  filters,
  onChange,
}: {
  filters: RunFilters;
  onChange: (filters: RunFilters) => void;
}) {
  const [savedViews, setSavedViews] = useState([
    { name: 'Recent Failures', filters: { status: 'failed', limit: 20 } },
    { name: 'Long Running', filters: { status: 'running' } },
    { name: 'High Cost', filters: { limit: 50 } },
  ]);

  return (
    <div className="rounded-lg border bg-white p-4 shadow-sm">
      <div className="mb-3 flex items-center justify-between">
        <h3 className="text-sm font-medium text-slate-700">Filters</h3>
        <button className="text-xs text-indigo-600 hover:text-indigo-700">
          Save View
        </button>
      </div>

      <div className="grid grid-cols-1 gap-3 md:grid-cols-4">
        <div>
          <label className="block text-xs text-slate-600 mb-1">Status</label>
          <select
            value={filters.status || ''}
            onChange={(e) =>
              onChange({ ...filters, status: e.target.value || undefined })
            }
            className="w-full rounded border px-2 py-1 text-sm"
          >
            <option value="">All statuses</option>
            <option value="queued">Queued</option>
            <option value="running">Running</option>
            <option value="succeeded">Succeeded</option>
            <option value="failed">Failed</option>
            <option value="cancelled">Cancelled</option>
          </select>
        </div>

        <div>
          <label className="block text-xs text-slate-600 mb-1">Pipeline</label>
          <input
            type="text"
            value={filters.pipeline || ''}
            onChange={(e) =>
              onChange({ ...filters, pipeline: e.target.value || undefined })
            }
            placeholder="Filter by pipeline..."
            className="w-full rounded border px-2 py-1 text-sm"
          />
        </div>

        <div>
          <label className="block text-xs text-slate-600 mb-1">
            Environment
          </label>
          <select
            value={filters.env || ''}
            onChange={(e) =>
              onChange({ ...filters, env: e.target.value || undefined })
            }
            className="w-full rounded border px-2 py-1 text-sm"
          >
            <option value="">All environments</option>
            <option value="dev">Development</option>
            <option value="staging">Staging</option>
            <option value="prod">Production</option>
          </select>
        </div>

        <div>
          <label className="block text-xs text-slate-600 mb-1">Search</label>
          <input
            type="text"
            value={filters.q || ''}
            onChange={(e) =>
              onChange({ ...filters, q: e.target.value || undefined })
            }
            placeholder="Search runs..."
            className="w-full rounded border px-2 py-1 text-sm"
          />
        </div>
      </div>

      {savedViews.length > 0 && (
        <div className="mt-3 pt-3 border-t">
          <div className="text-xs text-slate-600 mb-2">Saved Views</div>
          <div className="flex flex-wrap gap-2">
            {savedViews.map((view, i) => (
              <button
                key={i}
                onClick={() => onChange(view.filters)}
                className="rounded border px-2 py-1 text-xs text-slate-700 hover:bg-slate-50"
              >
                {view.name}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

export default function RunsList({
  filters: initialFilters = {},
  showFilters = true,
  compact = false,
}: RunsListProps) {
  const [filters, setFilters] = useState<RunFilters>(initialFilters);
  const [runs, setRuns] = useState<Run[]>([]);
  const [loading, setLoading] = useState(true);
  const [streamConnected, setStreamConnected] = useState(false);
  const eventSourceRef = useRef<EventSource | null>(null);

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
      const data: SSEEvent = JSON.parse(event.data);
      const newRun = data.payload as Run;
      setRuns((prev) => [newRun, ...prev.slice(0, 199)]); // Keep last 200 runs
    });

    eventSource.addEventListener('run_progress', (event) => {
      const data: SSEEvent = JSON.parse(event.data);
      const updatedRun = data.payload as Run;
      setRuns((prev) =>
        prev.map((run) =>
          run.id === updatedRun.id ? { ...run, ...updatedRun } : run,
        ),
      );
    });

    eventSource.addEventListener('run_completed', (event) => {
      const data: SSEEvent = JSON.parse(event.data);
      const completedRun = data.payload as Run;
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
    return (
      <div className="rounded-lg border bg-white p-8 text-center shadow-sm">
        <div className="text-sm text-slate-600">Loading runs...</div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Stream Status */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div
            className={`h-2 w-2 rounded-full ${
              streamConnected ? 'bg-green-500' : 'bg-red-500'
            }`}
          />
          <span className="text-xs text-slate-500">
            {streamConnected
              ? 'Live updates connected'
              : 'Connecting to live updates...'}
          </span>
        </div>
        <button
          onClick={() => refetch()}
          className="rounded border px-2 py-1 text-xs text-slate-600 hover:bg-slate-50"
        >
          Refresh
        </button>
      </div>

      {/* Filters */}
      {showFilters && <RunsFilters filters={filters} onChange={setFilters} />}

      {/* Results Summary */}
      <div className="flex items-center justify-between text-sm">
        <div className="text-slate-600">
          Showing {filteredRuns.length} run
          {filteredRuns.length !== 1 ? 's' : ''}
          {Object.keys(filters).length > 0 && ' (filtered)'}
        </div>
        <div className="flex items-center gap-2">
          <span className="text-slate-500">Auto-refresh:</span>
          <div
            className={`h-2 w-2 rounded-full ${
              streamConnected ? 'bg-green-500 animate-pulse' : 'bg-slate-300'
            }`}
          />
        </div>
      </div>

      {/* Runs Table */}
      <div className="overflow-hidden rounded-lg border bg-white shadow-sm">
        <table className="w-full text-sm">
          <thead className="bg-slate-50 text-left text-slate-500">
            <tr>
              <th className="px-3 py-2 font-medium">Run ID</th>
              <th className="px-3 py-2 font-medium">Pipeline</th>
              <th className="px-3 py-2 font-medium">Status</th>
              <th className="px-3 py-2 font-medium">Duration</th>
              <th className="px-3 py-2 font-medium">Cost</th>
              <th className="px-3 py-2 font-medium">Environment</th>
              {!compact && <th className="px-3 py-2 font-medium">Actions</th>}
            </tr>
          </thead>
          <tbody>
            {filteredRuns.map((run) => (
              <RunRow key={run.id} run={run} compact={compact} />
            ))}
            {filteredRuns.length === 0 && (
              <tr>
                <td
                  colSpan={compact ? 6 : 7}
                  className="px-3 py-8 text-center text-slate-500"
                >
                  No runs found matching current filters.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Load More */}
      {filteredRuns.length >= (filters.limit || 50) && (
        <div className="text-center">
          <button
            onClick={() =>
              setFilters((prev) => ({
                ...prev,
                limit: (prev.limit || 50) + 50,
              }))
            }
            className="rounded border px-4 py-2 text-sm text-slate-700 hover:bg-slate-50"
          >
            Load More Runs
          </button>
        </div>
      )}
    </div>
  );
}
