import React, { useEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { useFeatureFlags } from '@/contexts/FeatureFlagContext';
import { trackEvidenceTrailPeekEvent } from '@/telemetry/metrics';
import './EvidenceTrailPeek.css';

type BadgeKind = 'SBOM' | 'Provenance' | 'Test' | 'Attestation';

type EvidenceBadge = {
  kind: BadgeKind;
  href?: string;
};

type EvidenceItem = {
  evidence_id: string;
  title: string;
  url?: string;
  ts: string;
  weight: number;
  badges: EvidenceBadge[];
};

type RankedClaim = {
  claim_id: string;
  text: string;
  verifiability: number;
  supporting: string[];
  delta: number;
};

const SAFE_PROTOCOLS = new Set(['http:', 'https:']);

const safeUrl = (href?: string) => {
  if (!href) return undefined;
  if (href.startsWith('/')) return href;
  try {
    const parsed = new URL(href);
    if (!SAFE_PROTOCOLS.has(parsed.protocol)) {
      return undefined;
    }
    return href;
  } catch {
    return undefined;
  }
};

const safeRelTime = (iso: string) => {
  const d = new Date(iso);
  return Number.isFinite(d.getTime()) ? d.toLocaleString() : iso;
};

export function EvidenceTrailPeek({
  answerId,
  nodeId,
  anchor,
}: {
  answerId: string;
  nodeId?: string;
  anchor?: HTMLElement | null;
}) {
  const { isEnabled } = useFeatureFlags();
  const enabled = isEnabled('features.evidenceTrailPeek', false);
  const [timeline, setTimeline] = useState<EvidenceItem[]>([]);
  const [claims, setClaims] = useState<RankedClaim[]>([]);
  const [topArtifacts, setTopArtifacts] = useState<EvidenceItem[]>([]);
  const [minimized, setMinimized] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const firstVerdictLoggedRef = useRef(false);
  const startedAtRef = useRef<number | null>(null);

  useEffect(() => {
    if (!enabled) return;
    if (!answerId) return;

    const ac = new AbortController();
    setLoading(true);
    startedAtRef.current = Date.now();

    const qs = `/api/evidence-index?answer_id=${encodeURIComponent(answerId)}${
      nodeId ? `&node_id=${encodeURIComponent(nodeId)}` : ''
    }`;

    Promise.all([
      fetch(qs, { signal: ac.signal }).then((r) =>
        r.ok ? r.json() : Promise.reject(new Error(`evidence-index ${r.status}`))
      ),
      fetch(`/api/claim-ranking?answer_id=${encodeURIComponent(answerId)}`, {
        signal: ac.signal,
      }).then((r) =>
        r.ok ? r.json() : Promise.reject(new Error(`claim-ranking ${r.status}`))
      ),
      fetch(`/api/evidence-top?answer_id=${encodeURIComponent(answerId)}&limit=5`, {
        signal: ac.signal,
      }).then((r) =>
        r.ok ? r.json() : Promise.reject(new Error(`evidence-top ${r.status}`))
      ),
    ])
      .then(([timelineRes, claimsRes, topRes]) => {
        setTimeline(Array.isArray(timelineRes.items) ? timelineRes.items : []);
        setClaims(Array.isArray(claimsRes.claims) ? claimsRes.claims.slice(0, 3) : []);
        setTopArtifacts(Array.isArray(topRes.items) ? topRes.items : []);
        setErr(null);
      })
      .catch((e) => {
        if (ac.signal.aborted) return;
        setErr(String(e?.message ?? e));
      })
      .finally(() => {
        if (!ac.signal.aborted) setLoading(false);
      });

    return () => ac.abort();
  }, [answerId, nodeId, enabled]);

  useEffect(() => {
    if (!enabled) return;
    if (!minimized) return;
    void trackEvidenceTrailPeekEvent('answer_surface_claim_count', claims.length, {
      answer_id: answerId,
    });
  }, [answerId, claims.length, enabled, minimized]);

  const lookup = useMemo(() => {
    const m = new Map<string, EvidenceItem>();
    for (const ev of timeline) m.set(ev.evidence_id, ev);
    for (const ev of topArtifacts) if (!m.has(ev.evidence_id)) m.set(ev.evidence_id, ev);
    return m;
  }, [timeline, topArtifacts]);

  if (!enabled) return null;

  const handleFirstVerdict = (source: 'badge' | 'evidence_links') => {
    if (firstVerdictLoggedRef.current) return;
    const start = startedAtRef.current;
    if (!start) return;
    firstVerdictLoggedRef.current = true;
    void trackEvidenceTrailPeekEvent('time_to_first_confident_verdict_ms', Date.now() - start, {
      source,
      answer_id: answerId,
    });
  };

  const handleBadgeClick = (badge: EvidenceBadge, evidenceId: string) => {
    handleFirstVerdict('badge');
    void trackEvidenceTrailPeekEvent('badge_click', 1, {
      badge_kind: badge.kind,
      evidence_id: evidenceId,
      answer_id: answerId,
    });
  };

  const body = (
    <aside className="evidence-peek" data-testid="evidence-trail-peek">
      <header className="evidence-peek-header">
        <strong>Evidence-Trail</strong>
        <div className="spacer" />
        <button
          type="button"
          onClick={() => setMinimized((v) => !v)}
          aria-pressed={minimized}
          className="evidence-peek-toggle"
        >
          {minimized ? 'Expand' : 'Answer-Surface Minimizer'}
        </button>
      </header>

      {loading && <div className="evidence-peek-loading">Loading evidence…</div>}
      {err && <div className="evidence-peek-error">Unable to load evidence: {err}</div>}

      {!minimized && !err && (
        <>
          <section aria-label="Provenance timeline" className="timeline">
            {timeline.map((ev) => (
              <div key={ev.evidence_id} className="tick">
                <time dateTime={ev.ts}>{safeRelTime(ev.ts)}</time>
                {safeUrl(ev.url) ? (
                  <a href={safeUrl(ev.url)} target="_blank" rel="noreferrer">
                    {ev.title}
                  </a>
                ) : (
                  <span>{ev.title}</span>
                )}
                <div className="badges">
                  {ev.badges.map((b, i) =>
                    safeUrl(b.href) ? (
                      <a
                        key={`${ev.evidence_id}-${b.kind}-${i}`}
                        href={safeUrl(b.href)}
                        target="_blank"
                        rel="noreferrer"
                        className={`badge badge-${b.kind.toLowerCase()}`}
                        onClick={() => handleBadgeClick(b, ev.evidence_id)}
                      >
                        {b.kind}
                      </a>
                    ) : null
                  )}
                </div>
              </div>
            ))}
          </section>

          <section aria-label="Top supporting artifacts" className="top-artifacts">
            {topArtifacts.map((ev) => (
              <article key={ev.evidence_id} className="artifact">
                {safeUrl(ev.url) ? (
                  <a href={safeUrl(ev.url)} target="_blank" rel="noreferrer">
                    {ev.title}
                  </a>
                ) : (
                  <span>{ev.title}</span>
                )}
                <small>weight: {Number(ev.weight).toFixed(2)}</small>
              </article>
            ))}
          </section>
        </>
      )}

      {!err && (
        <section aria-label="Minimized answer (3 strongest claims)" className="minimized">
          {claims.map((c) => (
            <article key={c.claim_id} className="claim">
              <p>{c.text}</p>
              <details
                onToggle={(event) => {
                  if ((event.currentTarget as HTMLDetailsElement).open) {
                    handleFirstVerdict('evidence_links');
                  }
                }}
              >
                <summary>Evidence links</summary>
                <ul>
                  {c.supporting.map((id) => {
                    const ev = lookup.get(id);
                    if (!ev) return null;
                    return (
                      <li key={id}>
                        {safeUrl(ev.url) ? (
                          <a href={safeUrl(ev.url)} target="_blank" rel="noreferrer">
                            {ev.title}
                          </a>
                        ) : (
                          <span>{ev.title}</span>
                        )}
                        {ev.badges.map((b, i) =>
                          safeUrl(b.href) ? (
                            <a
                              key={`${id}-${b.kind}-${i}`}
                              href={safeUrl(b.href)}
                              target="_blank"
                              rel="noreferrer"
                              className={`badge badge-${b.kind.toLowerCase()}`}
                              onClick={() => handleBadgeClick(b, ev.evidence_id)}
                            >
                              {b.kind}
                            </a>
                          ) : null
                        )}
                      </li>
                    );
                  })}
                </ul>
              </details>
              <div className="waterfall" aria-label="influence waterfall">
                <span
                  data-delta={c.delta}
                  style={{
                    '--abs': String(Math.min(50, Math.round(Math.abs(c.delta) * 10))),
                  } as React.CSSProperties}
                  className={c.delta >= 0 ? 'delta-pos' : 'delta-neg'}
                />
              </div>
            </article>
          ))}
        </section>
      )}
    </aside>
  );

  return anchor ? createPortal(body, anchor) : body;
}
