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

const buildEvidenceLookup = (fixture: EvidenceTrailFixture) => {
  const lookup = new Map<string, EvidenceItem>();
  fixture.timeline.forEach((item) => lookup.set(item.evidence_id, item));
  fixture.topEvidence.forEach((item) => {
    if (!lookup.has(item.evidence_id)) lookup.set(item.evidence_id, item);
  });
  return lookup;
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
  if (!fixture) return [];
  return fixture.timeline.map(sanitizeEvidenceItem);
};

export const getTopEvidence = async (
  answerId: string,
  limit: number
): Promise<EvidenceItem[]> => {
  const fixture = fixtureStore.get(answerId);
  if (!fixture) return [];
  return fixture.topEvidence.slice(0, limit).map(sanitizeEvidenceItem);
};

export const getRankedClaims = async (
  answerId: string
): Promise<RankedClaim[]> => {
  const fixture = fixtureStore.get(answerId);
  if (!fixture) return [];

  const lookup = buildEvidenceLookup(fixture);
  const eligible = fixture.claims.filter((claim) =>
    claim.supporting.some((id) => hasDeterministicBadge(lookup.get(id)))
  );

  return eligible.sort(
    (a, b) => b.verifiability - a.verifiability || b.delta - a.delta
  );
};
