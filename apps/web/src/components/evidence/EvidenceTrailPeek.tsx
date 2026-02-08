import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { ScrollArea } from '@/components/ui/scroll-area';
import { recordEvidenceTrailPeekEvent } from '@/telemetry/evidenceTrailPeek';

type EvidenceTimelineItem = {
  id: string;
  type: 'claim' | 'evidence';
  timestamp: string | null;
  label: string;
  detail?: string | null;
};

type EvidenceArtifact = {
  id: string;
  artifactType: string;
  location: string | null;
  createdAt: string | null;
  preview: string | null;
};

type EvidenceBadge = {
  kind: 'SBOM' | 'Provenance' | 'Test' | 'Attestation';
  href: string;
};

type SupportingEvidence = {
  id: string;
  artifactType: string;
  location: string | null;
  badges: EvidenceBadge[];
};

type RankedClaim = {
  id: string;
  content: string;
  confidence: number;
  claimType: string;
  extractedAt: string | null;
  verifiabilityScore: number;
  badges: EvidenceBadge[];
  supporting: SupportingEvidence[];
};

type EvidenceTrailPeekProps = {
  answerId?: string;
  nodeId?: string;
  triggerLabel?: string;
  triggerVariant?: 'default' | 'secondary' | 'ghost' | 'outline';
  contextLabel?: string;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  showTrigger?: boolean;
};

const formatTimestamp = (value: string | null) => {
  if (!value) return 'Unknown';
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return 'Unknown';
  return parsed.toLocaleString();
};

const stripQuery = (value: string) => value.split('?')[0];

const buildQuery = (answerId?: string, nodeId?: string) => {
  const params = new URLSearchParams();
  if (answerId) params.set('answer_id', answerId);
  if (nodeId) params.set('node_id', nodeId);
  return params.toString();
};

const badgeVariant = (kind: EvidenceBadge['kind']) => {
  switch (kind) {
    case 'SBOM':
      return 'secondary';
    case 'Provenance':
      return 'default';
    case 'Test':
      return 'outline';
    case 'Attestation':
      return 'secondary';
    default:
      return 'default';
  }
};

export function EvidenceTrailPeek({
  answerId,
  nodeId,
  triggerLabel = 'Evidence trail',
  triggerVariant = 'secondary',
  contextLabel,
  open,
  onOpenChange,
  showTrigger = true,
}: EvidenceTrailPeekProps) {
  const [internalOpen, setInternalOpen] = useState(false);
  const [timeline, setTimeline] = useState<EvidenceTimelineItem[]>([]);
  const [artifacts, setArtifacts] = useState<EvidenceArtifact[]>([]);
  const [claims, setClaims] = useState<RankedClaim[]>([]);
  const [minimized, setMinimized] = useState(true);
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const openTimestamp = useRef<number | null>(null);
  const verdictRecorded = useRef(false);

  const resolvedOpen = typeof open === 'boolean' ? open : internalOpen;
  const hasScope = Boolean(answerId || nodeId);

  const handleOpenChange = useCallback(
    (nextOpen: boolean) => {
      if (typeof open !== 'boolean') {
        setInternalOpen(nextOpen);
      }
      onOpenChange?.(nextOpen);
    },
    [open, onOpenChange],
  );

  const queryString = useMemo(() => buildQuery(answerId, nodeId), [answerId, nodeId]);

  useEffect(() => {
    if (!resolvedOpen || !hasScope) return;
    setLoading(true);
    setErrorMessage(null);
    openTimestamp.current = performance.now();
    verdictRecorded.current = false;

    const fetchData = async () => {
      try {
        const [indexRes, artifactsRes, rankingRes] = await Promise.all([
          fetch(`/api/evidence-index?${queryString}`),
          fetch(`/api/evidence-top?${queryString}`),
          fetch(`/api/claim-ranking?${queryString}`),
        ]);

        if (!indexRes.ok || !artifactsRes.ok || !rankingRes.ok) {
          throw new Error('Evidence trail fetch failed');
        }

        const indexPayload = await indexRes.json();
        const artifactsPayload = await artifactsRes.json();
        const rankingPayload = await rankingRes.json();

        setTimeline(indexPayload.timeline ?? []);
        setArtifacts(artifactsPayload.artifacts ?? []);
        setClaims(rankingPayload.claims ?? []);

        if (!verdictRecorded.current && openTimestamp.current) {
          const elapsed = performance.now() - openTimestamp.current;
          const claimCount = (rankingPayload.claims ?? []).length;
          await recordEvidenceTrailPeekEvent('time_to_first_confident_verdict_ms', {
            elapsedMs: Math.round(elapsed),
            claimCount,
          });
          verdictRecorded.current = true;
        }

        await recordEvidenceTrailPeekEvent('answer_surface_claim_count', {
          claimCount: (rankingPayload.claims ?? []).length,
        });
      } catch (error) {
        setErrorMessage('Evidence trail data is temporarily unavailable.');
        await recordEvidenceTrailPeekEvent('verification_error_rate', {
          errorType: 'fetch_failed',
        });
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [resolvedOpen, hasScope, queryString]);

  useEffect(() => {
    if (resolvedOpen && hasScope) {
      recordEvidenceTrailPeekEvent('evidence_trail_peek_opened', {
        answerId: answerId ?? undefined,
        nodeId: nodeId ?? undefined,
      });
    }
  }, [resolvedOpen, hasScope, answerId, nodeId]);

  const minimizedClaims = useMemo(() => claims.slice(0, 3), [claims]);

  return (
    <Dialog open={resolvedOpen} onOpenChange={handleOpenChange}>
      {showTrigger && (
        <DialogTrigger asChild>
          <Button variant={triggerVariant} size="sm" disabled={!hasScope} data-testid="evidence-trail-trigger">
            {triggerLabel}
          </Button>
        </DialogTrigger>
      )}
      <DialogContent className="max-w-3xl">
        <DialogHeader>
          <DialogTitle>Evidence-Trail Peek</DialogTitle>
        </DialogHeader>
        <div className="flex flex-col gap-6" data-testid="evidence-trail-peek">
          <div className="flex items-start justify-between gap-4">
            <div>
              <p className="text-sm text-muted-foreground">Provenance timeline & artifact summary</p>
              {contextLabel && <p className="text-sm font-medium mt-1">{contextLabel}</p>}
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setMinimized((prev) => !prev)}
              data-testid="evidence-trail-minimize-toggle"
            >
              {minimized ? 'Expand claims' : 'Minimize claims'}
            </Button>
          </div>

          {loading && <div className="text-sm text-muted-foreground">Loading evidence trail...</div>}
          {errorMessage && <div className="text-sm text-destructive">{errorMessage}</div>}

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <div className="space-y-3">
              <h3 className="text-sm font-semibold">Provenance timeline</h3>
              <ScrollArea className="h-48 rounded border p-3">
                <ul className="space-y-3">
                  {timeline.map((item) => (
                    <li key={`${item.type}-${item.id}`} className="text-sm">
                      <div className="flex items-center justify-between">
                        <span className="font-medium">{item.label}</span>
                        <span className="text-xs text-muted-foreground">{formatTimestamp(item.timestamp)}</span>
                      </div>
                      {item.detail && <div className="text-xs text-muted-foreground">{item.detail}</div>}
                    </li>
                  ))}
                  {timeline.length === 0 && !loading && (
                    <li className="text-xs text-muted-foreground">No timeline events found.</li>
                  )}
                </ul>
              </ScrollArea>
            </div>

            <div className="space-y-3">
              <h3 className="text-sm font-semibold">Top artifacts</h3>
              <ScrollArea className="h-48 rounded border p-3">
                <ul className="space-y-3">
                  {artifacts.map((artifact) => (
                    <li key={artifact.id} className="text-sm">
                      <div className="flex items-center justify-between">
                        <span className="font-medium">{artifact.artifactType}</span>
                        <span className="text-xs text-muted-foreground">{formatTimestamp(artifact.createdAt)}</span>
                      </div>
                      {artifact.location && (
                        <a
                          href={artifact.location}
                          className="text-xs text-blue-500 hover:underline"
                          onClick={() =>
                            recordEvidenceTrailPeekEvent('artifact_click_through', {
                              artifactId: artifact.id,
                              location: stripQuery(artifact.location),
                            })
                          }
                        >
                          {stripQuery(artifact.location)}
                        </a>
                      )}
                      {artifact.preview && (
                        <div className="text-xs text-muted-foreground mt-1">{artifact.preview}</div>
                      )}
                    </li>
                  ))}
                  {artifacts.length === 0 && !loading && (
                    <li className="text-xs text-muted-foreground">No artifacts linked.</li>
                  )}
                </ul>
              </ScrollArea>
            </div>
          </div>

          <div className="space-y-3">
            <h3 className="text-sm font-semibold">Answer-Surface Minimizer</h3>
            <div className="rounded border p-3">
              <p className="text-xs text-muted-foreground mb-3">
                {minimized ? 'Showing the 3 most-verifiable claims.' : 'Showing claim details with deterministic evidence badges.'}
              </p>
              <div className="space-y-4">
                {minimizedClaims.map((claim) => (
                  <div key={claim.id} className="rounded border border-dashed p-3">
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium" data-testid="evidence-trail-claim">
                        {claim.content}
                      </span>
                      <span className="text-xs text-muted-foreground">
                        {Math.round(claim.confidence * 100)}% confidence
                      </span>
                    </div>
                    <div className="flex flex-wrap gap-2 mt-2">
                      {claim.badges.map((badge) => (
                        <a
                          key={`${claim.id}-${badge.kind}`}
                          href={badge.href}
                          onClick={() =>
                            recordEvidenceTrailPeekEvent('badge_click_through', {
                              claimId: claim.id,
                              badgeKind: badge.kind,
                            })
                          }
                        >
                          <Badge variant={badgeVariant(badge.kind)} data-testid="evidence-trail-badge">
                            {badge.kind}
                          </Badge>
                        </a>
                      ))}
                    </div>
                    {!minimized && claim.supporting.length > 0 && (
                      <div className="mt-3 text-xs text-muted-foreground">
                        <div className="font-medium mb-1">Supporting evidence</div>
                        <ul className="space-y-1">
                          {claim.supporting.map((support) => (
                            <li key={`${claim.id}-${support.id}`}>
                              {support.artifactType}
                              {support.location && (
                                <>
                                  {' '}
                                  <a
                                    href={support.location}
                                    className="text-blue-500 hover:underline"
                                    onClick={() =>
                                      recordEvidenceTrailPeekEvent('artifact_click_through', {
                                        artifactId: support.id,
                                        location: stripQuery(support.location),
                                      })
                                    }
                                  >
                                    {stripQuery(support.location)}
                                  </a>
                                </>
                              )}
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}
                  </div>
                ))}
                {minimizedClaims.length === 0 && !loading && (
                  <div className="text-xs text-muted-foreground">No verifiable claims available.</div>
                )}
              </div>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
