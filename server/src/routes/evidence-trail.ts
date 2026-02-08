import { Router, type Request, type Response } from 'express';
import { z } from 'zod';
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

const toBadges = (artifactType: string, evidenceId: string): EvidenceBadge[] => {
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
    href: `/evidence/${evidenceId}/badges.json`,
  }));
};

const buildEvidenceItem = (row: any): EvidenceItem => ({
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

export const evidenceIndexRouter = Router();
export const evidenceTopRouter = Router();
export const claimRankingRouter = Router();

evidenceIndexRouter.get(
  '/',
  ensureAuthenticated,
  async (req: Request, res: Response) => {
    const authReq = req as AuthenticatedRequest;
    const { answer_id } = indexQuerySchema.parse(req.query);
    const tenantId = authReq.user?.tenantId;

    if (!tenantId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const pool = getPostgresPool();
    const { rows } = await pool.query(
      `
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
      WHERE c.source_id = $1 AND c.tenant_id = $2 AND l.tenant_id = $2
      GROUP BY e.id, e.artifact_type, e.storage_uri, e.content_preview, e.created_at, s.origin_url
      ORDER BY e.id, e.created_at ASC
      `,
      [answer_id, tenantId],
    );

    const items = rows.map(buildEvidenceItem).sort((a, b) =>
      a.ts.localeCompare(b.ts),
    );
    return res.json({ items });
  },
);

evidenceTopRouter.get(
  '/',
  ensureAuthenticated,
  async (req: Request, res: Response) => {
    const authReq = req as AuthenticatedRequest;
    const { answer_id, limit } = topQuerySchema.parse(req.query);
    const tenantId = authReq.user?.tenantId;

    if (!tenantId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const pool = getPostgresPool();
    const { rows } = await pool.query(
      `
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
      WHERE c.source_id = $1 AND c.tenant_id = $2 AND l.tenant_id = $2
      GROUP BY e.id, e.artifact_type, e.storage_uri, e.content_preview, e.created_at, s.origin_url
      ORDER BY weight DESC, e.created_at DESC
      LIMIT $3
      `,
      [answer_id, tenantId, limit],
    );

    const items = rows.map(buildEvidenceItem);
    return res.json({ items });
  },
);

claimRankingRouter.get(
  '/',
  ensureAuthenticated,
  async (req: Request, res: Response) => {
    const authReq = req as AuthenticatedRequest;
    const { answer_id } = claimQuerySchema.parse(req.query);
    const tenantId = authReq.user?.tenantId;

    if (!tenantId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const pool = getPostgresPool();
    const { rows: claimRows } = await pool.query(
      `
      SELECT
        c.id,
        c.content,
        c.confidence,
        ARRAY_REMOVE(ARRAY_AGG(DISTINCT l.evidence_id), NULL) AS evidence_ids
      FROM claims_registry c
      LEFT JOIN claim_evidence_links l ON l.claim_id = c.id AND l.relation_type = 'SUPPORTS'
      WHERE c.source_id = $1 AND c.tenant_id = $2
      GROUP BY c.id
      `,
      [answer_id, tenantId],
    );

    const evidenceIds = claimRows.flatMap((row: any) => row.evidence_ids || []);
    const uniqueEvidenceIds = [...new Set(evidenceIds)];
    let evidenceBadges = new Map<string, EvidenceBadgeKind[]>();

    if (uniqueEvidenceIds.length > 0) {
      const { rows: evidenceRows } = await pool.query(
        `
        SELECT id, artifact_type FROM evidence_artifacts
        WHERE id = ANY($1) AND tenant_id = $2
        `,
        [uniqueEvidenceIds, tenantId],
      );

      evidenceBadges = new Map(
        evidenceRows.map((row: any) => [
          row.id,
          toBadges(row.artifact_type || '', row.id).map((badge) => badge.kind),
        ]),
      );
    }

    const claims: RankedClaim[] = claimRows
      .map((row: any) => {
        const supporting = (row.evidence_ids || []).filter((id: string) => {
          const badges = evidenceBadges.get(id) || [];
          return badges.some((badge) =>
            deterministicBadgeKinds.includes(badge),
          );
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
      .filter(Boolean)
      .sort((a: RankedClaim, b: RankedClaim) => b.verifiability - a.verifiability);

    return res.json({ claims });
  },
);
