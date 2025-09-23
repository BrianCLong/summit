import React from 'react';
import { api } from '../api';

export default function PolicyExplain({ context }: { context: any }) {
  const { postPolicyExplain } = api();
  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [result, setResult] = React.useState<any | null>(null);

  const runExplain = async () => {
    setLoading(true);
    setError(null);
    try {
      const payload = { input: context };
      const resp = await postPolicyExplain(payload);
      setResult(resp);
    } catch (e: any) {
      setError(e?.message || 'Explain failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <section className="rounded border bg-white p-3">
      <div className="mb-2 flex items-center justify-between">
        <h3 className="text-sm font-semibold text-slate-700">Policy Explain</h3>
        <button
          className="rounded border px-2 py-1 text-xs"
          onClick={runExplain}
          disabled={loading}
        >
          Explain
        </button>
      </div>
      {loading && <div className="text-sm text-slate-600">Explaining…</div>}
      {error && <div className="text-sm text-red-700">{error}</div>}
      {result && (
        <div className="space-y-2 text-sm">
          <div>
            Decision: <span className="font-semibold">{result.allowed ? 'Allow' : 'Deny'}</span>
          </div>
          <div>
            Rule Path: <span className="font-mono text-xs">{result.rulePath || '—'}</span>
          </div>
          <div>
            Reasons:
            <ul className="list-disc pl-5">
              {(result.reasons || []).map((r: string, i: number) => (
                <li key={i}>{r}</li>
              ))}
            </ul>
          </div>
          {result.inputs && (
            <details>
              <summary className="cursor-pointer">Inputs</summary>
              <pre className="overflow-auto rounded bg-slate-50 p-2 text-xs">
                {JSON.stringify(result.inputs, null, 2)}
              </pre>
            </details>
          )}
          {result.trace && (
            <details>
              <summary className="cursor-pointer">Rego Trace</summary>
              <pre className="overflow-auto rounded bg-slate-50 p-2 text-[11px]">
                {Array.isArray(result.trace)
                  ? result.trace.join('\n')
                  : JSON.stringify(result.trace, null, 2)}
              </pre>
            </details>
          )}
          {result.whatIf && (
            <details>
              <summary className="cursor-pointer">What-if Simulation</summary>
              <pre className="overflow-auto rounded bg-slate-50 p-2 text-xs">
                {JSON.stringify(result.whatIf, null, 2)}
              </pre>
            </details>
          )}
        </div>
      )}
    </section>
  );
}
