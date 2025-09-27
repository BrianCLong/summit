import React from 'react';
import { useParams } from 'react-router-dom';

export default function RunViewer() {
  const { id = '' } = useParams();
  const [data, setData] = React.useState<any>(null);
  const [err, setErr] = React.useState<string>('');

  React.useEffect(() => {
    let alive = true;
    const tick = async () => {
      try {
        const r = await fetch(`/api/maestro/v1/runs/${encodeURIComponent(id)}`);
        if (!r.ok) throw new Error(String(r.status));
        const j = await r.json();
        if (alive) setData(j);
      } catch (e: any) {
        if (alive) setErr(String(e));
      }
    };
    tick();
    const t = setInterval(tick, 2000);
    return () => {
      alive = false;
      clearInterval(t);
    };
  }, [id]);

  const traceId = (data as any)?.traceId || (data as any)?.otelTraceId;
  const tempo = (import.meta as any).env.VITE_OBS_TEMPO_URL || '';
  const tracesLink = traceId && tempo ? `${tempo}/search?traceID=${encodeURIComponent(traceId)}` : undefined;

  return (
    <div style={{ padding: 24 }}>
      <h2>Run Viewer — {id}</h2>
      {err && <p style={{ color: 'crimson' }}>Error: {err}</p>}
      {!data && !err && <p>Loading…</p>}
      {data && (
        <>
          <pre aria-label="run-json" style={{ background: '#111', color: '#ccc', padding: 12, overflow: 'auto', maxHeight: 300 }}>
            {JSON.stringify(data, null, 2)}
          </pre>
          {tracesLink && (
            <a href={tracesLink} target="_blank" rel="noreferrer">
              Open in Traces
            </a>
          )}
        </>
      )}
    </div>
  );
}

