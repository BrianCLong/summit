"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.STRATEGIES = exports.FederatedMultiCloudStrategy = exports.SpotRebalanceStrategy = exports.ReservedRightsStrategy = exports.BurstBufferStrategy = exports.ServerlessFirstStrategy = void 0;
function getDemand(demand, provider, region, resource) {
    return demand.find((datum) => datum.provider === provider &&
        datum.region === region &&
        datum.resource === resource);
}
function getEnergyScore(snapshot, region, weight) {
    const energy = snapshot.energy.find((entry) => entry.region === region);
    if (!energy) {
        return 0.5 * weight;
    }
    const normalizedCarbon = Math.max(0, 1 - energy.carbonIntensityGramsPerKwh / 600);
    return normalizedCarbon * weight;
}
function getRegulatoryScore(snapshot, provider, region) {
    const entry = snapshot.regulation.find((datum) => datum.provider === provider && datum.region === region);
    if (!entry) {
        return 0.25;
    }
    return 0.5 + Math.max(0, entry.incentivePerUnit - entry.penaltyPerUnit) * 10;
}
function basePerformanceScore(demand, profile) {
    if (!demand) {
        return profile.availabilityTier === 'mission-critical' ? 0.6 : 0.5;
    }
    const utilizationFactor = 1 - Math.min(0.95, demand.predictedUtilization);
    const confidenceBoost = demand.confidence * 0.2;
    const tierWeight = profile.availabilityTier === 'mission-critical' ? 0.7 : 0.5;
    return Math.max(0.3, tierWeight + utilizationFactor * 0.3 + confidenceBoost);
}
function buildRecommendations(snapshot, profile, priceSelector, label, modifier = (rec) => rec) {
    return snapshot.financial.flatMap((financial) => {
        const demand = getDemand(snapshot.demand, financial.provider, financial.region, 'compute');
        const basePrice = priceSelector({
            spot: financial.spotPricePerUnit,
            reserved: financial.reservedPricePerUnit,
            demand,
            profile,
        });
        const energyScore = getEnergyScore(snapshot, financial.region, profile.sustainabilityWeight);
        const regulatoryScore = getRegulatoryScore(snapshot, financial.provider, financial.region);
        const performanceScore = basePerformanceScore(demand, profile);
        const totalScore = performanceScore + energyScore + regulatoryScore;
        const recommendation = {
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
class ServerlessFirstStrategy {
    name = 'serverless';
    evaluate(input) {
        return buildRecommendations(input.snapshot, input.workloadProfile, ({ reserved, profile }) => {
            const availabilityPremium = profile.availabilityTier === 'mission-critical' ? 1.25 : 1.1;
            return reserved * availabilityPremium;
        }, this.name, (recommendation) => ({
            ...recommendation,
            expectedPerformanceScore: recommendation.expectedPerformanceScore + 0.1,
            totalScore: recommendation.totalScore + 0.1,
        }));
    }
}
exports.ServerlessFirstStrategy = ServerlessFirstStrategy;
class BurstBufferStrategy {
    name = 'burst';
    evaluate(input) {
        return buildRecommendations(input.snapshot, input.workloadProfile, ({ spot, demand, profile }) => {
            const burstRisk = demand ? demand.predictedUtilization : 0.6;
            const multiplier = profile.burstable ? 0.95 : 1.05;
            return spot * (1 + burstRisk * 0.2) * multiplier;
        }, this.name);
    }
}
exports.BurstBufferStrategy = BurstBufferStrategy;
class ReservedRightsStrategy {
    name = 'reserved';
    evaluate(input) {
        return buildRecommendations(input.snapshot, input.workloadProfile, ({ reserved, demand }) => {
            const utilization = demand ? demand.predictedUtilization : 0.5;
            return reserved * (0.85 + utilization * 0.1);
        }, this.name, (recommendation) => ({
            ...recommendation,
            expectedPerformanceScore: recommendation.expectedPerformanceScore + 0.05,
            totalScore: recommendation.totalScore + 0.05,
        }));
    }
}
exports.ReservedRightsStrategy = ReservedRightsStrategy;
class SpotRebalanceStrategy {
    name = 'spot';
    evaluate(input) {
        return buildRecommendations(input.snapshot, input.workloadProfile, ({ spot, demand }) => {
            const volatility = demand ? 1 - demand.confidence : 0.4;
            return spot * (1 + volatility * 0.3);
        }, this.name, (recommendation) => ({
            ...recommendation,
            expectedPerformanceScore: recommendation.expectedPerformanceScore - 0.1,
            totalScore: recommendation.totalScore - 0.05,
        }));
    }
}
exports.SpotRebalanceStrategy = SpotRebalanceStrategy;
class FederatedMultiCloudStrategy {
    name = 'federated';
    evaluate(input) {
        const base = buildRecommendations(input.snapshot, input.workloadProfile, ({ spot, reserved, profile }) => {
            const mix = profile.availabilityTier === 'mission-critical' ? 0.7 : 0.5;
            return spot * (1 - mix * 0.2) + reserved * mix * 0.8;
        }, this.name);
        const sorted = [...base].sort((a, b) => a.totalScore - b.totalScore);
        const lowestScore = sorted.length ? sorted[0].totalScore : 0;
        return base.map((recommendation) => ({
            ...recommendation,
            totalScore: recommendation.totalScore +
                (recommendation.totalScore - lowestScore) * 0.05,
            expectedPerformanceScore: recommendation.expectedPerformanceScore + 0.05,
        }));
    }
}
exports.FederatedMultiCloudStrategy = FederatedMultiCloudStrategy;
exports.STRATEGIES = [
    new ServerlessFirstStrategy(),
    new BurstBufferStrategy(),
    new ReservedRightsStrategy(),
    new SpotRebalanceStrategy(),
    new FederatedMultiCloudStrategy(),
];
