import React, { useEffect, useMemo, useState } from 'react';
import { sloSnapshots, sloBudget } from '../mockData';
import { isFeatureEnabled } from '../../../flags/featureFlags';

type RunAggregate = {
  runId: string;
  traceId: string;
  totalDurationMs: number;
  queueWaitMs: number;
  execMs: number;
  bestCaseDurationMs: number;
  wastedQueueMs: number;
  criticalPathStages: string[];
  errorCount: number;
  retryCount: number;
  startedAt: string | Date;
  finishedAt: string | Date;
  status: 'ok' | 'error';
};

type RunTreeNode = {
  spanId: string;
  parentSpanId?: string | null;
  stage: string;
  kind: string;
  durationMs: number;
  status: string;
  onCriticalPath?: boolean;
  children?: RunTreeNode[];
};

type RunDetail = {
  aggregate: RunAggregate;
  tree: RunTreeNode[];
};

const formatDuration = (ms: number) => `${ms.toLocaleString()} ms`;

const TreeNodeView: React.FC<{ node: RunTreeNode; depth?: number }> = ({
  node,
  depth = 0,
}) => (
  <div className="flex flex-col">
    <div
      className={`flex items-center justify-between rounded border border-slate-800/70 bg-slate-900/70 px-3 py-2 text-sm ${node.onCriticalPath ? 'border-emerald-500/70' : ''}`}
      style={{ marginLeft: depth * 16 }}
    >
      <div className="flex flex-col">
        <span className="text-slate-100">{node.stage}</span>
        <span className="text-xs text-slate-400">{node.kind}</span>
      </div>
      <div className="text-xs text-slate-300">
        {formatDuration(node.durationMs)}
        {node.onCriticalPath ? (
          <span className="ml-2 rounded bg-emerald-500/20 px-2 py-0.5 text-[10px] text-emerald-200">
            critical
          </span>
        ) : null}
      </div>
    </div>
    {(node.children || []).map((child) => (
      <TreeNodeView key={child.spanId} node={child} depth={depth + 1} />
    ))}
  </div>
);

export function ObservabilityPage() {
  const obsRunsEnabled = isFeatureEnabled('FEATURE_OBSERVABILITY_RUNS');
  const [runs, setRuns] = useState<RunAggregate[]>([]);
  const [selectedRunId, setSelectedRunId] = useState<string | null>(null);
  const [runDetail, setRunDetail] = useState<RunDetail | null>(null);
  const [loadingRuns, setLoadingRuns] = useState(false);
  const [loadingDetail, setLoadingDetail] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!obsRunsEnabled) return;
    setLoadingRuns(true);
    fetch('/api/observability/runs?limit=25')
      .then(async (res) => {
        if (!res.ok) throw new Error('Runs API disabled or unavailable');
        return res.json();
      })
      .then((payload) => {
        setRuns(payload.runs || []);
        setSelectedRunId((current) => current || payload.runs?.[0]?.runId || null);
        setError(null);
      })
      .catch((err) => setError(err.message))
      .finally(() => setLoadingRuns(false));
  }, [obsRunsEnabled]);

  useEffect(() => {
    if (!obsRunsEnabled || !selectedRunId) return;
    setLoadingDetail(true);
    fetch(`/api/observability/runs/${selectedRunId}`)
      .then(async (res) => {
        if (!res.ok) throw new Error('Run detail unavailable');
        return res.json();
      })
      .then((payload: RunDetail) => {
        setRunDetail(payload);
        setError(null);
      })
      .catch((err) => setError(err.message))
      .finally(() => setLoadingDetail(false));
  }, [obsRunsEnabled, selectedRunId]);

  const selectedAggregate = useMemo(() => {
    if (!selectedRunId) return null;
    return runs.find((run) => run.runId === selectedRunId) || runDetail?.aggregate || null;
  }, [runs, selectedRunId, runDetail]);

  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-2xl font-semibold text-white">Observability</h1>
        <p className="mt-1 text-sm text-slate-400">
          SLO widget tracks latency, error, and saturation with quick links to runs.
        </p>
      </header>
      <section className="rounded-2xl border border-slate-800 bg-slate-900/60 p-4">
        <h2 className="text-lg font-semibold text-white">Service SLOs</h2>
        <table className="mt-4 w-full text-sm text-slate-300">
          <thead className="text-xs uppercase text-slate-500">
            <tr>
              <th className="py-2 text-left">Service</th>
              <th className="text-left">Latency p95</th>
              <th className="text-left">Error Rate</th>
              <th className="text-left">Saturation</th>
            </tr>
          </thead>
          <tbody>
            {sloSnapshots.map((snapshot) => (
              <tr key={snapshot.service} className="border-t border-slate-800/60">
                <td className="py-2 text-slate-200">{snapshot.service}</td>
                <td>
                  <span
                    className={
                      snapshot.latencyP95Ms > sloBudget.latencyBudgetMs
                        ? 'text-amber-300'
                        : 'text-slate-300'
                    }
                  >
                    {snapshot.latencyP95Ms}ms
                  </span>
                </td>
                <td>
                  <span
                    className={
                      snapshot.errorRate > sloBudget.errorBudget
                        ? 'text-red-300'
                        : 'text-slate-300'
                    }
                  >
                    {(snapshot.errorRate * 100).toFixed(2)}%
                  </span>
                </td>
                <td>{(snapshot.saturation * 100).toFixed(1)}%</td>
              </tr>
            ))}
          </tbody>
        </table>
        <a
          href="/runs/run-1?filter=slo"
          className="mt-3 inline-flex text-xs font-semibold text-emerald-300 hover:text-emerald-200"
        >
          View impacted runs →
        </a>
      </section>
      <section className="rounded-2xl border border-slate-800 bg-slate-900/60 p-4 text-sm text-slate-200">
        <h2 className="text-lg font-semibold text-white">Self-SLO (UI)</h2>
        <p className="mt-2 text-slate-300">
          UI latency p95: 820ms • Error budget burn: 2.1% • Observed long tasks: 0.7%
        </p>
        <p className="mt-2 text-xs text-slate-400">
          These metrics hydrate from the in-app telemetry hook and surface regressions directly for operators.
        </p>
      </section>

      {obsRunsEnabled && (
        <section className="rounded-2xl border border-slate-800 bg-slate-900/60 p-4 text-sm text-slate-100">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-lg font-semibold text-white">Runs (request-first)</h2>
              <p className="text-xs text-slate-400">
                Pre-aggregated spans show wasted queue time, critical path, and retries.
              </p>
            </div>
            {loadingRuns && <span className="text-xs text-slate-400">Loading runs…</span>}
          </div>
          {error && <div className="mt-2 rounded bg-red-900/40 p-2 text-xs text-red-200">{error}</div>}
          <div className="mt-3 overflow-x-auto">
            <table className="w-full text-xs text-slate-200">
              <thead className="text-[11px] uppercase text-slate-500">
                <tr>
                  <th className="py-2 text-left">Run</th>
                  <th className="text-left">Total</th>
                  <th className="text-left">Queue Waste</th>
                  <th className="text-left">Critical Path</th>
                  <th className="text-left">Status</th>
                </tr>
              </thead>
              <tbody>
                {runs.map((run) => (
                  <tr
                    key={run.runId}
                    className={`cursor-pointer border-t border-slate-800/80 hover:bg-slate-800/60 ${
                      selectedRunId === run.runId ? 'bg-slate-800/70' : ''
                    }`}
                    onClick={() => setSelectedRunId(run.runId)}
                  >
                    <td className="py-2 font-semibold text-emerald-200">{run.runId}</td>
                    <td>{formatDuration(run.totalDurationMs)}</td>
                    <td className={run.wastedQueueMs > 0 ? 'text-amber-300' : 'text-slate-200'}>
                      {formatDuration(run.wastedQueueMs)}
                    </td>
                    <td>{run.criticalPathStages.slice(0, 3).join(' → ') || 'n/a'}</td>
                    <td className={run.status === 'error' ? 'text-red-300' : 'text-emerald-300'}>
                      {run.status}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="mt-4 grid gap-4 md:grid-cols-2">
            <div className="rounded-xl border border-slate-800/80 bg-slate-900/70 p-3">
              <h3 className="text-sm font-semibold text-white">Run summary</h3>
              {loadingDetail && <p className="mt-2 text-xs text-slate-400">Loading run…</p>}
              {selectedAggregate ? (
                <dl className="mt-2 grid grid-cols-2 gap-2 text-xs text-slate-200">
                  <div>
                    <dt className="text-slate-400">Total duration</dt>
                    <dd>{formatDuration(selectedAggregate.totalDurationMs)}</dd>
                  </div>
                  <div>
                    <dt className="text-slate-400">Best case</dt>
                    <dd>{formatDuration(selectedAggregate.bestCaseDurationMs)}</dd>
                  </div>
                  <div>
                    <dt className="text-slate-400">Queue waste</dt>
                    <dd className="text-amber-200">{formatDuration(selectedAggregate.wastedQueueMs)}</dd>
                  </div>
                  <div>
                    <dt className="text-slate-400">Retries</dt>
                    <dd>{selectedAggregate.retryCount}</dd>
                  </div>
                  <div>
                    <dt className="text-slate-400">Critical path</dt>
                    <dd>{selectedAggregate.criticalPathStages.join(' → ') || 'n/a'}</dd>
                  </div>
                  <div>
                    <dt className="text-slate-400">Status</dt>
                    <dd className={selectedAggregate.status === 'error' ? 'text-red-300' : 'text-emerald-300'}>
                      {selectedAggregate.status}
                    </dd>
                  </div>
                </dl>
              ) : (
                <p className="mt-2 text-xs text-slate-400">Select a run to see detail.</p>
              )}
            </div>
            <div className="rounded-xl border border-slate-800/80 bg-slate-900/70 p-3">
              <h3 className="text-sm font-semibold text-white">Run tree</h3>
              {runDetail?.tree?.length ? (
                <div className="mt-2 space-y-2">
                  {runDetail.tree.map((node) => (
                    <TreeNodeView key={node.spanId} node={node} />
                  ))}
                </div>
              ) : (
                <p className="mt-2 text-xs text-slate-400">No tree available yet.</p>
              )}
            </div>
          </div>
        </section>
      )}
    </div>
  );
}

export default ObservabilityPage;
