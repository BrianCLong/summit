import type {
  CompositeMarketSnapshot,
  DemandForecastDatum,
  StrategyInput,
  StrategyRecommendation,
  WorkloadProfile,
} from './types.js';

interface Strategy {
  readonly name: string;
  evaluate(input: StrategyInput): StrategyRecommendation[];
}

function getDemand(
  demand: DemandForecastDatum[],
  provider: string,
  region: string,
  resource: string,
): DemandForecastDatum | undefined {
  return demand.find(
    (datum) =>
      datum.provider === provider &&
      datum.region === region &&
      datum.resource === resource,
  );
}

function getEnergyScore(
  snapshot: CompositeMarketSnapshot,
  region: string,
  weight: number,
): number {
  const energy = snapshot.energy.find((entry) => entry.region === region);
  if (!energy) {
    return 0.5 * weight;
  }
  const normalizedCarbon = Math.max(
    0,
    1 - energy.carbonIntensityGramsPerKwh / 600,
  );
  return normalizedCarbon * weight;
}

function getRegulatoryScore(
  snapshot: CompositeMarketSnapshot,
  provider: string,
  region: string,
): number {
  const entry = snapshot.regulation.find(
    (datum) => datum.provider === provider && datum.region === region,
  );
  if (!entry) {
    return 0.25;
  }
  return 0.5 + Math.max(0, entry.incentivePerUnit - entry.penaltyPerUnit) * 10;
}

function basePerformanceScore(
  demand: DemandForecastDatum | undefined,
  profile: WorkloadProfile,
): number {
  if (!demand) {
    return profile.availabilityTier === 'mission-critical' ? 0.6 : 0.5;
  }
  const utilizationFactor = 1 - Math.min(0.95, demand.predictedUtilization);
  const confidenceBoost = demand.confidence * 0.2;
  const tierWeight =
    profile.availabilityTier === 'mission-critical' ? 0.7 : 0.5;
  return Math.max(0.3, tierWeight + utilizationFactor * 0.3 + confidenceBoost);
}

function buildRecommendations(
  snapshot: CompositeMarketSnapshot,
  profile: WorkloadProfile,
  priceSelector: (args: {
    spot: number;
    reserved: number;
    demand?: DemandForecastDatum;
    profile: WorkloadProfile;
  }) => number,
  label: string,
  modifier: (
    recommendation: StrategyRecommendation,
  ) => StrategyRecommendation = (rec) => rec,
): StrategyRecommendation[] {
  return snapshot.financial.flatMap((financial) => {
    const demand = getDemand(
      snapshot.demand,
      financial.provider,
      financial.region,
      'compute',
    );
    const basePrice = priceSelector({
      spot: financial.spotPricePerUnit,
      reserved: financial.reservedPricePerUnit,
      demand,
      profile,
    });
    const energyScore = getEnergyScore(
      snapshot,
      financial.region,
      profile.sustainabilityWeight,
    );
    const regulatoryScore = getRegulatoryScore(
      snapshot,
      financial.provider,
      financial.region,
    );
    const performanceScore = basePerformanceScore(demand, profile);
    const totalScore = performanceScore + energyScore + regulatoryScore;

    const recommendation: StrategyRecommendation = {
      strategy: label,
      provider: financial.provider,
      region: financial.region,
      resource: 'compute',
      expectedUnitPrice: basePrice,
      expectedPerformanceScore: performanceScore,
      sustainabilityScore: energyScore,
      regulatoryScore,
      totalScore,
    };

    return [modifier(recommendation)];
  });
}

export class ServerlessFirstStrategy implements Strategy {
  readonly name = 'serverless';

  evaluate(input: StrategyInput): StrategyRecommendation[] {
    return buildRecommendations(
      input.snapshot,
      input.workloadProfile,
      ({ reserved, profile }) => {
        const availabilityPremium =
          profile.availabilityTier === 'mission-critical' ? 1.25 : 1.1;
        return reserved * availabilityPremium;
      },
      this.name,
      (recommendation) => ({
        ...recommendation,
        expectedPerformanceScore: recommendation.expectedPerformanceScore + 0.1,
        totalScore: recommendation.totalScore + 0.1,
      }),
    );
  }
}

export class BurstBufferStrategy implements Strategy {
  readonly name = 'burst';

  evaluate(input: StrategyInput): StrategyRecommendation[] {
    return buildRecommendations(
      input.snapshot,
      input.workloadProfile,
      ({ spot, demand, profile }) => {
        const burstRisk = demand ? demand.predictedUtilization : 0.6;
        const multiplier = profile.burstable ? 0.95 : 1.05;
        return spot * (1 + burstRisk * 0.2) * multiplier;
      },
      this.name,
    );
  }
}

export class ReservedRightsStrategy implements Strategy {
  readonly name = 'reserved';

  evaluate(input: StrategyInput): StrategyRecommendation[] {
    return buildRecommendations(
      input.snapshot,
      input.workloadProfile,
      ({ reserved, demand }) => {
        const utilization = demand ? demand.predictedUtilization : 0.5;
        return reserved * (0.85 + utilization * 0.1);
      },
      this.name,
      (recommendation) => ({
        ...recommendation,
        expectedPerformanceScore:
          recommendation.expectedPerformanceScore + 0.05,
        totalScore: recommendation.totalScore + 0.05,
      }),
    );
  }
}

export class SpotRebalanceStrategy implements Strategy {
  readonly name = 'spot';

  evaluate(input: StrategyInput): StrategyRecommendation[] {
    return buildRecommendations(
      input.snapshot,
      input.workloadProfile,
      ({ spot, demand }) => {
        const volatility = demand ? 1 - demand.confidence : 0.4;
        return spot * (1 + volatility * 0.3);
      },
      this.name,
      (recommendation) => ({
        ...recommendation,
        expectedPerformanceScore: recommendation.expectedPerformanceScore - 0.1,
        totalScore: recommendation.totalScore - 0.05,
      }),
    );
  }
}

export class FederatedMultiCloudStrategy implements Strategy {
  readonly name = 'federated';

  evaluate(input: StrategyInput): StrategyRecommendation[] {
    const base = buildRecommendations(
      input.snapshot,
      input.workloadProfile,
      ({ spot, reserved, profile }) => {
        const mix = profile.availabilityTier === 'mission-critical' ? 0.7 : 0.5;
        return spot * (1 - mix * 0.2) + reserved * mix * 0.8;
      },
      this.name,
    );

    const sorted = [...base].sort((a, b) => a.totalScore - b.totalScore);
    const lowestScore = sorted.length ? sorted[0].totalScore : 0;

    return base.map((recommendation) => ({
      ...recommendation,
      totalScore:
        recommendation.totalScore +
        (recommendation.totalScore - lowestScore) * 0.05,
      expectedPerformanceScore: recommendation.expectedPerformanceScore + 0.05,
    }));
  }
}

export const STRATEGIES: Strategy[] = [
  new ServerlessFirstStrategy(),
  new BurstBufferStrategy(),
  new ReservedRightsStrategy(),
  new SpotRebalanceStrategy(),
  new FederatedMultiCloudStrategy(),
];
