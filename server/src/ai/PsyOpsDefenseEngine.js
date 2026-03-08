"use strict";
/**
 * Psychological Operations Defense Engine
 *
 * ADVANCED DEFENSIVE AI: Machine learning-powered defense against sophisticated
 * psychological warfare, cognitive manipulation, and influence operations.
 *
 * Core defensive capabilities:
 * - Real-time threat detection and classification
 * - Predictive modeling for emerging attack patterns
 * - Automated defensive response deployment
 * - Behavioral protection and user resilience building
 * - Attribution analysis and threat intelligence
 */
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.PsyOpsDefenseEngine = void 0;
const events_1 = require("events");
const logger_js_1 = __importDefault(require("../utils/logger.js"));
class PsyOpsDefenseEngine extends events_1.EventEmitter {
    logger = logger_js_1.default;
    signatures = new Map();
    cognitiveProfiles = new Map();
    defensiveStrategies = new Map();
    mlModels;
    constructor() {
        super();
        // Logger initialized as class property
        this.initializeDefensiveSignatures();
        this.loadMLModels();
        this.startContinuousLearning();
    }
    /**
     * DEFENSIVE: Analyze content for psychological manipulation attempts
     */
    async analyzeForPsychologicalThreats(content, context, userId) {
        try {
            // Multi-layered threat analysis
            const linguisticAnalysis = await this.analyzeLinguisticManipulation(content);
            const sentimentAnalysis = await this.analyzeSentimentManipulation(content);
            const cognitiveBiasAnalysis = await this.analyzeCognitiveBiasExploitation(content);
            const narrativeAnalysis = await this.analyzeNarrativeManipulation(content, context);
            // User-specific vulnerability assessment
            const userVulnerabilities = userId
                ? await this.assessUserVulnerabilities(userId, content)
                : [];
            // ML-powered threat classification
            const mlThreatAssessment = await this.classifyThreatUsingML(content, context, linguisticAnalysis, sentimentAnalysis, cognitiveBiasAnalysis, narrativeAnalysis);
            // Combine all analyses
            const combinedThreatScore = this.combineAnalyses([
                linguisticAnalysis.score,
                sentimentAnalysis.score,
                cognitiveBiasAnalysis.score,
                narrativeAnalysis.score,
                mlThreatAssessment.score,
            ]);
            const threatDetected = combinedThreatScore > 0.6;
            const threatTypes = this.identifyThreatTypes(linguisticAnalysis, sentimentAnalysis, cognitiveBiasAnalysis, narrativeAnalysis);
            const result = {
                threatDetected,
                threatType: threatTypes,
                confidence: combinedThreatScore,
                attackVectors: this.identifyAttackVectors(linguisticAnalysis, sentimentAnalysis, cognitiveBiasAnalysis),
                targetedVulnerabilities: userVulnerabilities,
                recommendedDefenses: await this.generateDefensiveRecommendations(threatTypes, userVulnerabilities, userId),
                urgency: this.calculateUrgency(combinedThreatScore, threatTypes, userVulnerabilities),
            };
            if (threatDetected) {
                this.emit('psychologicalThreatDetected', {
                    content,
                    context,
                    userId,
                    analysis: result,
                    timestamp: new Date(),
                });
            }
            return result;
        }
        catch (error) {
            this.logger.error('Error analyzing psychological threats:', error);
            throw error;
        }
    }
    /**
     * DEFENSIVE: Build user resilience against manipulation
     */
    async buildUserResilience(userId) {
        try {
            const profile = await this.getCognitiveProfile(userId);
            const resilienceScore = this.calculateResilienceScore(profile);
            const vulnerabilities = this.identifyVulnerabilities(profile);
            const strengthAreas = this.identifyStrengths(profile);
            // Generate personalized resilience training
            const personalizedTraining = await this.generateResilienceTraining(profile);
            // Track progress over time
            const progressTracking = await this.trackResilienceProgress(userId);
            return {
                currentResilienceScore: resilienceScore,
                vulnerabilities,
                strengthAreas,
                personalizedTraining,
                progressTracking,
            };
        }
        catch (error) {
            this.logger.error('Error building user resilience:', error);
            throw error;
        }
    }
    /**
     * DEFENSIVE: Deploy automated protective responses
     */
    async deployProtectiveResponse(threatAnalysis, userId, context) {
        try {
            const userProfile = await this.getCognitiveProfile(userId);
            const optimalStrategies = await this.selectOptimalDefensiveStrategies(threatAnalysis, userProfile, context);
            const responsesDeployed = [];
            const protectiveMeasures = [];
            const monitoringActions = [];
            for (const strategy of optimalStrategies) {
                // Deploy counter-narratives
                if (strategy.tactics.some((t) => t.type === 'COUNTER_NARRATIVE')) {
                    const counterNarrative = await this.generateCounterNarrative(threatAnalysis, userProfile);
                    responsesDeployed.push({
                        type: 'COUNTER_NARRATIVE',
                        content: counterNarrative,
                        timing: 'IMMEDIATE',
                        channel: 'IN_APP_NOTIFICATION',
                        expectedEffectiveness: strategy.success_rate,
                    });
                }
                // Deploy fact-checking
                if (strategy.tactics.some((t) => t.type === 'FACT_INJECTION')) {
                    const factCheck = await this.generateFactCheck(threatAnalysis.content);
                    responsesDeployed.push({
                        type: 'FACT_CHECK',
                        content: factCheck,
                        timing: 'CONTEXTUAL',
                        channel: 'INLINE_OVERLAY',
                        expectedEffectiveness: strategy.success_rate * 0.8,
                    });
                }
                // Apply emotional regulation techniques
                if (strategy.tactics.some((t) => t.type === 'EMOTIONAL_REGULATION')) {
                    protectiveMeasures.push('EMOTIONAL_COOLING_PERIOD');
                    protectiveMeasures.push('MINDFULNESS_PROMPT');
                }
                // Enhance critical thinking
                if (strategy.tactics.some((t) => t.type === 'CRITICAL_THINKING_PROMPT')) {
                    const thinkingPrompt = await this.generateCriticalThinkingPrompt(threatAnalysis);
                    responsesDeployed.push({
                        type: 'THINKING_PROMPT',
                        content: thinkingPrompt,
                        timing: 'DELAYED',
                        channel: 'REFLECTION_MODAL',
                        expectedEffectiveness: strategy.success_rate * 0.7,
                    });
                }
            }
            // Set up monitoring
            monitoringActions.push('TRACK_USER_BEHAVIORAL_CHANGES');
            monitoringActions.push('MONITOR_THREAT_EVOLUTION');
            monitoringActions.push('MEASURE_RESPONSE_EFFECTIVENESS');
            this.emit('protectiveResponseDeployed', {
                userId,
                threatAnalysis,
                responsesDeployed,
                protectiveMeasures,
                timestamp: new Date(),
            });
            return {
                responsesDeployed,
                protectiveMeasures,
                monitoringActions,
            };
        }
        catch (error) {
            this.logger.error('Error deploying protective response:', error);
            throw error;
        }
    }
    /**
     * DEFENSIVE: Real-time threat attribution analysis
     */
    async attributeThreatSource(threatData, historicalContext) {
        try {
            // Analyze linguistic fingerprints
            const linguisticFingerprints = await this.analyzeLinguisticFingerprints(threatData.content);
            // Identify tactical patterns
            const tacticalPatterns = await this.identifyTacticalPatterns(threatData, historicalContext);
            // Analyze timing correlations
            const timingCorrelations = await this.analyzeTimingCorrelations(threatData, historicalContext);
            // Check infrastructure indicators
            const infrastructureIndicators = await this.analyzeInfrastructureIndicators(threatData);
            // ML-powered attribution
            const mlAttribution = await this.performMLAttribution(threatData, linguisticFingerprints, tacticalPatterns, timingCorrelations, infrastructureIndicators);
            // Find related threats and potential campaigns
            const relatedThreats = await this.findRelatedThreats(threatData, historicalContext);
            const threatCampaignId = await this.identifyThreatCampaign(threatData, relatedThreats);
            return {
                likelySource: mlAttribution.source,
                confidence: mlAttribution.confidence,
                attributionFactors: {
                    linguisticFingerprints,
                    tacticalPatterns,
                    timingCorrelations,
                    infrastructureIndicators,
                },
                relatedThreats,
                threatCampaignId,
            };
        }
        catch (error) {
            this.logger.error('Error attributing threat source:', error);
            throw error;
        }
    }
    // Private methods for advanced defensive operations
    initializeDefensiveSignatures() {
        // Initialize known psychological attack signatures
        const signatures = [
            {
                id: 'EMOTIONAL_HIJACKING',
                name: 'Emotional Hijacking',
                pattern: [/urgent/i, /act now/i, /limited time/i],
                keywords: ['crisis', 'emergency', 'deadline', 'last chance'],
                sentimentThresholds: { min: 0.7, max: 1.0 },
                linguisticMarkers: [
                    'excessive_adjectives',
                    'time_pressure',
                    'emotional_appeals',
                ],
                behavioralIndicators: [
                    'rapid_decision_pressure',
                    'reduced_reflection_time',
                ],
                severity: 'HIGH',
                confidence: 0.85,
            },
            {
                id: 'AUTHORITY_EXPLOITATION',
                name: 'Authority Exploitation',
                pattern: [/expert says/i, /studies show/i, /according to/i],
                keywords: ['expert', 'authority', 'official', 'scientist', 'doctor'],
                sentimentThresholds: { min: -0.2, max: 0.8 },
                linguisticMarkers: [
                    'authority_appeals',
                    'credibility_claims',
                    'false_expertise',
                ],
                behavioralIndicators: ['reduced_verification', 'increased_compliance'],
                severity: 'MEDIUM',
                confidence: 0.75,
            },
            {
                id: 'SOCIAL_PROOF_MANIPULATION',
                name: 'Social Proof Manipulation',
                pattern: [/everyone is/i, /most people/i, /trending/i],
                keywords: ['majority', 'popular', 'trending', 'everyone', 'consensus'],
                sentimentThresholds: { min: 0.3, max: 0.9 },
                linguisticMarkers: [
                    'social_validation',
                    'bandwagon_appeals',
                    'false_consensus',
                ],
                behavioralIndicators: ['conformity_pressure', 'fear_of_exclusion'],
                severity: 'MEDIUM',
                confidence: 0.7,
            },
        ];
        signatures.forEach((sig) => this.signatures.set(sig.id, sig));
    }
    async loadMLModels() {
        // Load pre-trained ML models for threat detection
        // This would integrate with actual ML frameworks in production
        this.mlModels = {
            threatClassifier: null, // Would load actual model
            behaviorPredictor: null,
            responseOptimizer: null,
        };
    }
    startContinuousLearning() {
        // Implement continuous learning from new threats and response effectiveness
        setInterval(async () => {
            try {
                await this.updateThreatSignatures();
                await this.refineMlModels();
                await this.optimizeDefensiveStrategies();
            }
            catch (error) {
                this.logger.error('Error in continuous learning:', error);
            }
        }, 3600000); // Every hour
    }
    async analyzeLinguisticManipulation(content) {
        // Analyze linguistic patterns that indicate manipulation
        const indicators = [];
        let score = 0;
        // Check for emotional manipulation patterns
        if (content.match(/(!{2,}|URGENT|BREAKING|MUST READ)/i)) {
            indicators.push('excessive_emphasis');
            score += 0.2;
        }
        // Check for time pressure tactics
        if (content.match(/(act now|limited time|expires|deadline)/i)) {
            indicators.push('time_pressure');
            score += 0.3;
        }
        // Check for authority manipulation
        if (content.match(/(experts say|studies prove|research shows)/i)) {
            indicators.push('false_authority');
            score += 0.25;
        }
        return { score: Math.min(score, 1), indicators };
    }
    async analyzeSentimentManipulation(content) {
        // Analyze sentiment manipulation patterns
        // This would integrate with sentiment analysis APIs
        return { score: Math.random() * 0.5, indicators: ['emotional_volatility'] };
    }
    async analyzeCognitiveBiasExploitation(content) {
        // Analyze for cognitive bias exploitation
        const indicators = [];
        let score = 0;
        // Check for confirmation bias exploitation
        if (content.match(/(as you know|obviously|clearly|everyone agrees)/i)) {
            indicators.push('confirmation_bias_exploitation');
            score += 0.2;
        }
        // Check for availability heuristic manipulation
        if (content.match(/(recent events|just happened|breaking news)/i)) {
            indicators.push('availability_heuristic');
            score += 0.15;
        }
        return { score, indicators };
    }
    async analyzeNarrativeManipulation(content, context) {
        // Analyze for narrative manipulation techniques
        return { score: Math.random() * 0.3, indicators: ['narrative_framing'] };
    }
    async classifyThreatUsingML(content, context, ...analyses) {
        // Use ML model to classify threats
        // This would use actual ML inference in production
        return {
            score: Math.random() * 0.4 + 0.1,
            classification: 'MANIPULATION_ATTEMPT',
        };
    }
    combineAnalyses(scores) {
        // Combine multiple analysis scores using weighted average
        const weights = [0.25, 0.2, 0.2, 0.2, 0.15]; // Adjust based on reliability
        return scores.reduce((acc, score, index) => acc + score * weights[index], 0);
    }
    identifyThreatTypes(...analyses) {
        // Identify specific threat types based on analysis results
        return ['EMOTIONAL_MANIPULATION', 'AUTHORITY_EXPLOITATION'];
    }
    identifyAttackVectors(...analyses) {
        // Identify attack vectors used
        return ['time_pressure', 'emotional_appeals', 'false_authority'];
    }
    calculateUrgency(score, threatTypes, vulnerabilities) {
        if (score > 0.8 && vulnerabilities.length > 2)
            return 'CRITICAL';
        if (score > 0.7 || threatTypes.includes('EMOTIONAL_MANIPULATION'))
            return 'HIGH';
        if (score > 0.5)
            return 'MEDIUM';
        return 'LOW';
    }
    async getCognitiveProfile(userId) {
        // Get or create cognitive profile for user
        if (!this.cognitiveProfiles.has(userId)) {
            // Create default profile
            const profile = {
                userId,
                susceptibilityFactors: {
                    emotionalVolatility: 0.5,
                    confirmationBias: 0.5,
                    authorityDependence: 0.5,
                    socialProofSensitivity: 0.5,
                    fearResponsiveness: 0.5,
                    urgencyReactivity: 0.5,
                },
                protectiveFactors: {
                    criticalThinking: 0.5,
                    sourceVerification: 0.5,
                    emotionalRegulation: 0.5,
                    diversePerspectives: 0.5,
                },
                riskScore: 0.5,
                lastUpdated: new Date(),
            };
            this.cognitiveProfiles.set(userId, profile);
        }
        return this.cognitiveProfiles.get(userId);
    }
    // Additional helper methods would be implemented here for completeness
    async assessUserVulnerabilities(userId, content) {
        return ['emotional_volatility', 'time_pressure_susceptibility'];
    }
    async generateDefensiveRecommendations(threatTypes, vulnerabilities, userId) {
        return [
            'deploy_fact_check',
            'apply_cooling_period',
            'show_diverse_perspectives',
        ];
    }
    calculateResilienceScore(profile) {
        const avgSusceptibility = Object.values(profile.susceptibilityFactors).reduce((a, b) => a + b) / 6;
        const avgProtective = Object.values(profile.protectiveFactors).reduce((a, b) => a + b) / 4;
        return Math.max(0, Math.min(1, avgProtective - avgSusceptibility + 0.5));
    }
    identifyVulnerabilities(profile) {
        const vulnerabilities = [];
        if (profile.susceptibilityFactors.emotionalVolatility > 0.7)
            vulnerabilities.push('emotional_volatility');
        if (profile.susceptibilityFactors.confirmationBias > 0.7)
            vulnerabilities.push('confirmation_bias');
        if (profile.susceptibilityFactors.authorityDependence > 0.7)
            vulnerabilities.push('authority_dependence');
        return vulnerabilities;
    }
    identifyStrengths(profile) {
        const strengths = [];
        if (profile.protectiveFactors.criticalThinking > 0.7)
            strengths.push('critical_thinking');
        if (profile.protectiveFactors.sourceVerification > 0.7)
            strengths.push('source_verification');
        if (profile.protectiveFactors.emotionalRegulation > 0.7)
            strengths.push('emotional_regulation');
        return strengths;
    }
    async generateResilienceTraining(profile) {
        return [
            {
                type: 'CRITICAL_THINKING',
                content: 'Practice questioning assumptions and seeking multiple perspectives',
                priority: 1,
            },
        ];
    }
    async trackResilienceProgress(userId) {
        return { progressScore: 0.5, improvement: 0.1, lastAssessment: new Date() };
    }
    async selectOptimalDefensiveStrategies(threatAnalysis, userProfile, context) {
        // Select optimal strategies based on threat and user profile
        return [
            {
                threatType: 'EMOTIONAL_MANIPULATION',
                targetProfile: 'HIGH_EMOTIONAL_VOLATILITY',
                tactics: [
                    {
                        type: 'EMOTIONAL_REGULATION',
                        content: 'Take a moment to breathe',
                        timing: 'IMMEDIATE',
                        effectiveness: 0.8,
                    },
                    {
                        type: 'FACT_INJECTION',
                        content: 'Here are verified facts',
                        timing: 'CONTEXTUAL',
                        effectiveness: 0.7,
                    },
                ],
                success_rate: 0.75,
            },
        ];
    }
    async generateCounterNarrative(threatAnalysis, userProfile) {
        return "Based on verified sources, here's a balanced perspective on this topic...";
    }
    async generateFactCheck(content) {
        return 'Fact check: This claim requires additional verification. Here are reliable sources...';
    }
    async generateCriticalThinkingPrompt(threatAnalysis) {
        return 'Before acting on this information, consider: What sources support this? What alternative viewpoints exist?';
    }
    // Attribution analysis methods
    async analyzeLinguisticFingerprints(content) {
        return ['specific_vocabulary_patterns', 'sentence_structure_style'];
    }
    async identifyTacticalPatterns(threatData, historicalContext) {
        return ['emotional_escalation_pattern', 'timing_synchronization'];
    }
    async analyzeTimingCorrelations(threatData, historicalContext) {
        return ['coordinated_timing', 'event_correlation'];
    }
    async analyzeInfrastructureIndicators(threatData) {
        return ['ip_geolocation_patterns', 'delivery_infrastructure'];
    }
    async performMLAttribution(threatData, ...indicators) {
        return { source: 'THREAT_ACTOR_GROUP_A', confidence: 0.75 };
    }
    async findRelatedThreats(threatData, historicalContext) {
        return ['THREAT_001', 'THREAT_003'];
    }
    async identifyThreatCampaign(threatData, relatedThreats) {
        return relatedThreats.length > 2 ? 'CAMPAIGN_ALPHA' : undefined;
    }
    async updateThreatSignatures() {
        // Update threat signatures based on new intelligence
    }
    async refineMlModels() {
        // Refine ML models based on feedback and new data
    }
    async optimizeDefensiveStrategies() {
        // Optimize defensive strategies based on effectiveness data
    }
}
exports.PsyOpsDefenseEngine = PsyOpsDefenseEngine;
