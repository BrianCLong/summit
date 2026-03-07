import { Router, type Request, type Response } from 'express';
import { ZodError, z } from 'zod';
import { ensureAuthenticated } from '../middleware/auth.js';
import { getPostgresPool } from '../config/database.js';

type EvidenceBadgeKind = 'SBOM' | 'Provenance' | 'Test' | 'Attestation';

type EvidenceBadge = {
  kind: EvidenceBadgeKind;
  href: string;
};

type EvidenceItem = {
  evidence_id: string;
  title: string;
  url: string;
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

type EvidenceIndexRow = {
  id: string;
  artifact_type: string | null;
  storage_uri: string | null;
  content_preview: string | null;
  created_at: string;
  origin_url: string | null;
  weight: string | number | null;
};

type ClaimRankingRow = {
  id: string;
  content: string;
  confidence: number | string | null;
  evidence_ids: string[] | null;
};

type EvidenceArtifactTypeRow = {
  id: string;
  artifact_type: string | null;
};

interface AuthenticatedRequest extends Request {
  user?: {
    id?: string;
    tenantId?: string;
  };
}

const indexQuerySchema = z.object({
  answer_id: z.string().min(1),
  node_id: z.string().min(1).optional(),
});

const topQuerySchema = z.object({
  answer_id: z.string().min(1),
  limit: z.coerce.number().min(1).max(20).default(5),
});

const claimQuerySchema = z.object({
  answer_id: z.string().min(1),
});

const deterministicBadgeKinds: EvidenceBadgeKind[] = [
  'SBOM',
  'Provenance',
  'Test',
  'Attestation',
];

const toBadges = (
  artifactType: string,
  evidenceId: string,
): EvidenceBadge[] => {
  const normalized = artifactType.toLowerCase();
  const badges: EvidenceBadgeKind[] = [];

  if (normalized.includes('sbom')) {
    badges.push('SBOM');
  }
  if (normalized.includes('attest')) {
    badges.push('Attestation');
  }
  if (normalized.includes('test')) {
    badges.push('Test');
  }
  if (normalized.includes('provenance') || normalized.includes('receipt')) {
    badges.push('Provenance');
  }

  if (badges.length === 0) {
    badges.push('Provenance');
  }

  return badges.map((kind) => ({
    kind,
    href: `/api/evidence/${evidenceId}/badges.json`,
  }));
};

const buildEvidenceItem = (row: EvidenceIndexRow): EvidenceItem => ({
  evidence_id: row.id,
  title: row.content_preview || row.artifact_type || 'Evidence',
  url: row.storage_uri || row.origin_url || `/evidence/${row.id}`,
  ts: row.created_at,
  weight: Number(row.weight ?? 0),
  badges: toBadges(row.artifact_type || '', row.id),
});

const clamp = (value: number, min: number, max: number) =>
  Math.min(max, Math.max(min, value));

const computeVerifiability = (confidence: number, evidenceCount: number) => {
  const base = clamp(confidence || 0, 0, 1);
  const evidenceScore = clamp(evidenceCount / 5, 0, 1);
  return Number((base * 0.7 + evidenceScore * 0.3).toFixed(2));
};

const computeDelta = (confidence: number) =>
  Number(((clamp(confidence || 0.5, 0, 1) - 0.5) * 2).toFixed(2));

const sendBadRequest = (res: Response, error: unknown) => {
  if (error instanceof ZodError) {
    return res.status(400).json({
      error: 'Invalid request',
      details: error.flatten(),
    });
  }

  return res.status(500).json({ error: 'Failed to load evidence trail' });
};

const resolveTenantId = (req: Request, res: Response): string | null => {
  const authReq = req as AuthenticatedRequest;
  const tenantId = authReq.user?.tenantId;
  if (!tenantId) {
    res.status(401).json({ error: 'Unauthorized' });
    return null;
  }
  return tenantId;
};

const evidenceIndexQuery = `
  SELECT DISTINCT ON (e.id)
    e.id,
    e.artifact_type,
    e.storage_uri,
    e.content_preview,
    e.created_at,
    s.origin_url,
    COALESCE(MAX(l.confidence), 0) AS weight
  FROM claims_registry c
  JOIN claim_evidence_links l ON l.claim_id = c.id
  JOIN evidence_artifacts e ON e.id = l.evidence_id
  LEFT JOIN sources s ON s.id = e.source_id
  WHERE c.source_id = $1
    AND c.tenant_id = $2
    AND l.tenant_id = $2
    AND ($3::text IS NULL OR c.content ILIKE '%' || $3 || '%')
  GROUP BY e.id, e.artifact_type, e.storage_uri, e.content_preview, e.created_at, s.origin_url
  ORDER BY e.id, e.created_at ASC
`;

const evidenceTopQuery = `
  SELECT
    e.id,
    e.artifact_type,
    e.storage_uri,
    e.content_preview,
    e.created_at,
    s.origin_url,
    COALESCE(MAX(l.confidence), 0) AS weight
  FROM claims_registry c
  JOIN claim_evidence_links l ON l.claim_id = c.id
  JOIN evidence_artifacts e ON e.id = l.evidence_id
  LEFT JOIN sources s ON s.id = e.source_id
  WHERE c.source_id = $1
    AND c.tenant_id = $2
    AND l.tenant_id = $2
  GROUP BY e.id, e.artifact_type, e.storage_uri, e.content_preview, e.created_at, s.origin_url
  ORDER BY weight DESC, e.created_at DESC
  LIMIT $3
`;

const claimRankingQuery = `
  SELECT
    c.id,
    c.content,
    c.confidence,
    ARRAY_REMOVE(ARRAY_AGG(DISTINCT l.evidence_id), NULL) AS evidence_ids
  FROM claims_registry c
  LEFT JOIN claim_evidence_links l ON l.claim_id = c.id AND l.relation_type = 'SUPPORTS'
  WHERE c.source_id = $1 AND c.tenant_id = $2
  GROUP BY c.id
`;

export const evidenceIndexRouter = Router();
export const evidenceTopRouter = Router();
export const claimRankingRouter = Router();

evidenceIndexRouter.get('/', ensureAuthenticated, async (req, res) => {
  try {
    const { answer_id, node_id } = indexQuerySchema.parse(req.query);
    const tenantId = resolveTenantId(req, res);
    if (!tenantId) {
      return;
    }

    const pool = getPostgresPool();
    const { rows } = await pool.query<EvidenceIndexRow>(evidenceIndexQuery, [
      answer_id,
      tenantId,
      node_id ?? null,
    ]);

    const items = rows.map(buildEvidenceItem).sort((a, b) =>
      a.ts.localeCompare(b.ts),
    );

    res.json({ items });
  } catch (error: unknown) {
    sendBadRequest(res, error);
  }
});

evidenceTopRouter.get('/', ensureAuthenticated, async (req, res) => {
  try {
    const { answer_id, limit } = topQuerySchema.parse(req.query);
    const tenantId = resolveTenantId(req, res);
    if (!tenantId) {
      return;
    }

    const pool = getPostgresPool();
    const { rows } = await pool.query<EvidenceIndexRow>(evidenceTopQuery, [
      answer_id,
      tenantId,
      limit,
    ]);

    const items = rows.map(buildEvidenceItem);
    res.json({ items });
  } catch (error: unknown) {
    sendBadRequest(res, error);
  }
});

claimRankingRouter.get('/', ensureAuthenticated, async (req, res) => {
  try {
    const { answer_id } = claimQuerySchema.parse(req.query);
    const tenantId = resolveTenantId(req, res);
    if (!tenantId) {
      return;
    }

    const pool = getPostgresPool();
    const { rows: claimRows } = await pool.query<ClaimRankingRow>(
      claimRankingQuery,
      [answer_id, tenantId],
    );

    const evidenceIds = claimRows.flatMap((row) => row.evidence_ids || []);
    const uniqueEvidenceIds = [...new Set(evidenceIds)];
    let evidenceBadges = new Map<string, EvidenceBadgeKind[]>();

    if (uniqueEvidenceIds.length > 0) {
      const { rows: evidenceRows } = await pool.query<EvidenceArtifactTypeRow>(
        `
        SELECT id, artifact_type FROM evidence_artifacts
        WHERE id = ANY($1) AND tenant_id = $2
        `,
        [uniqueEvidenceIds, tenantId],
      );

      evidenceBadges = new Map(
        evidenceRows.map((row) => [
          row.id,
          toBadges(row.artifact_type || '', row.id).map((badge) => badge.kind),
        ]),
      );
    }

    const claims: RankedClaim[] = claimRows
      .map((row) => {
        const supporting = (row.evidence_ids || []).filter((id) => {
          const badges = evidenceBadges.get(id) || [];
          return badges.some((badge) => deterministicBadgeKinds.includes(badge));
        });

        if (supporting.length === 0) {
          return null;
        }

        const confidence = Number(row.confidence ?? 0);

        return {
          claim_id: row.id,
          text: row.content,
          verifiability: computeVerifiability(confidence, supporting.length),
          supporting,
          delta: computeDelta(confidence),
        };
      })
      .filter((claim): claim is RankedClaim => Boolean(claim))
      .sort((a, b) => b.verifiability - a.verifiability);

    res.json({ claims });
  } catch (error: unknown) {
    sendBadRequest(res, error);
  }
});
