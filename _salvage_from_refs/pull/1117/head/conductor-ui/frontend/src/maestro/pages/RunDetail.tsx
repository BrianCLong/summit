import React from 'react';
import { useParams } from 'react-router-dom';
import { api } from '../api';
import AgentTimeline from '../components/AgentTimeline';
import DAG, { DagNode, DagEdge } from '../components/DAG';
import PolicyExplain from '../components/PolicyExplain';
import { getMaestroConfig } from '../config';
import { useFocusTrap } from '../utils/useFocusTrap';
import { useResilientStream } from '../utils/streamUtils';
import { sanitizeLogs } from '../utils/secretUtils';
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip } from 'recharts';
import PolicyExplainDialog from '../components/PolicyExplainDialog';

function Tabs({
  value,
  onChange,
  tabs,
}: {
  value: string;
  onChange: (v: string) => void;
  tabs: string[];
}) {
  return (
    <div role="tablist" className="mb-3 flex gap-2 border-b">
      {tabs.map((t) => (
        <button
          key={t}
          role="tab"
          aria-selected={value === t}
          className={[
            'rounded-t px-3 py-1.5 text-sm',
            value === t
              ? 'bg-white font-semibold text-slate-800 border border-b-transparent'
              : 'text-slate-600 hover:bg-slate-100',
          ].join(' ')}
          onClick={() => onChange(t)}
        >
          {t}
        </button>
      ))}
    </div>
  );
}

export default function RunDetail() {
  const { id = '' } = useParams();
  const {
    useRun,
    useRunGraph,
    useRunLogs,
    usePolicyDecisions,
    useArtifacts,
    useRunNodeMetrics,
    useRunNodeEvidence,
    getCIAnnotations,
    getRunComparePrevious,
    getRunScorecard,
    checkGate,
    getRunNodeRouting,
    getRunEvidence,
  } = api();
  const { data: run } = useRun(id);
  const { nodes, edges } = useRunGraph(id);
  const [selectedNode, setSelectedNode] = React.useState<string | null>(null);

  // Use resilient streaming for logs
  const streamUrl = `/api/maestro/v1/runs/${id}/logs?stream=true${selectedNode ? `&nodeId=${selectedNode}` : ''}`;
  const { connection, connected, events, error, reconnect } = useResilientStream(streamUrl, {
    maxRetries: 15,
    initialRetryDelay: 500,
    maxRetryDelay: 10000,
    heartbeatInterval: 20000,
  });

  // Convert stream events to log lines and sanitize them
  const lines = React.useMemo(() => {
    return sanitizeLogs(
      events.map((event) => event.data?.text || JSON.stringify(event.data)).filter(Boolean),
    );
  }, [events]);

  const clearLogs = React.useCallback(() => {
    // In a real implementation, this would signal the backend to restart the stream
    reconnect();
  }, [reconnect]);
  const [ci, setCi] = React.useState<any[] | null>(null);
  const [cmp, setCmp] = React.useState<any | null>(null);
  const { decisions } = usePolicyDecisions(id);
  const { artifacts } = useArtifacts(id);
  const [tab, setTab] = React.useState('Overview');
  const [sc, setSc] = React.useState<any | null>(null);
  const [gate, setGate] = React.useState<any | null>(null);
  React.useEffect(() => {
    (async () => {
      try {
        const s = await getRunScorecard(id);
        setSc(s);
      } catch {}
      try {
        const g = await checkGate({ runId: id, pipeline: 'intelgraph_pr_build' });
        setGate(g);
      } catch {}
    })();
  }, [id]);
  const [selectedNode, setSelectedNode] = React.useState<string | null>(null);
  const { metrics } = useRunNodeMetrics(id, selectedNode);
  const { evidence: nodeEvidence } = useRunNodeEvidence(id, selectedNode);
  const [replayOpen, setReplayOpen] = React.useState(false);
  const [replayReason, setReplayReason] = React.useState('');
  const cfg = getMaestroConfig();
  const replayRef = React.useRef<HTMLDivElement>(null);
  useFocusTrap(replayRef, replayOpen, () => setReplayOpen(false));

  return (
    <>
      <div className="space-y-3">
        <header className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <div className="text-xs text-slate-500">Run</div>
            <h1 className="font-mono text-lg">{id}</h1>
            <div className="text-xs text-slate-500">
              Pipeline: {run?.pipeline} • Status:{' '}
              <span className="rounded bg-slate-200 px-2 py-0.5 text-xs">{run?.status}</span>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button className="rounded border px-2 py-1 text-sm" title="Pause">
              Pause
            </button>
            <button className="rounded border px-2 py-1 text-sm" title="Cancel">
              Cancel
            </button>
            <button className="rounded border px-2 py-1 text-sm" title="Retry">
              Retry
            </button>
            <button
              className="rounded border px-2 py-1 text-sm"
              title="Replay from node"
              disabled={!selectedNode}
            >
              Replay from node
            </button>
            {run?.ghRunUrl && (
              <a
                className="rounded border px-2 py-1 text-sm text-indigo-700"
                href={run.ghRunUrl}
                target="_blank"
                rel="noreferrer"
              >
                Open GH logs
              </a>
            )}
            {run?.traceId && (
              <a
                className="rounded border px-2 py-1 text-sm text-blue-600"
                href={`${cfg.grafanaBase}/explore?orgId=1&left=%5B%22now-1h%22,%22now%22,%22Tempo%22,%7B%22query%22:%22${run.traceId}%22%7D,%7B%22ui%22:%22trace%22%7D%5D`}
                target="_blank"
                rel="noreferrer"
              >
                View Trace
              </a>
            )}
            <button
              className="rounded border px-2 py-1 text-sm"
              onClick={async () => {
                try {
                  const r = await getRunComparePrevious(id);
                  setCmp(r);
                  setTab('Events');
                } catch {}
              }}
            >
              Compare prev
            </button>
            <button
              className="rounded border px-2 py-1 text-sm"
              title="Create ticket"
              onClick={async () => {
                try {
                  const base = cfg.gatewayBase?.replace(/\/$/, '') || '';
                  if (base) {
                    await fetch(`${base}/tickets`, {
                      method: 'POST',
                      headers: { 'content-type': 'application/json' },
                      body: JSON.stringify({
                        provider: 'github',
                        title: `Run ${id} failed`,
                        labels: ['maestro'],
                        links: { runId: id },
                      }),
                    });
                    alert('Ticket created');
                  }
                } catch {}
              }}
            >
              Create ticket
            </button>
          </div>
        </header>

        <Tabs
          value={tab}
          onChange={setTab}
          tabs={[
            'Overview',
            'DAG',
            'Timeline',
            'Logs',
            'Artifacts',
            'Evidence',
            'Policies',
            'Scorecard',
            'Agent',
            'Approvals',
            'Events',
          ]}
        />

        {tab === 'Overview' && (
          <div className="grid grid-cols-1 gap-3 lg:grid-cols-3">
            <section className="rounded border bg-white p-3 lg:col-span-2">
              <h3 className="mb-2 text-sm font-semibold text-slate-700">Timeline</h3>
              <div className="text-sm text-slate-600">
                Started: {run?.startedAt} • Duration: {run?.durationMs} ms • Cost: ${run?.cost}
              </div>
            </section>
            <section className="rounded border bg-white p-3">
              <h3 className="mb-2 text-sm font-semibold text-slate-700">Autonomy & Budget</h3>
              <div className="text-sm text-slate-600">
                Level L{run?.autonomyLevel} • Canary {Math.round((run?.canary ?? 0) * 100)}% •
                Budget cap ${run?.budgetCap}
              </div>
            </section>
          </div>
        )}

        {tab === 'DAG' && (
          <div className="grid grid-cols-1 gap-3 lg:grid-cols-[1fr_360px]">
            <DAG nodes={nodes as DagNode[]} edges={edges as DagEdge[]} onSelect={setSelectedNode} />
            <section className="rounded border bg-white p-3">
              <h3 className="mb-2 text-sm font-semibold text-slate-700">Node Inspector</h3>
              {!selectedNode && (
                <div className="text-sm text-slate-500">
                  Select a node to inspect inputs/outputs, metrics, and logs.
                </div>
              )}
              {selectedNode && (
                <div className="space-y-2 text-sm">
                  <div className="text-slate-600">
                    Node: <span className="font-mono">{selectedNode}</span>
                  </div>
                  <div className="text-slate-600">Retries: 0 • Duration: 320ms</div>
                  <div className="text-xs text-slate-500">
                    Metrics: cpu {metrics?.cpuPct ?? '—'}%, mem {metrics?.memMB ?? '—'}MB, tokens{' '}
                    {metrics?.tokens ?? '—'}, cost ${metrics?.cost ?? '—'}
                  </div>
                  <div className="text-xs text-slate-500">
                    Evidence: {nodeEvidence?.artifacts?.[0]?.name || '—'}; traceId:{' '}
                    {nodeEvidence?.traceId || '—'}
                  </div>
                  <div className="flex gap-2">
                    <button
                      className="rounded border px-2 py-1 text-xs"
                      onClick={() => {
                        setTab('Logs');
                      }}
                    >
                      View node logs
                    </button>
                    {nodeEvidence?.traceId && nodeEvidence?.spanId && (
                      <a
                        className="rounded border px-2 py-1 text-xs text-blue-600"
                        href={`${cfg.grafanaBase}/explore?orgId=1&left=%5B%22now-1h%22,%22now%22,%22Tempo%22,%7B%22query%22:%22${nodeEvidence.traceId}%22%7D,%7B%22ui%22:%22trace%22%7D%5D`}
                        target="_blank"
                        rel="noreferrer"
                      >
                        View Node Trace
                      </a>
                    )}
                    <button
                      className="rounded border px-2 py-1 text-xs"
                      onClick={() => setReplayOpen(true)}
                    >
                      Replay from here
                    </button>
                  </div>
                  <RouterDecision runId={id} nodeId={selectedNode} fetcher={getRunNodeRouting} />
                </div>
              )}
            </section>
          </div>
        )}

        {tab === 'Logs' && (
          <section className="rounded border bg-white">
            <div className="flex items-center justify-between border-b p-2">
              <div className="text-sm font-semibold text-slate-700">Live Logs</div>
              <div className="flex items-center gap-2">
                {run?.traceId && (
                  <button
                    className="rounded border px-2 py-1 text-xs hover:bg-slate-50"
                    onClick={() => setTraceFilter(run.traceId)}
                  >
                    Filter to this trace
                  </button>
                )}
                {traceFilter && (
                  <button
                    className="rounded border px-2 py-1 text-xs hover:bg-slate-50"
                    onClick={() => setTraceFilter(null)}
                  >
                    Clear trace filter
                  </button>
                )}
                <button
                  className="rounded border px-2 py-1 text-xs hover:bg-slate-50"
                  onClick={clearLogs}
                >
                  Clear
                </button>
                <button
                  className="rounded border px-2 py-1 text-xs hover:bg-slate-50"
                  onClick={reconnect}
                  disabled={connected}
                >
                  Reconnect
                </button>
                <div className="flex items-center gap-1">
                  <div
                    className={`w-2 h-2 rounded-full ${
                      connected ? 'bg-green-500' : error ? 'bg-red-500' : 'bg-yellow-500'
                    }`}
                  />
                  <span className="text-[11px] text-slate-500">
                    {connected ? 'Connected' : error ? 'Disconnected' : 'Connecting...'}
                  </span>
                </div>
              </div>
            </div>

            {error && (
              <div className="bg-red-50 border-b border-red-200 p-2 text-sm text-red-800">
                <div className="flex items-center justify-between">
                  <span>⚠️ Stream error: {error}</span>
                  <button onClick={reconnect} className="text-red-600 hover:text-red-800 underline">
                    Retry
                  </button>
                </div>
              </div>
            )}

            <div
              role="log"
              aria-live="polite"
              aria-atomic="false"
              aria-relevant="additions text"
              className="max-h-[50vh] overflow-auto p-2 font-mono text-xs"
            >
              {lines.length === 0 && connected && (
                <div className="text-slate-500 italic">Waiting for log entries...</div>
              )}
              {lines
                .filter(
                  (l) =>
                    (!selectedNode || l.includes(`[${selectedNode}]`)) &&
                    (!traceFilter || l.includes(`traceId=${traceFilter}`)),
                ) // Added traceFilter
                .map((logLine, i) => (
                  <div key={i} className="whitespace-pre-wrap">
                    <span className="text-slate-400">
                      {new Date().toISOString().split('T')[1].slice(0, -1)}
                    </span>{' '}
                    {logLine}
                  </div>
                ))}
            </div>
          </section>
        )}

        {tab === 'Timeline' && (
          <section className="rounded border bg-white p-3">
            <h3 className="mb-2 text-sm font-semibold text-slate-700">Timeline</h3>
            <ul className="text-sm text-slate-700">
              {(nodes || []).map((n: any, i: number) => (
                <li key={n.id} className="border-b py-2 last:border-0">
                  <span className="font-mono text-xs">T+{i * 250}ms</span> • {n.label} — {n.state}
                  {n?.retries ? ` (r${n.retries})` : ''}
                </li>
              ))}
            </ul>
          </section>
        )}

        {tab === 'Scorecard' && (
          <div role="tabpanel" aria-label="Eval scorecard" className="space-y-3">
            {sc ? (
              <div className="rounded-2xl border p-4">
                <div className="mb-2 flex items-center gap-2">
                  <span
                    className={`px-2 py-0.5 rounded text-white text-xs ${sc.overall === 'PASS' ? 'bg-emerald-600' : 'bg-red-600'}`}
                  >
                    {sc.overall}
                  </span>
                  <div className="text-sm text-gray-600">pipeline: {sc.pipeline}</div>
                </div>
                <table className="w-full text-sm">
                  <thead>
                    <tr>
                      <th>Metric</th>
                      <th>Value</th>
                      <th>Target</th>
                      <th>Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {sc.rows.map((r: any) => (
                      <tr key={r.metric}>
                        <td>{r.metric}</td>
                        <td>{r.value}</td>
                        <td>{r.target}</td>
                        <td>{r.pass ? '✓' : '✕'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="text-sm text-gray-500">No scorecard</div>
            )}
            {gate && (
              <div className="rounded-2xl border p-4">
                <div className="mb-2 text-sm text-gray-600">Gate decision</div>
                <div
                  className={`inline-block rounded px-2 py-1 text-white ${gate.status === 'ALLOW' ? 'bg-emerald-600' : 'bg-red-600'}`}
                >
                  {gate.status}
                </div>
                {!!gate.failing?.length && (
                  <div className="mt-2 text-sm">Failing: {gate.failing.join(', ')}</div>
                )}
              </div>
            )}
          </div>
        )}

        {tab === 'Agent' && <AgentTimeline runId={id} />}

        {tab === 'Artifacts' && (
          <section className="rounded border bg-white">
            <div className="border-b p-2 text-sm font-semibold text-slate-700">Artifacts</div>
            <table className="w-full text-sm">
              <thead className="bg-slate-50 text-left text-slate-500">
                <tr>
                  <th className="px-3 py-2">Name</th>
                  <th className="px-3 py-2">Digest</th>
                  <th className="px-3 py-2">Size</th>
                </tr>
              </thead>
              <tbody>
                {artifacts.map((a) => (
                  <tr key={a.digest} className="border-t">
                    <td className="px-3 py-2">{a.name}</td>
                    <td className="px-3 py-2 font-mono text-xs">{a.digest}</td>
                    <td className="px-3 py-2">{a.size}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </section>
        )}

        {tab === 'Evidence' && <RunEvidence runId={id} getRunEvidence={getRunEvidence} />}

        {tab === 'Policies' && (
          <div className="grid grid-cols-1 gap-3 lg:grid-cols-2">
            <section className="rounded border bg-white">
              <div className="border-b p-2 text-sm font-semibold text-slate-700">
                Policy Decisions
              </div>
              <table className="w-full text-sm">
                <thead className="bg-slate-50 text-left text-slate-500">
                  <tr>
                    <th className="px-3 py-2">Action</th>
                    <th className="px-3 py-2">Allowed</th>
                    <th className="px-3 py-2">Reasons</th>
                    <th className="px-3 py-2">Appeal</th>
                  </tr>
                </thead>
                <tbody>
                  {decisions.map((d) => (
                    <tr key={d.id} className="border-t">
                      <td className="px-3 py-2">{d.action}</td>
                      <td className="px-3 py-2">{d.allowed ? 'Yes' : 'No'}</td>
                      <td className="px-3 py-2 text-xs">{d.reasons.join('; ')}</td>
                      <td className="px-3 py-2 text-xs">{d.appealPath}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </section>
            <PolicyExplain context={{ runId: id, nodeId: selectedNode, env: 'prod' }} />
          </div>
        )}

        {tab === 'Approvals' && (
          <section className="rounded border bg-white p-3">
            <h3 className="mb-2 text-sm font-semibold text-slate-700">Pending Approvals</h3>
            <div className="text-sm text-slate-600">None</div>
          </section>
        )}

        {tab === 'Events' && (
          <section className="rounded border bg-white p-3">
            <h3 className="mb-2 text-sm font-semibold text-slate-700">Events</h3>
            {cmp ? (
              <div className="text-sm text-slate-700">
                <div>
                  Duration delta: {cmp.durationDeltaMs}ms • Cost delta: ${cmp.costDelta}
                </div>
                <div className="mt-2">Changed nodes:</div>
                <ul className="list-disc pl-5">
                  {(cmp.changedNodes || []).map((n: any, i: number) => (
                    <li key={i}>
                      {n.id}: {n.durationDeltaMs}ms
                    </li>
                  ))}
                </ul>
              </div>
            ) : (
              <div className="text-sm text-slate-600">Run created → canary → promote</div>
            )}
          </section>
        )}

        {tab === 'CI' && (
          <section className="rounded border bg-white">
            <div className="flex items-center justify-between border-b p-2">
              <div className="text-sm font-semibold text-slate-700">CI Annotations</div>
              <button
                className="rounded border px-2 py-1 text-xs"
                onClick={async () => {
                  try {
                    const r = await getCIAnnotations(id);
                    setCi(r.items || []);
                  } catch {}
                }}
              >
                Refresh
              </button>
            </div>
            <table className="w-full text-sm">
              <thead className="bg-slate-50 text-left text-slate-500">
                <tr>
                  <th className="px-3 py-2">Level</th>
                  <th className="px-3 py-2">Title</th>
                  <th className="px-3 py-2">File</th>
                  <th className="px-3 py-2">Message</th>
                </tr>
              </thead>
              <tbody>
                {(ci || []).map((a: any, i: number) => (
                  <tr key={i} className="border-t">
                    <td className="px-3 py-2">{a.level}</td>
                    <td className="px-3 py-2">{a.title}</td>
                    <td className="px-3 py-2 text-xs">
                      {a.file}:{a.line}
                    </td>
                    <td className="px-3 py-2 text-xs">
                      <a
                        className="text-indigo-700 hover:underline"
                        href={a.url}
                        target="_blank"
                        rel="noreferrer"
                      >
                        {a.message}
                      </a>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </section>
        )}
      </div>
      {replayOpen && (
        <div
          role="dialog"
          aria-modal="true"
          aria-label="Replay from node dialog"
          className="fixed inset-0 z-[100] flex items-center justify-center bg-black/30"
          onClick={() => setReplayOpen(false)}
        >
          <div
            ref={replayRef}
            className="w-full max-w-md rounded-lg border bg-white p-3"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="mb-2 text-sm font-semibold" id="replay-title">
              Replay from node
            </div>
            <div className="mb-2 text-xs text-slate-500">
              Node: <span className="font-mono">{selectedNode}</span>
            </div>
            <textarea
              aria-label="Replay reason"
              aria-describedby="replay-title"
              className="h-28 w-full rounded border p-2 text-sm"
              placeholder="Reason / justification"
              value={replayReason}
              onChange={(e) => setReplayReason(e.target.value)}
            />
            <div className="mt-2 flex justify-end gap-2">
              <button
                className="rounded border px-2 py-1 text-sm"
                onClick={() => setReplayOpen(false)}
              >
                Cancel
              </button>
              <button
                className="rounded bg-indigo-600 px-3 py-1.5 text-sm text-white"
                onClick={async () => {
                  try {
                    // Best-effort call; ignore error if not available
                    const base = cfg.gatewayBase?.replace(/\/$/, '') || '';
                    if (base && selectedNode) {
                      await fetch(`${base}/runs/${encodeURIComponent(id!)}/replay`, {
                        method: 'POST',
                        headers: { 'content-type': 'application/json' },
                        body: JSON.stringify({ nodeId: selectedNode, reason: replayReason }),
                      });
                    }
                  } finally {
                    setReplayOpen(false);
                  }
                }}
              >
                Replay
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

function RouterDecision({
  runId,
  nodeId,
  fetcher,
}: {
  runId: string;
  nodeId: string;
  fetcher: (rid: string, nid: string) => Promise<any>;
}) {
  const [data, setData] = React.useState<any | null>(null);
  const [open, setOpen] = React.useState(false);
  React.useEffect(() => {
    (async () => {
      try {
        const r = await fetcher(runId, nodeId);
        setData(r);
      } catch {}
    })();
  }, [runId, nodeId]);
  if (!data) return null;
  return (
    <div className="mt-2 rounded border p-2">
      <div className="mb-1 text-xs font-semibold text-slate-700">Router Decision</div>
      <div className="text-xs text-slate-600">
        Selected: <span className="font-mono">{data.decision?.model}</span> • score{' '}
        {data.decision?.score}
      </div>
      <div className="mt-1">
        <button className="rounded border px-2 py-1 text-xs" onClick={() => setOpen(true)}>
          Explain policy
        </button>
      </div>
      <div className="mt-2" style={{ height: 140 }}>
        <ResponsiveContainer>
          <BarChart
            data={(data.candidates || []).map((c: any) => ({ model: c.model, score: c.score }))}
          >
            <XAxis dataKey="model" hide />
            <YAxis domain={[0, 1]} />
            <Tooltip />
            <Bar dataKey="score" fill="#6366F1" />
          </BarChart>
        </ResponsiveContainer>
      </div>
      <div className="mt-2 text-xs text-slate-600">
        Policy: {data.policy?.allow ? 'ALLOW' : 'DENY'} —{' '}
        <span className="font-mono">{data.policy?.rulePath}</span>
      </div>
      {!!(data.policy?.reasons || []).length && (
        <div className="text-[11px] text-slate-500">{data.policy.reasons.join('; ')}</div>
      )}
      <PolicyExplainDialog open={open} onClose={() => setOpen(false)} context={{ runId, nodeId }} />
    </div>
  );
}

function RunEvidence({
  runId,
  getRunEvidence,
}: {
  runId: string;
  getRunEvidence: (id: string) => Promise<any>;
}) {
  const [ev, setEv] = React.useState<any | null>(null);
  React.useEffect(() => {
    (async () => {
      try {
        const r = await getRunEvidence(runId);
        setEv(r);
      } catch {}
    })();
  }, [runId]);
  return (
    <section className="rounded border bg-white p-3">
      <h3 className="mb-2 text-sm font-semibold text-slate-700">Provenance</h3>
      {!ev ? (
        <div className="text-sm text-slate-500">Loading…</div>
      ) : (
        <div className="space-y-2 text-sm">
          <Badges ev={ev} />
          <div className="flex flex-wrap items-center gap-2">
            <button className="rounded border px-2 py-1 text-xs" onClick={handleVerifyNow}>
              Verify now
            </button>
            <button className="rounded border px-2 py-1 text-xs" onClick={handleSbomDiff}>
              SBOM Diff
            </button>
            <button
              className="rounded border px-2 py-1 text-xs"
              onClick={() => {
                const blob = new Blob([JSON.stringify(ev, null, 2)], { type: 'application/json' });
                const a = document.createElement('a');
                a.href = URL.createObjectURL(blob);
                a.download = `evidence-${runId}.json`;
                a.click();
                setTimeout(() => URL.revokeObjectURL(a.href), 0);
              }}
            >
              Export JSON
            </button>
            {ev?.sbom?.href && (
              <a
                className="rounded border px-2 py-1 text-xs text-blue-600 underline"
                href={ev.sbom.href}
                target="_blank"
                rel="noreferrer"
              >
                Open SBOM
              </a>
            )}
            {ev?.cosign?.verifyCmd && (
              <button
                className="rounded border px-2 py-1 text-xs"
                onClick={() => navigator.clipboard?.writeText(ev.cosign.verifyCmd)}
              >
                Copy verify command
              </button>
            )}
            {ev?.slsa?.href && (
              <a
                className="rounded border px-2 py-1 text-xs text-blue-600 underline"
                href={ev.slsa.href}
                target="_blank"
                rel="noreferrer"
              >
                Open SLSA
              </a>
            )}
          </div>

          {showSbomDiff && sbomDiff && (
            <div className="rounded border p-2">
              <h4 className="mb-2 text-sm font-semibold">SBOM Diff Summary</h4>
              <p className="text-xs text-slate-600">
                Added: {sbomDiff.summary.addedCount} (High Severity:{' '}
                {sbomDiff.summary.highSeverityAdded})
              </p>
              <p className="text-xs text-slate-600">Removed: {sbomDiff.summary.removedCount}</p>
              <p className="text-xs text-slate-600">
                Changed: {sbomDiff.summary.changedCount} (Medium Severity:{' '}
                {sbomDiff.summary.mediumSeverityChanged})
              </p>

              {sbomDiff.added.length > 0 && (
                <details className="mt-2">
                  <summary className="cursor-pointer text-xs font-semibold">
                    Added Components
                  </summary>
                  <ul className="list-disc pl-5 text-xs">
                    {sbomDiff.added.map((item: any, i: number) => (
                      <li key={i}>
                        {item.component} (License: {item.license}, Severity: {item.severity})
                      </li>
                    ))}
                  </ul>
                </details>
              )}
              {sbomDiff.removed.length > 0 && (
                <details className="mt-2">
                  <summary className="cursor-pointer text-xs font-semibold">
                    Removed Components
                  </summary>
                  <ul className="list-disc pl-5 text-xs">
                    {sbomDiff.removed.map((item: any, i: number) => (
                      <li key={i}>
                        {item.component} (License: {item.license})
                      </li>
                    ))}
                  </ul>
                </details>
              )}
              {sbomDiff.changed.length > 0 && (
                <details className="mt-2">
                  <summary className="cursor-pointer text-xs font-semibold">
                    Changed Components
                  </summary>
                  <ul className="list-disc pl-5 text-xs">
                    {sbomDiff.changed.map((item: any, i: number) => (
                      <li key={i}>
                        {item.component} (from {item.fromVersion} to {item.toVersion}, Severity:{' '}
                        {item.severity})
                      </li>
                    ))}
                  </ul>
                </details>
              )}
            </div>
          )}

          <div className="flex items-center gap-2 mt-2">
            <input
              type="checkbox"
              id="quarantine-toggle"
              checked={isQuarantined}
              onChange={(e) => setIsQuarantined(e.target.checked)}
              className="form-checkbox h-4 w-4 text-indigo-600 transition duration-150 ease-in-out"
            />
            <label htmlFor="quarantine-toggle" className="text-sm font-medium text-slate-700">
              Quarantine Artifacts (Read-Only)
            </label>
            {isQuarantined && (
              <a
                href="/docs/maestro/runbooks/quarantine"
                target="_blank"
                rel="noreferrer"
                className="text-xs text-blue-600 underline"
              >
                View Quarantine Runbook
              </a>
            )}
          </div>
          <div className="rounded border">
            <table className="w-full text-sm">
              <thead>
                <tr>
                  <th>Type</th>
                  <th>Ref</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {(ev.attestations || []).map((a: any, i: number) => (
                  <tr key={i}>
                    <td>{a.type}</td>
                    <td className="font-mono text-xs">{a.ref}</td>
                    <td>{a.status || a.issuer || '-'}</td>
                  </tr>
                ))}
                {!(ev.attestations || []).length && (
                  <tr>
                    <td colSpan={3} className="p-2 text-center text-slate-500">
                      No attestations
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </section>
  );
}

function Badges({ ev }: { ev: any }) {
  const badge = (label: string, ok: boolean) => (
    <span
      className={`inline-block rounded px-2 py-0.5 text-xs ${ok ? 'bg-emerald-100 text-emerald-700' : 'bg-red-100 text-red-700'}`}
    >
      {label} {ok ? '✓' : '✗'}
    </span>
  );
  return (
    <div className="flex flex-wrap gap-2 text-sm">
      {badge('Signed', ev.cosign?.signed || ev.cosign?.verified)}
      {badge('SLSA', ev.slsa?.present)}
      {badge('SBOM', ev.sbom?.present)}
    </div>
  );
}
