import React, { useEffect, useState } from 'react';
import { api } from '../api';

export default function AgentTimeline({ runId }: { runId: string }) {
  const { getAgentSteps, streamAgent, actOnAgent } = api();
  const [steps, setSteps] = useState<any[]>([]);
  useEffect(() => {
    let off = () => {};
    (async () => {
      try {
        const r = await getAgentSteps(runId);
        setSteps(r.steps || []);
      } catch {}
      off = streamAgent(runId, (s) =>
        setSteps((x) => {
          const nx = x.filter((y) => y.id !== s.id);
          return [...nx, s];
        }),
      );
    })();
    return () => off();
  }, [runId]);

  return (
    <section className="rounded-2xl border p-4 space-y-2" aria-label="Agent timeline">
      {steps
        .sort((a, b) => a.ts - b.ts)
        .map((s) => (
          <div key={s.id} className="rounded border p-3">
            <div className="flex items-center justify-between">
              <div className="text-sm text-gray-500">{s.role}</div>
              <span
                className={`text-xs px-2 py-0.5 rounded text-white ${s.state === 'approved' ? 'bg-emerald-600' : s.state === 'blocked' ? 'bg-red-600' : s.state === 'need_approval' ? 'bg-amber-500' : 'bg-slate-500'}`}
              >
                {s.state}
              </span>
            </div>
            <pre className="whitespace-pre-wrap text-sm">{s.text}</pre>
            {s.state === 'need_approval' && (
              <div className="mt-2 flex gap-2">
                <button
                  className="rounded bg-emerald-600 px-2 py-1 text-white"
                  onClick={() => actOnAgent(runId, { stepId: s.id, action: 'approve' })}
                >
                  Approve
                </button>
                <button
                  className="rounded bg-red-600 px-2 py-1 text-white"
                  onClick={() => actOnAgent(runId, { stepId: s.id, action: 'block' })}
                >
                  Block
                </button>
                <button
                  className="rounded border px-2 py-1"
                  onClick={async () => {
                    const patch = prompt('Edit step text', s.text) || s.text;
                    await actOnAgent(runId, { stepId: s.id, action: 'edit', patch });
                  }}
                >
                  Edit & approve
                </button>
              </div>
            )}
          </div>
        ))}
      {!steps.length && <div className="text-sm text-gray-500">No agent steps yet</div>}
    </section>
  );
}
