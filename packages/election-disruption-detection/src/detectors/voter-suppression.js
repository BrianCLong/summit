"use strict";
/**
 * Advanced Voter Suppression Detection
 *
 * Multi-vector detection of voter suppression activities including:
 * - Targeted disinformation (wrong dates, locations, requirements)
 * - Queue manipulation and resource denial
 * - Intimidation campaigns
 * - Legal/procedural barriers
 * - Technical attacks on registration systems
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.VoterSuppressionDetector = void 0;
const index_js_1 = require("../base/index.js");
class VoterSuppressionDetector extends index_js_1.ThreatDetector {
    demographicVulnerabilityMap;
    historicalPatterns;
    languageModels;
    constructor(config) {
        super();
        this.demographicVulnerabilityMap = new Map();
        this.historicalPatterns = [];
        this.languageModels = new SuppressionLanguageDetector();
    }
    async analyze(signals, context) {
        const threats = [];
        // Detect procedural disinformation
        const proceduralThreats = await this.detectProceduralDisinformation(signals, context);
        threats.push(...proceduralThreats);
        // Detect intimidation campaigns
        const intimidationThreats = await this.detectIntimidation(signals, context);
        threats.push(...intimidationThreats);
        // Detect targeting patterns
        const targetingThreats = await this.detectDemographicTargeting(signals, context);
        threats.push(...targetingThreats);
        // Detect infrastructure-based suppression
        const infraThreats = await this.detectInfrastructureSuppression(signals, context);
        threats.push(...infraThreats);
        return threats;
    }
    async detectProceduralDisinformation(signals, context) {
        const threats = [];
        // Look for signals containing wrong election information
        const proceduralSignals = signals.filter((s) => this.languageModels.containsProceduralMisinformation(s));
        for (const signal of proceduralSignals) {
            const targeting = this.analyzeTargeting(signal);
            if (targeting.isTargeted) {
                threats.push(this.createThreat('VOTER_SUPPRESSION', signal, targeting, context));
            }
        }
        return threats;
    }
    async detectIntimidation(signals, context) {
        const threats = [];
        // Detect coordinated harassment/intimidation
        const intimidationSignals = signals.filter((s) => this.languageModels.containsIntimidationLanguage(s));
        // Cluster by target
        const clusters = this.clusterByTarget(intimidationSignals);
        for (const cluster of clusters) {
            if (cluster.length >= 3) {
                // Coordinated pattern
                threats.push(this.createCoordinatedThreat(cluster, context));
            }
        }
        return threats;
    }
    async detectDemographicTargeting(signals, context) {
        // Analyze demographic patterns in misinformation targeting
        const threats = [];
        const demographicAnalysis = this.analyzeDemographicPatterns(signals);
        for (const pattern of demographicAnalysis) {
            if (pattern.disparateImpact > 0.3) {
                threats.push({
                    id: crypto.randomUUID(),
                    type: 'VOTER_SUPPRESSION',
                    confidence: pattern.confidence,
                    severity: this.calculateSeverity(pattern.disparateImpact),
                    vectors: ['SOCIAL_MEDIA'],
                    temporalContext: {
                        phase: context.currentPhase,
                        daysToElection: context.daysToElection,
                        timeWindow: { start: new Date(), end: new Date() },
                        trendDirection: 'STABLE',
                        velocity: 0,
                    },
                    geospatialContext: {
                        jurisdictions: pattern.jurisdictions,
                        precincts: [],
                        swingIndicator: 0,
                        demographicOverlays: pattern.targetedGroups.map((g) => ({
                            group: g,
                            vulnerabilityScore: this.demographicVulnerabilityMap.get(g) || 0.5,
                            historicalTargeting: true,
                        })),
                        infrastructureDependencies: [],
                    },
                    attribution: {
                        primaryActor: null,
                        confidence: 0,
                        methodology: 'BEHAVIORAL_ANALYSIS',
                        indicators: [],
                        alternativeHypotheses: [],
                    },
                    evidence: [],
                    mitigationRecommendations: [
                        {
                            action: 'Deploy targeted counter-messaging to affected demographics',
                            priority: 1,
                            timeframe: '24 hours',
                            stakeholders: ['Election officials', 'Community organizations'],
                            effectivenessEstimate: 0.6,
                            riskOfEscalation: 0.1,
                        },
                    ],
                });
            }
        }
        return threats;
    }
    async detectInfrastructureSuppression(signals, context) {
        // Detect anomalies in polling infrastructure that may indicate suppression
        return [];
    }
    analyzeTargeting(signal) {
        return {
            isTargeted: false,
            targetGroups: [],
            confidence: 0,
        };
    }
    clusterByTarget(signals) {
        return [];
    }
    createThreat(type, signal, targeting, context) {
        return {
            id: crypto.randomUUID(),
            type,
            confidence: targeting.confidence,
            severity: 'MEDIUM',
            vectors: ['SOCIAL_MEDIA'],
            temporalContext: {
                phase: context.currentPhase,
                daysToElection: context.daysToElection,
                timeWindow: { start: new Date(), end: new Date() },
                trendDirection: 'STABLE',
                velocity: 0,
            },
            geospatialContext: {
                jurisdictions: [],
                precincts: [],
                swingIndicator: 0,
                demographicOverlays: [],
                infrastructureDependencies: [],
            },
            attribution: {
                primaryActor: null,
                confidence: 0,
                methodology: 'BEHAVIORAL_ANALYSIS',
                indicators: [],
                alternativeHypotheses: [],
            },
            evidence: [],
            mitigationRecommendations: [],
        };
    }
    createCoordinatedThreat(signals, context) {
        return this.createThreat('VOTER_SUPPRESSION', signals[0], { isTargeted: true, targetGroups: [], confidence: 0.8 }, context);
    }
    analyzeDemographicPatterns(signals) {
        return [];
    }
    calculateSeverity(impact) {
        if (impact >= 0.7) {
            return 'CRITICAL';
        }
        if (impact >= 0.5) {
            return 'HIGH';
        }
        if (impact >= 0.3) {
            return 'MEDIUM';
        }
        return 'LOW';
    }
}
exports.VoterSuppressionDetector = VoterSuppressionDetector;
class SuppressionLanguageDetector {
    containsProceduralMisinformation(signal) {
        return false;
    }
    containsIntimidationLanguage(signal) {
        return false;
    }
}
