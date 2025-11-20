import React from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { runRecords } from '../mockData';
import { useDebouncedValue, useLiveLogFeed } from '../hooks/useMaestroHooks';
import { useReasonForAccess } from '../ReasonForAccessContext';

interface LogLine {
  ts: string;
  level: 'info' | 'warn' | 'error';
  message: string;
}

function buildLogs(runId: string): LogLine[] {
  const base = Date.now();
  const lines: LogLine[] = [];
  for (let index = 0; index < 800; index += 1) {
    const level =
      index % 180 === 0 ? 'error' : index % 40 === 0 ? 'warn' : 'info';
    lines.push({
      ts: new Date(base + index * 200).toISOString(),
      level,
      message:
        level === 'error'
          ? `ERROR [${runId}] step_${index % 12} failed at ${index}s: exit 137`
          : level === 'warn'
            ? `WARN [${runId}] cache miss for dependency bucket=${index % 6}`
            : `INFO [${runId}] processed chunk ${index.toString().padStart(3, '0')}`,
    });
  }
  return lines;
}

export function RunViewPage() {
  const { runId = 'run-1' } = useParams();
  const run =
    runRecords.find((candidate) => candidate.id === runId) ?? runRecords[0];
  const navigate = useNavigate();
  const { requestReason } = useReasonForAccess();
  const [activeTab, setActiveTab] = React.useState<
    'logs' | 'artifacts' | 'metadata'
  >('logs');
  const allLogs = React.useMemo(() => buildLogs(run.id), [run.id]);
  const [followTail, setFollowTail] = React.useState(true);
  const visibleLogs = useLiveLogFeed(
    allLogs.map(
      (line) => `${line.ts} ${line.level.toUpperCase()} ${line.message}`,
    ),
    {
      followTail,
      intervalMs: 250,
    },
  );
  const [search, setSearch] = React.useState('');
  const debouncedSearch = useDebouncedValue(search, 250);
  const [highlightIndex, setHighlightIndex] = React.useState<number | null>(
    null,
  );
  const containerRef = React.useRef<HTMLDivElement | null>(null);
  const [artifactsReason, setArtifactsReason] = React.useState('');

  React.useEffect(() => {
    if (!debouncedSearch) {
      setHighlightIndex(null);
      return;
    }
    const idx = visibleLogs.findIndex((line) =>
      line.toLowerCase().includes(debouncedSearch.toLowerCase()),
    );
    if (idx >= 0) {
      setHighlightIndex(idx);
      if (containerRef.current) {
        containerRef.current.scrollTo({ top: idx * 22, behavior: 'smooth' });
      }
    }
  }, [debouncedSearch, visibleLogs]);

  const handleJumpToError = React.useCallback(() => {
    const idx = visibleLogs.findIndex((line) => line.includes('ERROR'));
    if (idx >= 0) {
      setHighlightIndex(idx);
      if (containerRef.current)
        containerRef.current.scrollTo({ top: idx * 22, behavior: 'smooth' });
    }
  }, [visibleLogs]);

  const handleTabChange = React.useCallback(
    async (tab: 'logs' | 'artifacts' | 'metadata') => {
      if (tab === 'artifacts' && !artifactsReason) {
        const reason = await requestReason(`Artifacts for ${run.id}`);
        setArtifactsReason(reason);
      }
      setActiveTab(tab);
    },
    [artifactsReason, requestReason, run.id],
  );

  return (
    <div className="flex h-full flex-col gap-4">
      <header className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <button
            type="button"
            onClick={() => navigate(-1)}
            className="text-sm text-emerald-400 hover:text-emerald-300"
          >
            ← Back
          </button>
          <h1 className="mt-2 text-2xl font-semibold text-white">
            Run {run.id}
          </h1>
          <p className="text-sm text-slate-400">
            Streaming logs with follow-tail and client search under 250ms on 50k
            lines.
          </p>
        </div>
        <div className="flex items-center gap-2 text-xs text-slate-300">
          <span className="rounded-full border border-emerald-400/60 px-2 py-1 text-emerald-300">
            {run.status}
          </span>
          <span>{run.environment}</span>
          <span>{run.durationSeconds}s</span>
          <span>Retries: {run.retries}</span>
        </div>
      </header>
      <section className="rounded-2xl border border-slate-800 bg-slate-900/60 p-4 text-sm text-slate-200">
        <div className="grid gap-3 md:grid-cols-3">
          <div>
            <p className="text-xs uppercase text-slate-400">Commit</p>
            <p className="font-mono text-emerald-300">{run.commit}</p>
          </div>
          <div>
            <p className="text-xs uppercase text-slate-400">Branch</p>
            <p>{run.branch}</p>
          </div>
          <div>
            <p className="text-xs uppercase text-slate-400">Initiator</p>
            <p>{run.initiator}</p>
          </div>
        </div>
      </section>
      <section className="flex flex-col gap-4 lg:flex-row">
        <div className="flex-1 rounded-2xl border border-slate-800 bg-slate-950/60">
          <div className="flex items-center justify-between border-b border-slate-800/70 px-4 py-3 text-sm">
            <div className="space-x-2">
              <button
                type="button"
                onClick={() => setActiveTab('logs')}
                className={`rounded-lg px-3 py-1 ${activeTab === 'logs' ? 'bg-emerald-500 text-slate-950' : 'text-slate-300 hover:text-white'}`}
              >
                Logs
              </button>
              <button
                type="button"
                onClick={() => void handleTabChange('artifacts')}
                className={`rounded-lg px-3 py-1 ${activeTab === 'artifacts' ? 'bg-emerald-500 text-slate-950' : 'text-slate-300 hover:text-white'}`}
              >
                Artifacts
              </button>
              <button
                type="button"
                onClick={() => setActiveTab('metadata')}
                className={`rounded-lg px-3 py-1 ${activeTab === 'metadata' ? 'bg-emerald-500 text-slate-950' : 'text-slate-300 hover:text-white'}`}
              >
                Metadata
              </button>
            </div>
            {activeTab === 'logs' ? (
              <div className="flex items-center gap-3 text-xs">
                <label className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={followTail}
                    onChange={(event) => setFollowTail(event.target.checked)}
                    className="h-4 w-4 rounded border-slate-600 bg-slate-950"
                  />
                  Follow tail
                </label>
                <button
                  type="button"
                  onClick={handleJumpToError}
                  className="rounded-lg border border-emerald-400/50 px-2 py-1 text-emerald-300 hover:border-emerald-300"
                >
                  Jump to first error
                </button>
                <input
                  className="rounded-lg border border-slate-700 bg-slate-950 px-2 py-1 text-xs text-slate-100"
                  placeholder="Find"
                  value={search}
                  onChange={(event) => setSearch(event.target.value)}
                />
              </div>
            ) : null}
          </div>
          <div className="h-[420px] overflow-auto" ref={containerRef}>
            {activeTab === 'logs' ? (
              <pre className="space-y-1 px-4 py-3 text-xs leading-5">
                {visibleLogs.map((line, index) => (
                  <code

                    key={`${line}-${index}`}
                    className={`block rounded px-2 py-1 ${highlightIndex === index ? 'bg-emerald-500/30 text-white' : 'text-slate-300'}`}
                  >
                    {line}
                  </code>
                ))}
              </pre>
            ) : null}
            {activeTab === 'artifacts' ? (
              <div className="p-4 text-sm text-slate-300">
                <p className="text-xs text-slate-400">Reason captured:</p>
                <p className="font-medium text-emerald-300">
                  {artifactsReason}
                </p>
                <ul className="mt-3 space-y-2">
                  <li className="rounded border border-slate-800/60 p-3">
                    artifact.tar.gz • sha256:abc…123
                  </li>
                  <li className="rounded border border-slate-800/60 p-3">
                    sbom.json • 52KB
                  </li>
                </ul>
              </div>
            ) : null}
            {activeTab === 'metadata' ? (
              <div className="space-y-2 p-4 text-xs text-slate-400">
                <p>Started: {new Date(run.startedAt).toLocaleString()}</p>
                <p>Queue → Start: 45s</p>
                <p>Auto-retry: disabled</p>
                <p>Provenance: manifest #12</p>
              </div>
            ) : null}
          </div>
        </div>
        <aside className="w-full max-w-sm rounded-2xl border border-slate-800 bg-slate-900/60 p-4 text-sm text-slate-200">
          <h2 className="text-lg font-semibold text-white">Explainability</h2>
          <ul className="mt-3 space-y-2 text-xs text-slate-300">
            <li>Auto-retry skipped: deterministic failure signature.</li>
            <li>Gate fail reason: missing change ticket #4821.</li>
            <li>
              Suggested fix: regenerate cache for step_04 (owners: alex, jules).
            </li>
          </ul>
          <div className="mt-5 rounded-xl border border-slate-800 bg-slate-950/70 p-3 text-xs text-slate-400">
            <p className="font-semibold text-slate-200">Provenance</p>
            <p className="mt-1">
              Logs signed with digest sha256:b12… fed by SSE channel. Copy uses
              provenance chips.
            </p>
          </div>
        </aside>
      </section>
    </div>
  );
}

export default RunViewPage;
