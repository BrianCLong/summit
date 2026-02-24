import { Router } from 'express';
import { ensureAuthenticated } from '../middleware/auth.js';
import { pg } from '../db/pg.js';

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

const router = Router();

const DEFAULT_TIMELINE_LIMIT = 50;
const DEFAULT_TOP_ARTIFACTS = 5;
const MAX_TOP_ARTIFACTS = 20;

const DETERMINISTIC_BADGE_KINDS = ['SBOM', 'Provenance', 'Test', 'Attestation'] as const;
const DETERMINISTIC_BADGES = new Set<string>(DETERMINISTIC_BADGE_KINDS);

const badgeForArtifactType = (artifactType: string | null): EvidenceBadge['kind'] | null => {
  if (!artifactType) return null;
  const normalized = artifactType.toLowerCase();
  if (normalized.includes('sbom')) return 'SBOM';
  if (normalized.includes('provenance')) return 'Provenance';
  if (normalized.includes('test')) return 'Test';
  if (normalized.includes('attestation')) return 'Attestation';
  return null;
};

const clampLimit = (value: number, fallback: number, max: number) => {
  if (!Number.isFinite(value) || value <= 0) {
    return fallback;
  }
  return Math.min(value, max);
};

const getTenantId = (req: any) => req.user?.tenantId || req.user?.tenant_id || 'unknown';

const ensureScope = (answerId?: string | null, nodeId?: string | null) => {
  if (!answerId && !nodeId) {
    return {
      ok: false,
      error: 'answer_id or node_id required',
    } as const;
  }
  return { ok: true } as const;
};

const fetchScopedClaims = async (
  tenantId: string,
  answerId: string | null,
  nodeId: string | null,
  limit = DEFAULT_TIMELINE_LIMIT,
) => {
  const query = `
    SELECT id, content, confidence, claim_type, extracted_at, created_at
    FROM claims_registry
    WHERE tenant_id = $1
      AND (
        ($2::text IS NOT NULL AND (investigation_id = $2 OR id = $2))
        OR ($3::text IS NOT NULL AND (source_id = $3 OR id = $3))
      )
    ORDER BY extracted_at DESC NULLS LAST, created_at DESC, id ASC
    LIMIT $4
  `;
  return pg.readMany(query, [tenantId, answerId, nodeId, limit], { tenantId });
};

const fetchEvidenceForClaims = async (tenantId: string, claimIds: string[], limit: number) => {
  if (claimIds.length === 0) return [];
  const query = `
    SELECT ea.id,
      ea.artifact_type,
      ea.storage_uri,
      ea.content_preview,
      ea.created_at
    FROM evidence_artifacts ea
    JOIN claim_evidence_links cel ON cel.evidence_id = ea.id
    WHERE cel.claim_id = ANY($1)
      AND ea.tenant_id = $2
      AND cel.tenant_id = $2
    ORDER BY ea.created_at DESC NULLS LAST, ea.id ASC
    LIMIT $3
  `;
  return pg.readMany(query, [claimIds, tenantId, limit], { tenantId });
};

const fetchEvidenceLinks = async (tenantId: string, claimIds: string[]) => {
  if (claimIds.length === 0) return [];
  const query = `
    SELECT cel.claim_id,
      ea.id,
      ea.artifact_type,
      ea.storage_uri,
      ea.content_preview,
      ea.created_at,
      cel.created_at AS linked_at
    FROM claim_evidence_links cel
    JOIN evidence_artifacts ea ON ea.id = cel.evidence_id
    WHERE cel.claim_id = ANY($1)
      AND cel.tenant_id = $2
      AND ea.tenant_id = $2
    ORDER BY cel.created_at DESC NULLS LAST, ea.created_at DESC NULLS LAST, ea.id ASC
  `;
  return pg.readMany(query, [claimIds, tenantId], { tenantId });
};

const buildBadgeLinks = (tenantId: string, evidenceId: string, artifactType: string | null) => {
  const badgeKind = badgeForArtifactType(artifactType);
  if (!badgeKind || !DETERMINISTIC_BADGES.has(badgeKind)) {
    return [] as EvidenceBadge[];
  }

  const href = `/api/provenance-beta/evidence/${evidenceId}?tenant=${encodeURIComponent(tenantId)}`;
  return [{ kind: badgeKind, href }];
};

const buildTimeline = (claims: any[], evidence: any[]): EvidenceTimelineItem[] => {
  const claimItems = claims.map((claim: any) => ({
    id: claim.id,
    type: 'claim' as const,
    timestamp: claim.extracted_at ? new Date(claim.extracted_at).toISOString() : claim.created_at ? new Date(claim.created_at).toISOString() : null,
    label: claim.content?.slice(0, 120) || 'Claim recorded',
    detail: claim.claim_type || null,
  }));

  const evidenceItems = evidence.map((artifact: any) => ({
    id: artifact.id,
    type: 'evidence' as const,
    timestamp: artifact.created_at ? new Date(artifact.created_at).toISOString() : null,
    label: artifact.artifact_type || 'Evidence artifact',
    detail: artifact.content_preview || null,
  }));

  return [...claimItems, ...evidenceItems].sort((a, b) => {
    const aTime = a.timestamp ? Date.parse(a.timestamp) : 0;
    const bTime = b.timestamp ? Date.parse(b.timestamp) : 0;
    if (aTime !== bTime) return bTime - aTime;
    return a.id.localeCompare(b.id);
  });
};

const rankClaims = (claims: any[], evidenceLinks: any[], tenantId: string): RankedClaim[] => {
  const evidenceByClaim = new Map<string, SupportingEvidence[]>();

  evidenceLinks.forEach((link: any) => {
    const badges = buildBadgeLinks(tenantId, link.id, link.artifact_type);
    const entry: SupportingEvidence = {
      id: link.id,
      artifactType: link.artifact_type || 'evidence',
      location: link.storage_uri || null,
      badges,
    };
    const list = evidenceByClaim.get(link.claim_id) ?? [];
    list.push(entry);
    evidenceByClaim.set(link.claim_id, list);
  });

  const ranked = claims.map((claim: any) => {
    const supporting = evidenceByClaim.get(claim.id) ?? [];
    const badgeSet = new Map<string, EvidenceBadge>();
    supporting.forEach((item) => {
      item.badges.forEach((badge) => {
        badgeSet.set(badge.kind, badge);
      });
    });

    const badges = Array.from(badgeSet.values());
    const verifiabilityScore = Number(claim.confidence || 0) + badges.length * 0.1;

    return {
      id: claim.id,
      content: claim.content,
      confidence: Number(claim.confidence || 0),
      claimType: claim.claim_type || 'factual',
      extractedAt: claim.extracted_at ? new Date(claim.extracted_at).toISOString() : null,
      verifiabilityScore,
      badges,
      supporting,
    };
  });

  return ranked
    .filter((claim) => claim.badges.some((badge) => DETERMINISTIC_BADGES.has(badge.kind)))
    .sort((a, b) => {
      if (b.verifiabilityScore !== a.verifiabilityScore) {
        return b.verifiabilityScore - a.verifiabilityScore;
      }
      return a.id.localeCompare(b.id);
    })
    .slice(0, 3);
};

router.get('/evidence-index', ensureAuthenticated, async (req, res) => {
  const answerId = (req.query.answer_id as string) || null;
  const nodeId = (req.query.node_id as string) || null;
  const scopeCheck = ensureScope(answerId, nodeId);
  if (!scopeCheck.ok) {
    return res.status(400).json({ error: scopeCheck.error });
  }

  const tenantId = getTenantId(req);

  try {
    const claims = await fetchScopedClaims(tenantId, answerId, nodeId, DEFAULT_TIMELINE_LIMIT);
    const claimIds = claims.map((claim: any) => claim.id);
    const evidence = await fetchEvidenceForClaims(tenantId, claimIds, DEFAULT_TIMELINE_LIMIT);

    return res.json({
      timeline: buildTimeline(claims, evidence),
      claimCount: claims.length,
      evidenceCount: evidence.length,
    });
  } catch (error: any) {
    return res.status(500).json({ error: 'Failed to load evidence index' });
  }
});

router.get('/evidence-top', ensureAuthenticated, async (req, res) => {
  const answerId = (req.query.answer_id as string) || null;
  const nodeId = (req.query.node_id as string) || null;
  const scopeCheck = ensureScope(answerId, nodeId);
  if (!scopeCheck.ok) {
    return res.status(400).json({ error: scopeCheck.error });
  }

  const tenantId = getTenantId(req);
  const limit = clampLimit(Number(req.query.limit ?? DEFAULT_TOP_ARTIFACTS), DEFAULT_TOP_ARTIFACTS, MAX_TOP_ARTIFACTS);

  try {
    const claims = await fetchScopedClaims(tenantId, answerId, nodeId, DEFAULT_TIMELINE_LIMIT);
    const claimIds = claims.map((claim: any) => claim.id);
    const evidence = await fetchEvidenceForClaims(tenantId, claimIds, limit);

    const artifacts: EvidenceArtifact[] = evidence.map((artifact: any) => ({
      id: artifact.id,
      artifactType: artifact.artifact_type || 'evidence',
      location: artifact.storage_uri || null,
      createdAt: artifact.created_at ? new Date(artifact.created_at).toISOString() : null,
      preview: artifact.content_preview || null,
    }));

    return res.json({ artifacts });
  } catch (error: any) {
    return res.status(500).json({ error: 'Failed to load top evidence' });
  }
});

router.get('/claim-ranking', ensureAuthenticated, async (req, res) => {
  const answerId = (req.query.answer_id as string) || null;
  const nodeId = (req.query.node_id as string) || null;
  const scopeCheck = ensureScope(answerId, nodeId);
  if (!scopeCheck.ok) {
    return res.status(400).json({ error: scopeCheck.error });
  }

  const tenantId = getTenantId(req);

  try {
    const claims = await fetchScopedClaims(tenantId, answerId, nodeId, DEFAULT_TIMELINE_LIMIT);
    const claimIds = claims.map((claim: any) => claim.id);
    const evidenceLinks = await fetchEvidenceLinks(tenantId, claimIds);
    const rankedClaims = rankClaims(claims, evidenceLinks, tenantId);

    return res.json({ claims: rankedClaims });
  } catch (error: any) {
    return res.status(500).json({ error: 'Failed to load claim ranking' });
  }
});

export default router;
