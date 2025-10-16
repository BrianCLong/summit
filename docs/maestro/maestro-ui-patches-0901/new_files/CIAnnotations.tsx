import React, { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';

type Annotation = {
  runId: string;
  level: 'notice' | 'warning' | 'failure';
  file: string;
  line: number;
  message: string;
  url: string;
  createdAt?: string;
};

async function fetchAnnotations(since?: string): Promise<Annotation[]> {
  const base =
    (window as any).__MAESTRO_CFG__?.gatewayBase ?? '/api/maestro/v1';
  const qs = new URLSearchParams();
  if (since) qs.set('since', since);
  const res = await fetch(`${base}/ci/annotations?${qs.toString()}`, {
    credentials: 'omit',
  });
  if (!res.ok) throw new Error('Failed to load annotations');
  return res.json();
}

export default function CIAnnotationsPage() {
  const [since, setSince] = useState<string>(''); // ISO string or blank
  const [data, setData] = useState<Annotation[] | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const grouped = useMemo(() => {
    if (!data) return {};
    return data.reduce((acc: Record<string, Annotation[]>, a) => {
      (acc[a.level] ||= []).push(a);
      return acc;
    }, {});
  }, [data]);

  useEffect(() => {
    setLoading(true);
    setErr(null);
    fetchAnnotations(since || undefined)
      .then(setData)
      .catch((e) => setErr(String(e)))
      .finally(() => setLoading(false));
  }, [since]);

  return (
    <div className="p-6 space-y-4">
      <header className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">CI Annotations</h1>
        <div className="flex items-center gap-2">
          <label className="text-sm">Since</label>
          <input
            type="datetime-local"
            value={since}
            onChange={(e) => setSince(e.target.value)}
            className="border rounded px-2 py-1"
            aria-label="Filter since timestamp"
          />
        </div>
      </header>

      {loading && <div>Loading…</div>}
      {err && <div className="text-red-600">Error: {err}</div>}

      {data && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {(['failure', 'warning', 'notice'] as const).map((level) => (
            <section key={level} className="border rounded-xl p-4 shadow-sm">
              <h2 className="text-lg font-medium capitalize">
                {level}{' '}
                <span className="text-sm text-gray-500">
                  ({grouped[level]?.length ?? 0})
                </span>
              </h2>
              <ul className="mt-2 space-y-2 max-h-[60vh] overflow-auto pr-2">
                {(grouped[level] ?? []).map((a, idx) => (
                  <li key={idx} className="border rounded p-2">
                    <div className="text-sm text-gray-600">
                      Run{' '}
                      <Link
                        className="underline"
                        to={`/maestro/runs/${a.runId}`}
                      >
                        #{a.runId}
                      </Link>
                    </div>
                    <div className="font-mono text-sm">
                      {a.file}:{a.line}
                    </div>
                    <div className="text-sm">{a.message}</div>
                    <div>
                      <a
                        className="text-blue-600 underline"
                        href={a.url}
                        target="_blank"
                        rel="noreferrer"
                      >
                        Open in GitHub
                      </a>
                    </div>
                  </li>
                ))}
              </ul>
            </section>
          ))}
        </div>
      )}
    </div>
  );
}
