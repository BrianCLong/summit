// =============================================
// File: apps/web/src/components/maestro/WebOrchestrator.tsx
// =============================================
import React, { useMemo, useState } from 'react';
import { useWebInterfaces, useOrchestrateWeb } from '../../hooks/useMaestroWeb';

export default function WebOrchestrator() {
  const [task, setTask] = useState('Collect and synthesize credible updates on Project Nimbus in the last 48h.');
  const [selected, setSelected] = useState<string[]>([]);
  const { data } = useWebInterfaces();
  const run = useOrchestrateWeb();

  const items = data?.items ?? [];
  const canRun = selected.length > 0 && !run.isPending;

  const selectedTitles = useMemo(() => new Set(selected), [selected]);

  return (
    <div className="space-y-4">
      <div className="flex gap-2">
        <input className="input input-bordered w-full" value={task} onChange={(e) => setTask(e.target.value)} />
        <button className="btn btn-primary" disabled={!canRun} onClick={() => run.mutate({ task, interfaces: selected })}>Run</button>
      </div>

      <div className="rounded-2xl border p-3">
        <h3 className="font-semibold">Interfaces</h3>
        <ul className="mt-2 grid md:grid-cols-2 gap-2">
          {items.map((it) => (
            <li key={it.id} className={`p-2 rounded border ${selectedTitles.has(it.id) ? 'border-primary' : 'border-base-300'}`}>
              <label className="flex items-start gap-2">
                <input type="checkbox" checked={selectedTitles.has(it.id)} onChange={(e) => setSelected((prev) => e.target.checked ? [...prev, it.id] : prev.filter((id) => id !== it.id))} />
                <div className="flex-1">
                  <div className="font-medium">{it.name}</div>
                  <div className="text-xs opacity-70">{it.category} · reliability {Math.round(it.reliability * 100)}%</div>
                </div>
                <div className="text-xs opacity-70">${it.cost_hint}</div>
              </label>
            </li>
          ))}
        </ul>
      </div>

      {run.isSuccess && (
        <div className="grid md:grid-cols-2 gap-3">
          <div className="rounded-2xl border p-3">
            <h3 className="font-semibold">Responses</h3>
            <ul className="mt-2 space-y-2">
              {run.data.responses.map((r) => (
                <li key={r.id} className="p-2 rounded bg-base-200">
                  <div className="font-medium">{r.interface}</div>
                  <p className="text-sm whitespace-pre-wrap">{r.text}</p>
                  <div className="text-xs mt-1">Citations: {r.citations.map((c, i) => <a key={i} className="link" href={c.url} target="_blank" rel="noreferrer">{c.title}</a>)}</div>
                </li>
              ))}
            </ul>
          </div>
          <div className="rounded-2xl border p-3">
            <h3 className="font-semibold">Synthesized</h3>
            <p className="text-sm whitespace-pre-wrap">{run.data.synthesized.text}</p>
            <div className="text-xs mt-1">Citations: {run.data.synthesized.citations.map((c, i) => <a key={i} className="link" href={c.url} target="_blank" rel="noreferrer">{c.title}</a>)}</div>
            <div className="mt-3">
              <button className="btn btn-outline btn-sm" onClick={() => alert('Attached to Case (stub).')}>Attach to Case</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
