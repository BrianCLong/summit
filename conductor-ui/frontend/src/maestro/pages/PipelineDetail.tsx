import React from 'react';
import { useParams } from 'react-router-dom';
import { api } from '../api';
import GrafanaPanel from '../components/GrafanaPanel';
import ErrorBudgetBurn from '../components/ErrorBudgetBurn';
import { api } from '../api';

export default function PipelineDetail() {
  const { id = '' } = useParams();
  const {
    getPipeline,
    planPipeline,
    validatePipeline,
    postPolicyExplain,
    getPipelineBaseline,
    putPipelineBaseline,
  } = api();
  const [pipe, setPipe] = React.useState<any | null>(null);
  const [yaml, setYaml] = React.useState('');
  const [plan, setPlan] = React.useState<any | null>(null);
  const [msg, setMsg] = React.useState<string | null>(null);
  const [tab, setTab] = React.useState<
    'overview' | 'validate' | 'policy' | 'observability'
  >('overview');
  const pipelineIdOrName = (pipe?.name ||
    id ||
    'intelgraph_pr_build') as string;
  const [baseline, setBaseline] = React.useState<any>(null);
  React.useEffect(() => {
    (async () => {
      const p = await getPipeline(id);
      setPipe(p);
      setYaml(p.yaml || '');
      try {
        const b = await getPipelineBaseline(pipelineIdOrName);
        setBaseline(b.baseline || {});
      } catch {}
    })();
  }, [id]);
  return (
    <section className="space-y-3 p-1" aria-label="Pipeline detail">
      <h2 className="text-lg font-semibold">Pipeline: {pipe?.name || id}</h2>
      <div role="tablist" className="flex gap-2">
        <button
          role="tab"
          aria-selected={tab === 'overview'}
          onClick={() => setTab('overview')}
          className="rounded border px-2 py-1"
        >
          Overview
        </button>
        <button
          role="tab"
          aria-selected={tab === 'validate'}
          onClick={() => setTab('validate')}
          className="rounded border px-2 py-1"
        >
          Validate
        </button>
        <button
          role="tab"
          aria-selected={tab === 'policy'}
          onClick={() => setTab('policy')}
          className="rounded border px-2 py-1"
        >
          Policy
        </button>
        <button
          role="tab"
          aria-selected={tab === 'observability'}
          onClick={() => setTab('observability')}
          className="rounded border px-2 py-1"
        >
          Observability
        </button>
      </div>

      {tab === 'overview' && (
        <div className="grid grid-cols-1 gap-3 lg:grid-cols-2">
          <section className="rounded border bg-white p-3">
            <div className="mb-2 text-sm font-semibold text-slate-700">
              YAML
            </div>
            <textarea
              aria-label="Pipeline YAML"
              className="h-[50vh] w-full rounded border p-2 font-mono text-xs"
              value={yaml}
              onChange={(e) => setYaml(e.target.value)}
            />
          </section>
          <section className="rounded border bg-white p-3">
            <div className="text-sm text-slate-600">
              Owner: {pipe?.owner || '—'}
            </div>
            <div className="text-sm text-slate-600">
              Version: {pipe?.version || '—'}
            </div>
          </section>
        </div>
      )}

      {tab === 'validate' && (
        <div className="grid grid-cols-1 gap-3 lg:grid-cols-2">
          <section className="rounded border bg-white p-3">
            <div className="mb-2 text-sm font-semibold text-slate-700">
              YAML
            </div>
            <textarea
              aria-label="Pipeline YAML"
              className="h-[50vh] w-full rounded border p-2 font-mono text-xs"
              value={yaml}
              onChange={(e) => setYaml(e.target.value)}
            />
            <div className="mt-2 flex flex-wrap items-center justify-end gap-2">
              <button
                className="rounded border px-2 py-1 text-sm"
                onClick={async () => {
                  try {
                    const r = await validatePipeline(id, { yaml });
                    setMsg(r.valid ? 'Valid ✔' : 'Invalid');
                    setTimeout(() => setMsg(null), 1500);
                  } catch (e: any) {
                    setMsg(e?.message || 'Validate failed');
                  }
                }}
              >
                Validate
              </button>
              <button
                className="rounded border px-2 py-1 text-sm"
                onClick={async () => {
                  try {
                    const r = await planPipeline(id, { yaml });
                    setPlan(r);
                    setMsg('Plan computed');
                    setTimeout(() => setMsg(null), 1500);
                  } catch (e: any) {
                    setMsg(e?.message || 'Plan failed');
                  }
                }}
              >
                Plan Preview
              </button>
              {msg && <span className="text-xs text-slate-500">{msg}</span>}
            </div>
          </section>
          <section className="rounded border bg-white p-3">
            <div className="mb-2 text-sm font-semibold text-slate-700">
              Diff & Impact
            </div>
            {!plan && (
              <div className="text-sm text-slate-500">
                Click Plan Preview to see changes.
              </div>
            )}
            {plan && (
              <div className="text-sm">
                <div className="mb-2 text-slate-700">Changes</div>
                <ul className="list-disc pl-5">
                  {(plan.changes || []).map((c: any, i: number) => (
                    <li key={i}>
                      {c.type} {c.path}: {c.before} → {c.after}
                    </li>
                  ))}
                </ul>
                <div className="mt-3 text-slate-700">
                  Cost delta: ${plan.costEstimate?.delta ?? 0}
                </div>
              </div>
            )}
          </section>
        </div>
      )}

      {tab === 'policy' && (
        <section className="rounded border bg-white p-3">
          <div className="mb-2 text-sm font-semibold text-slate-700">
            Policy Explain
          </div>
          <div>
            <button
              className="rounded border px-2 py-1 text-xs"
              onClick={async () => {
                try {
                  const r = await postPolicyExplain({
                    input: { yaml, changes: plan?.changes || [] },
                  });
                  setPlan({ ...plan, explain: r });
                } catch {}
              }}
            >
              Explain (Policy)
            </button>
          </div>
          {plan?.explain && (
            <div className="mt-2 rounded border bg-slate-50 p-2 text-xs">
              Decision: {plan.explain.allowed ? 'Allow' : 'Deny'}
              <br />
              Rule: <span className="font-mono">{plan.explain.rulePath}</span>
              <br />
              Reasons: {(plan.explain.reasons || []).join('; ')}
            </div>
          )}
        </section>
      )}

      {tab === 'observability' && (
        <div
          role="tabpanel"
          aria-label="Pipeline observability"
          className="space-y-3"
        >
          <section className="rounded-2xl border p-4 space-y-2">
            <div className="text-sm font-medium">Eval baselines</div>
            <div className="grid grid-cols-1 gap-2 md:grid-cols-4">
              <label className="text-sm">
                P99 latency (ms)
                <input
                  className="w-full rounded border px-2 py-1"
                  value={baseline?.latencyMs || 600000}
                  onChange={(e) =>
                    setBaseline({
                      ...(baseline || {}),
                      latencyMs: Number(e.target.value),
                    })
                  }
                />
              </label>
              <label className="text-sm">
                Fail pct
                <input
                  className="w-full rounded border px-2 py-1"
                  value={baseline?.failPct || 0.02}
                  onChange={(e) =>
                    setBaseline({
                      ...(baseline || {}),
                      failPct: Number(e.target.value),
                    })
                  }
                />
              </label>
              <label className="text-sm">
                Cost (USD)
                <input
                  className="w-full rounded border px-2 py-1"
                  value={baseline?.costUsd || 2.5}
                  onChange={(e) =>
                    setBaseline({
                      ...(baseline || {}),
                      costUsd: Number(e.target.value),
                    })
                  }
                />
              </label>
              <label className="text-sm">
                Policy errs
                <input
                  className="w-full rounded border px-2 py-1"
                  value={baseline?.policy || 0}
                  onChange={(e) =>
                    setBaseline({
                      ...(baseline || {}),
                      policy: Number(e.target.value),
                    })
                  }
                />
              </label>
            </div>
            <button
              className="rounded bg-blue-600 px-3 py-2 text-white"
              onClick={async () => {
                try {
                  await putPipelineBaseline(pipelineIdOrName, baseline);
                } catch {}
              }}
            >
              Save baseline
            </button>
          </section>
          <ErrorBudgetBurn pipeline={pipelineIdOrName} />
          <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
            <GrafanaPanel
              uid={
                (window as any).__MAESTRO_CFG__?.grafanaDashboards?.slo ||
                'maestro-slo'
              }
              vars={{ pipeline: pipelineIdOrName }}
            />
            <GrafanaPanel
              uid={
                (window as any).__MAESTRO_CFG__?.grafanaDashboards?.overview ||
                'maestro-overview'
              }
              vars={{ pipeline: pipelineIdOrName }}
            />
            <GrafanaPanel
              uid={
                (window as any).__MAESTRO_CFG__?.grafanaDashboards?.cost ||
                'maestro-cost'
              }
              vars={{ pipeline: pipelineIdOrName }}
            />
          </div>
        </div>
      )}
    </section>
  );
}
