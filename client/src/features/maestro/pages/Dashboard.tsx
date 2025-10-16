import React from 'react';
import {
  pipelineRecords,
  policyDenials,
  queueDepthHistory,
  sloSnapshots,
} from '../mockData';

function StatCard({
  label,
  value,
  helper,
}: {
  label: string;
  value: string;
  helper: string;
}) {
  return (
    <div className="rounded-2xl border border-slate-800 bg-slate-900/60 p-4 shadow-lg">
      <p className="text-sm uppercase tracking-wide text-slate-400">{label}</p>
      <p className="mt-2 text-2xl font-semibold text-white">{value}</p>
      <p className="mt-1 text-xs text-slate-400">{helper}</p>
    </div>
  );
}

function QueueDepthChart() {
  return (
    <div className="rounded-2xl border border-slate-800 bg-slate-900/60 p-4">
      <div className="flex items-center justify-between">
        <p className="text-sm font-semibold text-slate-200">
          Queue Depth (last 12h)
        </p>
        <span className="text-xs text-slate-400">p95 target: 12</span>
      </div>
      <div className="mt-4 flex items-end gap-1">
        {queueDepthHistory.map((point) => (
          <div
            key={point.hour}
            className="flex-1 rounded-t-lg bg-emerald-500/70"
            style={{ height: `${point.depth * 4}px` }}
            aria-label={`Hour ${point.hour}, depth ${point.depth}`}
          />
        ))}
      </div>
    </div>
  );
}

function PolicyDenialsCard() {
  return (
    <div className="rounded-2xl border border-slate-800 bg-slate-900/60 p-4">
      <p className="text-sm font-semibold text-slate-200">Policy Denials</p>
      <ul className="mt-3 space-y-3 text-sm text-slate-300">
        {policyDenials.map((denial) => (
          <li
            key={denial.id}
            className="rounded-xl border border-slate-800/60 bg-slate-950/60 p-3"
          >
            <p className="font-semibold text-emerald-300">{denial.tenant}</p>
            <p className="mt-1 text-slate-100">{denial.reason}</p>
            <p className="mt-1 text-xs text-slate-500">
              {new Date(denial.occurredAt).toLocaleTimeString()}
            </p>
          </li>
        ))}
      </ul>
    </div>
  );
}

function SloWidget() {
  return (
    <div className="rounded-2xl border border-slate-800 bg-slate-900/60 p-4">
      <p className="text-sm font-semibold text-slate-200">SLO Summary</p>
      <table className="mt-3 w-full text-sm text-slate-300">
        <thead className="text-xs uppercase text-slate-500">
          <tr>
            <th className="py-2 text-left">Service</th>
            <th className="text-left">p95</th>
            <th className="text-left">Error</th>
            <th className="text-left">Saturation</th>
          </tr>
        </thead>
        <tbody>
          {sloSnapshots.map((snapshot) => (
            <tr key={snapshot.service} className="border-t border-slate-800/70">
              <td className="py-2 text-slate-200">{snapshot.service}</td>
              <td>{snapshot.latencyP95Ms}ms</td>
              <td>{(snapshot.errorRate * 100).toFixed(2)}%</td>
              <td>{(snapshot.saturation * 100).toFixed(1)}%</td>
            </tr>
          ))}
        </tbody>
      </table>
      <a
        href="/runs/run-1?filter=slo"
        className="mt-3 inline-flex items-center text-xs font-semibold text-emerald-400 hover:text-emerald-300"
      >
        View impacted runs →
      </a>
    </div>
  );
}

export function DashboardPage() {
  const totalPipelines = pipelineRecords.length;
  const healthy = pipelineRecords.filter(
    (pipeline) => pipeline.status === 'healthy',
  ).length;
  const degraded = pipelineRecords.filter(
    (pipeline) => pipeline.status === 'degraded',
  ).length;

  const longestLeadTime = pipelineRecords.reduce(
    (max, pipeline) => Math.max(max, pipeline.leadTimeMinutes),
    0,
  );
  const averageChangeFailure =
    pipelineRecords.reduce(
      (total, pipeline) => total + pipeline.dora.changeFailureRate,
      0,
    ) / totalPipelines;

  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-2xl font-semibold text-white">Dashboard</h1>
        <p className="mt-1 text-sm text-slate-400">
          p95 load &lt; 1.5s with 2k pipelines — this view hydrates from cached
          telemetry.
        </p>
      </header>
      <section className="grid gap-4 md:grid-cols-4">
        <StatCard
          label="Pipelines"
          value={`${totalPipelines}`}
          helper="Total managed pipelines"
        />
        <StatCard
          label="Healthy"
          value={`${healthy}`}
          helper="Passing policy + SLO"
        />
        <StatCard
          label="Degraded"
          value={`${degraded}`}
          helper="Requires triage"
        />
        <StatCard
          label="Longest critical path"
          value={`${longestLeadTime}m`}
          helper="Lead time to prod"
        />
      </section>
      <section className="grid gap-4 xl:grid-cols-[2fr,1fr]">
        <QueueDepthChart />
        <div className="space-y-4">
          <PolicyDenialsCard />
          <SloWidget />
        </div>
      </section>
      <section className="rounded-2xl border border-slate-800 bg-slate-900/60 p-4 text-sm text-slate-300">
        <h2 className="text-lg font-semibold text-slate-100">Change risk</h2>
        <p className="mt-2">
          Average change failure rate:{' '}
          <span className="font-semibold text-emerald-300">
            {averageChangeFailure.toFixed(1)}%
          </span>
          . Auto retry reasons and policy denials stream into this widget every
          30 seconds via SSE.
        </p>
      </section>
    </div>
  );
}

export default DashboardPage;
