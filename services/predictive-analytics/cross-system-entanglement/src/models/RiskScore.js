"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.RiskScoreBuilder = void 0;
exports.createCriticalPath = createCriticalPath;
exports.calculateOverallRisk = calculateOverallRisk;
exports.generateRecommendations = generateRecommendations;
exports.classifyRiskLevel = classifyRiskLevel;
class RiskScoreBuilder {
    riskScore = {
        criticalPaths: [],
        recommendations: [],
    };
    withSystemId(systemId) {
        this.riskScore.systemId = systemId;
        return this;
    }
    withOverallRisk(risk) {
        if (risk < 0 || risk > 1) {
            throw new Error('Overall risk must be between 0 and 1');
        }
        this.riskScore.overallRisk = risk;
        return this;
    }
    withCascadeRisk(risk) {
        if (risk < 0 || risk > 1) {
            throw new Error('Cascade risk must be between 0 and 1');
        }
        this.riskScore.cascadeRisk = risk;
        return this;
    }
    withImpactRadius(radius) {
        if (radius < 0) {
            throw new Error('Impact radius must be non-negative');
        }
        this.riskScore.impactRadius = radius;
        return this;
    }
    withCriticalPath(path) {
        this.riskScore.criticalPaths.push(path);
        return this;
    }
    withRecommendation(recommendation) {
        this.riskScore.recommendations.push(recommendation);
        return this;
    }
    build() {
        if (!this.riskScore.systemId) {
            throw new Error('System ID is required');
        }
        if (this.riskScore.overallRisk === undefined) {
            throw new Error('Overall risk is required');
        }
        if (this.riskScore.cascadeRisk === undefined) {
            throw new Error('Cascade risk is required');
        }
        if (this.riskScore.impactRadius === undefined) {
            throw new Error('Impact radius is required');
        }
        return {
            systemId: this.riskScore.systemId,
            overallRisk: this.riskScore.overallRisk,
            cascadeRisk: this.riskScore.cascadeRisk,
            impactRadius: this.riskScore.impactRadius,
            criticalPaths: this.riskScore.criticalPaths,
            recommendations: this.riskScore.recommendations,
        };
    }
}
exports.RiskScoreBuilder = RiskScoreBuilder;
function createCriticalPath(path, propagationProbability, estimatedLatency) {
    if (path.length < 2) {
        throw new Error('Critical path must have at least 2 systems');
    }
    if (propagationProbability < 0 || propagationProbability > 1) {
        throw new Error('Propagation probability must be between 0 and 1');
    }
    if (estimatedLatency < 0) {
        throw new Error('Estimated latency must be non-negative');
    }
    return {
        path,
        propagationProbability,
        estimatedLatency,
    };
}
function calculateOverallRisk(cascadeRisk, impactRadius, couplingCount, weights = { cascade: 0.5, centrality: 0.3, coupling: 0.2 }) {
    // Normalize impact radius and coupling count
    const normalizedCentrality = Math.min(impactRadius / 10, 1.0);
    const normalizedCoupling = Math.min(couplingCount / 20, 1.0);
    const risk = cascadeRisk * weights.cascade +
        normalizedCentrality * weights.centrality +
        normalizedCoupling * weights.coupling;
    return Math.min(Math.max(risk, 0), 1);
}
function generateRecommendations(riskScore) {
    const recommendations = [];
    if (riskScore.overallRisk > 0.8) {
        recommendations.push('CRITICAL: System has very high overall risk. Consider immediate decoupling or circuit breaker implementation.');
    }
    if (riskScore.cascadeRisk > 0.7) {
        recommendations.push('High cascade risk detected. Implement bulkheads and fallback mechanisms.');
    }
    if (riskScore.impactRadius > 10) {
        recommendations.push(`System impacts ${riskScore.impactRadius} other systems. Review architectural boundaries and consider service decomposition.`);
    }
    if (riskScore.criticalPaths.length > 5) {
        recommendations.push(`${riskScore.criticalPaths.length} critical failure paths identified. Prioritize monitoring on high-probability paths.`);
    }
    const highProbPaths = riskScore.criticalPaths.filter((p) => p.propagationProbability > 0.8);
    if (highProbPaths.length > 0) {
        recommendations.push(`${highProbPaths.length} paths have >80% failure propagation probability. Add retry logic and timeout configurations.`);
    }
    const fastPropPaths = riskScore.criticalPaths.filter((p) => p.estimatedLatency < 1000);
    if (fastPropPaths.length > 0) {
        recommendations.push(`${fastPropPaths.length} paths propagate failures in <1s. Implement rate limiting and back-pressure mechanisms.`);
    }
    if (recommendations.length === 0) {
        recommendations.push('System risk is within acceptable bounds. Continue monitoring coupling metrics.');
    }
    return recommendations;
}
function classifyRiskLevel(overallRisk) {
    if (overallRisk >= 0.8)
        return 'CRITICAL';
    if (overallRisk >= 0.6)
        return 'HIGH';
    if (overallRisk >= 0.4)
        return 'MEDIUM';
    return 'LOW';
}
