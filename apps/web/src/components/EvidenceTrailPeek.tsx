import { useEffect, useState } from "react";

type EvidenceItem = {
  evidence_id: string;
  title: string;
  url: string;
  ts: string;           // ISO; render relative in UI (do not store new timestamps)
  weight: number;       // influence score from backend
  badges: { kind: "SBOM" | "Provenance" | "Test" | "Attestation"; href: string }[];
};

type RankedClaim = {
  claim_id: string;
  text: string;
  verifiability: number;   // higher = better
  supporting: string[];    // evidence_ids
  delta: number;           // SHAP-like contribution to final answer confidence
};

export function EvidenceTrailPeek({ answer_id, node_id, onClose }: { answer_id: string; node_id?: string; onClose?: () => void }) {
  const [timeline, setTimeline] = useState<EvidenceItem[]>([]);
  const [claims, setClaims] = useState<RankedClaim[]>([]);
  const [topArtifacts, setTopArtifacts] = useState<EvidenceItem[]>([]);
  const [minimized, setMinimized] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!answer_id) return;
    setLoading(true);
    Promise.all([
      fetch(`/api/evidence-index?answer_id=${answer_id}${node_id ? `&node_id=${node_id}` : ""}`).then(r => r.json()),
      fetch(`/api/claim-ranking?answer_id=${answer_id}`).then(r => r.json()),
      fetch(`/api/evidence-top?answer_id=${answer_id}&limit=5`).then(r => r.json()),
    ]).then(([timelineRes, claimsRes, topRes]) => {
      setTimeline(timelineRes.items || []);
      setClaims((claimsRes.claims || []).slice(0, 3)); // highest verifiability first (server-enforced)
      setTopArtifacts(topRes.items || []);
      setLoading(false);
    }).catch(err => {
      console.error("Failed to load evidence trail", err);
      setLoading(false);
    });
  }, [answer_id, node_id]);

  if (!answer_id) return null;

  return (
    <aside className="fixed bottom-4 right-4 w-96 bg-white dark:bg-gray-800 shadow-xl rounded-lg border border-gray-200 dark:border-gray-700 z-50 overflow-hidden flex flex-col max-h-[80vh]">
      <header className="p-3 bg-gray-50 dark:bg-gray-900 border-b border-gray-200 dark:border-gray-700 flex items-center justify-between">
        <strong className="text-sm font-semibold">Evidence‑Trail</strong>
        <div className="flex gap-2">
          <button
            onClick={() => setMinimized(!minimized)}
            aria-pressed={minimized}
            className="text-xs px-2 py-1 bg-gray-200 dark:bg-gray-700 rounded hover:bg-gray-300 dark:hover:bg-gray-600 transition-colors"
          >
            {minimized ? "Expand" : "Minimize"}
          </button>
          {onClose && (
            <button
              onClick={onClose}
              className="text-xs px-2 py-1 text-gray-500 hover:text-gray-700"
              aria-label="Close"
            >
              ✕
            </button>
          )}
        </div>
      </header>

      <div className="overflow-y-auto p-4 space-y-4">
        {loading ? (
          <div className="text-center text-sm text-gray-500">Loading evidence...</div>
        ) : (
          <>
            {!minimized && (
              <>
                {/* A) Compact provenance timeline */}
                <section aria-label="Provenance timeline" className="space-y-2">
                  <h4 className="text-xs font-bold text-gray-500 uppercase tracking-wider">Provenance Timeline</h4>
                  {timeline.map(ev => (
                    <div key={ev.evidence_id} className="flex gap-2 items-center text-sm">
                      <time dateTime={ev.ts} className="text-xs text-gray-400 whitespace-nowrap w-24">
                        {new Date(ev.ts).toLocaleString([], { dateStyle: 'short', timeStyle: 'short' })}
                      </time>
                      <div className="flex-1 min-w-0 truncate">
                        <a href={ev.url} target="_blank" rel="noreferrer" className="text-blue-600 hover:underline truncate block">
                          {ev.title}
                        </a>
                      </div>
                      <div className="flex gap-1 shrink-0">
                        {ev.badges.map((b, i) => (
                          <a
                            key={i}
                            href={b.href}
                            target="_blank"
                            rel="noreferrer"
                            className={`text-[10px] px-1 rounded border border-current opacity-75 hover:opacity-100 no-underline
                              ${b.kind === 'SBOM' ? 'text-purple-600 border-purple-600' : ''}
                              ${b.kind === 'Provenance' ? 'text-green-600 border-green-600' : ''}
                              ${b.kind === 'Test' ? 'text-blue-600 border-blue-600' : ''}
                              ${b.kind === 'Attestation' ? 'text-orange-600 border-orange-600' : ''}
                            `}
                          >
                            {b.kind}
                          </a>
                        ))}
                      </div>
                    </div>
                  ))}
                  {timeline.length === 0 && <p className="text-xs text-gray-400">No timeline events found.</p>}
                </section>

                {/* B) Top‑N artifacts */}
                <section aria-label="Top supporting artifacts" className="space-y-2 pt-2 border-t border-gray-100 dark:border-gray-800">
                  <h4 className="text-xs font-bold text-gray-500 uppercase tracking-wider">Top Artifacts (by weight)</h4>
                  {topArtifacts.map(ev => (
                    <article key={ev.evidence_id} className="flex justify-between items-center text-sm group">
                      <a href={ev.url} target="_blank" rel="noreferrer" className="text-blue-600 hover:underline truncate pr-2">
                        {ev.title}
                      </a>
                      <small className="text-xs text-gray-400 font-mono group-hover:text-gray-600">
                        {ev.weight.toFixed(2)}
                      </small>
                    </article>
                  ))}
                  {topArtifacts.length === 0 && <p className="text-xs text-gray-400">No top artifacts found.</p>}
                </section>
              </>
            )}

            {/* C) Minimized view: 3 most‑verifiable claims with badges */}
            <section aria-label="Key Claims" className="space-y-3 pt-2 border-t border-gray-100 dark:border-gray-800">
              <div className="flex justify-between items-center">
                <h4 className="text-xs font-bold text-gray-500 uppercase tracking-wider">Verifiable Claims</h4>
                {minimized && <span className="text-[10px] bg-green-100 text-green-800 px-1 rounded">Minimized View</span>}
              </div>

              {claims.map(c => (
                <article key={c.claim_id} className="text-sm border-l-2 pl-3 py-1 border-gray-200 hover:border-blue-400 transition-colors">
                  <p className="mb-1 leading-snug">{c.text}</p>

                  {/* Evidence Links (Collapsed by default, or inline if minimal) */}
                  <div className="text-xs space-y-1">
                    {c.supporting.map(id => {
                      const ev = timeline.find(t => t.evidence_id === id) ?? topArtifacts.find(t => t.evidence_id === id);
                      if (!ev) return null;
                      return (
                        <div key={id} className="flex items-center gap-2">
                          <span className="text-gray-400">↳</span>
                          <a href={ev.url} target="_blank" rel="noreferrer" className="text-blue-500 hover:underline truncate max-w-[150px]">
                            {ev.title}
                          </a>
                          <div className="flex gap-1">
                            {ev.badges.map((b, i) => (
                              <a key={i} href={b.href} className="text-[9px] px-1 border rounded text-gray-500 hover:text-gray-800">
                                {b.kind}
                              </a>
                            ))}
                          </div>
                        </div>
                      );
                    })}
                  </div>

                  {/* Waterfall Influence Bar */}
                  <div className="mt-2 h-1.5 w-full bg-gray-100 rounded-full overflow-hidden flex items-center relative" aria-label={`Influence delta: ${c.delta}`}>
                    <div className="absolute left-1/2 w-px h-full bg-gray-300"></div>
                    {/* Render bar based on positive/negative delta */}
                    <div
                      className={`h-full ${c.delta >= 0 ? 'bg-green-400' : 'bg-red-400'}`}
                      style={{
                        width: `${Math.min(Math.abs(c.delta) * 100, 50)}%`, // Scale logic simplified
                        marginLeft: c.delta >= 0 ? '50%' : `calc(50% - ${Math.min(Math.abs(c.delta) * 100, 50)}%)`
                      }}
                    />
                  </div>
                </article>
              ))}
              {claims.length === 0 && <p className="text-xs text-gray-400">No verifiable claims available.</p>}
            </section>
          </>
        )}
      </div>
    </aside>
  );
}
