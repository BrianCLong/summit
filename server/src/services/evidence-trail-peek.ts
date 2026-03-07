import { pool } from '../db/pg.js';
import { runCypher } from '../graph/neo4j.js';

export type BadgeKind = 'SBOM' | 'Provenance' | 'Test' | 'Attestation';

export type EvidenceBadge = {
  kind: BadgeKind;
  href?: string;
};

export type EvidenceItem = {
  evidence_id: string;
  title: string;
  url?: string;
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

type EvidenceTrailFixture = {
  timeline: EvidenceItem[];
  topEvidence: EvidenceItem[];
  claims: RankedClaim[];
};

type CitedEvidenceRow = {
  evidence_id?: string;
  title?: string;
  url?: string;
  ts?: number | string;
  weight?: number;
};

type ClaimRow = {
  claim_id: string;
  text: string;
  verifiability: number;
  supporting: string[];
  support_count: number;
};

const DETERMINISTIC_BADGES: BadgeKind[] = [
  'SBOM',
  'Provenance',
  'Test',
  'Attestation',
];

const fixtureStore = new Map<string, EvidenceTrailFixture>();

const allowlistedHosts = new Set(
  (process.env.EVIDENCE_BADGE_HOST_ALLOWLIST ?? '')
    .split(',')
    .map((value) => value.trim())
    .filter(Boolean)
);

const isRelativeUrl = (href: string) => href.startsWith('/');

const toIsoTimestamp = (raw?: number | string) => {
  if (typeof raw === 'number' && Number.isFinite(raw)) {
    return new Date(raw).toISOString();
  }
  if (typeof raw === 'string' && raw.length > 0) {
    const parsed = Date.parse(raw);
    if (Number.isFinite(parsed)) {
      return new Date(parsed).toISOString();
    }
  }
  return new Date(0).toISOString();
};

const sanitizeUrl = (href?: string) => {
  if (!href) return undefined;
  if (isRelativeUrl(href)) {
    const withoutHash = href.split('#')[0];
    return withoutHash.split('?')[0];
  }
  try {
    const parsed = new URL(href);
    if (!['http:', 'https:'].includes(parsed.protocol)) {
      return undefined;
    }
    if (!allowlistedHosts.has(parsed.host)) {
      return undefined;
    }
    parsed.search = '';
    parsed.hash = '';
    return parsed.toString();
  } catch {
    return undefined;
  }
};

const deterministicBadgeForEvidence = (evidenceId: string): EvidenceBadge[] => [
  {
    kind: 'Provenance',
    href: `/evidence/${encodeURIComponent(evidenceId)}/badges.json`,
  },
];

const sanitizeBadges = (badges: EvidenceBadge[]) =>
  badges
    .filter((badge) => DETERMINISTIC_BADGES.includes(badge.kind))
    .map((badge) => ({
      ...badge,
      href: sanitizeUrl(badge.href),
    }))
    .filter((badge) => Boolean(badge.href));

const sanitizeEvidenceItem = (item: EvidenceItem): EvidenceItem => {
  const sanitizedUrl = sanitizeUrl(item.url);
  return {
    ...item,
    url: sanitizedUrl,
    badges: sanitizeBadges(item.badges ?? []),
  };
};

const buildEvidenceLookup = (items: EvidenceItem[]) => {
  const lookup = new Map<string, EvidenceItem>();
  items.forEach((item) => lookup.set(item.evidence_id, item));
  return lookup;
};

const toEvidenceItem = (row: CitedEvidenceRow): EvidenceItem | null => {
  if (!row.evidence_id) return null;
  return sanitizeEvidenceItem({
    evidence_id: row.evidence_id,
    title: row.title ?? row.evidence_id,
    url: row.url,
    ts: toIsoTimestamp(row.ts),
    weight: Number(row.weight ?? 0),
    badges: deterministicBadgeForEvidence(row.evidence_id),
  });
};

const loadCitedEvidence = async (answerId: string): Promise<EvidenceItem[]> => {
  const rows = await runCypher<CitedEvidenceRow>(
    `
      MATCH (a:Answer {id:$answerId})-[c:CITED]->(target)
      WITH
        coalesce(target.id, target.source, toString(id(target))) AS evidence_id,
        coalesce(target.title, target.name, target.source, toString(id(target))) AS title,
        coalesce(target.url, target.source, '') AS url,
        coalesce(c.ts, a.createdAt, timestamp()) AS ts,
        coalesce(c.weight, 1.0) AS weight
      RETURN evidence_id, title, url, ts, weight
      ORDER BY ts ASC, evidence_id ASC
    `,
    { answerId },
  );

  return rows
    .map(toEvidenceItem)
    .filter((item): item is EvidenceItem => item !== null);
};

export const hasDeterministicBadge = (item?: EvidenceItem) => {
  if (!item) return false;
  return item.badges?.some((badge) => DETERMINISTIC_BADGES.includes(badge.kind));
};

export const seedEvidenceTrailPeekFixture = (
  answerId: string,
  fixture: EvidenceTrailFixture
) => {
  fixtureStore.set(answerId, fixture);
};

export const clearEvidenceTrailPeekFixtures = () => {
  fixtureStore.clear();
};

export const getEvidenceIndex = async (
  answerId: string,
  _nodeId?: string
): Promise<EvidenceItem[]> => {
  const fixture = fixtureStore.get(answerId);
  if (fixture) {
    return fixture.timeline.map(sanitizeEvidenceItem);
  }

  return loadCitedEvidence(answerId);
};

export const getTopEvidence = async (
  answerId: string,
  limit: number
): Promise<EvidenceItem[]> => {
  const fixture = fixtureStore.get(answerId);
  if (fixture) {
    return fixture.topEvidence.slice(0, limit).map(sanitizeEvidenceItem);
  }

  const index = await loadCitedEvidence(answerId);
  return [...index]
    .sort(
      (a, b) =>
        b.weight - a.weight ||
        Date.parse(b.ts) - Date.parse(a.ts) ||
        a.evidence_id.localeCompare(b.evidence_id)
    )
    .slice(0, limit);
};

const loadClaims = async (answerId: string): Promise<ClaimRow[]> => {
  const result = await pool.query(
    `
      SELECT
        c.id::text AS claim_id,
        c.content::text AS text,
        COALESCE(c.confidence, 0)::float AS verifiability,
        ARRAY_REMOVE(array_agg(DISTINCT cel.evidence_id::text), NULL) AS supporting,
        COUNT(cel.evidence_id)::int AS support_count
      FROM claims_registry c
      LEFT JOIN claim_evidence_links cel ON cel.claim_id = c.id
      WHERE c.source_id = $1 OR c.id::text = $1
      GROUP BY c.id, c.content, c.confidence
      ORDER BY COALESCE(c.confidence, 0) DESC, c.id::text ASC
    `,
    [answerId],
  );

  return result.rows as ClaimRow[];
};

const buildClaimsFromEvidence = (evidence: EvidenceItem[]): RankedClaim[] =>
  evidence.slice(0, 3).map((item, index) => ({
    claim_id: `derived-${item.evidence_id}`,
    text: `Claim inferred from ${item.title}`,
    verifiability: Math.max(0.1, Math.min(1, item.weight)),
    supporting: [item.evidence_id],
    delta: Number((item.weight - 0.5 - index * 0.05).toFixed(2)),
  }));

export const getRankedClaims = async (
  answerId: string
): Promise<RankedClaim[]> => {
  const fixture = fixtureStore.get(answerId);
  if (fixture) {
    const fixtureEvidence = [...fixture.timeline, ...fixture.topEvidence].map(sanitizeEvidenceItem);
    const fixtureLookup = buildEvidenceLookup(fixtureEvidence);
    return fixture.claims
      .filter((claim) =>
        claim.supporting.some((id) => hasDeterministicBadge(fixtureLookup.get(id)))
      )
      .sort(
        (a, b) => b.verifiability - a.verifiability || b.delta - a.delta
      );
  }

  const evidenceIndex = await loadCitedEvidence(answerId);
  const evidenceLookup = buildEvidenceLookup(evidenceIndex);
  const claimRows = await loadClaims(answerId);

  const mappedClaims: RankedClaim[] = claimRows.map((row) => ({
    claim_id: row.claim_id,
    text: row.text,
    verifiability: Number(row.verifiability ?? 0),
    supporting: row.supporting ?? [],
    delta: Number(((row.verifiability ?? 0) - 0.5).toFixed(2)),
  }));

  const baseClaims = mappedClaims.length > 0 ? mappedClaims : buildClaimsFromEvidence(evidenceIndex);

  return baseClaims
    .filter((claim) =>
      Array.isArray(claim.supporting) &&
      claim.supporting.length > 0 &&
      claim.supporting.some((id) => hasDeterministicBadge(evidenceLookup.get(id)))
    )
    .sort(
      (a, b) => b.verifiability - a.verifiability || b.delta - a.delta
    );
};
