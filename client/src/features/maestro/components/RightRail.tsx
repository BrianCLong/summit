import React from 'react';

export function RightRail({ view }: { view: string }) {
  const explainers: Record<
    string,
    { title: string; body: string; items: string[] }
  > = {
    dashboard: {
      title: 'Pipeline Health Overview',
      body: 'Metrics combine persisted queries and streaming deltas. Values are debiased for queued retries.',
      items: [
        'Health score blends error budget burn, MTTR trend, and critical path saturation.',
        'Queue depth is normalized per tenant to ensure fair slot allocation.',
        'Policy denials update every 30s from the governance event stream.',
      ],
    },
    pipelines: {
      title: 'Virtualized pipeline catalog',
      body: 'List renders directly from the normalized React Query cache with dynamic windowing to keep input latency low.',
      items: [
        'Column metrics refresh every 60s via background fetch.',
        'Status pill color encodes run health (healthy/degraded/failed).',
        'Query params sync with filters so deep links stay shareable.',
      ],
    },
    runs: {
      title: 'Explainability for build outcomes',
      body: 'Log stream is back-pressured with a worker parser. Provenance chips show source artifacts.',
      items: [
        'Jump-to-error inspects the parsed event index and focuses the first failing line.',
        'Follow tail keeps the viewport pinned unless user scrolls manually.',
        'Reason for access is enforced for artifacts and approvals.',
      ],
    },
  };

  const content = explainers[view] ?? explainers.dashboard;

  return (
    <aside className="hidden w-80 shrink-0 border-l border-slate-800/80 bg-slate-950/40 p-4 text-slate-200 xl:block">
      <h3 className="text-sm font-semibold uppercase tracking-wide text-slate-400">
        Explain this view
      </h3>
      <p className="mt-2 text-sm text-slate-300">{content.body}</p>
      <ul className="mt-4 space-y-3 text-sm text-slate-300">
        {content.items.map((item) => (
          <li key={item} className="flex items-start gap-2">
            <span
              className="mt-1 inline-flex h-2 w-2 rounded-full bg-emerald-400"
              aria-hidden
            />
            <span>{item}</span>
          </li>
        ))}
      </ul>
      <div className="mt-6 rounded-xl border border-slate-800 bg-slate-900/60 p-3 text-xs text-slate-400">
        <p className="font-semibold text-slate-200">Provenance</p>
        <p className="mt-1">
          Data stitched from persisted GraphQL queries (
          <code className="font-mono text-emerald-400">pipelineSummary</code>,
          <code className="font-mono text-emerald-400">runLogs</code>) with SSE
          deltas. Last refresh: {new Date().toLocaleTimeString()}.
        </p>
      </div>
    </aside>
  );
}
