export type DecayKernel = 'exponential' | 'hyperbolic';

export interface FreshnessMetadata {
  source: string;
  publishedAt: string | Date;
  lastVerifiedAt?: string | Date;
}

export interface RerankCandidate {
  id: string;
  relevance: number;
  metadata: FreshnessMetadata;
}

export interface RerankedCandidate extends RerankCandidate {
  freshness: number;
  combinedScore: number;
}

export interface FreshnessOptions {
  now?: Date;
  defaultHalfLifeHours: number;
  sourceHalfLives?: Record<string, number>;
  kernel?: DecayKernel;
  freshnessWeight?: number;
}

const LN_2 = Math.log(2);

function toDate(value: string | Date | undefined): Date | undefined {
  if (!value) {
    return undefined;
  }
  if (value instanceof Date) {
    return value;
  }
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) {
    throw new TypeError(`Invalid datetime value: ${value}`);
  }
  return parsed;
}

function hoursToMillis(hours: number): number {
  if (hours <= 0) {
    throw new Error('half-life must be positive');
  }
  return hours * 60 * 60 * 1000;
}

function computeAgeMillis(now: Date, metadata: FreshnessMetadata): number {
  const publishedAt = toDate(metadata.publishedAt);
  if (!publishedAt) {
    throw new Error('publishedAt is required');
  }
  const lastVerified = toDate(metadata.lastVerifiedAt);
  const reference = lastVerified && lastVerified > publishedAt ? lastVerified : publishedAt;
  return Math.max(0, now.getTime() - reference.getTime());
}

function exponentialDecay(ageMillis: number, halfLifeMillis: number): number {
  if (ageMillis === 0) {
    return 1;
  }
  const decayConstant = LN_2 / halfLifeMillis;
  return Math.exp(-decayConstant * ageMillis);
}

function hyperbolicDecay(ageMillis: number, halfLifeMillis: number): number {
  return 1 / (1 + ageMillis / halfLifeMillis);
}

function computeFreshness(
  metadata: FreshnessMetadata,
  halfLifeMillis: number,
  now: Date,
  kernel: DecayKernel,
): number {
  const ageMillis = computeAgeMillis(now, metadata);
  if (kernel === 'hyperbolic') {
    return hyperbolicDecay(ageMillis, halfLifeMillis);
  }
  return exponentialDecay(ageMillis, halfLifeMillis);
}

export function createFreshnessReranker(options: FreshnessOptions) {
  const {
    now = new Date(),
    defaultHalfLifeHours,
    sourceHalfLives = {},
    kernel = 'exponential',
    freshnessWeight = 1,
  } = options;

  const defaultHalfLifeMillis = hoursToMillis(defaultHalfLifeHours);

  function rerank(candidates: RerankCandidate[]): RerankedCandidate[] {
    const scored = candidates.map((candidate) => {
      const override = sourceHalfLives[candidate.metadata.source];
      const halfLifeMillis = override
        ? hoursToMillis(override)
        : defaultHalfLifeMillis;
      const freshness = computeFreshness(candidate.metadata, halfLifeMillis, now, kernel);
      const combined = candidate.relevance * ((1 - freshnessWeight) + freshnessWeight * freshness);
      return {
        ...candidate,
        freshness,
        combinedScore: combined,
      };
    });

    return scored.sort((a, b) => b.combinedScore - a.combinedScore);
  }

  return { rerank };
}
