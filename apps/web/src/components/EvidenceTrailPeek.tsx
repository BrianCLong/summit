import { useEffect, useMemo, useState } from 'react';

type EvidenceBadgeKind = 'SBOM' | 'Provenance' | 'Test' | 'Attestation';

type EvidenceBadge = {
  kind: EvidenceBadgeKind;
  href: string;
};

export type EvidenceItem = {
  evidence_id: string;
  title: string;
  url: string;
  ts: string;
  weight: number;
  badges: EvidenceBadge[];
};

export type RankedClaim = {
  claim_id: string;
  text: string;
  verifiability: number;
  supporting: string[];
  delta: number;
};

type EvidenceTrailPeekProps = {
  answerId: string;
  nodeId?: string;
  className?: string;
};

const formatTimestamp = (value: string) => {
  const date = new Date(value);
  return new Intl.DateTimeFormat(undefined, {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(date);
};

const clampDelta = (delta: number) =>
  Math.max(-1, Math.min(1, delta || 0));

export function EvidenceTrailPeek({
  answerId,
  nodeId,
  className,
}: EvidenceTrailPeekProps) {
  const [timeline, setTimeline] = useState<EvidenceItem[]>([]);
  const [claims, setClaims] = useState<RankedClaim[]>([]);
  const [topArtifacts, setTopArtifacts] = useState<EvidenceItem[]>([]);
  const [minimized, setMinimized] = useState(false);
  const [focusedClaimId, setFocusedClaimId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const controller = new AbortController();
    const loadEvidence = async () => {
      setLoading(true);
      setError(null);
      try {
        const querySuffix = nodeId ? `&node_id=${nodeId}` : '';
        const [timelineRes, claimsRes, topRes] = await Promise.all([
          fetch(`/api/evidence-index?answer_id=${answerId}${querySuffix}`, {
            signal: controller.signal,
          }),
          fetch(`/api/claim-ranking?answer_id=${answerId}`, {
            signal: controller.signal,
          }),
          fetch(`/api/evidence-top?answer_id=${answerId}&limit=5`, {
            signal: controller.signal,
          }),
        ]);

        if (!timelineRes.ok || !claimsRes.ok || !topRes.ok) {
          throw new Error('Evidence endpoints returned an error response.');
        }

        const [timelineJson, claimsJson, topJson] = await Promise.all([
          timelineRes.json(),
          claimsRes.json(),
          topRes.json(),
        ]);

        setTimeline(timelineJson.items || []);
        setClaims((claimsJson.claims || []).slice(0, 3));
        setTopArtifacts(topJson.items || []);
      } catch (err: any) {
        if (err?.name !== 'AbortError') {
          setError('Evidence trail data is unavailable.');
        }
      } finally {
        setLoading(false);
      }
    };

    if (answerId) {
      loadEvidence();
    }

    return () => controller.abort();
  }, [answerId, nodeId]);

  const evidenceById = useMemo(() => {
    const items = [...timeline, ...topArtifacts];
    return items.reduce<Record<string, EvidenceItem>>((acc, item) => {
      acc[item.evidence_id] = item;
      return acc;
    }, {});
  }, [timeline, topArtifacts]);

  return (
    <aside
      className={`rounded-lg border border-slate-200 bg-white shadow-lg ${className || ''}`}
      aria-label="Evidence trail peek"
    >
      <header className="flex items-center gap-3 border-b border-slate-200 px-4 py-3">
        <div className="flex flex-col">
          <strong className="text-sm text-slate-900">Evidence-Trail</strong>
          <span className="text-xs text-slate-500">Auditable at a glance</span>
        </div>
        <div className="flex-1" />
        <button
          onClick={() => setMinimized((prev) => !prev)}
          aria-pressed={minimized}
          className="text-xs font-medium text-indigo-600 hover:text-indigo-500"
        >
          {minimized ? 'Expand' : 'Answer-Surface Minimizer'}
        </button>
      </header>

      {loading && (
        <div className="px-4 py-6 text-xs text-slate-500">Loading evidence…</div>
      )}
      {!loading && error && (
        <div className="px-4 py-6 text-xs text-rose-600">{error}</div>
      )}

      {!loading && !error && (
        <>
          {!minimized && (
            <>
              <section
                aria-label="Provenance timeline"
                className="space-y-3 px-4 py-4"
              >
                <div className="text-xs font-semibold uppercase text-slate-500">
                  Provenance timeline
                </div>
                {timeline.length === 0 && (
                  <div className="text-xs text-slate-500">
                    No provenance events linked yet.
                  </div>
                )}
                {timeline.map((ev) => (
                  <div
                    key={ev.evidence_id}
                    className="flex flex-col gap-1 rounded-md border border-slate-100 bg-slate-50 px-3 py-2"
                  >
                    <div className="flex items-center gap-2 text-xs text-slate-500">
                      <time dateTime={ev.ts}>{formatTimestamp(ev.ts)}</time>
                      <span className="text-slate-300">•</span>
                      <span className="font-medium text-slate-700">
                        weight {ev.weight.toFixed(2)}
                      </span>
                    </div>
                    <a
                      href={ev.url}
                      target="_blank"
                      rel="noreferrer"
                      className="text-sm font-medium text-slate-900 hover:text-indigo-600"
                    >
                      {ev.title}
                    </a>
                    <div className="flex flex-wrap gap-1">
                      {ev.badges.map((badge, index) => (
                        <a
                          key={`${badge.kind}-${index}`}
                          href={badge.href}
                          target="_blank"
                          rel="noreferrer"
                          className="rounded border border-slate-300 px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-slate-600"
                        >
                          {badge.kind}
                        </a>
                      ))}
                    </div>
                  </div>
                ))}
              </section>

              <section
                aria-label="Top supporting artifacts"
                className="space-y-3 border-t border-slate-200 px-4 py-4"
              >
                <div className="text-xs font-semibold uppercase text-slate-500">
                  Top supporting artifacts
                </div>
                {topArtifacts.length === 0 && (
                  <div className="text-xs text-slate-500">
                    No ranked artifacts available yet.
                  </div>
                )}
                {topArtifacts.map((ev) => (
                  <article
                    key={ev.evidence_id}
                    className="flex items-center justify-between gap-2 rounded-md border border-slate-100 bg-white px-3 py-2"
                  >
                    <a
                      href={ev.url}
                      target="_blank"
                      rel="noreferrer"
                      className="text-xs font-medium text-slate-800 hover:text-indigo-600"
                    >
                      {ev.title}
                    </a>
                    <span className="text-xs text-slate-500">
                      {ev.weight.toFixed(2)}
                    </span>
                  </article>
                ))}
              </section>
            </>
          )}

          <section
            aria-label="Minimized answer (3 strongest claims)"
            className="space-y-3 border-t border-slate-200 px-4 py-4"
          >
            <div className="flex items-center justify-between text-xs font-semibold uppercase text-slate-500">
              <span>Minimized answer</span>
              <span className="text-[11px] normal-case text-slate-400">
                top 3 verifiable claims
              </span>
            </div>
            {claims.length === 0 && (
              <div className="text-xs text-slate-500">
                No claims ranked for this answer yet.
              </div>
            )}
            {claims.map((claim) => {
              const deltaValue = clampDelta(claim.delta);
              const absDelta = Math.abs(deltaValue);
              const selected = focusedClaimId === claim.claim_id;
              return (
                <article
                  key={claim.claim_id}
                  className={`rounded-md border px-3 py-2 text-xs ${
                    selected ? 'border-indigo-400 bg-indigo-50' : 'border-slate-200'
                  }`}
                >
                  <div className="flex items-start justify-between gap-2">
                    <p className="text-slate-800">{claim.text}</p>
                    <button
                      onClick={() =>
                        setFocusedClaimId((prev) =>
                          prev === claim.claim_id ? null : claim.claim_id,
                        )
                      }
                      className="text-[10px] font-semibold uppercase text-indigo-600 hover:text-indigo-500"
                    >
                      {selected ? 'Unfocus' : 'Focus'}
                    </button>
                  </div>
                  <div className="mt-2 flex items-center justify-between">
                    <span className="text-[11px] text-slate-500">
                      verifiability {claim.verifiability.toFixed(2)}
                    </span>
                    <span className="text-[11px] text-slate-500">
                      Δ {deltaValue.toFixed(2)}
                    </span>
                  </div>
                  <details className="mt-2">
                    <summary className="cursor-pointer text-[11px] font-semibold text-slate-600">
                      Evidence links
                    </summary>
                    <ul className="mt-2 space-y-1">
                      {claim.supporting.map((id) => {
                        const ev = evidenceById[id];
                        if (!ev) {
                          return (
                            <li key={id} className="text-[11px] text-slate-400">
                              Evidence {id}
                            </li>
                          );
                        }
                        return (
                          <li key={id} className="text-[11px] text-slate-600">
                            <a
                              href={ev.url}
                              target="_blank"
                              rel="noreferrer"
                              className="font-medium text-indigo-600 hover:text-indigo-500"
                            >
                              {ev.title}
                            </a>
                            <div className="mt-1 flex flex-wrap gap-1">
                              {ev.badges.map((badge, index) => (
                                <a
                                  key={`${badge.kind}-${index}`}
                                  href={badge.href}
                                  target="_blank"
                                  rel="noreferrer"
                                  className="rounded border border-slate-300 px-1.5 py-0.5 text-[9px] font-semibold uppercase tracking-wide text-slate-600"
                                >
                                  {badge.kind}
                                </a>
                              ))}
                            </div>
                          </li>
                        );
                      })}
                    </ul>
                  </details>
                  <div className="mt-3" aria-label="influence waterfall">
                    <div className="h-1.5 w-full rounded-full bg-slate-100">
                      <div
                        className={`h-1.5 rounded-full ${
                          deltaValue >= 0
                            ? 'bg-emerald-500'
                            : 'bg-rose-500'
                        }`}
                        style={{ width: `${Math.max(absDelta * 100, 6)}%` }}
                      />
                    </div>
                  </div>
                </article>
              );
            })}
          </section>
        </>
      )}
    </aside>
  );
}
