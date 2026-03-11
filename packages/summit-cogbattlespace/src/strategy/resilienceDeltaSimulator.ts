import { createHash } from 'node:crypto';

type PressureDimension =
  | 'adaptivity'
  | 'cognitiveInfrastructure'
  | 'crossDomainLinkage'
  | 'swarmCoordination';

export type CampaignPressureSnapshot = {
  campaignId: string;
  asOf: string;
  narrativeCount: number;
  evidenceCount: number;
  indicatorKinds: string[];
  scores: Record<PressureDimension, number>;
};

export type InterventionPrimitive = {
  id: string;
  label: string;
  family: 'trust' | 'coordination' | 'friction' | 'verification' | 'education';
  cost: number;
  latencyHours: number;
  minimumEvidenceCount: number;
  effects: Record<PressureDimension, number>;
};

export type SimulationPolicy = {
  maxPortfolioSize: number;
  maxBudget: number;
  maxLatencyHours: number;
  minimumConfidence: number;
};

export type ResiliencePortfolioCandidate = {
  planId: string;
  primitiveIds: string[];
  projectedScores: Record<PressureDimension, number>;
  resilienceDelta: number;
  noveltyScore: number;
  confidence: number;
  cost: number;
  latencyHours: number;
  rationale: string;
};

export type ResilienceSimulationResult = {
  recommended: ResiliencePortfolioCandidate | null;
  candidates: ResiliencePortfolioCandidate[];
  baselinePressure: number;
};

const DIMENSIONS: PressureDimension[] = [
  'adaptivity',
  'cognitiveInfrastructure',
  'crossDomainLinkage',
  'swarmCoordination',
];

const WEIGHTS: Record<PressureDimension, number> = {
  adaptivity: 0.34,
  cognitiveInfrastructure: 0.26,
  crossDomainLinkage: 0.22,
  swarmCoordination: 0.18,
};

const DEFAULT_POLICY: SimulationPolicy = {
  maxPortfolioSize: 3,
  maxBudget: 1.0,
  maxLatencyHours: 72,
  minimumConfidence: 0.55,
};

export const DEFAULT_DEFENSIVE_PRIMITIVES: InterventionPrimitive[] = [
  {
    id: 'prebunk-briefing',
    label: 'Prebunk Briefing Packet',
    family: 'education',
    cost: 0.22,
    latencyHours: 18,
    minimumEvidenceCount: 2,
    effects: {
      adaptivity: 0.24,
      cognitiveInfrastructure: 0.41,
      crossDomainLinkage: 0.08,
      swarmCoordination: 0.06,
    },
  },
  {
    id: 'cross-domain-fusion-room',
    label: 'Cross-Domain Fusion Room',
    family: 'coordination',
    cost: 0.3,
    latencyHours: 24,
    minimumEvidenceCount: 3,
    effects: {
      adaptivity: 0.17,
      cognitiveInfrastructure: 0.12,
      crossDomainLinkage: 0.49,
      swarmCoordination: 0.19,
    },
  },
  {
    id: 'forensic-citation-watermark',
    label: 'Forensic Citation Watermark',
    family: 'verification',
    cost: 0.2,
    latencyHours: 12,
    minimumEvidenceCount: 2,
    effects: {
      adaptivity: 0.09,
      cognitiveInfrastructure: 0.3,
      crossDomainLinkage: 0.15,
      swarmCoordination: 0.2,
    },
  },
  {
    id: 'algorithmic-friction-surge',
    label: 'Algorithmic Friction Surge',
    family: 'friction',
    cost: 0.26,
    latencyHours: 14,
    minimumEvidenceCount: 1,
    effects: {
      adaptivity: 0.37,
      cognitiveInfrastructure: 0.09,
      crossDomainLinkage: 0.16,
      swarmCoordination: 0.31,
    },
  },
  {
    id: 'community-trust-cell',
    label: 'Community Trust Cell',
    family: 'trust',
    cost: 0.18,
    latencyHours: 36,
    minimumEvidenceCount: 2,
    effects: {
      adaptivity: 0.08,
      cognitiveInfrastructure: 0.44,
      crossDomainLinkage: 0.14,
      swarmCoordination: 0.12,
    },
  },
];

function clamp(value: number, min = 0, max = 1): number {
  return Math.min(max, Math.max(min, value));
}

function round4(value: number): number {
  return Number(value.toFixed(4));
}

function stableStringify(value: unknown): string {
  if (Array.isArray(value)) {
    return `[${value.map((entry) => stableStringify(entry)).join(',')}]`;
  }
  if (value !== null && typeof value === 'object') {
    const entries = Object.entries(value as Record<string, unknown>).sort(([a], [b]) =>
      a.localeCompare(b),
    );
    return `{${entries
      .map(([key, entryValue]) => `${JSON.stringify(key)}:${stableStringify(entryValue)}`)
      .join(',')}}`;
  }
  return JSON.stringify(value);
}

function hashPlanId(snapshot: CampaignPressureSnapshot, primitiveIds: string[]): string {
  const digest = createHash('sha256')
    .update(stableStringify({ snapshot, primitiveIds }))
    .digest('hex')
    .slice(0, 12)
    .toUpperCase();
  return `cogwar-plan-${digest}`;
}

function choosePortfolios(
  ordered: InterventionPrimitive[],
  maxSize: number,
): InterventionPrimitive[][] {
  const out: InterventionPrimitive[][] = [];
  const active: InterventionPrimitive[] = [];

  const walk = (index: number): void => {
    if (active.length > 0) {
      out.push([...active]);
    }
    if (active.length === maxSize) {
      return;
    }
    for (let i = index; i < ordered.length; i += 1) {
      active.push(ordered[i] as InterventionPrimitive);
      walk(i + 1);
      active.pop();
    }
  };

  walk(0);
  return out;
}

function blendedEffect(portfolio: InterventionPrimitive[], dimension: PressureDimension): number {
  const missProbability = portfolio.reduce(
    (current, primitive) => current * (1 - clamp(primitive.effects[dimension])),
    1,
  );
  return clamp(1 - missProbability);
}

function computeNovelty(portfolio: InterventionPrimitive[]): number {
  if (portfolio.length <= 1) {
    return 0.35;
  }
  const familyCount = new Set(portfolio.map((primitive) => primitive.family)).size;
  const familyDiversity = familyCount / portfolio.length;
  let axisCoverage = 0;
  for (const dimension of DIMENSIONS) {
    const strongest = Math.max(
      ...portfolio.map((primitive) => clamp(primitive.effects[dimension])),
    );
    axisCoverage += strongest;
  }
  const normalizedCoverage = axisCoverage / DIMENSIONS.length;
  return round4(clamp((familyDiversity * 0.55 + normalizedCoverage * 0.45) * 1.05));
}

function computeConfidence(
  snapshot: CampaignPressureSnapshot,
  portfolio: InterventionPrimitive[],
): number {
  const evidencePressure = clamp(snapshot.evidenceCount / 10);
  const requirementMean =
    portfolio.reduce((sum, primitive) => sum + primitive.minimumEvidenceCount, 0) /
    portfolio.length;
  const requirementMatch = clamp(snapshot.evidenceCount / Math.max(1, requirementMean * 2));
  return round4(clamp(evidencePressure * 0.6 + requirementMatch * 0.4));
}

function scorePressure(scores: Record<PressureDimension, number>): number {
  return round4(
    DIMENSIONS.reduce((sum, dimension) => sum + clamp(scores[dimension]) * WEIGHTS[dimension], 0),
  );
}

export function simulateResilienceDelta(
  snapshot: CampaignPressureSnapshot,
  primitives: InterventionPrimitive[] = DEFAULT_DEFENSIVE_PRIMITIVES,
  policyOverrides: Partial<SimulationPolicy> = {},
): ResilienceSimulationResult {
  const policy: SimulationPolicy = { ...DEFAULT_POLICY, ...policyOverrides };
  const orderedPrimitives = [...primitives].sort((a, b) => a.id.localeCompare(b.id));
  const baselinePressure = scorePressure(snapshot.scores);
  const candidatePortfolios = choosePortfolios(orderedPrimitives, policy.maxPortfolioSize);

  const candidates: ResiliencePortfolioCandidate[] = [];
  for (const portfolio of candidatePortfolios) {
    const primitiveIds = portfolio.map((primitive) => primitive.id).sort();
    const cost = round4(portfolio.reduce((sum, primitive) => sum + primitive.cost, 0));
    const latencyHours = Math.max(...portfolio.map((primitive) => primitive.latencyHours));
    const confidence = computeConfidence(snapshot, portfolio);
    const minimumEvidenceRequired = Math.max(
      ...portfolio.map((primitive) => primitive.minimumEvidenceCount),
    );

    if (cost > policy.maxBudget) {
      continue;
    }
    if (latencyHours > policy.maxLatencyHours) {
      continue;
    }
    if (confidence < policy.minimumConfidence) {
      continue;
    }
    if (snapshot.evidenceCount < minimumEvidenceRequired) {
      continue;
    }

    const projectedScores: Record<PressureDimension, number> = {
      adaptivity: 0,
      cognitiveInfrastructure: 0,
      crossDomainLinkage: 0,
      swarmCoordination: 0,
    };
    for (const dimension of DIMENSIONS) {
      const baseline = clamp(snapshot.scores[dimension]);
      const effect = blendedEffect(portfolio, dimension);
      projectedScores[dimension] = round4(clamp(baseline * (1 - effect)));
    }

    const projectedPressure = scorePressure(projectedScores);
    const resilienceDelta = round4(clamp(baselinePressure - projectedPressure));
    const noveltyScore = computeNovelty(portfolio);
    const rationale =
      `Defensive portfolio lowers weighted pressure by ${resilienceDelta} ` +
      `with confidence ${confidence} across ${primitiveIds.length} interventions.`;

    candidates.push({
      planId: hashPlanId(snapshot, primitiveIds),
      primitiveIds,
      projectedScores,
      resilienceDelta,
      noveltyScore,
      confidence,
      cost,
      latencyHours,
      rationale,
    });
  }

  candidates.sort((left, right) => {
    if (right.resilienceDelta !== left.resilienceDelta) {
      return right.resilienceDelta - left.resilienceDelta;
    }
    if (right.noveltyScore !== left.noveltyScore) {
      return right.noveltyScore - left.noveltyScore;
    }
    if (left.cost !== right.cost) {
      return left.cost - right.cost;
    }
    if (left.latencyHours !== right.latencyHours) {
      return left.latencyHours - right.latencyHours;
    }
    return left.planId.localeCompare(right.planId);
  });

  return {
    recommended: candidates[0] ?? null,
    candidates,
    baselinePressure,
  };
}
