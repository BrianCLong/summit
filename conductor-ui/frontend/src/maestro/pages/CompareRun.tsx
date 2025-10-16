import React from 'react';
import { useParams, Link } from 'react-router-dom';
import { api } from '../api';
import DAG from '../components/DAG';

export default function CompareRun() {
  const { id = '' } = useParams();
  const { getRunGraphCompare } = api();
  const [mode, setMode] = React.useState<'overlay' | 'side'>('side');
  const [data, setData] = React.useState<any | null>(null);
  const [err, setErr] = React.useState<string | null>(null);
  React.useEffect(() => {
    (async () => {
      try {
        const r = await getRunGraphCompare(id);
        setData(r);
      } catch (e: any) {
        setErr(e?.message || 'Failed');
      }
    })();
  }, [id]);

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold">Compare Run: {id}</h2>
        <div className="flex gap-2">
          <button
            className={`rounded border px-2 py-1 text-sm ${mode === 'overlay' ? 'bg-indigo-600 text-white' : ''}`}
            onClick={() => setMode('overlay')}
          >
            Overlay
          </button>
          <button
            className={`rounded border px-2 py-1 text-sm ${mode === 'side' ? 'bg-indigo-600 text-white' : ''}`}
            onClick={() => setMode('side')}
          >
            Side-by-side
          </button>
        </div>
      </div>
      <div className="text-sm">
        <Link
          className="text-indigo-700 hover:underline"
          to={`/maestro/runs/${id}`}
        >
          Back to run
        </Link>
      </div>
      {err && <div className="text-sm text-red-700">{err}</div>}
      {data && (
        <div className="space-y-3">
          {mode === 'side' && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <section className="rounded border bg-white p-3">
                <div className="mb-2 text-sm font-semibold text-slate-700">
                  Baseline {data.baselineRunId ? `(${data.baselineRunId})` : ''}
                </div>
                <DAG
                  nodes={(data.baseline?.nodes || []).map((n: any) => ({
                    id: n.id,
                    label: n.label || n.id,
                    state: 'succeeded',
                  }))}
                  edges={(data.baseline?.edges || []).map((e: any) => ({
                    from: e.source || e.from,
                    to: e.target || e.to,
                  }))}
                />
              </section>
              <section className="rounded border bg-white p-3">
                <div className="mb-2 text-sm font-semibold text-slate-700">
                  Current
                </div>
                <DAG
                  nodes={(data.current?.nodes || []).map((n: any) => ({
                    id: n.id,
                    label: n.label || n.id,
                    state:
                      n.status === 'failed'
                        ? 'failed'
                        : n.status === 'running'
                          ? 'running'
                          : 'succeeded',
                  }))}
                  edges={(data.current?.edges || []).map((e: any) => ({
                    from: e.source || e.from,
                    to: e.target || e.to,
                  }))}
                />
              </section>
            </div>
          )}
          {mode === 'overlay' && (
            <section className="rounded border bg-white p-3">
              <div className="mb-2 text-sm font-semibold text-slate-700">
                Overlay
              </div>
              <DAG
                nodes={(data.current?.nodes || []).map((n: any) => ({
                  id: n.id,
                  label: n.label || n.id,
                  state:
                    n.status === 'failed'
                      ? 'failed'
                      : n.status === 'running'
                        ? 'running'
                        : 'succeeded',
                }))}
                edges={(data.current?.edges || []).map((e: any) => ({
                  from: e.source || e.from,
                  to: e.target || e.to,
                }))}
              />
            </section>
          )}
        </div>
      )}
    </div>
  );
}
