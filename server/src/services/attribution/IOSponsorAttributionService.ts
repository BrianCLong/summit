const DEFAULT_WEIGHTS = {
  infrastructure: 0.35,
  timing: 0.2,
  contentFingerprint: 0.25,
  languageMarker: 0.2,
};

const CATEGORY_LABELS: Record<AttributionCategory, string> = {
  infrastructure: 'Infrastructure reuse',
  timing: 'Timing alignment',
  contentFingerprint: 'Content fingerprint similarity',
  languageMarker: 'Language marker overlap',
};

export type AttributionCategory =
  | 'infrastructure'
  | 'timing'
  | 'contentFingerprint'
  | 'languageMarker';

export interface SponsorCandidate {
  id: string;
  name: string;
  description?: string | null;
}

export interface AttributionIndicator {
  id: string;
  category: AttributionCategory;
  description: string;
  confidence: number;
  observedAt?: string | null;
  metadata?: Record<string, unknown> | null;
}

export interface AttributionSignal {
  indicatorId: string;
  sponsorId: string;
  signalStrength: number;
  rationale?: string | null;
}

export interface AttributionWeights {
  infrastructure?: number;
  timing?: number;
  contentFingerprint?: number;
  languageMarker?: number;
}

export interface SponsorAttributionRequest {
  indicators: AttributionIndicator[];
  candidates: SponsorCandidate[];
  signals: AttributionSignal[];
  weights?: AttributionWeights;
}

export interface AttributionGraph {
  indicators: AttributionIndicator[];
  sponsors: SponsorCandidate[];
  edges: AttributionSignal[];
}

export interface AttributionEvidenceContribution {
  indicatorId: string;
  category: AttributionCategory;
  indicatorConfidence: number;
  signalStrength: number;
  weight: number;
  contribution: number;
  rationale?: string | null;
}

export interface SponsorHypothesis {
  sponsorId: string;
  sponsorName: string;
  score: number;
  confidence: number;
  evidence: AttributionEvidenceContribution[];
  caveats: string[];
}

export interface AttributionCategoryCoverage {
  category: AttributionCategory;
  indicatorCount: number;
  weight: number;
}

export interface AttributionCoverage {
  indicatorCount: number;
  categoryCoverage: AttributionCategoryCoverage[];
}

export interface SponsorAttributionRanking {
  modelVersion: string;
  coverage: AttributionCoverage;
  hypotheses: SponsorHypothesis[];
}

export interface SponsorRankingDelta {
  sponsorId: string;
  sponsorName: string;
  baselineRank: number;
  scenarioRank: number;
  deltaScore: number;
  deltaConfidence: number;
}

export interface SponsorAttributionScenarioResult {
  baseline: SponsorAttributionRanking;
  scenario: SponsorAttributionRanking;
  deltas: SponsorRankingDelta[];
}

const MODEL_VERSION = 'io-sponsor-attribution-v1';
const MIN_INDICATOR_COUNT = 3;

export class IOSponsorAttributionService {
  computeRanking(
    request: SponsorAttributionRequest,
    overrideWeights?: AttributionWeights,
  ): SponsorAttributionRanking {
    const normalizedWeights = normalizeWeights(
      request.weights,
      overrideWeights,
    );
    validateRequest(request);

    const graph = buildGraph(request);
    const indicatorMap = new Map(
      graph.indicators.map((indicator) => [indicator.id, indicator]),
    );
    const candidateMap = new Map(
      graph.sponsors.map((candidate) => [candidate.id, candidate]),
    );

    const coverage = buildCoverage(request.indicators, normalizedWeights);
    const sponsorScores = new Map<string, SponsorHypothesis>();

    graph.sponsors.forEach((candidate) => {
      sponsorScores.set(candidate.id, {
        sponsorId: candidate.id,
        sponsorName: candidate.name,
        score: 0,
        confidence: 0,
        evidence: [],
        caveats: [],
      });
    });

    graph.edges.forEach((signal) => {
      const indicator = indicatorMap.get(signal.indicatorId);
      const candidate = candidateMap.get(signal.sponsorId);
      if (!indicator || !candidate) {
        return;
      }
      const weight = normalizedWeights[indicator.category];
      const signalStrength = clamp(signal.signalStrength);
      const indicatorConfidence = clamp(indicator.confidence);
      const contribution = signalStrength * indicatorConfidence * weight;
      const sponsor = sponsorScores.get(candidate.id);
      if (!sponsor) {
        return;
      }
      sponsor.score += contribution;
      sponsor.evidence.push({
        indicatorId: indicator.id,
        category: indicator.category,
        indicatorConfidence,
        signalStrength,
        weight,
        contribution,
        rationale: signal.rationale ?? null,
      });
    });

    const hypotheses = Array.from(sponsorScores.values());
    const totalScore = hypotheses.reduce((sum, item) => sum + item.score, 0);

    hypotheses.forEach((hypothesis) => {
      hypothesis.confidence = totalScore > 0 ? hypothesis.score / totalScore : 0;
      const categoriesSeen = new Set(
        hypothesis.evidence.map((evidence) => evidence.category),
      );
      const missingCategories = coverage.categoryCoverage
        .filter((coverageItem) => coverageItem.weight > 0)
        .filter((coverageItem) => !categoriesSeen.has(coverageItem.category))
        .map((coverageItem) => coverageItem.category);

      missingCategories.forEach((category) => {
        hypothesis.caveats.push(
          `No ${CATEGORY_LABELS[category]} signals connected to this sponsor.`,
        );
      });

      if (hypothesis.evidence.length < MIN_INDICATOR_COUNT) {
        hypothesis.caveats.push(
          `Only ${hypothesis.evidence.length} linked indicators; confidence is intentionally constrained.`,
        );
      }
    });

    const sorted = hypotheses.sort((a, b) => b.score - a.score);
    if (sorted.length > 1) {
      const top = sorted[0];
      const runnerUp = sorted[1];
      if (top.score > 0 && runnerUp.score > 0) {
        const gap = top.score - runnerUp.score;
        if (gap / top.score < 0.15) {
          top.caveats.push(
            'Top candidates are within 15% of each other; attribution remains contested.',
          );
        }
      }
    }

    return {
      modelVersion: MODEL_VERSION,
      coverage,
      hypotheses: sorted,
    };
  }

  computeScenario(
    request: SponsorAttributionRequest,
    scenarioWeights: AttributionWeights,
  ): SponsorAttributionScenarioResult {
    const baseline = this.computeRanking(request);
    const scenario = this.computeRanking(request, scenarioWeights);
    const deltas = buildRankingDeltas(baseline, scenario);

    return {
      baseline,
      scenario,
      deltas,
    };
  }
}

function buildGraph(request: SponsorAttributionRequest): AttributionGraph {
  return {
    indicators: request.indicators,
    sponsors: request.candidates,
    edges: request.signals,
  };
}

function normalizeWeights(
  baseWeights?: AttributionWeights,
  overrideWeights?: AttributionWeights,
): Record<AttributionCategory, number> {
  const merged: AttributionWeights = {
    ...DEFAULT_WEIGHTS,
    ...baseWeights,
    ...overrideWeights,
  };

  const total =
    (merged.infrastructure ?? 0) +
    (merged.timing ?? 0) +
    (merged.contentFingerprint ?? 0) +
    (merged.languageMarker ?? 0);

  if (total <= 0) {
    return { ...DEFAULT_WEIGHTS };
  }

  return {
    infrastructure: (merged.infrastructure ?? 0) / total,
    timing: (merged.timing ?? 0) / total,
    contentFingerprint: (merged.contentFingerprint ?? 0) / total,
    languageMarker: (merged.languageMarker ?? 0) / total,
  };
}

function buildCoverage(
  indicators: AttributionIndicator[],
  weights: Record<AttributionCategory, number>,
): AttributionCoverage {
  const counts: Record<AttributionCategory, number> = {
    infrastructure: 0,
    timing: 0,
    contentFingerprint: 0,
    languageMarker: 0,
  };

  indicators.forEach((indicator) => {
    counts[indicator.category] += 1;
  });

  return {
    indicatorCount: indicators.length,
    categoryCoverage: (Object.keys(counts) as AttributionCategory[]).map(
      (category) => ({
        category,
        indicatorCount: counts[category],
        weight: weights[category],
      }),
    ),
  };
}

function buildRankingDeltas(
  baseline: SponsorAttributionRanking,
  scenario: SponsorAttributionRanking,
): SponsorRankingDelta[] {
  const baselineRanks = new Map(
    baseline.hypotheses.map((hypothesis, index) => [hypothesis.sponsorId, index + 1]),
  );
  const scenarioRanks = new Map(
    scenario.hypotheses.map((hypothesis, index) => [hypothesis.sponsorId, index + 1]),
  );

  return scenario.hypotheses.map((hypothesis) => {
    const baselineHypothesis = baseline.hypotheses.find(
      (item) => item.sponsorId === hypothesis.sponsorId,
    );
    const baselineScore = baselineHypothesis?.score ?? 0;
    const baselineConfidence = baselineHypothesis?.confidence ?? 0;

    return {
      sponsorId: hypothesis.sponsorId,
      sponsorName: hypothesis.sponsorName,
      baselineRank: baselineRanks.get(hypothesis.sponsorId) ?? 0,
      scenarioRank: scenarioRanks.get(hypothesis.sponsorId) ?? 0,
      deltaScore: hypothesis.score - baselineScore,
      deltaConfidence: hypothesis.confidence - baselineConfidence,
    };
  });
}

function validateRequest(request: SponsorAttributionRequest): void {
  if (request.indicators.length === 0) {
    throw new Error('At least one indicator is required for attribution.');
  }
  if (request.candidates.length === 0) {
    throw new Error('At least one sponsor candidate is required for attribution.');
  }

  const indicatorIds = new Set(request.indicators.map((indicator) => indicator.id));
  const candidateIds = new Set(request.candidates.map((candidate) => candidate.id));

  request.signals.forEach((signal) => {
    if (!indicatorIds.has(signal.indicatorId)) {
      throw new Error(`Signal references unknown indicator ${signal.indicatorId}.`);
    }
    if (!candidateIds.has(signal.sponsorId)) {
      throw new Error(`Signal references unknown sponsor ${signal.sponsorId}.`);
    }
  });
}

function clamp(value: number): number {
  if (Number.isNaN(value)) {
    return 0;
  }
  return Math.min(1, Math.max(0, value));
}
