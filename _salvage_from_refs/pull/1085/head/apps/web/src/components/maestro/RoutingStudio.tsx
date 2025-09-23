// =============================================
// File: apps/web/src/components/maestro/RoutingStudio.tsx
// =============================================
import React, { useMemo, useState } from 'react';
import { useRouteExecute, useRoutePreview } from '../../hooks/useMaestroRouting';

export default function RoutingStudio() {
  const [task, setTask] = useState('Summarize today\'s top three developments on ACME Corp.');
  const [selected, setSelected] = useState<string[]>([]);
  const { data, isFetching } = useRoutePreview(task, true);
  const exec = useRouteExecute();

  const candidates = data?.candidates ?? [];
  const disabled = isFetching || exec.isPending;

  const totalCost = useMemo(() => candidates.filter(c => selected.includes(c.id)).reduce((a, c) => a + c.cost_est, 0), [selected, candidates]);

  return (
    <div className="space-y-4">
      <div className="flex gap-2">
        <input
          aria-label="Task"
          className="input input-bordered w-full"
          value={task}
          onChange={(e) => setTask(e.target.value)}
          placeholder="Enter task…"
        />
        <button
          className="btn btn-primary"
          onClick={() => exec.mutate({ task, selection: selected })}
          disabled={disabled || selected.length === 0}
        >
          Run
        </button>
      </div>

      <div className="rounded-2xl border p-3">
        <div className="flex items-center justify-between">
          <h3 className="font-semibold">Candidates</h3>
          <div className="text-sm opacity-80">Projected cost: ${totalCost.toFixed(3)}</div>
        </div>
        <ul className="mt-2 divide-y">
          {candidates.map((c) => (
            <li key={c.id} className="py-2 flex items-center gap-3">
              <input
                type="checkbox"
                aria-label={`Select ${c.name}`}
                checked={selected.includes(c.id)}
                onChange={(e) => setSelected((prev) => e.target.checked ? [...prev, c.id] : prev.filter((id) => id !== c.id))}
              />
              <div className="flex-1">
                <div className="flex items-center gap-2">
                  <span className="font-medium">{c.name}</span>
                  <span className="text-xs badge badge-outline">{c.type}</span>
                  <span className="text-xs opacity-70">score {Math.round(c.score * 100)}%</span>
                </div>
                <div className="text-xs opacity-75">{c.rationale}</div>
              </div>
              <div className="text-right text-sm">
                <div>${c.cost_est.toFixed(3)}</div>
                <div className="opacity-70">{c.latency_est_ms} ms</div>
              </div>
            </li>
          ))}
          {candidates.length === 0 && <li className="py-6 text-center text-sm opacity-60">No candidates yet…</li>}
        </ul>
      </div>

      {exec.isSuccess && (
        <div className="rounded-2xl border p-3">
          <h3 className="font-semibold">Run Timeline</h3>
          <ol className="mt-2 space-y-2">
            {exec.data.steps.map((s) => (
              <li key={s.id} className="p-2 rounded bg-base-200">
                <div className="flex items-center justify-between">
                  <div className="font-medium">{s.source}</div>
                  <div className={`badge ${s.status === 'ok' ? 'badge-success' : 'badge-error'}`}>{s.status}</div>
                </div>
                <div className="text-xs opacity-70">{s.elapsed_ms} ms · ${(s.cost ?? 0).toFixed(3)} · {s.tokens ?? 0} tok</div>
                {s.citations && s.citations.length > 0 && (
                  <div className="mt-1 text-xs">
                    Citations: {s.citations.map((c, i) => <a key={i} className="link" href={c.url} target="_blank" rel="noreferrer">{c.title}</a>)}
                  </div>
                )}
              </li>
            ))}
          </ol>
        </div>
      )}
    </div>
  );
}
