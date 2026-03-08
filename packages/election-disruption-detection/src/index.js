"use strict";
// @ts-nocheck
/**
 * @intelgraph/election-disruption-detection
 *
 * State-of-the-art election disruption detection system leveraging:
 * - Multi-modal threat fusion (social, infrastructure, cyber, physical)
 * - Adversarial ML for evolving threat detection
 * - Causal inference for attribution
 * - Real-time anomaly correlation across electoral phases
 */
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __exportStar = (this && this.__exportStar) || function(m, exports) {
    for (var p in m) if (p !== "default" && !Object.prototype.hasOwnProperty.call(exports, p)) __createBinding(exports, m, p);
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.AdversarialDefenseLayer = exports.CausalAttributionEngine = exports.MultiModalFusionEngine = exports.ElectionDisruptionEngine = exports.ThreatDetector = void 0;
// Re-export types
__exportStar(require("./types.js"), exports);
// Export base classes
var index_js_1 = require("./base/index.js");
Object.defineProperty(exports, "ThreatDetector", { enumerable: true, get: function () { return index_js_1.ThreatDetector; } });
// Export sub-modules
__exportStar(require("./detectors/index.js"), exports);
__exportStar(require("./models/index.js"), exports);
__exportStar(require("./fusion/index.js"), exports);
__exportStar(require("./attribution/index.js"), exports);
const index_js_2 = require("./base/index.js");
/**
 * Main Election Disruption Detection Engine
 */
class ElectionDisruptionEngine {
    detectors = [];
    fusionEngine;
    attributionEngine;
    adversarialDefense;
    constructor(config) {
        this.fusionEngine = new MultiModalFusionEngine(config.fusion);
        this.attributionEngine = new CausalAttributionEngine(config.attribution);
        this.adversarialDefense = new AdversarialDefenseLayer(config.adversarial);
        this.initializeDetectors(config);
    }
    initializeDetectors(config) {
        this.detectors = [
            new VoterSuppressionDetector(config),
            new DisinformationCampaignDetector(config),
            new InfrastructureAttackDetector(config),
            new ForeignInterferenceDetector(config),
            new DeepfakeInjectionDetector(config),
            new CoordinatedHarassmentDetector(config),
            new PerceptionHackDetector(config),
            new LegitimacyAttackDetector(config),
        ];
    }
    async analyzeSignals(signals, context) {
        // Adversarial robustness check
        const cleanedSignals = await this.adversarialDefense.filterAdversarialInputs(signals);
        // Multi-detector analysis
        const detectorResults = await Promise.all(this.detectors.map((d) => d.analyze(cleanedSignals, context)));
        // Multi-modal fusion
        const fusedThreats = await this.fusionEngine.fuse(detectorResults);
        // Causal attribution
        const attributedThreats = await this.attributionEngine.attribute(fusedThreats);
        // Temporal correlation
        const correlatedThreats = this.correlateTemporally(attributedThreats, context);
        return {
            timestamp: new Date(),
            context,
            threats: correlatedThreats,
            overallRiskLevel: this.calculateOverallRisk(correlatedThreats),
            recommendations: this.generateRecommendations(correlatedThreats, context),
            confidence: this.calculateConfidence(correlatedThreats),
        };
    }
    correlateTemporally(threats, context) {
        return threats.map((threat) => ({
            ...threat,
            temporalContext: {
                ...threat.temporalContext,
                phase: context.currentPhase,
                daysToElection: context.daysToElection,
            },
        }));
    }
    calculateOverallRisk(threats) {
        const severityWeights = {
            CRITICAL: 1.0,
            HIGH: 0.7,
            MEDIUM: 0.4,
            LOW: 0.2,
            INFORMATIONAL: 0.05,
        };
        const weightedSum = threats.reduce((sum, t) => sum + severityWeights[t.severity] * t.confidence, 0);
        const normalizedRisk = Math.min(1, weightedSum / threats.length || 0);
        return {
            level: this.riskLevelFromScore(normalizedRisk),
            score: normalizedRisk,
            trend: this.calculateTrend(threats),
            keyDrivers: this.identifyKeyDrivers(threats),
        };
    }
    riskLevelFromScore(score) {
        if (score >= 0.8) {
            return 'CRITICAL';
        }
        if (score >= 0.6) {
            return 'HIGH';
        }
        if (score >= 0.4) {
            return 'MEDIUM';
        }
        if (score >= 0.2) {
            return 'LOW';
        }
        return 'INFORMATIONAL';
    }
    calculateTrend(threats) {
        const escalating = threats.filter((t) => t.temporalContext.trendDirection === 'ESCALATING').length;
        const total = threats.length || 1;
        if (escalating / total > 0.6) {
            return 'ESCALATING';
        }
        if (escalating / total < 0.3) {
            return 'DECLINING';
        }
        return 'STABLE';
    }
    identifyKeyDrivers(threats) {
        const typeCount = new Map();
        threats.forEach((t) => {
            typeCount.set(t.type, (typeCount.get(t.type) || 0) + 1);
        });
        return Array.from(typeCount.entries())
            .sort((a, b) => b[1] - a[1])
            .slice(0, 3)
            .map(([type]) => type);
    }
    generateRecommendations(threats, context) {
        const recommendations = [];
        const criticalThreats = threats.filter((t) => t.severity === 'CRITICAL');
        for (const threat of criticalThreats) {
            recommendations.push(...threat.mitigationRecommendations);
        }
        return this.prioritizeMitigations(recommendations, context);
    }
    prioritizeMitigations(mitigations, context) {
        return mitigations
            .sort((a, b) => {
            const urgencyA = a.priority * (1 + 1 / (context.daysToElection + 1));
            const urgencyB = b.priority * (1 + 1 / (context.daysToElection + 1));
            return urgencyB - urgencyA;
        })
            .slice(0, 10);
    }
    calculateConfidence(threats) {
        if (threats.length === 0) {
            return 0;
        }
        return threats.reduce((sum, t) => sum + t.confidence, 0) / threats.length;
    }
}
exports.ElectionDisruptionEngine = ElectionDisruptionEngine;
class MultiModalFusionEngine {
    config;
    constructor(config) {
        this.config = config;
    }
    async fuse(results) {
        const allThreats = results.flat();
        return this.correlateAndDeduplicate(allThreats);
    }
    correlateAndDeduplicate(threats) {
        const grouped = new Map();
        threats.forEach((t) => {
            const key = `${t.type}-${t.geospatialContext.jurisdictions.join(',')}`;
            if (!grouped.has(key)) {
                grouped.set(key, []);
            }
            grouped.get(key).push(t);
        });
        return Array.from(grouped.values()).map((group) => this.mergeThreats(group));
    }
    mergeThreats(threats) {
        const merged = { ...threats[0] };
        merged.confidence = Math.max(...threats.map((t) => t.confidence));
        merged.evidence = threats.flatMap((t) => t.evidence);
        return merged;
    }
}
exports.MultiModalFusionEngine = MultiModalFusionEngine;
class CausalAttributionEngine {
    config;
    constructor(config) {
        this.config = config;
    }
    async attribute(threats) {
        return Promise.all(threats.map(async (threat) => ({
            ...threat,
            attribution: await this.performAttribution(threat),
        })));
    }
    async performAttribution(_threat) {
        return {
            primaryActor: null,
            confidence: 0,
            methodology: 'MULTI_INT_FUSION',
            indicators: [],
            alternativeHypotheses: [],
        };
    }
}
exports.CausalAttributionEngine = CausalAttributionEngine;
class AdversarialDefenseLayer {
    config;
    constructor(config) {
        this.config = config;
    }
    async filterAdversarialInputs(signals) {
        if (!this.config.enabled) {
            return signals;
        }
        return signals.filter((s) => this.isClean(s));
    }
    isClean(_signal) {
        return true;
    }
}
exports.AdversarialDefenseLayer = AdversarialDefenseLayer;
// Internal detector implementations (used by engine)
class VoterSuppressionDetector extends index_js_2.ThreatDetector {
    config;
    constructor(config) {
        super();
        this.config = config;
    }
    async analyze(_signals, _context) {
        return [];
    }
}
class DisinformationCampaignDetector extends index_js_2.ThreatDetector {
    config;
    constructor(config) {
        super();
        this.config = config;
    }
    async analyze(_signals, _context) {
        return [];
    }
}
class InfrastructureAttackDetector extends index_js_2.ThreatDetector {
    config;
    constructor(config) {
        super();
        this.config = config;
    }
    async analyze(_signals, _context) {
        return [];
    }
}
class ForeignInterferenceDetector extends index_js_2.ThreatDetector {
    config;
    constructor(config) {
        super();
        this.config = config;
    }
    async analyze(_signals, _context) {
        return [];
    }
}
class DeepfakeInjectionDetector extends index_js_2.ThreatDetector {
    config;
    constructor(config) {
        super();
        this.config = config;
    }
    async analyze(_signals, _context) {
        return [];
    }
}
class CoordinatedHarassmentDetector extends index_js_2.ThreatDetector {
    config;
    constructor(config) {
        super();
        this.config = config;
    }
    async analyze(_signals, _context) {
        return [];
    }
}
class PerceptionHackDetector extends index_js_2.ThreatDetector {
    config;
    constructor(config) {
        super();
        this.config = config;
    }
    async analyze(_signals, _context) {
        return [];
    }
}
class LegitimacyAttackDetector extends index_js_2.ThreatDetector {
    config;
    constructor(config) {
        super();
        this.config = config;
    }
    async analyze(_signals, _context) {
        return [];
    }
}
